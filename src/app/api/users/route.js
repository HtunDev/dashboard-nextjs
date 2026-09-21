import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import pool from '../../../lib/database';
import { requireAdminResponse } from '../middleware/auth';
import { validatePassword } from '../../../lib/passwordPolicy';
import { ensureUserTwoFactorColumns } from '../../../lib/schema';

// GET /api/users - Get all users (admin only)
export async function GET(request) {
  const authError = await requireAdminResponse();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const rawPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = Number.parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status');
    const isAdmin = true; // Only admins reach this handler
    const defaultStatus = isAdmin ? null : 'active';
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 10;

    const connection = await pool.getConnection();
    await ensureUserTwoFactorColumns(connection);
    
    let query = 'SELECT id, name, email, status, role, two_factor_enabled, created_at, updated_at FROM users';
    let params = [];
    
    // Filter by status only if specified or if not admin (frontend gets active only)
    const finalStatus = status || defaultStatus;
    if (finalStatus) {
      query += ' WHERE status = ?';
      params.push(finalStatus);
    }
    
    query += ' ORDER BY id DESC';
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const [rows] = await connection.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let countParams = [];
    if (finalStatus) {
      countQuery += ' WHERE status = ?';
      countParams.push(finalStatus);
    }
    
    const [countResult] = await connection.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    connection.release();

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      message: "Users retrieved successfully"
    });
  } catch (error) {
    console.error('[GET /api/users] Error:', error?.message, {
      stack: error?.stack
    });
    return NextResponse.json({
      success: false,
      message: "Failed to retrieve users",
      error: error.message
    }, { status: 500 });
  }
}

// POST /api/users - Register new user (admin only, strong password required)
export async function POST(request) {
  const authError = await requireAdminResponse();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, email, password, role: bodyRole } = body;

    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        message: "Missing required fields: name, email, password"
      }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({
        success: false,
        message: passwordCheck.message
      }, { status: 400 });
    }

    // Determine role with admin limit enforcement (max 2 admins)
    const connection = await pool.getConnection();
    await ensureUserTwoFactorColumns(connection);

    let role = bodyRole === 'admin' ? 'admin' : 'user';
    if (role === 'admin') {
      const [adminCountRows] = await connection.execute(
        'SELECT COUNT(*) as adminCount FROM users WHERE role = ?',
        ['admin']
      );
      const adminCount = adminCountRows?.[0]?.adminCount ?? 0;
      if (adminCount >= 2) {
        connection.release();
        return NextResponse.json({
          success: false,
          message: "Admin user limit reached (maximum 2 admins allowed)"
        }, { status: 400 });
      }
    }

    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      connection.release();
      return NextResponse.json({
        success: false,
        message: "User with this email already exists"
      }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password, status, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'active', role]
    );
    const [newUser] = await connection.execute('SELECT id, name, email, status, role, created_at FROM users WHERE id = ?', [result.insertId]);
    connection.release();

    return NextResponse.json({
      success: true,
      data: newUser[0],
      message: "User registered successfully"
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to register user",
      error: error.message
    }, { status: 500 });
  }
}
