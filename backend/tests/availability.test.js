import { describe, expect, it } from 'vitest';
import { getIstDateStamp, getRestaurantAvailability, parseClockTime } from '../src/utils/time.js';

/**
 * Fixed UTC instants make these checks deterministic regardless of when the
 * suite runs. IST is UTC+05:30.
 */
function atIst(hour, minute, day = 15) {
  return new Date(Date.UTC(2026, 0, day, hour - 5, minute - 30));
}

function restaurant(overrides = {}) {
  return {
    isActive: true,
    openingTime: '11:00',
    closingTime: '15:00',
    timezone: 'Asia/Kolkata',
    ...overrides,
  };
}

describe('restaurant opening hours', () => {
  it('parses only valid 24-hour clock strings', () => {
    expect(parseClockTime('00:00')).toBe(0);
    expect(parseClockTime('09:30')).toBe(570);
    expect(parseClockTime('23:59')).toBe(1439);
    expect(parseClockTime('24:00')).toBeNull();
    expect(parseClockTime('9:30')).toBeNull();
    expect(parseClockTime('noon')).toBeNull();
    expect(parseClockTime(undefined)).toBeNull();
  });

  it('treats opening as inclusive and closing as exclusive', () => {
    const kitchen = restaurant();

    expect(getRestaurantAvailability(kitchen, atIst(10, 59))).toMatchObject({
      isOpen: false,
      localTime: '10:59',
    });
    expect(getRestaurantAvailability(kitchen, atIst(11, 0))).toMatchObject({
      isOpen: true,
      localTime: '11:00',
    });
    expect(getRestaurantAvailability(kitchen, atIst(14, 59)).isOpen).toBe(true);
    expect(getRestaurantAvailability(kitchen, atIst(15, 0)).isOpen).toBe(false);
  });

  it('supports opening hours that cross midnight', () => {
    const lateNight = restaurant({ openingTime: '22:00', closingTime: '02:00' });

    expect(getRestaurantAvailability(lateNight, atIst(21, 59)).isOpen).toBe(false);
    expect(getRestaurantAvailability(lateNight, atIst(22, 0)).isOpen).toBe(true);
    expect(getRestaurantAvailability(lateNight, atIst(23, 30)).isOpen).toBe(true);
    expect(getRestaurantAvailability(lateNight, atIst(0, 0, 16)).isOpen).toBe(true);
    expect(getRestaurantAvailability(lateNight, atIst(1, 59, 16)).isOpen).toBe(true);
    expect(getRestaurantAvailability(lateNight, atIst(2, 0, 16))).toMatchObject({
      isOpen: false,
      localTime: '02:00',
    });
    expect(getRestaurantAvailability(lateNight, atIst(12, 0, 16)).isOpen).toBe(false);
  });

  it('treats identical opening and closing times as a 24-hour period', () => {
    const allDay = restaurant({ openingTime: '00:00', closingTime: '00:00' });

    expect(getRestaurantAvailability(allDay, atIst(0, 0)).isOpen).toBe(true);
    expect(getRestaurantAvailability(allDay, atIst(3, 15)).isOpen).toBe(true);
    expect(getRestaurantAvailability(allDay, atIst(23, 59)).isOpen).toBe(true);
  });

  it('evaluates opening hours in the restaurant timezone, not the server timezone', () => {
    const newYork = restaurant({
      openingTime: '09:00',
      closingTime: '17:00',
      timezone: 'America/New_York',
    });

    // 14:00 UTC is 09:00 in New York during January (EST, UTC-5).
    expect(getRestaurantAvailability(newYork, new Date('2026-01-15T14:00:00Z'))).toMatchObject({
      isOpen: true,
      localTime: '09:00',
    });
    // 22:30 UTC is 17:30 in New York, after closing.
    expect(getRestaurantAvailability(newYork, new Date('2026-01-15T22:30:00Z'))).toMatchObject({
      isOpen: false,
      localTime: '17:30',
    });
    // The same instant is outside a Bengaluru restaurant's 09:00-17:00 hours.
    expect(
      getRestaurantAvailability(
        restaurant({ openingTime: '09:00', closingTime: '17:00' }),
        new Date('2026-01-15T14:00:00Z'),
      ).isOpen,
    ).toBe(false);
  });

  it('fails closed for inactive restaurants, invalid hours, and invalid timezones', () => {
    expect(getRestaurantAvailability(restaurant({ isActive: false }), atIst(12, 0))).toEqual({
      isOpen: false,
      localTime: null,
      reason: 'Restaurant is not active.',
    });
    expect(
      getRestaurantAvailability(restaurant({ openingTime: '11am' }), atIst(12, 0)),
    ).toMatchObject({ isOpen: false, reason: 'Opening hours are invalid.' });
    expect(
      getRestaurantAvailability(restaurant({ timezone: 'Mars/Olympus_Mons' }), atIst(12, 0)),
    ).toMatchObject({ isOpen: false, reason: 'Restaurant timezone is invalid.' });
    expect(getRestaurantAvailability(null, atIst(12, 0)).isOpen).toBe(false);
  });

  it('derives the order-number date stamp from the IST calendar day', () => {
    expect(getIstDateStamp(new Date('2026-01-15T18:29:00Z'))).toBe('20260115');
    expect(getIstDateStamp(new Date('2026-01-15T18:30:00Z'))).toBe('20260116');
    expect(getIstDateStamp(new Date('2026-01-15T00:00:00Z'))).toBe('20260115');
  });
});
