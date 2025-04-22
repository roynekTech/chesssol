// // db.js
// const mysql = require('mysql2/promise');
// require('dotenv').config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
// //   connectionLimit: 10,
// //   queueLimit: 0
// });

// async function query(sql, params) {
//   const connection = await pool.getConnection();
//   try {
//     const [results] = await connection.execute(sql, params);
//     return results;
//   } finally {
//     connection.release();
//   }
// }

// module.exports = {
//   query,
//   pool
// };
// require('dotenv').config();
require('dotenv').config({ path: __dirname + '/.env' });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // waitForConnections: true,
  // connectionLimit: 10,
  // queueLimit: 0
});

// console.log('ENV:', {
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME
// });


async function getDbConnection() {
  return await pool.getConnection();
}

module.exports = { getDbConnection };
