const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config();

// Create MySQL connection pool
const createConnectionPool = () => {
  try {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    
    // Check if all required variables are present
    if (!DB_HOST || !DB_NAME) {
      console.warn('Database configuration is incomplete. Using file storage instead.');
      return null;
    }
    
    return mysql.createPool({
      host: DB_HOST,
      port: DB_PORT || 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } catch (error) {
    console.warn('Error creating database connection pool:', error.message);
    console.warn('Using file storage instead.');
    return null;
  }
};

// Connect to MySQL database
const connectToDatabase = async () => {
  try {
    const pool = createConnectionPool();
    
    // If pool creation failed, use file storage instead
    if (!pool) {
      console.log('Database connection not available, using file storage instead.');
      return null;
    }
    
    // Test the connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully');
    connection.release();
    
    // Return the pool for reuse
    return pool;
  } catch (error) {
    console.warn('Error connecting to MySQL database:', error.message);
    console.warn('Using file storage instead.');
    return null;
  }
};

module.exports = {
  connectToDatabase,
  createConnectionPool
}; 