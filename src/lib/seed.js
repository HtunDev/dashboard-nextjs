import bcrypt from 'bcryptjs';
import pool from './database.js';

/**
 * Seed database with essential data only.
 * Creates the default admin user required for first login.
 * @param {{ closePool?: boolean }} options - Closes the pool when true.
 */
export async function seedDatabase(options = {}) {
  const { closePool = false } = options;
  console.log('Seeding database...\n');

  try {
    const connection = await pool.getConnection();
    const adminPassword = 'password';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await connection.execute(
      `INSERT INTO users (name, email, password, status, role)
       VALUES (?, ?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE name=name, role='admin'`,
      ['Admin User', 'admin@example.com', hashedPassword, 'active']
    );

    connection.release();
    console.log('Admin user ready');
    console.log('   Email: admin@example.com');
    console.log('   Password: password');
    console.log('   IMPORTANT: Change this password after first login!\n');
    console.log('Seeding completed!');

    if (closePool) await pool.end();
    return true;
  } catch (error) {
    console.error('Seeding failed:', error.message);
    if (closePool) await pool.end().catch(() => {});
    return false;
  }
}

export default seedDatabase;
