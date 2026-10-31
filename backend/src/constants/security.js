// Central password policy. Keeping it in one place makes it easy to strengthen
// later without changing registration and password-change rules independently.
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt only considers the first 72 bytes.
export const BCRYPT_ROUNDS = 10;
