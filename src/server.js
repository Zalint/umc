/**
 * HTTP Server Start
 * Entry point for the application
 */

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log('==============================================');
  console.log('  Gambia Election Results Collection System');
  console.log('==============================================');
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Server running on: http://localhost:${PORT}`);
  console.log(`  API available at: http://localhost:${PORT}/api`);
  console.log('==============================================');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

