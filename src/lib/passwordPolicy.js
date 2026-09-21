/**
 * Strong password policy for all accounts.
 * Requirements: min 8 chars, at least one uppercase, one lowercase, one number, one special character.
 */
const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_LENGTH} characters.` };
  }
  if (!HAS_UPPERCASE.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!HAS_LOWERCASE.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!HAS_NUMBER.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  if (!HAS_SPECIAL.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.).' };
  }
  return { valid: true, message: null };
}
