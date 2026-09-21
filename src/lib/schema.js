export async function ensureUserTwoFactorColumns(connection) {
  const requiredColumns = [
    {
      name: 'two_factor_secret',
      definition: 'VARCHAR(255) DEFAULT NULL',
    },
    {
      name: 'two_factor_enabled',
      definition: 'TINYINT(1) DEFAULT 0',
    },
    {
      name: 'two_factor_pending_secret',
      definition: 'VARCHAR(255) DEFAULT NULL',
    },
  ];

  for (const column of requiredColumns) {
    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = ?`,
      [column.name]
    );

    if (rows.length === 0) {
      await connection.execute(
        `ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`
      );
    }
  }
}
