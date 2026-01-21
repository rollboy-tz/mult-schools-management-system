//src/routes/health.js - COMPREHENSIVE HEALTH CHECK ROUTES

import express from 'express';
import axios from 'axios';
// import { emailService, checkEmailServiceHealth } from '../shared/services/email/index.js';
import { pool } from '../config/database.js';

const router = express.Router();

// ============================================
// 1. BASIC HEALTH CHECK
// ============================================
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'school-management-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    endpoints: {
      database: '/health/database',
      email: '/health/email',
      python: '/health/python',
      full: '/health/full',
      ping: '/health/ping'
    }
  });
});

// ============================================
// 2. DATABASE HEALTH CHECK
// ============================================
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const dbResult = await pool.query('SELECT NOW() as time, version() as version');
    const responseTime = Date.now() - startTime;
    
    // Get connection stats
    const poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };
    
    res.json({
      status: 'healthy',
      service: 'postgres-database',
      response_time: `${responseTime}ms`,
      database_time: dbResult.rows[0].time,
      postgres_version: dbResult.rows[0].version,
      connection_pool: poolStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      service: 'postgres-database',
      error: error.message,
      error_code: error.code,
      timestamp: new Date().toISOString(),
      suggestion: 'Check DATABASE_URL in .env file'
    });
  }
});

// ============================================
// 3. EMAIL SERVICE HEALTH CHECK
// ============================================
/*
router.get('/email', async (req, res) => {
  try {
    const emailHealth = await checkEmailServiceHealth();
    
    res.json({
      ...emailHealth,
      config: {
        sender: process.env.EMAIL_SENDER_NAME,
        provider: 'Resend',
        frontend_url: process.env.FRONTEND_URL ? 'Configured' : 'Not configured'
      }
    });
    
  } catch (error) {
    console.error('Email health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      service: 'email-service',
      error: error.message,
      timestamp: new Date().toISOString(),
      suggestion: 'Check RESEND_API_KEY in .env file'
    });
  }
});
*/
// ============================================
// 4. PYTHON API HEALTH CHECK
// ============================================
router.get('/python', async (req, res) => {
  try {
    const pythonApiUrl = process.env.PYTHON_API_URL || 'https://eduasas-python.onrender.com';
    const startTime = Date.now();
    
    console.log(`Checking Python API health: ${pythonApiUrl}`);
    
    const response = await axios.get(`${pythonApiUrl}/health`, {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'User-Agent': 'School-Management-System/1.0',
        'Accept': 'application/json',
        'X-Health-Check': 'true'
      },
      // Add auth token if configured
      ...(process.env.PYTHON_API_TOKEN && {
        headers: {
          ...(process.env.PYTHON_API_TOKEN && { 'Authorization': `Bearer ${process.env.PYTHON_API_TOKEN}` })
        }
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      service: 'python-api',
      response_time: `${responseTime}ms`,
      python_api_status: response.data,
      python_api_url: pythonApiUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Python API health check failed:', error.message);
    
    // Detailed error analysis
    let errorDetails = {
      service: 'python-api',
      timestamp: new Date().toISOString(),
      python_url: process.env.PYTHON_API_URL || 'https://eduasas-python.onrender.com'
    };
    
    if (error.code === 'ECONNREFUSED') {
      errorDetails = {
        ...errorDetails,
        status: 'unreachable',
        error: 'Connection refused - Python API may be down',
        error_code: 'ECONNREFUSED'
      };
    } else if (error.code === 'ETIMEDOUT') {
      errorDetails = {
        ...errorDetails,
        status: 'timeout',
        error: 'Request timeout - Python API is slow or unavailable',
        error_code: 'ETIMEDOUT',
        timeout_ms: 10000
      };
    } else if (error.response) {
      // Python API responded with error status
      errorDetails = {
        ...errorDetails,
        status: 'error_response',
        error: `Python API returned ${error.response.status}`,
        status_code: error.response.status,
        response_data: error.response.data
      };
    } else if (error.request) {
      // Request made but no response
      errorDetails = {
        ...errorDetails,
        status: 'no_response',
        error: 'No response from Python API',
        error_code: 'NO_RESPONSE'
      };
    } else {
      // Other errors
      errorDetails = {
        ...errorDetails,
        status: 'check_failed',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
    
    res.status(503).json(errorDetails);
  }
});

// ============================================
// 5. COMPREHENSIVE HEALTH CHECK (ALL SERVICES)
// ============================================
router.get('/full', async (req, res) => {
  const healthResults = {
    node_server: { 
      status: 'healthy', 
      uptime: process.uptime(),
      timestamp: new Date().toISOString() 
    },
    database: { status: 'checking' },
    email_service: { status: 'checking' },
    python_api: { status: 'checking' }
  };
  
  const startTime = Date.now();
  
  try {
    // Check database
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    healthResults.database = {
      status: 'healthy',
      response_time: `${Date.now() - dbStart}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (dbError) {
    healthResults.database = {
      status: 'unhealthy',
      error: dbError.message,
      timestamp: new Date().toISOString()
    };
  }
  /*
  try {
    // Check email service
    const emailStart = Date.now();
    const emailHealth = await checkEmailServiceHealth();
    healthResults.email_service = {
      ...emailHealth,
      response_time: `${Date.now() - emailStart}ms`
    };
  } catch (emailError) {
    healthResults.email_service = {
      status: 'unhealthy',
      error: emailError.message,
      timestamp: new Date().toISOString()
    };
  }
  */
  try {
    // Check Python API
    const pythonStart = Date.now();
    const pythonApiUrl = process.env.PYTHON_API_URL || 'https://eduasas-python.onrender.com';
    const response = await axios.get(`${pythonApiUrl}/health`, { timeout: 5000 });
    
    healthResults.python_api = {
      status: 'healthy',
      python_status: response.data,
      response_time: `${Date.now() - pythonStart}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (pythonError) {
    let errorMessage = 'Python API unreachable';
    if (pythonError.code === 'ECONNREFUSED') errorMessage = 'Connection refused';
    if (pythonError.code === 'ETIMEDOUT') errorMessage = 'Request timeout';
    
    healthResults.python_api = {
      status: 'unhealthy',
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
  }
  
  // Determine overall status
  const allHealthy = Object.values(healthResults).every(check => check.status === 'healthy');
  const totalTime = Date.now() - startTime;
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    total_check_time: `${totalTime}ms`,
    timestamp: new Date().toISOString(),
    checks: healthResults,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ============================================
// 6. SIMPLE PING ENDPOINT
// ============================================
router.get('/ping', (req, res) => {
  res.json({ 
    message: 'pong',
    timestamp: new Date().toISOString(),
    server_time: new Date().toLocaleString(),
    uptime: `${Math.floor(process.uptime())} seconds`
  });
});

// ============================================
// 7. DETAILED SERVICE STATUS
// ============================================
router.get('/detailed', async (req, res) => {
  const services = [
    { name: 'Node.js Server', status: 'healthy' },
    { name: 'PostgreSQL Database', status: 'checking' },
    { name: 'Email Service (Resend)', status: 'checking' },
    { name: 'Python API', status: 'checking' },
    { name: 'Environment', status: process.env.NODE_ENV || 'development' }
  ];
  
  try {
    await pool.query('SELECT 1');
    services[1].status = 'healthy';
  } catch {
    services[1].status = 'unhealthy';
  }
  
  /*
  try {
    const emailHealth = await checkEmailServiceHealth();
    services[2].status = emailHealth.status;
  } catch {
    services[2].status = 'unhealthy';
  }
  */
  
  try {
    const pythonApiUrl = process.env.PYTHON_API_URL || 'https://eduasas-python.onrender.com';
    await axios.get(`${pythonApiUrl}/health`, { timeout: 3000 });
    services[3].status = 'healthy';
  } catch {
    services[3].status = 'unhealthy';
  }
  
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalCount = services.length;
  
  res.json({
    overall: `${healthyCount}/${totalCount} services healthy`,
    services,
    environment_variables: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      database_url: process.env.DATABASE_URL ? 'Configured' : 'Missing',
      python_api_url: process.env.PYTHON_API_URL || 'Default',
      resend_api_key: process.env.RESEND_API_KEY ? 'Configured' : 'Missing'
    },
    system: {
      node_version: process.version,
      platform: process.platform,
      memory_usage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      uptime: `${Math.floor(process.uptime() / 60)} minutes`
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 8. READINESS CHECK (For Kubernetes/Deployments)
// ============================================
router.get('/ready', async (req, res) => {
  const readinessChecks = [];
  
  // Database readiness
  try {
    await pool.query('SELECT 1');
    readinessChecks.push({ service: 'database', status: 'ready' });
  } catch (error) {
    readinessChecks.push({ service: 'database', status: 'not_ready', error: error.message });
  }
  

  /*
  // Email service readiness (basic check)
  if (process.env.RESEND_API_KEY) {
    readinessChecks.push({ service: 'email', status: 'ready' });
  } else {
    readinessChecks.push({ service: 'email', status: 'not_ready', error: 'RESEND_API_KEY not configured' });
  }
  */

  const allReady = readinessChecks.every(check => check.status === 'ready');
  
  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    checks: readinessChecks,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 9. LIVENESS CHECK (Simple)
// ============================================
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// 10. CONFIGURATION CHECK (Safe - no secrets)
// ============================================
router.get('/config', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    cors_origins: process.env.ALLOWED_ORIGINS ? 'Configured' : 'Not configured',
    python_api: process.env.PYTHON_API_URL ? 'Configured' : 'Using default',
    email_service: process.env.RESEND_API_KEY ? 'Configured' : 'Not configured',
    database: process.env.DATABASE_URL ? 'Configured' : 'Missing',
    frontend_url: process.env.FRONTEND_URL || 'Not configured',
    timestamp: new Date().toISOString()
  });
});

export default router;


routes
// 1. Basic health
// http://localhost:3000/health

// 2. Database health
// http://localhost:3000/health/database

// 3. Email health
// http://localhost:3000/health/email

// 4. Python API health
// http://localhost:3000/health/python

// 5. Comprehensive check
// http://localhost:3000/health/full

// 6. Simple ping
// http://localhost:3000/health/ping

// 7. Readiness (for deployments)
// http://localhost:3000/health/ready