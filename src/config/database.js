// config/database.js - DATABASE CONFIGURATION & CONNECTION MANAGEMENT
import pg from 'pg';
const { Pool } = pg;
import { databaseLogger } from '../shared/utils/logger.js';

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.connectionString = this.getConnectionString();
    this.initializePool();
  }

  // Get connection string from environment
  getConnectionString() {
    // Priority: DATABASE_URL > Individual parameters
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    // Build from individual parameters (if DATABASE_URL not provided)
    const dbConfig = {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'school_management',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT) || 5432,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

    return `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
  }

  // Initialize connection pool
  initializePool() {
    try {
      const config = {
        connectionString: this.connectionString,
        max: parseInt(process.env.DB_POOL_MAX) || 20,     // Maximum clients
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT) || 2000,
        ...(process.env.NODE_ENV === 'production' && {
          ssl: { 
            rejectUnauthorized: false,
            ...(process.env.DB_SSL_MODE && { sslmode: process.env.DB_SSL_MODE })
          }
        })
      };

      this.pool = new Pool(config);

      // Event listeners
      this.pool.on('connect', () => {
        databaseLogger.info('Database connection established');
      });

      this.pool.on('error', (err) => {
        databaseLogger.error('Unexpected database pool error:', err);
      });

      this.pool.on('remove', () => {
        databaseLogger.info('Database connection removed from pool');
      });

      databaseLogger.info('Database pool initialized successfully');
      
    } catch (error) {
      databaseLogger.error('Failed to initialize database pool:', error);
      throw error;
    }
  }

  // Get pool instance
  getPool() {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  // Execute query with error handling
  async query(text, params) {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      databaseLogger.debug('Database query executed', {
        query: text.substring(0, 100), // Log first 100 chars
        duration: `${duration}ms`,
        rowCount: result.rowCount
      });

      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      
      databaseLogger.error('Database query failed:', {
        error: error.message,
        query: text.substring(0, 200),
        params: params ? JSON.stringify(params) : 'none',
        duration: `${duration}ms`,
        code: error.code
      });

      // Enhanced error handling
      const dbError = this.handleDatabaseError(error);
      throw dbError;
    }
  }

  // Handle specific database errors
  handleDatabaseError(error) {
    const enhancedError = new Error(error.message);
    enhancedError.originalError = error;
    enhancedError.code = error.code;
    
    // Common PostgreSQL error codes
    switch (error.code) {
      case '23505': // unique_violation
        enhancedError.status = 409;
        enhancedError.message = 'Duplicate record found';
        break;
        
      case '23503': // foreign_key_violation
        enhancedError.status = 400;
        enhancedError.message = 'Referenced record does not exist';
        break;
        
      case '23502': // not_null_violation
        enhancedError.status = 400;
        enhancedError.message = 'Required field is missing';
        break;
        
      case '28P01': // invalid_password
        enhancedError.status = 401;
        enhancedError.message = 'Invalid database credentials';
        break;
        
      case '3D000': // invalid_database
        enhancedError.status = 500;
        enhancedError.message = 'Database does not exist';
        break;
        
      case '57P03': // cannot_connect_now
        enhancedError.status = 503;
        enhancedError.message = 'Database is starting up';
        break;
        
      case 'ECONNREFUSED':
        enhancedError.status = 503;
        enhancedError.message = 'Database connection refused';
        break;
        
      case 'ETIMEDOUT':
        enhancedError.status = 504;
        enhancedError.message = 'Database connection timeout';
        break;
        
      default:
        enhancedError.status = 500;
        enhancedError.message = 'Database operation failed';
    }
    
    return enhancedError;
  }

  // Check database connection
  async checkConnection() {
    try {
      const start = Date.now();
      await this.pool.query('SELECT 1 as health_check');
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString(),
        connectionString: this.maskConnectionString(this.connectionString)
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        suggestion: 'Check database connection parameters'
      };
    }
  }

  // Get pool statistics
  getPoolStats() {
    if (!this.pool) {
      return { error: 'Pool not initialized' };
    }
    
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      max: this.pool.options.max
    };
  }

  // Mask sensitive connection string for logging
  maskConnectionString(connectionString) {
    if (!connectionString) return 'Not configured';
    
    // Hide password in logs
    return connectionString.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@');
  }

  // Graceful shutdown
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        databaseLogger.info('Database pool closed gracefully');
      }
    } catch (error) {
      databaseLogger.error('Error closing database pool:', error);
    }
  }

  // Transaction helper
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
      
    } finally {
      client.release();
    }
  }

  // Migration/Setup helper
  async setupDatabase() {
    const setupQueries = [
      // Enable UUID extension if not exists
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
      
      // Create verification_codes table if not exists
      `CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        user_id UUID,
        school_id INTEGER,
        metadata JSONB,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_verification_email (email),
        INDEX idx_verification_code (code),
        INDEX idx_verification_expires (expires_at)
      );`
    ];

    try {
      for (const query of setupQueries) {
        await this.query(query);
      }
      databaseLogger.info('Database setup completed');
    } catch (error) {
      databaseLogger.error('Database setup failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();
export const pool = databaseManager.getPool();
export const query = databaseManager.query.bind(databaseManager);
export const transaction = databaseManager.transaction.bind(databaseManager);
export const checkConnection = databaseManager.checkConnection.bind(databaseManager);
export const getPoolStats = databaseManager.getPoolStats.bind(databaseManager);
export const close = databaseManager.close.bind(databaseManager);
export const setupDatabase = databaseManager.setupDatabase.bind(databaseManager);

// Default export
export default databaseManager;