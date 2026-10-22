require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'markaz_calendar',
  JWT_SECRET: process.env.JWT_SECRET || 'markaz_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DEFAULT_CALENDAR_QUOTA: parseInt(process.env.DEFAULT_CALENDAR_QUOTA || '100', 10)
};
