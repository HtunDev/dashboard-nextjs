import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { requireAdminResponse } from '../../../middleware/auth';
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

// POST /api/users/[id]/reset-2fa - Reset user's 2FA (admin only). User will set up 2FA again on next login.
export async function POST(request, { params }) {
  const authError = await requireAdminResponse();
  if (authError) return authError;

  try {
    const { id } = await params;
    const connection = await getConnection();
    await ensureUserTwoFactorColumns(connection);

    const [rows] = await connection.execute(
      'SELECT id, name, email FROM users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      await connection.end();
      return NextResponse.json({
        success: false,
        message: 'User not found',
      }, { status: 404 });
    }

    await connection.execute(
      'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0, two_factor_pending_secret = NULL WHERE id = ?',
      [id]
    );
    await connection.end();

    return NextResponse.json({
      success: true,
      data: { id: rows[0].id, name: rows[0].name, email: rows[0].email },
      message: "User's authenticator has been reset. They will set up 2FA again on next login.",
    });
  } catch (error) {
    console.error('Reset 2FA error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to reset authenticator',
      error: error.message,
    }, { status: 500 });
  }
}
