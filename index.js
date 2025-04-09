const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');

const app = express();
app.use(express.json());

// تعیین مسیر برای ذخیره اطلاعات احراز هویت
const authPath = path.join(process.cwd(), 'auth');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: authPath
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code received, scan it with your WhatsApp mobile app.');
});

client.on('ready', () => {
    console.log('Client is ready!');
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

client.initialize();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
}); 