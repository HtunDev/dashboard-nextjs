import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import { verifyToken as verifyTotp } from '../../../../lib/twoFactor';
import { ensureUserTwoFactorColumns } from '../../../../lib/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PENDING_2FA_EXPIRY = '5m';

/** Parse User-Agent string into browser, os, deviceType (server-side fallback when client deviceInfo is missing) */
function parseUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return { browser: null, os: null, deviceType: null };
  const browser = detectBrowserFromUA(ua);
  const os = detectOSFromUA(ua);
  const deviceType = detectDeviceTypeFromUA(ua);
  return { browser, os, deviceType };
}

function detectBrowserFromUA(ua) {
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function detectOSFromUA(ua) {
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('iPhone') || ua.includes('iPod')) return 'iOS';
  return 'Unknown';
}

function detectDeviceTypeFromUA(ua) {
  const isMobileLike = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (!isMobileLike) return 'Desktop';
  const isTablet = ua.includes('iPad') || (ua.includes('Mac') && ua.includes('Mobile'));
  return isTablet ? 'Tablet' : 'Mobile';
}

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard_template',
  });
}

// POST /api/auth/verify-2fa - Verify 2FA code after login (every login / new device)
export async function POST(request) {
  try {
    const body = await request.json();
    const { pendingToken, code, deviceFingerprint, deviceInfo } = body;

    if (!pendingToken || !code) {
      return NextResponse.json({
        success: false,
        message: 'Verification code and pending token are required',
      }, { status: 400 });
    }

    let payload;
    try {
      payload = jwt.verify(pendingToken, JWT_SECRET, { maxAge: PENDING_2FA_EXPIRY });
    } catch (e) {
      return NextResponse.json({
        success: false,
        message: 'Session expired. Please sign in again.',
      }, { status: 401 });
    }

    if (payload.purpose !== '2fa_pending' || !payload.userId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid session.',
      }, { status: 401 });
    }

    // Find and validate the user for this 2FA code
    const result = await findAndValidateUser(payload.userId, code);
    if (result.error) return result.error;
    const user = result.value;

    await maybeEnableFirstTime2FA(user);
    await maybeRecordTrustedDevice(request, user, deviceFingerprint, deviceInfo);

    const role = user.role || 'user';
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const secureCookie =
      process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role, two_factor_enabled: true },
        token,
      },
      message: 'Login successful',
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error('Verify 2FA error:', error);
    return NextResponse.json({
      success: false,
      message: 'Verification failed',
      error: error.message,
    }, { status: 500 });
  }
}

async function findAndValidateUser(userId, code) {
  const connection = await getConnection();
  await ensureUserTwoFactorColumns(connection);
  const [rows] = await connection.execute(
    'SELECT id, name, email, role, two_factor_secret, two_factor_enabled, two_factor_pending_secret FROM users WHERE id = ?',
    [userId]
  );
  await connection.end();

  if (rows.length === 0) {
    return {
      error: NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 401 }
      ),
    };
  }

  const user = rows[0];
  let secretToVerify = user.two_factor_secret;

  if (user.two_factor_pending_secret) {
    secretToVerify = user.two_factor_pending_secret;
  } else if (!user.two_factor_enabled || !user.two_factor_secret) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Two-factor is not enabled for this account' },
        { status: 400 }
      ),
    };
  }

  const isValid = verifyTotp(code, secretToVerify);
  if (!isValid) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 401 }
      ),
    };
  }

  return { value: user };
}

async function maybeEnableFirstTime2FA(user) {
  if (!user.two_factor_pending_secret) return;
  const conn = await getConnection();
  await ensureUserTwoFactorColumns(conn);
  await conn.execute(
    'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1, two_factor_pending_secret = NULL WHERE id = ?',
    [user.two_factor_pending_secret, user.id]
  );
  await conn.end();
}

async function maybeRecordTrustedDevice(request, user, deviceFingerprint, deviceInfo) {
  if (!deviceFingerprint || String(deviceFingerprint).length === 0) return;

  let conn;
  try {
    conn = await getConnection();
    const fp = String(deviceFingerprint).substring(0, 255);
    const uaHeader = request.headers.get('user-agent') || request.headers.get('User-Agent');
    const fallback = parseUserAgent(uaHeader);
    const browser = (deviceInfo?.browser || fallback.browser)
      ? String(deviceInfo?.browser || fallback.browser).substring(0, 100)
      : null;
    const os = (deviceInfo?.os || fallback.os)
      ? String(deviceInfo?.os || fallback.os).substring(0, 100)
      : null;
    const deviceType = (deviceInfo?.deviceType || fallback.deviceType)
      ? String(deviceInfo?.deviceType || fallback.deviceType).substring(0, 50)
      : null;

    await conn.execute(
      `INSERT INTO user_trusted_devices (user_id, device_fingerprint, browser, os, device_type)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE browser = VALUES(browser), os = VALUES(os), device_type = VALUES(device_type)`,
      [user.id, fp, browser, os, deviceType]
    );
  } finally {
    if (conn) await conn.end();
  }
}
