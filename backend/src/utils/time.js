const formatterCache = new Map();

function getClockFormatter(timezone) {
  if (!formatterCache.has(timezone)) {
    formatterCache.set(
      timezone,
      new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    );
  }
  return formatterCache.get(timezone);
}

export function parseClockTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Availability is derived from persisted opening hours in the restaurant's
 * timezone. A period such as 18:00-02:00 crosses midnight and is open during
 * both the evening and the early hours of the next calendar day.
 */
export function getRestaurantAvailability(restaurant, now = new Date()) {
  if (!restaurant?.isActive) {
    return { isOpen: false, localTime: null, reason: 'Restaurant is not active.' };
  }

  const openingMinutes = parseClockTime(restaurant.openingTime);
  const closingMinutes = parseClockTime(restaurant.closingTime);

  if (openingMinutes === null || closingMinutes === null) {
    return { isOpen: false, localTime: null, reason: 'Opening hours are invalid.' };
  }

  try {
    const parts = getClockFormatter(restaurant.timezone || 'Asia/Kolkata').formatToParts(now);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    const localMinutes = hour * 60 + minute;
    const localTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    let isOpen;
    if (openingMinutes === closingMinutes) {
      isOpen = true; // Documented as a 24-hour opening period.
    } else if (openingMinutes < closingMinutes) {
      isOpen = localMinutes >= openingMinutes && localMinutes < closingMinutes;
    } else {
      // Crosses midnight, for example 18:00-02:00. Times before closing belong
      // to the opening period that began on the previous day.
      isOpen = localMinutes >= openingMinutes || localMinutes < closingMinutes;
    }

    return { isOpen, localTime, reason: null };
  } catch {
    return { isOpen: false, localTime: null, reason: 'Restaurant timezone is invalid.' };
  }
}

export function getIstDateStamp(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now).replaceAll('-', '');
}
