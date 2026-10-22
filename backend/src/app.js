const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const locationRoutes = require('./routes/locationRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const unitAssignmentRoutes = require('./routes/unitAssignmentRoutes');
const importRoutes = require('./routes/importRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Markaz Student Registration API',
    version: '1.0.0'
  });
});

// Favicon Handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/admin/unit-assignments', unitAssignmentRoutes);
app.use('/api/admin/students/import', importRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/reports', reportRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint "${req.method} ${req.originalUrl}" not found.`
  });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
