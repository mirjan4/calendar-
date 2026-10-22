const env = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  // Multer error handling
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum permitted limit.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
