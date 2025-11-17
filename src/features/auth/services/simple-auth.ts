/**
 * Simple Authentication Service
 *
 * Provides password-based lock screen functionality
 * No backend required - uses localStorage for persistence
 */

const AUTH_PASSWORD_HASH_KEY = 'auth_password_hash';
const AUTH_SESSION_TOKEN_KEY = 'auth_session_token';
const AUTH_LOCK_ENABLED_KEY = 'lock_screen_enabled';
const AUTH_SALT_KEY = 'auth_salt';

/**
 * Generate random salt for password hashing
 */
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create device salt
 */
function getDeviceSalt(): string {
  let salt = localStorage.getItem(AUTH_SALT_KEY);
  if (!salt) {
    salt = generateSalt();
    localStorage.setItem(AUTH_SALT_KEY, salt);
  }
  return salt;
}

/**
 * Hash password with salt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = getDeviceSalt();
  const saltedPassword = salt + password + salt;

  const encoder = new TextEncoder();
  const data = encoder.encode(saltedPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate session token
 */
function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Check if lock screen is enabled
 */
export function isLockEnabled(): boolean {
  return localStorage.getItem(AUTH_LOCK_ENABLED_KEY) === 'true';
}

/**
 * Enable lock screen
 */
export function enableLock(): void {
  localStorage.setItem(AUTH_LOCK_ENABLED_KEY, 'true');
}

/**
 * Disable lock screen
 */
export function disableLock(): void {
  localStorage.setItem(AUTH_LOCK_ENABLED_KEY, 'false');
  localStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
}

/**
 * Check if user has set a password
 */
export function hasPassword(): boolean {
  return !!localStorage.getItem(AUTH_PASSWORD_HASH_KEY);
}

/**
 * Set/Update password
 */
export async function setPassword(password: string): Promise<void> {
  if (!password || password.length < 4) {
    throw new Error('Password must be at least 4 characters');
  }

  const hash = await hashPassword(password);
  localStorage.setItem(AUTH_PASSWORD_HASH_KEY, hash);
  enableLock();
}

/**
 * Validate password
 */
export async function validatePassword(password: string): Promise<boolean> {
  const storedHash = localStorage.getItem(AUTH_PASSWORD_HASH_KEY);
  if (!storedHash) return false;

  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
}

/**
 * Check if user is authenticated (has valid session)
 */
export function isAuthenticated(): boolean {
  // If lock is not enabled, always authenticated
  if (!isLockEnabled()) return true;

  // Check for valid session token
  const token = localStorage.getItem(AUTH_SESSION_TOKEN_KEY);
  return !!token;
}

/**
 * Login with password
 */
export async function login(password: string): Promise<boolean> {
  const isValid = await validatePassword(password);

  if (isValid) {
    // Generate and store session token
    const token = generateSessionToken();
    localStorage.setItem(AUTH_SESSION_TOKEN_KEY, token);
    return true;
  }

  return false;
}

/**
 * Logout (clear session)
 */
export function logout(): void {
  localStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
}

/**
 * Clear all auth data (reset)
 */
export function clearAuthData(): void {
  localStorage.removeItem(AUTH_PASSWORD_HASH_KEY);
  localStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
  localStorage.removeItem(AUTH_LOCK_ENABLED_KEY);
  localStorage.removeItem(AUTH_SALT_KEY);
}

/**
 * Get auth status for debugging
 */
export function getAuthStatus(): {
  lockEnabled: boolean;
  hasPassword: boolean;
  isAuthenticated: boolean;
  hasSalt: boolean;
} {
  return {
    lockEnabled: isLockEnabled(),
    hasPassword: hasPassword(),
    isAuthenticated: isAuthenticated(),
    hasSalt: !!localStorage.getItem(AUTH_SALT_KEY)
  };
}
