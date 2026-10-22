const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT, () => {
  console.log(`========================================================`);
  console.log(` Markaz Registration & Calendar Distribution API Server `);
  console.log(` Environment: ${env.NODE_ENV}`);
  console.log(` Port:        ${env.PORT}`);
  console.log(` Database:    ${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT}`);
  console.log(` URL:         http://localhost:${env.PORT}`);
  console.log(`========================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
