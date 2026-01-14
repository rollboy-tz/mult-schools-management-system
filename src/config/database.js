import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
    
    // Check if tables exist
    await checkAndCreateTables();
    
    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    throw error;
  }
};

const checkAndCreateTables = async () => {
  try {
    // Check if platform_users table exists
    const check = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'platform_users'
      )
    `);
    
    if (!check.rows[0].exists) {
      console.log('📝 Creating initial tables...');
      await createInitialTables();
    } else {
      console.log('✅ Database tables already exist');
    }
  } catch (error) {
    console.error('Error checking tables:', error);
  }
};

const createInitialTables = async () => {
  try {
    // Create platform_users table
    await pool.query(`
      CREATE TABLE platform_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        user_type VARCHAR(20) DEFAULT 'school_admin',
        full_name VARCHAR(255),
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        updated_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    console.log('✅ Created platform_users table');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

export { pool };