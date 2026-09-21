import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import { JWT_SECRET } from '../../../../lib/config';
import { ensureUserTwoFactorColumns } from '../../../../lib/schema';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard_template'
  });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Surface the real JWT error so we can see *why* it fails
      return NextResponse.json(
        {
          success: false,
          message: `Invalid token: ${e.name}: ${e.message}`,
        },
        { status: 401 }
      );
    }

    // Support both { userId } and legacy { id } payloads, and never pass undefined to SQL
    const userId = payload.userId ?? payload.id;
    if (userId == null) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const connection = await getConnection();
    await ensureUserTwoFactorColumns(connection);
    const [rows] = await connection.execute(
      'SELECT id, name, email, status, role, two_factor_enabled FROM users WHERE id = ?',
      [userId]
    );
    await connection.end();

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const user = rows[0];
    user.role = user.role || 'user';
    user.two_factor_enabled = !!user.two_factor_enabled;

    if (user.status !== 'active') {
      return NextResponse.json({ success: false, message: 'Account is suspended' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: { user } });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch user', error: error.message }, { status: 500 });
  }
}


