import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import { getSafeErrorResponse } from '../../../../utils/sanitizeError';
import { generateSecret, getSetupQr } from '../../../../lib/twoFactor';
import { ensureUserTwoFactorColumns } from '../../../../lib/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PENDING_2FA_EXPIRY = '5m';

// Create database connection
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard_template'
  });
}

// POST /api/auth/login - User login
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: "Email and password are required"
      }, { status: 400 });
    }

    // Find user by email in database
    const connection = await getConnection();
    await ensureUserTwoFactorColumns(connection);
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
    await connection.end();

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Invalid email or password"
      }, { status: 401 });
    }

    const user = rows[0];

    // Check user status
    if (user.status !== 'active') {
      return NextResponse.json({
        success: false,
        message: "Account is suspended"
      }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        message: "Invalid email or password"
      }, { status: 401 });
    }

    const pendingToken = jwt.sign(
      { userId: user.id, purpose: '2fa_pending' },
      JWT_SECRET,
      { expiresIn: PENDING_2FA_EXPIRY }
    );

    // If 2FA is enabled: require verify-2fa step (every login)
    const twoFactorEnabled = Number(user.two_factor_enabled) === 1 && !!user.two_factor_secret;
    if (twoFactorEnabled) {
      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        pendingToken,
        message: "Enter your authenticator code",
      });
    }

    // No 2FA yet: force setup on first login (mandatory 2FA for all users)
    const { secret } = generateSecret();
    const { qrCodeDataUrl } = await getSetupQr(user.email, secret);
    const conn = await getConnection();
    await conn.execute(
      'UPDATE users SET two_factor_pending_secret = ? WHERE id = ?',
      [secret, user.id]
    );
    await conn.end();

    return NextResponse.json({
      success: true,
      requiresTwoFactorSetup: true,
      pendingToken,
      qrCodeDataUrl,
      message: "Scan the QR code, then enter the code",
    });
  } catch (error) {
    console.error('Login error:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      getSafeErrorResponse(error, isProduction),
      { status: 500 }
    );
  }
}
