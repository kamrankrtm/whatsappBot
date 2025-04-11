const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'kaafcrmdatabase',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'pu9gJd0cJm8xfIgsGks0wzzO',
        database: process.env.DB_NAME || 'youthful_bassi',
        port: process.env.DB_PORT || 3306
    });

    try {
        // Read and execute each migration file
        const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
            await connection.query(sql);
            console.log(`Migration ${file} completed successfully`);
        }

        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Error running migrations:', error);
    } finally {
        await connection.end();
    }
}

runMigrations(); 