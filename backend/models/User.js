const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { name, email, password, phone, address } = userData;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await db.execute(
      `INSERT INTO users (name, email, password, phone, address, role) 
       VALUES (?, ?, ?, ?, ?, 'user')`,
      [name, email, hashedPassword, phone, address]
    );
    
    return this.findById(result.insertId);
  }
  
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, address, role, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }
  
  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }
  
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;