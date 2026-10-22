const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+05:30' // Standard Indian Standard Time
});

// Test initial database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL database "${env.DB_NAME}" at ${env.DB_HOST}:${env.DB_PORT}`);
    connection.release();
  } catch (err) {
    console.error(`[Database Error] Could not connect to MySQL:`, err.message);
  }
}

testConnection();

module.exports = pool;
