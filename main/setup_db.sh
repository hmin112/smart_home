#!/bin/bash

echo "Starting MySQL Setup for Smart Home..."

# 1. Update and install MariaDB
echo "Installing MariaDB Server..."
sudo apt-get update
sudo apt-get install -y mariadb-server

# 2. Enable and start MariaDB service
echo "Enabling and starting MariaDB service..."
sudo systemctl enable mariadb
sudo systemctl start mariadb

# 3. Create database and table
echo "Setting up database and schema..."

sudo mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS smarthome;
USE smarthome;

CREATE TABLE IF NOT EXISTS device_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    status VARCHAR(10) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a user for the Node.js backend to connect
CREATE USER IF NOT EXISTS 'smartuser'@'localhost' IDENTIFIED BY 'smartpassword';
GRANT ALL PRIVILEGES ON smarthome.* TO 'smartuser'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "Database setup complete."
