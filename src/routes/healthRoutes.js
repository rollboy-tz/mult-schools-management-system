//routes/healthRoutes.js

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Health check ya local server
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'school-management-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check ya database
router.get('/database', async (req, res) => {
  try {
    const { pool } = await import('../config/database.js');
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      service: 'postgres-database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'postgres-database',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check ya Python API (bila token)
router.get('/python', async (req, res) => {
  try {
    const pythonApiUrl = process.env.PYTHON_API_URL || 'https://eduasas-python.onrender.com';
    
    const response = await axios.get(`${pythonApiUrl}/health`, {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'User-Agent': 'School-Management-System/1.0'
      }
    });
    
    res.json({
      status: 'healthy',
      service: 'python-api',
      python_api_status: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Check specific error types
    let errorMessage = 'Python API unreachable';
    let statusCode = 503;
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Python API connection refused';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Python API request timeout';
    } else if (error.response) {
      // Python API returned error status
      errorMessage = `Python API returned ${error.response.status}`;
      statusCode = error.response.status;
    } else if (error.request) {
      errorMessage = 'No response from Python API';
    } else {
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({
      status: 'unhealthy',
      service: 'python-api',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      ...(error.response && { python_response: error.response.data })
    });
  }
});

// Comprehensive health check
router.get('/full', async (req, res) => {
  const healthChecks = {
    node_server: { status: 'healthy', timestamp: new Date().toISOString() },
    database: { status: 'checking' },
    python_api: { status: 'checking' }
  };
  
  try {
    // Check database
    const { pool } = await import('../config/database.js');
    await pool.query('SELECT 1');
    healthChecks.database = { 
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  } catch (dbError) {
    healthChecks.database = {
      status: 'unhealthy',
      error: dbError.message,
      timestamp: new Date().toISOString()
    };
  }
  
  try {
    // Check Python API
    const pythonApiUrl = process.env.PYTHON_API_URL || 'https://eduasas-python.onrender.com';
    const response = await axios.get(`${pythonApiUrl}/health`, { timeout: 5000 });
    
    healthChecks.python_api = {
      status: 'healthy',
      python_status: response.data,
      timestamp: new Date().toISOString()
    };
  } catch (pyError) {
    healthChecks.python_api = {
      status: 'unhealthy',
      error: pyError.message,
      timestamp: new Date().toISOString()
    };
  }
  
  // Determine overall status
  const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: healthChecks
  });
});

// Simple ping endpoint
router.get('/ping', (req, res) => {
  res.json({ 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

export default router;