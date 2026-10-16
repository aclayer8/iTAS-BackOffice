export const PASSWORD_MIN_LENGTH = 12;
export const TEMPORARY_PASSWORD_MIN_LENGTH = 10;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/\d/.test(password)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character";
  return null;
}

export function validateTemporaryPassword(password: string): string | null {
  if (password.length < TEMPORARY_PASSWORD_MIN_LENGTH) return `Temporary password must be at least ${TEMPORARY_PASSWORD_MIN_LENGTH} characters`;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Temporary password must include uppercase, lowercase, number, and special character";
  }
  return null;
}
