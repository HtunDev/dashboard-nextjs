import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { requireAdminResponse } from '../../middleware/auth';
import { validatePassword } from '../../../../lib/passwordPolicy';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard_template'
  });
}

// GET /api/users/[id] - Get user by ID (admin only)
export async function GET(request, { params }) {
  const authError = await requireAdminResponse();
  if (authError) return authError;

  try {
    const { id } = await params;
    const connection = await getConnection();
    const [rows] = await connection.execute('SELECT id, name, email, status, role, created_at, updated_at FROM users WHERE id = ?', [id]);
    await connection.end();

    if (rows.length === 0) {
      // Treat already-deleted / missing users as a clean "not found" state
      return NextResponse.json({
        success: false,
        message: "User not found"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
      message: "User retrieved successfully"
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to retrieve user",
      error: error.message
    }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user (admin only; strong password if provided)
export async function PUT(request, { params }) {
  const authError = await requireAdminResponse();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, password, status, role: bodyRole } = body;

    const passwordError = validateIncomingPassword(password);
    if (passwordError) return passwordError;

    const connection = await getConnection();
    const [existingRows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      await connection.end();
      return NextResponse.json({
        success: false,
        message: "User not found"
      }, { status: 404 });
    }

    if (email && email !== existingRows[0].email) {
      const [emailCheck] = await connection.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailCheck.length > 0) {
        await connection.end();
        return NextResponse.json({
          success: false,
          message: "Email already taken by another user"
        }, { status: 409 });
      }
    }

    const newRole = bodyRole === 'admin' ? 'admin' : (bodyRole === 'user' ? 'user' : existingRows[0].role);
    const updateData = {
      name: name || existingRows[0].name,
      email: email || existingRows[0].email,
      status: status || existingRows[0].status,
      role: newRole
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await connection.execute(
      'UPDATE users SET name = ?, email = ?, status = ?, role = ?' + (password ? ', password = ?' : '') + ' WHERE id = ?',
      password
        ? [updateData.name, updateData.email, updateData.status, updateData.role, updateData.password, id]
        : [updateData.name, updateData.email, updateData.status, updateData.role, id]
    );

    const [updatedRows] = await connection.execute('SELECT id, name, email, status, role, created_at, updated_at FROM users WHERE id = ?', [id]);
    await connection.end();

    return NextResponse.json({
      success: true,
      data: updatedRows[0],
      message: "User updated successfully"
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to update user",
      error: error.message
    }, { status: 500 });
  }
}

function validateIncomingPassword(password) {
  if (!password) return null;
  const passwordCheck = validatePassword(password);
  if (passwordCheck.valid) return null;

  return NextResponse.json({
    success: false,
    message: passwordCheck.message
  }, { status: 400 });
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(request, { params }) {
  const authError = await requireAdminResponse();
  if (authError) return authError;

  try {
    const { id } = await params;
    const connection = await getConnection();

    // Check if user exists
    const [existingRows] = await connection.execute('SELECT id, name, email, status, role, created_at, updated_at FROM users WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      // Make delete idempotent: if user is already gone, respond success
      await connection.end();
      return NextResponse.json({
        success: true,
        data: null,
        message: "User already deleted"
      });
    }

    // Don't allow deleting the admin user
    if (existingRows[0].email === 'admin@example.com') {
      await connection.end();
      return NextResponse.json({
        success: false,
        message: "Cannot delete admin user"
      }, { status: 403 });
    }

    // Delete user
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    await connection.end();

    return NextResponse.json({
      success: true,
      data: existingRows[0],
      message: "User deleted successfully"
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to delete user",
      error: error.message
    }, { status: 500 });
  }
}
