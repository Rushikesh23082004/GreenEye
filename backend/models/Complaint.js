const db = require('../config/database');

class Complaint {
  static async create(complaintData) {
    const {
      userId, userName, userEmail, userPhone, issueType, description, 
      address, latitude, longitude, imagePath, customIssue
    } = complaintData;
    
    const [result] = await db.execute(
      `INSERT INTO complaints (user_id, user_name, user_email, user_phone, issue_type, description, address, latitude, longitude, image_path, custom_issue, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, userName, userEmail, userPhone, issueType, description, address, latitude, longitude, imagePath, customIssue]
    );
    
    return this.findById(result.insertId);
  }
  
  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT c.*, u.name as user_name, u.email as user_email, 
              w.name as worker_name, w.email as worker_email
       FROM complaints c 
       LEFT JOIN users u ON c.user_id = u.id 
       LEFT JOIN workers w ON c.assigned_to = w.id 
       WHERE c.id = ?`,
      [id]
    );
    return rows[0];
  }
  
  static async getAll() {
    const [rows] = await db.execute(
      `SELECT c.*, u.name as user_name, w.name as worker_name 
       FROM complaints c 
       LEFT JOIN users u ON c.user_id = u.id 
       LEFT JOIN workers w ON c.assigned_to = w.id 
       ORDER BY c.created_at DESC`
    );
    return rows;
  }
  
  static async updateStatus(id, updateData) {
    const { status, assignedTo, adminNotes } = updateData;
    
    const [result] = await db.execute(
      `UPDATE complaints SET status = ?, assigned_to = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, assignedTo, adminNotes, id]
    );
    
    return this.findById(id);
  }
  
  static async getStats() {
    const [rows] = await db.execute(`
      SELECT 
        COUNT(*) as totalComplaints,
        SUM(status = 'pending') as pendingComplaints,
        SUM(status = 'completed') as completedComplaints,
        SUM(status = 'verified') as verifiedComplaints,
        SUM(status = 'rejected') as rejectedComplaints
      FROM complaints
    `);
    return rows[0];
  }
}

module.exports = Complaint;