const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Import database connection
const { connectToDatabase } = require('./database');

// Import models
const Message = require('./fileStorageMessage');
const BotConfig = require('./fileStorage');

// Load environment variables if .env file exists
try {
    require('dotenv').config();
} catch (e) {
    console.log('dotenv package not found, using default environment variables');
}

// Create sessions directory if it doesn't exist
const dataDir = process.env.NODE_ENV === 'production' ? '/app/data' : '.';
const sessionsDir = path.join(dataDir, '.wwebjs_auth');
const sessionDir = path.join(sessionsDir, 'session');

// Create all required directories
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory at ${dataDir}`);
}

if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
    console.log(`Created sessions directory at ${sessionsDir}`);
}

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
    console.log(`Created session directory at ${sessionDir}`);
}

// Check directory permissions
try {
    fs.accessSync(dataDir, fs.constants.W_OK);
    fs.accessSync(sessionsDir, fs.constants.W_OK);
    fs.accessSync(sessionDir, fs.constants.W_OK);
    console.log('All directories have write permissions');
} catch (err) {
    console.error('Directory permission error:', err);
}

// Initialize Express app
const app = express();
app.use(express.json());

// Add route for root path - dashboard UI
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>مدیریت بات‌های واتساپ</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css">
            <style>
                body {
                    font-family: 'Tahoma', 'Arial', sans-serif;
                    direction: rtl;
                    text-align: right;
                    background-color: #f5f5f5;
                }
                .navbar {
                    background-color: #075e54 !important;
                }
                .card {
                    border-radius: 10px;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s;
                }
                .card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
                }
                .card-header {
                    background-color: #128c7e;
                    color: white;
                    border-radius: 10px 10px 0 0 !important;
                    font-weight: bold;
                }
                .btn-success {
                    background-color: #25d366;
                    border-color: #25d366;
                }
                .btn-success:hover {
                    background-color: #128c7e;
                    border-color: #128c7e;
                }
                .bot-status {
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    display: inline-block;
                    margin-left: 5px;
                }
                .status-connected {
                    background-color: #25d366;
                }
                .status-disconnected {
                    background-color: #dc3545;
                }
                .status-connecting {
                    background-color: #ffc107;
                }
                #qrcode-container {
                    background-color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    margin: 20px auto;
                    max-width: 300px;
                }
                #qrcode-container img {
                    max-width: 100%;
                    height: auto;
                }
                .loader {
                    border: 6px solid #f3f3f3;
                    border-top: 6px solid #128c7e;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .api-info {
                    background-color: #f8f9fa;
                    border-radius: 10px;
                    padding: 15px;
                    margin-top: 30px;
                }
                .api-endpoint {
                    padding: 8px;
                    border-bottom: 1px solid #dee2e6;
                }
                .api-endpoint:last-child {
                    border-bottom: none;
                }
            </style>
        </head>
        <body>
            <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
                <div class="container">
                    <a class="navbar-brand" href="/">
                        <i class="bi bi-whatsapp me-2"></i>
                        مدیریت بات‌های واتساپ
                    </a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link active" href="/">داشبورد</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/health">وضعیت سرور</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <div class="container">
                <!-- Main Dashboard -->
                <div class="row">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                افزودن بات جدید
                            </div>
                            <div class="card-body">
                                <form id="create-bot-form">
                                    <div class="mb-3">
                                        <label for="botName" class="form-label">نام بات</label>
                                        <input type="text" class="form-control" id="botName" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="welcomeMessage" class="form-label">پیام خوش‌آمدگویی</label>
                                        <textarea class="form-control" id="welcomeMessage" rows="2">سلام! این یک پیام خودکار است. چطور می‌توانم به شما کمک کنم؟</textarea>
                                    </div>
                                    <button type="submit" class="btn btn-success w-100">
                                        <i class="bi bi-plus-circle me-2"></i>
                                        ایجاد بات جدید
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                بات‌های فعال
                            </div>
                            <div class="card-body">
                                <div id="bots-list">
                                    <div class="loader" id="loading-bots"></div>
                                    <div id="no-bots-message" style="display: none;" class="text-center py-4">
                                        <i class="bi bi-emoji-frown" style="font-size: 2rem;"></i>
                                        <p class="mt-2">هیچ باتی یافت نشد. یک بات جدید ایجاد کنید.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- QR Code Section -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card" id="qrcode-section" style="display: none;">
                            <div class="card-header">
                                <span id="qr-bot-name">اتصال به واتساپ</span>
                            </div>
                            <div class="card-body text-center">
                                <p>لطفاً QR کد زیر را با اپلیکیشن واتساپ خود اسکن کنید.</p>
                                <div id="qrcode-container">
                                    <div class="loader" id="loading-qr"></div>
                                    <img id="qrcode-image" style="display: none;" />
                                </div>
                                <p id="qr-status" class="mt-3">در حال دریافت QR کد...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- API Info Section -->
                <div class="api-info mt-4">
                    <h5>راهنمای API</h5>
                    <p>برای استفاده از API بات، از آدرس‌های زیر استفاده کنید:</p>
                    
                    <div class="api-endpoint">
                        <code>POST /send-message</code>
                        <p class="mb-0">ارسال پیام متنی</p>
                    </div>
                    
                    <div class="api-endpoint">
                        <code>POST /send-file</code>
                        <p class="mb-0">ارسال فایل</p>
                    </div>
                    
                    <div class="api-endpoint">
                        <code>GET /messages/:phone</code>
                        <p class="mb-0">دریافت تاریخچه پیام‌ها</p>
                    </div>
                    
                    <div class="api-endpoint">
                        <code>GET /bot-config</code>
                        <p class="mb-0">دریافت تنظیمات بات</p>
                    </div>
                </div>
            </div>

            <!-- JavaScript -->
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
            <script>
                // Fetch active bots
                function fetchBots() {
                    fetch('/bot-config')
                        .then(response => response.json())
                        .then(data => {
                            const botsList = document.getElementById('bots-list');
                            const loadingBots = document.getElementById('loading-bots');
                            const noBotMessage = document.getElementById('no-bots-message');
                            
                            loadingBots.style.display = 'none';
                            
                            if (!data.data || data.data.length === 0) {
                                noBotMessage.style.display = 'block';
                                return;
                            }
                            
                            let botsHTML = '';
                            data.data.forEach(bot => {
                                let statusClass = '';
                                let statusText = '';
                                
                                switch(bot.status) {
                                    case 'connected':
                                        statusClass = 'status-connected';
                                        statusText = 'متصل';
                                        break;
                                    case 'disconnected':
                                        statusClass = 'status-disconnected';
                                        statusText = 'قطع شده';
                                        break;
                                    case 'connecting':
                                        statusClass = 'status-connecting';
                                        statusText = 'در حال اتصال';
                                        break;
                                    default:
                                        statusClass = 'status-disconnected';
                                        statusText = 'نامشخص';
                                }
                                
                                botsHTML += \`
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h5 class="mb-1">\${bot.name}</h5>
                                                <p class="mb-1 text-muted">\${bot.phoneNumber}</p>
                                                <span class="bot-status \${statusClass}"></span>
                                                <small>\${statusText}</small>
                                            </div>
                                            <div class="btn-group">
                                                <button class="btn btn-sm btn-primary show-qr-btn" data-phone="\${bot.phoneNumber}" data-name="\${bot.name}" \${bot.status === 'connected' ? 'disabled' : ''}>
                                                    <i class="bi bi-qr-code"></i> QR کد
                                                </button>
                                                <button class="btn btn-sm btn-danger delete-bot-btn" data-phone="\${bot.phoneNumber}">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                \`;
                            });
                            
                            botsList.innerHTML = botsHTML;
                            
                            // Add event listeners for QR code buttons
                            document.querySelectorAll('.show-qr-btn').forEach(btn => {
                                btn.addEventListener('click', function() {
                                    const phone = this.getAttribute('data-phone');
                                    const name = this.getAttribute('data-name');
                                    showQRCode(phone, name);
                                });
                            });
                            
                            // Add event listeners for delete buttons
                            document.querySelectorAll('.delete-bot-btn').forEach(btn => {
                                btn.addEventListener('click', function() {
                                    const phone = this.getAttribute('data-phone');
                                    deleteBot(phone);
                                });
                            });
                        })
                        .catch(error => {
                            console.error('Error fetching bots:', error);
                            const botsList = document.getElementById('bots-list');
                            const loadingBots = document.getElementById('loading-bots');
                            
                            loadingBots.style.display = 'none';
                            botsList.innerHTML = '<div class="alert alert-danger">خطا در دریافت اطلاعات بات‌ها</div>';
                        });
                }

                // Show QR code for a bot
                function showQRCode(phone, name) {
                    const qrSection = document.getElementById('qrcode-section');
                    const qrBotName = document.getElementById('qr-bot-name');
                    const qrImage = document.getElementById('qrcode-image');
                    const loadingQR = document.getElementById('loading-qr');
                    const qrStatus = document.getElementById('qr-status');
                    
                    qrSection.style.display = 'block';
                    qrBotName.innerText = 'اتصال به واتساپ: ' + name;
                    qrImage.style.display = 'none';
                    loadingQR.style.display = 'block';
                    qrStatus.innerText = 'در حال دریافت QR کد...';
                    
                    // Scroll to QR section
                    qrSection.scrollIntoView({ behavior: 'smooth' });
                    
                    // Poll for QR code
                    pollForQRCode(phone);
                }

                // Poll for QR code
                function pollForQRCode(phone) {
                    fetch(\`/bot-qr/\${phone}\`)
                        .then(response => response.json())
                        .then(data => {
                            const qrImage = document.getElementById('qrcode-image');
                            const loadingQR = document.getElementById('loading-qr');
                            const qrStatus = document.getElementById('qr-status');
                            
                            if (data.status === 'success' && data.qrCode) {
                                loadingQR.style.display = 'none';
                                qrImage.src = \`data:image/png;base64,\${data.qrCode}\`;
                                qrImage.style.display = 'block';
                                qrStatus.innerText = 'لطفاً QR کد را با گوشی خود اسکن کنید.';
                                
                                // Check connection status after QR is shown
                                setTimeout(() => checkConnectionStatus(phone), 10000);
                            } else if (data.status === 'connected') {
                                loadingQR.style.display = 'none';
                                qrStatus.innerText = 'بات با موفقیت متصل شد!';
                                setTimeout(() => {
                                    document.getElementById('qrcode-section').style.display = 'none';
                                    fetchBots(); // Refresh bot list
                                }, 3000);
                            } else {
                                // No QR yet, poll again
                                qrStatus.innerText = 'در انتظار QR کد...';
                                setTimeout(() => pollForQRCode(phone), 5000);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching QR code:', error);
                            const qrStatus = document.getElementById('qr-status');
                            qrStatus.innerText = 'خطا در دریافت QR کد. لطفاً دوباره تلاش کنید.';
                        });
                }

                // Check connection status
                function checkConnectionStatus(phone) {
                    fetch(\`/bot-status/\${phone}\`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'connected') {
                                const qrStatus = document.getElementById('qr-status');
                                qrStatus.innerText = 'بات با موفقیت متصل شد!';
                                setTimeout(() => {
                                    document.getElementById('qrcode-section').style.display = 'none';
                                    fetchBots(); // Refresh bot list
                                }, 3000);
                            } else {
                                // Still not connected, check again
                                setTimeout(() => checkConnectionStatus(phone), 5000);
                            }
                        })
                        .catch(error => {
                            console.error('Error checking connection status:', error);
                        });
                }

                // Delete a bot
                function deleteBot(phone) {
                    if (confirm('آیا از حذف این بات اطمینان دارید؟')) {
                        fetch(\`/bot-config/\${phone}\`, {
                            method: 'DELETE'
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'success') {
                                alert('بات با موفقیت حذف شد.');
                                fetchBots(); // Refresh bot list
                            } else {
                                alert('خطا در حذف بات: ' + (data.message || 'خطای نامشخص'));
                            }
                        })
                        .catch(error => {
                            console.error('Error deleting bot:', error);
                            alert('خطا در حذف بات. لطفاً دوباره تلاش کنید.');
                        });
                    }
                }

                // Create a new bot
                document.getElementById('create-bot-form').addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const botName = document.getElementById('botName').value;
                    const welcomeMessage = document.getElementById('welcomeMessage').value;
                    
                    fetch('/bot-config', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: botName,
                            welcomeMessage: welcomeMessage
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            alert('بات جدید با موفقیت ایجاد شد.');
                            document.getElementById('create-bot-form').reset();
                            fetchBots(); // Refresh bot list
                            
                            // Show QR code for the new bot
                            showQRCode(data.data.phoneNumber, data.data.name);
                        } else {
                            alert('خطا در ایجاد بات: ' + (data.message || 'خطای نامشخص'));
                        }
                    })
                    .catch(error => {
                        console.error('Error creating bot:', error);
                        alert('خطا در ایجاد بات. لطفاً دوباره تلاش کنید.');
                    });
                });

                // Initial fetch
                document.addEventListener('DOMContentLoaded', fetchBots);
                
                // Refresh bots list every 30 seconds
                setInterval(fetchBots, 30000);
            </script>
        </body>
        </html>
    `);
});

// Connect to database
connectToDatabase()
    .then(connection => {
        if (connection) {
            console.log('Database connection established');
        } else {
            console.log('Running without database connection');
        }
    })
    .catch(err => {
        console.error('Failed to connect to database:', err);
    });

// Check if we should use remote chrome
const useRemoteChrome = process.env.USE_REMOTE_CHROME === 'true';
console.log(`Using remote Chrome: ${useRemoteChrome}`);

// Configure WhatsApp client with appropriate browser settings
let clientOptions = {
    authStrategy: new LocalAuth({
        dataPath: sessionsDir
    }),
    puppeteer: {
        // Default local browser options
        headless: process.env.HEADLESS !== 'false',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...(process.env.PROXY_SERVER ? {
            browserArgs: [`--proxy-server=${process.env.PROXY_SERVER}`]
        } : {})
    }
};

// If remote chrome is enabled, replace puppeteer config with connect options
if (useRemoteChrome) {
    const chromeEndpoint = process.env.CHROME_WS_ENDPOINT;
    const chromeToken = process.env.CHROME_TOKEN;
    
    if (!chromeEndpoint || !chromeToken) {
        console.error('Error: CHROME_WS_ENDPOINT and CHROME_TOKEN must be set when USE_REMOTE_CHROME is true');
        process.exit(1);
    }
    
    const browserWSEndpoint = `${chromeEndpoint}?token=${chromeToken}`;
    console.log(`Connecting to remote Chrome at: ${chromeEndpoint}`);
    
    clientOptions.puppeteer = {
        browserWSEndpoint,
        // Add additional puppeteer connect options here if needed
    };
}

const client = new Client(clientOptions);

// Event: QR Code received
client.on('qr', async (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code received, scan it with your WhatsApp mobile app.');
    
    // Store QR code in database if connected
    try {
        // Update or create bot config with QR code
        await BotConfig.findOneAndUpdate(
            { phoneNumber: 'default' }, // You may want to update this based on your business logic
            { 
                qrCode: qr,
                status: 'connecting'
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Failed to save QR code to database:', error);
    }
});

// Event: Client is ready
client.on('ready', async () => {
    console.log('Client is ready!');
    
    // Update bot status in database
    try {
        const clientInfo = client.info;
        await BotConfig.findOneAndUpdate(
            { phoneNumber: clientInfo.wid.user },
            { 
                status: 'connected', 
                lastConnection: new Date(),
                name: clientInfo.pushname || 'WhatsApp Bot',
                isActive: true,
                qrCode: null // Clear QR code when connected
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Failed to update bot status in database:', error);
    }
});

// Event: Message received
client.on('message', async (message) => {
    console.log(`Received message: ${message.body}`);
    
    // Save message to database
    try {
        const chat = await message.getChat();
        const contact = await message.getContact();
        
        const newMessage = new Message({
            sender: contact.id.user,
            receiver: client.info.wid.user,
            content: message.body,
            messageType: message.type,
            whatsappMessageId: message.id._serialized,
            timestamp: message.timestamp * 1000 // Convert to milliseconds
        });
        
        await newMessage.save();
    } catch (error) {
        console.error('Failed to save message to database:', error);
    }
    
    // Load auto-replies from database
    let autoReplies = {};
    try {
        const botConfig = await BotConfig.findOne({ phoneNumber: client.info.wid.user });
        if (botConfig && botConfig.autoReplies) {
            botConfig.autoReplies.forEach(reply => {
                if (reply.isActive) {
                    autoReplies[reply.trigger] = reply.response;
                }
            });
        }
    } catch (error) {
        console.error('Failed to load auto-replies from database:', error);
        // Fallback to hard-coded auto-replies
        autoReplies = {
            'سلام': 'سلام! چطور می‌توانم کمک کنم؟',
            'hello': 'Hello! How can I help you?',
            'ساعت چنده': () => `ساعت الان ${new Date().toLocaleTimeString('fa-IR')} است.`,
            'چطوری': 'خوبم، ممنون! شما چطورید؟'
        };
    }
    
    // Check for auto-replies
    const messageText = message.body.toLowerCase();
    
    // Process auto-replies if matches
    if (autoReplies[messageText]) {
        const reply = typeof autoReplies[messageText] === 'function' 
            ? autoReplies[messageText]() 
            : autoReplies[messageText];
            
        const sentMessage = await message.reply(reply);
        
        // Save reply to database
        try {
            const newReply = new Message({
                sender: client.info.wid.user,
                receiver: message.from.split('@')[0],
                content: reply,
                messageType: 'text',
                whatsappMessageId: sentMessage.id._serialized,
                status: 'sent',
                timestamp: new Date()
            });
            
            await newReply.save();
        } catch (error) {
            console.error('Failed to save reply to database:', error);
        }
    }
});

// Event: Authentication failure
client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
});

// Event: Disconnected
client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
});

// Utility function to format phone numbers
const formatPhoneNumber = (number) => {
    // Strip any non-numeric characters
    let formatted = number.replace(/\D/g, '');
    
    // Add country code if missing
    if (formatted.startsWith('0')) {
        formatted = '98' + formatted.substring(1);
    } else if (!formatted.startsWith('98')) {
        formatted = '98' + formatted;
    }
    
    return `${formatted}@c.us`;
};

// API: Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'whatsapp-bot',
        timestamp: new Date().toISOString(),
        client: {
            connected: client.info ? true : false
        }
    });
});

// API endpoint to send a text message
app.post('/send-message', async (req, res) => {
    const { number, message, image_url } = req.body;

    if (!number || !message) {
        return res.status(400).json({ status: 'error', message: 'Number and message are required' });
    }

    // Format the phone number
    const formattedNumber = formatPhoneNumber(number);

    try {
        // Send text message
        const sentMessage = await client.sendMessage(formattedNumber, message);

        // Send image if URL is provided
        if (image_url) {
            const media = await MessageMedia.fromUrl(image_url);
            await client.sendMessage(formattedNumber, media, { caption: message });
        }

        res.json({ status: 'success', message: 'Message sent!', id: sentMessage.id._serialized });
    } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ status: 'error', message: 'Failed to send message', details: error.message });
    }
});

// API endpoint to send a file
app.post('/send-file', async (req, res) => {
    const { number, caption, file_path, file_url } = req.body;
    
    if (!number) {
        return res.status(400).json({ status: 'error', message: 'Phone number is required' });
    }
    
    if (!file_path && !file_url) {
        return res.status(400).json({ status: 'error', message: 'Either file_path or file_url is required' });
    }
    
    const formattedNumber = formatPhoneNumber(number);
    
    try {
        let media;
        
        if (file_path) {
            // Local file
            const filePath = path.resolve(file_path);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ status: 'error', message: 'File not found' });
            }
            
            const mimetype = path.extname(filePath).toLowerCase() === '.pdf' ? 'application/pdf' : '';
            const filename = path.basename(filePath);
            const data = fs.readFileSync(filePath, {encoding: 'base64'});
            
            media = new MessageMedia(mimetype, data, filename);
        } else {
            // Remote URL
            media = await MessageMedia.fromUrl(file_url);
        }
        
        const result = await client.sendMessage(formattedNumber, media, { caption: caption || '' });
        res.json({ status: 'success', message: 'File sent successfully', id: result.id._serialized });
        
    } catch (error) {
        console.error('Failed to send file:', error);
        res.status(500).json({ status: 'error', message: 'Failed to send file', details: error.message });
    }
});

// API endpoint to send message to multiple recipients
app.post('/send-bulk', async (req, res) => {
    const { numbers, message, media_url } = req.body;
    
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Valid array of phone numbers is required' });
    }
    
    if (!message && !media_url) {
        return res.status(400).json({ status: 'error', message: 'Either message or media_url is required' });
    }
    
    const results = {
        success: [],
        failed: []
    };
    
    let media;
    if (media_url) {
        try {
            media = await MessageMedia.fromUrl(media_url);
        } catch (error) {
            return res.status(400).json({ status: 'error', message: 'Invalid media URL', details: error.message });
        }
    }
    
    for (const number of numbers) {
        try {
            const formattedNumber = formatPhoneNumber(number);
            
            if (media) {
                await client.sendMessage(formattedNumber, media, { caption: message || '' });
            } else {
                await client.sendMessage(formattedNumber, message);
            }
            
            results.success.push(number);
        } catch (error) {
            console.error(`Failed to send message to ${number}:`, error);
            results.failed.push({ number, error: error.message });
        }
    }
    
    res.json({ 
        status: 'complete', 
        summary: {
            total: numbers.length,
            successful: results.success.length,
            failed: results.failed.length
        },
        results 
    });
});

// API endpoint to get chat history with a contact
app.get('/chat-history/:number', async (req, res) => {
    const { number } = req.params;
    const { limit = 50 } = req.query;
    
    try {
        const formattedNumber = formatPhoneNumber(number);
        const chat = await client.getChatById(formattedNumber);
        
        if (!chat) {
            return res.status(404).json({ status: 'error', message: 'Chat not found' });
        }
        
        // Load message history
        await chat.fetchMessages({ limit: parseInt(limit) });
        
        const messages = chat.messages.map(msg => ({
            id: msg.id._serialized,
            body: msg.body,
            fromMe: msg.fromMe,
            timestamp: msg.timestamp,
            hasMedia: msg.hasMedia,
            type: msg.type
        }));
        
        res.json({ 
            status: 'success', 
            contact: {
                name: chat.name,
                number: chat.id._serialized
            },
            messages 
        });
        
    } catch (error) {
        console.error('Failed to fetch chat history:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch chat history', details: error.message });
    }
});

// API: Get message history
app.get('/messages/:phone', async (req, res) => {
    const { phone } = req.params;
    const { limit = 50, before } = req.query;
    
    try {
        let query = {
            $or: [
                { sender: phone, receiver: client.info.wid.user },
                { sender: client.info.wid.user, receiver: phone }
            ]
        };
        
        if (before) {
            query.timestamp = { $lt: new Date(before) };
        }
        
        const messages = await Message.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();
            
        res.json({ status: 'success', data: messages });
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch messages', details: error.message });
    }
});

// API: Get bot configurations
app.get('/bot-config', async (req, res) => {
    try {
        const configs = await BotConfig.find({ isActive: true }).lean();
        res.json({ status: 'success', data: configs });
    } catch (error) {
        console.error('Failed to fetch bot configurations:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch bot configurations', details: error.message });
    }
});

// API: Update bot auto-replies
app.post('/bot-config/:phone/auto-replies', async (req, res) => {
    const { phone } = req.params;
    const { autoReplies } = req.body;
    
    if (!autoReplies || !Array.isArray(autoReplies)) {
        return res.status(400).json({ status: 'error', message: 'Auto-replies must be an array' });
    }
    
    try {
        const updatedConfig = await BotConfig.findOneAndUpdate(
            { phoneNumber: phone },
            { autoReplies },
            { upsert: true }
        );
        
        if (!updatedConfig) {
            return res.status(404).json({ status: 'error', message: 'Bot configuration not found' });
        }
        
        res.json({ status: 'success', data: updatedConfig });
    } catch (error) {
        console.error('Failed to update auto-replies:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update auto-replies', details: error.message });
    }
});

// API: Create a new bot
app.post('/bot-config', async (req, res) => {
    const { name, welcomeMessage } = req.body;
    
    if (!name) {
        return res.status(400).json({ status: 'error', message: 'Bot name is required' });
    }
    
    try {
        // Generate a unique phone number placeholder
        const uniqueId = 'bot_' + Date.now();
        
        const newBot = await BotConfig.create({
            name: name,
            phoneNumber: uniqueId,
            welcomeMessage: welcomeMessage || 'سلام! این یک پیام خودکار است. چطور می‌توانم به شما کمک کنم؟',
            isActive: true,
            status: 'disconnected',
            autoReplies: []
        });
        
        res.json({ status: 'success', message: 'Bot created successfully', data: newBot });
    } catch (error) {
        console.error('Failed to create bot:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create bot', details: error.message });
    }
});

// API: Delete a bot
app.delete('/bot-config/:phone', async (req, res) => {
    const { phone } = req.params;
    
    try {
        // First check if the bot exists
        const bot = await BotConfig.findOne({ phoneNumber: phone });
        
        if (!bot) {
            return res.status(404).json({ status: 'error', message: 'Bot not found' });
        }
        
        // TODO: Implement logic to disconnect the bot if it's connected
        
        // Delete the bot
        await BotConfig.findOneAndDelete({ phoneNumber: phone });
        
        res.json({ status: 'success', message: 'Bot deleted successfully' });
    } catch (error) {
        console.error('Failed to delete bot:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete bot', details: error.message });
    }
});

// API: Get QR code for a bot
app.get('/bot-qr/:phone', async (req, res) => {
    const { phone } = req.params;
    
    try {
        const bot = await BotConfig.findOne({ phoneNumber: phone });
        
        if (!bot) {
            return res.status(404).json({ status: 'error', message: 'Bot not found' });
        }
        
        if (bot.status === 'connected') {
            return res.json({ status: 'connected', message: 'Bot is already connected' });
        }
        
        if (bot.qrCode) {
            return res.json({ status: 'success', qrCode: bot.qrCode });
        }
        
        // No QR code yet
        return res.json({ status: 'pending', message: 'QR code not yet available' });
    } catch (error) {
        console.error('Failed to get QR code:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get QR code', details: error.message });
    }
});

// API: Get bot status
app.get('/bot-status/:phone', async (req, res) => {
    const { phone } = req.params;
    
    try {
        const bot = await BotConfig.findOne({ phoneNumber: phone });
        
        if (!bot) {
            return res.status(404).json({ status: 'error', message: 'Bot not found' });
        }
        
        res.json({ status: bot.status, lastConnection: bot.lastConnection });
    } catch (error) {
        console.error('Failed to get bot status:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get bot status', details: error.message });
    }
});

// Initialize WhatsApp client
client.initialize().catch(err => {
    console.error('Failed to initialize client:', err);
    process.exit(1);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Initialize WhatsApp client
client.initialize();
    console.log(`Health check available at http://localhost:${PORT}/health`);
});
