const db = require('../config/database');
const bcrypt = require('bcryptjs');

class Worker {
  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT * FROM workers WHERE email = ? AND is_active = true',
      [email]
    );
    return rows[0];
  }
  
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  static async getAll() {
    const [rows] = await db.execute(
      `SELECT w.*, 
              COUNT(c.id) as assigned_count 
       FROM workers w 
       LEFT JOIN complaints c ON w.id = c.assigned_to AND c.status IN ('assigned', 'in progress')
       WHERE w.is_active = true
       GROUP BY w.id`
    );
    return rows;
  }
  
  static async getAssignedComplaints(workerId) {
    const [rows] = await db.execute(
      `SELECT c.*, u.name as user_name 
       FROM complaints c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.assigned_to = ? AND c.status IN ('assigned', 'in progress')`,
      [workerId]
    );
    return rows;
  }
}

module.exports = Worker;