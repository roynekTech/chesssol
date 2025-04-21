const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDbConnection() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to the database!');

    // Optional: run a simple query
    const [rows] = await connection.query('SELECT NOW() AS time');
    console.log('Current DB time:', rows[0].time);

    // Always release the connection
    connection.release();
    pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testDbConnection();
