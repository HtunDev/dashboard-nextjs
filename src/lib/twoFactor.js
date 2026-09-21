import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Dashboard';

/**
 * Generate a new TOTP secret for the user.
 * @returns {{ secret: string }}
 */
export function generateSecret() {
  return {
    secret: authenticator.generateSecret(),
  };
}

/**
 * Generate otpauth URL and QR code data URL for authenticator apps.
 * @param {string} email - User email (label)
 * @param {string} secret - TOTP secret
 * @returns {Promise<{ secret: string, qrCodeDataUrl: string, otpauthUrl: string }>}
 */
export async function getSetupQr(email, secret) {
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 });
  return { secret, qrCodeDataUrl, otpauthUrl };
}

/**
 * Verify a TOTP code against a secret.
 * @param {string} token - 6-digit code from authenticator app
 * @param {string} secret - User's TOTP secret
 * @returns {boolean}
 */
export function verifyToken(token, secret) {
  if (!token || !secret) return false;
  try {
    return authenticator.check(token.replace(/\s/g, ''), secret);
  } catch {
    return false;
  }
}
