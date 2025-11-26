/**
 * Global Error Handler Middleware
 * Centralized error handling for the application
 */

const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Default error status and message
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  // Handle specific error types
  
  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        status = 409;
        message = 'A record with this value already exists';
        break;
      case '23503': // Foreign key violation
        status = 400;
        message = 'Referenced record does not exist';
        break;
      case '23502': // Not null violation
        status = 400;
        message = 'Required field is missing';
        break;
      case '22P02': // Invalid text representation
        status = 400;
        message = 'Invalid data format';
        break;
      case '42P01': // Undefined table
        status = 500;
        message = 'Database configuration error';
        break;
    }
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Authentication token has expired';
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
  }
  
  // Send error response
  res.status(status).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      error: {
        message: err.message,
        stack: err.stack
      }
    })
  });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
};

module.exports = {
  errorHandler,
  notFound
};

