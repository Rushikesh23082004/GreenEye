const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create connection without prepared statements for setup
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
});

async function setupDatabase() {
  try {
    console.log('🚀 Setting up GreenEye database...');
    
    // Create database (using callback style to avoid prepared statement issues)
    await new Promise((resolve, reject) => {
      connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'greeneye'}`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    console.log('✅ Database created/verified');
    
    // Switch to the database
    await new Promise((resolve, reject) => {
      connection.changeUser({ database: process.env.DB_NAME || 'greeneye' }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    console.log('✅ Database selected');
    
    // Create tables using multipleStatements
    const schemaSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(15),
        address TEXT,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      -- Workers table
      CREATE TABLE IF NOT EXISTS workers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(15),
        address TEXT,
        specialization VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Complaints table
      CREATE TABLE IF NOT EXISTS complaints (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NULL,
        user_name VARCHAR(100),
        user_email VARCHAR(100),
        user_phone VARCHAR(15),
        issue_type ENUM('garbage_overflow', 'sewer_water', 'toilet_cleaning', 'custom') NOT NULL,
        custom_issue VARCHAR(200),
        description TEXT,
        address TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        image_path VARCHAR(255),
        status ENUM('pending', 'assigned', 'in progress', 'completed', 'verified', 'rejected') DEFAULT 'pending',
        assigned_to INT,
        admin_notes TEXT,
        ml_verification JSON,
        before_image_path VARCHAR(255),
        after_image_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      -- IoT Bins data table
      CREATE TABLE IF NOT EXISTS iot_bins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        bin_id VARCHAR(50) NOT NULL,
        location VARCHAR(100) NOT NULL,
        fill_level DECIMAL(5,2) NOT NULL,
        distance DECIMAL(5,2) NOT NULL,
        status ENUM('normal', 'warning', 'critical') DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bin_id (bin_id),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status)
      );

      -- Feedback table
      CREATE TABLE IF NOT EXISTS feedback (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        complaint_id INT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await new Promise((resolve, reject) => {
      connection.query(schemaSQL, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    console.log('✅ Tables created successfully');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const workerPassword = await bcrypt.hash('worker123', 10);
    
    // Insert default data
    const dataSQL = `
      -- Insert default admin accounts
      INSERT IGNORE INTO users (name, email, password, role) VALUES 
      ('Admin One', 'admin1@greeneye.com', '${adminPassword}', 'admin'),
      ('Admin Two', 'admin2@greeneye.com', '${adminPassword}', 'admin');

      -- Insert default workers
      INSERT IGNORE INTO workers (name, email, password, phone, address, specialization) VALUES 
      ('Worker One', 'worker1@greeneye.com', '${workerPassword}', '9876543210', 'Area 1, City', 'Garbage Collection'),
      ('Worker Two', 'worker2@greeneye.com', '${workerPassword}', '9876543211', 'Area 2, City', 'Sewer Cleaning'),
      ('Worker Three', 'worker3@greeneye.com', '${workerPassword}', '9876543212', 'Area 3, City', 'Toilet Cleaning'),
      ('Worker Four', 'worker4@greeneye.com', '${workerPassword}', '9876543213', 'Area 4, City', 'General Cleaning');

      -- Insert sample IoT data
      INSERT IGNORE INTO iot_bins (bin_id, location, fill_level, distance, status) VALUES 
      ('bin-001', 'Main Street Area', 45.5, 27.3, 'normal');
    `;
    
    await new Promise((resolve, reject) => {
      connection.query(dataSQL, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    console.log('✅ Default data inserted successfully');
    
    console.log('\n🎉 Database setup completed!');
    console.log('\n📋 Default Login Credentials:');
    console.log('👨‍💼 Admins:');
    console.log('   admin1@greeneye.com / admin123');
    console.log('   admin2@greeneye.com / admin123');
    console.log('\n👷 Workers:');
    console.log('   worker1@greeneye.com / worker123');
    console.log('   worker2@greeneye.com / worker123');
    console.log('   worker3@greeneye.com / worker123');
    console.log('   worker4@greeneye.com / worker123');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Verify MySQL user has CREATE DATABASE privileges');
  } finally {
    connection.end();
  }
}

setupDatabase();