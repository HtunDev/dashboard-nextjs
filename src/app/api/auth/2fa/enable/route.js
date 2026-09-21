import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getCurrentUserFromCookie } from '../../../middleware/auth';
import { verifyToken as verifyTotp } from '../../../../../lib/twoFactor';
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

// POST /api/auth/2fa/enable - Verify code and enable 2FA (authenticated)
export async function POST(request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;
    if (!code) {
      return NextResponse.json({
        success: false,
        message: 'Verification code is required',
      }, { status: 400 });
    }

    const connection = await getConnection();
    await ensureUserTwoFactorColumns(connection);
    const [rows] = await connection.execute(
      'SELECT id, two_factor_pending_secret FROM users WHERE id = ?',
      [user.id]
    );
    await connection.end();

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const u = rows[0];
    if (!u.two_factor_pending_secret) {
      return NextResponse.json({
        success: false,
        message: 'No pending 2FA setup. Start setup first (GET /api/auth/2fa/setup).',
      }, { status: 400 });
    }

    const isValid = verifyTotp(code, u.two_factor_pending_secret);
    if (!isValid) {
      return NextResponse.json({
        success: false,
        message: 'Invalid verification code',
      }, { status: 401 });
    }

    const conn = await getConnection();
    await ensureUserTwoFactorColumns(conn);
    await conn.execute(
      'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1, two_factor_pending_secret = NULL WHERE id = ?',
      [u.two_factor_pending_secret, user.id]
    );
    await conn.end();

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication enabled. You will need your authenticator code on every login and logout.',
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json({
      success: false,
      message: 'Enable failed',
      error: error.message,
    }, { status: 500 });
  }
}
