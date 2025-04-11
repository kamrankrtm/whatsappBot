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

class BotConfig {
    static async createTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS bot_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                status ENUM('active', 'inactive', 'connecting') DEFAULT 'inactive',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_phone (phone_number)
            )
        `;
        await pool.query(createTableSQL);
    }

    static async find(query = {}) {
        let sql = 'SELECT * FROM bot_configs';
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
        const [rows] = await pool.query('SELECT * FROM bot_configs WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async findOne(query) {
        const conditions = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(query);
        const [rows] = await pool.query(`SELECT * FROM bot_configs WHERE ${conditions} LIMIT 1`, values);
        return rows[0] || null;
    }

    static async create(data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);
        
        const [result] = await pool.query(
            `INSERT INTO bot_configs (${columns}) VALUES (${placeholders})`,
            values
        );
        
        return this.findById(result.insertId);
    }

    static async update(id, data) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(data), id];
        
        await pool.query(
            `UPDATE bot_configs SET ${setClause} WHERE id = ?`,
            values
        );
        
        return this.findById(id);
    }

    static async delete(id) {
        await pool.query('DELETE FROM bot_configs WHERE id = ?', [id]);
        return true;
    }
}

module.exports = BotConfig; 