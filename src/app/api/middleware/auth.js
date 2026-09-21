import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '../../../lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token (Bearer header)
export function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Get current user from HTTP-only cookie (for dashboard API routes). Returns { id, role, ... } or null.
export async function getCurrentUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId ?? decoded.id;
    if (userId == null) return null;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [userId]
    );
    connection.release();
    if (rows.length === 0) return null;
    const user = rows[0];
    user.role = user.role || 'user';
    return user;
  } catch (error) {
    return null;
  }
}

// Require admin role (use in API routes). Returns NextResponse (403/401) or null if allowed.
export async function requireAdminResponse() {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
  }
  return null;
}

// Middleware to check authentication
export function requireAuth(request) {
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json({
      success: false,
      message: "Authentication required"
    }, { status: 401 });
  }
  return user;
}

// Middleware to check admin role (Bearer token; for programmatic API use)
export function requireAdmin(request) {
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json({
      success: false,
      message: "Authentication required"
    }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({
      success: false,
      message: "Admin access required"
    }, { status: 403 });
  }
  return user;
}
