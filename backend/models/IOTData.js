const db = require('../config/database');

class IOTData {
  static async create(binData) {
    const { binId, location, fillLevel, distance, status } = binData;
    
    const [result] = await db.execute(
      `INSERT INTO iot_bins (bin_id, location, fill_level, distance, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [binId, location, fillLevel, distance, status]
    );
    
    return this.findById(result.insertId);
  }
  
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM iot_bins WHERE id = ?',
      [id]
    );
    return rows[0];
  }
  
  static async findLatestByBinId(binId) {
    const [rows] = await db.execute(
      `SELECT * FROM iot_bins 
       WHERE bin_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [binId]
    );
    return rows[0];
  }
  
  static async findLatestStatus() {
    const [rows] = await db.execute(
      `SELECT ib1.* 
       FROM iot_bins ib1
       INNER JOIN (
         SELECT bin_id, MAX(created_at) as latest_date
         FROM iot_bins 
         GROUP BY bin_id
       ) ib2 ON ib1.bin_id = ib2.bin_id AND ib1.created_at = ib2.latest_date
       ORDER BY ib1.created_at DESC`
    );
    return rows;
  }
  
  static async getCriticalBins() {
    const [rows] = await db.execute(
      `SELECT ib1.* 
       FROM iot_bins ib1
       INNER JOIN (
         SELECT bin_id, MAX(created_at) as latest_date
         FROM iot_bins 
         GROUP BY bin_id
       ) ib2 ON ib1.bin_id = ib2.bin_id AND ib1.created_at = ib2.latest_date
       WHERE ib1.status = 'critical'
       ORDER BY ib1.fill_level DESC`
    );
    return rows;
  }
  
  static async getBinHistory(binId, limit = 24) {
    const [rows] = await db.execute(
      `SELECT * FROM iot_bins 
       WHERE bin_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [binId, limit]
    );
    return rows;
  }
}

module.exports = IOTData;