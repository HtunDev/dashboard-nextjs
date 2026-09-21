import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getCurrentUserFromCookie } from '../../../middleware/auth';
import { generateSecret, getSetupQr } from '../../../../../lib/twoFactor';
import { ensureUserTwoFactorColumns } from '../../../../../lib/schema';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard_template',
  });
}

// GET /api/auth/2fa/setup - Generate 2FA secret and QR (authenticated)
export async function GET() {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const connection = await getConnection();
    await ensureUserTwoFactorColumns(connection);
    const [rows] = await connection.execute(
      'SELECT id, email, two_factor_enabled, two_factor_pending_secret FROM users WHERE id = ?',
      [user.id]
    );
    await connection.end();

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const u = rows[0];
    if (u.two_factor_enabled) {
      return NextResponse.json({
        success: false,
        message: 'Two-factor is already enabled. Disable it first to set up again.',
      }, { status: 400 });
    }

    const { secret } = generateSecret();
    const { qrCodeDataUrl, otpauthUrl } = await getSetupQr(u.email, secret);

    const conn = await getConnection();
    await ensureUserTwoFactorColumns(conn);
    await conn.execute(
      'UPDATE users SET two_factor_pending_secret = ? WHERE id = ?',
      [secret, user.id]
    );
    await conn.end();

    return NextResponse.json({
      success: true,
      data: {
        qrCodeDataUrl,
        secret,
        otpauthUrl,
        message: 'Scan the QR code with your authenticator app, then enter the code to enable 2FA.',
      },
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json({
      success: false,
      message: 'Setup failed',
      error: error.message,
    }, { status: 500 });
  }
}
