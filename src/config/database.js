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
  // We'll add table creation here step by step
  console.log('Creating tables... (Phase 1: User Management)');
  // We'll implement this in next step
};

export { pool };