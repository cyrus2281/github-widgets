/**
 * GitHub Widgets - Standalone Express Server
 * 
 * This server provides an alternative deployment option to Netlify Functions,
 * allowing the GitHub Widgets API to run on any Node.js hosting platform.
 * 
 * Features:
 * - 100% compatible with existing Netlify Function handlers
 * - CORS support for cross-origin requests
 * - Static file serving from public/ directory
 * - Health check endpoint
 * - Graceful shutdown handling
 * - Comprehensive error handling
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import routes from './routes.js';

// Load environment variables from .env file
dotenv.config();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// Middleware Configuration
// ============================================================================

// CORS - Allow all origins for public API
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Parse JSON request bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ============================================================================
// Static Files
// ============================================================================

// Serve static files from public/ directory (e.g., index.html)
app.use(express.static(join(__dirname, '../public')));

// ============================================================================
// Health Check Endpoint
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      githubTokenConfigured: !!process.env.GITHUB_TOKEN,
      lockedUser: process.env.LOCK_GITHUB_USER || null
    }
  });
});

// ============================================================================
// API Routes
// ============================================================================

// Mount API routes under /api prefix
app.use('/api', routes);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler for non-API routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    availableEndpoints: [
      '/health',
      '/api/v1/user-stats.svg',
      '/api/v1/repository-card.svg',
      '/api/v1/most-starred.svg',
      '/api/v1/timeseries-history.svg',
      '/api/v1/experience-timeline.svg'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Check if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Send error response
  res.status(err.statusCode || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 GitHub Widgets Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API endpoints: http://localhost:${PORT}/api/v1/`);
  console.log('='.repeat(60));
  console.log('Available endpoints:');
  console.log(`  • GET /api/v1/user-stats.svg`);
  console.log(`  • GET /api/v1/repository-card.svg`);
  console.log(`  • GET /api/v1/most-starred.svg`);
  console.log(`  • GET /api/v1/timeseries-history.svg`);
  console.log(`  • GET /api/v1/experience-timeline.svg`);
  console.log('='.repeat(60));
  console.log(`🔑 GitHub Token: ${process.env.GITHUB_TOKEN ? '✓ Configured' : '✗ Missing'}`);
  if (process.env.LOCK_GITHUB_USER) {
    console.log(`🔒 Locked to user: ${process.env.LOCK_GITHUB_USER}`);
  }
  console.log('='.repeat(60));
  console.log('Press Ctrl+C to stop the server');
  console.log('='.repeat(60));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Handle graceful shutdown on SIGTERM or SIGINT
 */
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('✓ HTTP server closed');
    console.log('✓ All connections closed');
    console.log('👋 Server shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
