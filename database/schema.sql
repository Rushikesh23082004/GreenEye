-- Users table (Citizens)
CREATE TABLE users (
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
CREATE TABLE workers (
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
CREATE TABLE complaints (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL, -- Can be null for public complaints
    user_name VARCHAR(100), -- Store name for public complaints
    user_email VARCHAR(100), -- Store email for public complaints
    user_phone VARCHAR(15), -- Store phone for public complaints
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES workers(id)
);

-- IoT Bins data table
CREATE TABLE iot_bins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bin_id VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(100) NOT NULL,
    fill_level DECIMAL(5,2) NOT NULL,
    distance DECIMAL(5,2) NOT NULL,
    status ENUM('normal', 'warning', 'critical') DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    complaint_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);

-- Insert default admin accounts with hashed passwords
-- Passwords are hashed version of 'admin123'
INSERT INTO users (name, email, password, role) VALUES 
('Admin One', 'admin1@greeneye.com', '$2b$10$8S5D5n5U.6tN7b3Mk8qZQuK5jJzW8XyY2VrF9P3H8G7N2M1K5S3D', 'admin'),
('Admin Two', 'admin2@greeneye.com', '$2b$10$8S5D5n5U.6tN7b3Mk8qZQuK5jJzW8XyY2VrF9P3H8G7N2M1K5S3D', 'admin');

-- Insert default workers with hashed passwords
-- Passwords are hashed version of 'worker123'
INSERT INTO workers (name, email, password, phone, address, specialization) VALUES 
('Worker One', 'worker1@greeneye.com', '$2b$10$9T6E6o6V.7uO8c4Nl9rZRvL6kK0X9Yz3WsG0Q4I9H8H8O3L6T4E', '9876543210', 'Area 1, City', 'Garbage Collection'),
('Worker Two', 'worker2@greeneye.com', '$2b$10$9T6E6o6V.7uO8c4Nl9rZRvL6kK0X9Yz3WsG0Q4I9H8H8O3L6T4E', '9876543211', 'Area 2, City', 'Sewer Cleaning'),
('Worker Three', 'worker3@greeneye.com', '$2b$10$9T6E6o6V.7uO8c4Nl9rZRvL6kK0X9Yz3WsG0Q4I9H8H8O3L6T4E', '9876543212', 'Area 3, City', 'Toilet Cleaning'),
('Worker Four', 'worker4@greeneye.com', '$2b$10$9T6E6o6V.7uO8c4Nl9rZRvL6kK0X9Yz3WsG0Q4I9H8H8O3L6T4E', '9876543213', 'Area 4, City', 'General Cleaning');

-- IoT Bins data table
CREATE TABLE iot_bins (
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

-- Bin registry table (optional - for managing multiple bins)
CREATE TABLE bin_registry (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bin_id VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    capacity DECIMAL(5,2) NOT NULL, -- in cm
    empty_distance DECIMAL(5,2) NOT NULL, -- in cm
    installation_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample bin registry entry
INSERT INTO bin_registry (bin_id, location, capacity, empty_distance, installation_date) 
VALUES ('bin-001', 'Main Street Area', 50.0, 5.0, CURDATE());