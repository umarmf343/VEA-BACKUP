-- Creating actual MySQL database schema for VEA Portal

CREATE DATABASE IF NOT EXISTS vea_portal;
USE vea_portal;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher', 'admin', 'super_admin', 'parent', 'accountant', 'librarian') NOT NULL,
  class_id INT NULL,
  student_id VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  level VARCHAR(50) NOT NULL,
  teacher_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  class_id INT NOT NULL,
  parent_email VARCHAR(255) NULL,
  date_of_birth DATE NULL,
  address TEXT NULL,
  phone VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_student_id (student_id),
  INDEX idx_class_id (class_id)
);

-- Report cards table
CREATE TABLE IF NOT EXISTS report_cards (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  admission_number VARCHAR(64) NULL,
  class_name VARCHAR(64) NOT NULL,
  term VARCHAR(32) NOT NULL,
  session VARCHAR(32) NOT NULL,
  status ENUM('draft', 'submitted', 'approved', 'revoked', 'published') DEFAULT 'submitted',
  teacher_id VARCHAR(64) NOT NULL,
  teacher_name VARCHAR(255) NULL,
  subjects_data JSON NOT NULL,
  affective_domain JSON NOT NULL,
  psychomotor_domain JSON NOT NULL,
  class_teacher_remarks TEXT NULL,
  total_obtained DECIMAL(10,2) DEFAULT 0,
  total_obtainable DECIMAL(10,2) DEFAULT 0,
  average DECIMAL(6,2) DEFAULT 0,
  position VARCHAR(32) DEFAULT '--',
  submitted_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME NULL,
  admin_feedback TEXT NULL,
  approvals JSON NOT NULL,
  metadata JSON NULL,
  UNIQUE KEY unique_student_term (student_id, term, session),
  INDEX idx_status (status),
  INDEX idx_class_term_session (class_name, term, session)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type VARCHAR(100) NOT NULL,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  reference VARCHAR(255) UNIQUE NOT NULL,
  paystack_reference VARCHAR(255) NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_reference (reference),
  INDEX idx_status (status)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_recipient (recipient_id),
  INDEX idx_created_at (created_at)
);

-- Library books table
CREATE TABLE IF NOT EXISTS library_books (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(50) NULL,
  category VARCHAR(100) NOT NULL,
  total_copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_title (title)
);

-- Book borrowing table
CREATE TABLE IF NOT EXISTS book_borrowings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  book_id INT NOT NULL,
  borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date DATE NOT NULL,
  returned_at TIMESTAMP NULL,
  status ENUM('borrowed', 'returned', 'overdue') DEFAULT 'borrowed',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_due_date (due_date)
);

-- Insert default admin user
INSERT IGNORE INTO users (email, password, name, role) VALUES 
('admin@victoryeducationalacademy.com.ng', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Super Admin', 'super_admin');

-- Insert sample classes
INSERT IGNORE INTO classes (name, level) VALUES 
('JSS 1A', 'Junior Secondary'),
('JSS 1B', 'Junior Secondary'),
('JSS 2A', 'Junior Secondary'),
('JSS 2B', 'Junior Secondary'),
('JSS 3A', 'Junior Secondary'),
('JSS 3B', 'Junior Secondary'),
('SS 1A', 'Senior Secondary'),
('SS 1B', 'Senior Secondary'),
('SS 2A', 'Senior Secondary'),
('SS 2B', 'Senior Secondary'),
('SS 3A', 'Senior Secondary'),
('SS 3B', 'Senior Secondary');
