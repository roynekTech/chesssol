// db.js
require('dotenv').config({ path: __dirname + '/.env' });
const mysql = require('mysql2/promise');

// Define connection limit here to reuse
const connectionLimit = 10;

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0
});

/**
 * Safe wrapper for SQL queries
 */
async function query(sql, params = [], timeoutMs = 10000) {
  const conn = await pool.getConnection();
  try {
    const [results] = await conn.query({ sql, timeout: timeoutMs }, params);
    return results;
  } catch (err) {
    console.error('Database error:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Get current connection pool stats
 */
function getPoolStats() {
  const used = pool._acquiredConnections?.length || 0;
  return {
    used,
    available: connectionLimit - used,
    max: connectionLimit
  };
}

module.exports = {
  query,
  pool,
  getPoolStats
};


// require('dotenv').config({ path: __dirname + '/.env' });

// const mysql = require('mysql2/promise');

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10, // You can increase if needed
//   queueLimit: 0
// });

// /**
//  * Safe wrapper to run MySQL queries with automatic connection handling.
//  * @param {string} sql - The SQL query
//  * @param {Array} params - Query parameters
//  * @param {number} timeoutMs - Optional timeout in milliseconds (default: 10s)
//  * @returns {Promise<any>} Query result
//  */
// async function query(sql, params = [], timeoutMs = 10000) {
//   const conn = await pool.getConnection();
//   try {
//     const [results] = await conn.query({ sql, timeout: timeoutMs }, params);
//     return results;
//   } catch (err) {
//     console.error('Database error:', err.message);
//     throw err;
//   } finally {
//     conn.release();
//   }
// }

// // async function getDbConnection() {
// //   return await pool.getConnection();
// // }

// module.exports = {
//   query,
//   pool, // Exported in case you need raw access
// };




// //db.js
// // require('dotenv').config();
// require('dotenv').config({ path: __dirname + '/.env' });

// const mysql = require('mysql2/promise');

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   // waitForConnections: true,
//   // connectionLimit: 10,
//   // queueLimit: 0
// });

// // console.log('ENV:', {
// //   host: process.env.DB_HOST,
// //   user: process.env.DB_USER,
// //   password: process.env.DB_PASSWORD,
// //   database: process.env.DB_NAME
// // });




// module.exports = { getDbConnection };
