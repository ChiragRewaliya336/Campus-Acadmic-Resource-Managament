
CREATE DATABASE IF NOT EXISTS campus_db;

USE campus_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  user_id INT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  resource_id INT,
  file_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

INSERT INTO users (username, email, password_hash, role)
VALUES
  ('Main Admin', 'admin@campus.edu', '$2b$10$pnk6M4iRTxpsYUQHOZrfGequBPVOsvVqpgNNb4OcpMj1LKAk1rqtS', 'admin'),
  ('john_student', 'john@campus.edu', '$2b$10$eSF3OfH94f7ivJorYPHxHeCYhPR.eMUB76KrhoeNaPjDVeYMhO6mi', 'student')
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  role = VALUES(role);

INSERT INTO categories (name, created_by)
SELECT 'Lecture Notes', id FROM users WHERE email = 'admin@campus.edu'
UNION ALL
SELECT 'Assignments', id FROM users WHERE email = 'admin@campus.edu'
UNION ALL
SELECT 'Research Papers', id FROM users WHERE email = 'admin@campus.edu'
UNION ALL
SELECT 'Presentations', id FROM users WHERE email = 'admin@campus.edu'
UNION ALL
SELECT 'Books', id FROM users WHERE email = 'admin@campus.edu'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);
