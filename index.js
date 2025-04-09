const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const os = require('os');
const fs = require('fs');
const WebSocket = require('ws');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Create auth directory in /tmp (which is writable in most environments)
const authPath = path.join(os.tmpdir(), '.wwebjs_auth');
try {
    if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
    }
    const sessionPath = path.join(authPath, 'session');
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }
    // Ensure the directory has the right permissions
    fs.chmodSync(authPath, '777');
    fs.chmodSync(sessionPath, '777');

    console.log('Authentication directories created successfully at:', authPath);
} catch (err) {
    console.error('Error creating authentication directories:', err);
}

// ایجاد سرور WebSocket
const wss = new WebSocket.Server({ port: 8080 });

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: authPath
    }),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code received, scan it with your WhatsApp mobile app.');
    
    // ارسال کد QR به همه کلاینت‌های متصل
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(qr);
        }
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send('Client is ready!');
        }
    });
});

client.on('message', message => {
    console.log(`Received message: ${message.body}`);
});

app.post('/send-message', async (req, res) => {
    const { number, message, image_url } = req.body;

    // Convert the number to the proper format
    const formattedNumber = `${number.replace(/^0/, '98')}@c.us`;

    try {
        // Send text message
        const sentMessage = await client.sendMessage(formattedNumber, message);

        // Send image if URL is provided
        if (image_url) {
            const media = await MessageMedia.fromUrl(image_url);
            await client.sendMessage(formattedNumber, media, { caption: message });
        }

        res.json({ status: 'success', message: 'Message sent!' });
    } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ status: 'error', message: 'Failed to send message', details: error.message });
    }
});

// Initialize the client after creating directories
try {
    client.initialize();
} catch (error) {
    console.error('Error initializing client:', error);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
}); 