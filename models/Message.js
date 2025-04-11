const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'kaafcrmdatabase',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'pu9gJd0cJm8xfIgsGks0wzzO',
    database: process.env.DB_NAME || 'youthful_bassi',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

class Message {
  constructor(data) {
    this.sender = data.sender;
    this.receiver = data.receiver;
    this.content = data.content;
    this.messageType = data.messageType || 'text';
    this.mediaUrl = data.mediaUrl;
    this.whatsappMessageId = data.whatsappMessageId;
    this.status = data.status || 'sent';
    this.timestamp = data.timestamp || new Date();
  }

  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bot_id INT NOT NULL,
        sender VARCHAR(255) NOT NULL,
        receiver VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        direction ENUM('incoming', 'outgoing') NOT NULL,
        status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bot_configs(id) ON DELETE CASCADE
      )
    `;
    await pool.query(createTableSQL);
  }

  async save() {
    const query = `
      INSERT INTO messages 
        (sender, receiver, content, messageType, mediaUrl, whatsappMessageId, status, timestamp)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      this.sender,
      this.receiver,
      this.content,
      this.messageType,
      this.mediaUrl,
      this.whatsappMessageId,
      this.status,
      this.timestamp
    ];
    
    try {
      const [result] = await pool.query(query, values);
      this.id = result.insertId;
      return this;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  static async find(query = {}) {
    let sql = 'SELECT * FROM messages';
    const values = [];
    
    if (Object.keys(query).length > 0) {
      const conditions = Object.keys(query).map(key => `${key} = ?`);
      sql += ' WHERE ' + conditions.join(' AND ');
      values.push(...Object.values(query));
    }
    
    const [rows] = await pool.query(sql, values);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async findOne(query) {
    const conditions = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(query);
    const [rows] = await pool.query(`SELECT * FROM messages WHERE ${conditions} LIMIT 1`, values);
    return rows[0] || null;
  }

  static async create(data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const [result] = await pool.query(
      `INSERT INTO messages (${columns}) VALUES (${placeholders})`,
      values
    );
    
    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    await pool.query(
      `UPDATE messages SET ${setClause} WHERE id = ?`,
      values
    );
    
    return this.findById(id);
  }

  static async delete(id) {
    await pool.query('DELETE FROM messages WHERE id = ?', [id]);
    return true;
  }
}

// Create the table if it doesn't exist
Message.createTable().catch(err => {
  console.error('Error initializing Message model:', err);
});

module.exports = Message; 