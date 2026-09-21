import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// POST /api/auth/logout - User logout (no 2FA required; 2FA is only for login)
export async function POST() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful',
    });

    // Clear the HTTP-only cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      message: 'Logout failed',
      error: error.message,
    }, { status: 500 });
  }
}
