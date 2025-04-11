require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

// Initialize express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-multi-bot', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Models
const Schema = mongoose.Schema;

// User model for dashboard authentication
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Bot Configuration model
const BotConfigSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['disconnected', 'connecting', 'connected'], default: 'disconnected' },
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  lastConnected: { type: Date },
  autoReplies: { type: Map, of: String, default: {} }
});

const BotConfig = mongoose.model('BotConfig', BotConfigSchema);

// Message history model
const MessageSchema = new Schema({
  botId: { type: Schema.Types.ObjectId, ref: 'BotConfig', required: true },
  type: { type: String, enum: ['incoming', 'outgoing'], required: true },
  fromNumber: { type: String, required: true },
  toNumber: { type: String, required: true },
  message: { type: String, required: true },
  hasMedia: { type: Boolean, default: false },
  mediaUrl: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);

// Store active bot instances
const activeBots = new Map();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all bots
app.get('/api/bots', authenticateToken, async (req, res) => {
  try {
    const bots = await BotConfig.find({ owner: req.user.id });
    res.json(bots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new bot
app.post('/api/bots', authenticateToken, async (req, res) => {
  try {
    const { name, description, autoReplies } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ message: 'Bot name is required' });
    }
    
    // Create bot
    const bot = new BotConfig({
      name,
      description,
      owner: req.user.id,
      autoReplies: autoReplies || {}
    });
    
    await bot.save();
    
    res.status(201).json({
      message: 'Bot created successfully',
      bot
    });
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a bot
app.put('/api/bots/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, autoReplies } = req.body;
    const botId = req.params.id;
    
    // Find bot
    const bot = await BotConfig.findOne({ _id: botId, owner: req.user.id });
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }
    
    // Update bot
    if (name) bot.name = name;
    if (description !== undefined) bot.description = description;
    if (autoReplies) bot.autoReplies = autoReplies;
    
    await bot.save();
    
    // If bot is active, update autoReplies
    if (activeBots.has(botId)) {
      const botInstance = activeBots.get(botId);
      botInstance.autoReplies = autoReplies || {};
    }
    
    res.json({
      message: 'Bot updated successfully',
      bot
    });
  } catch (error) {
    console.error('Error updating bot:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a bot
app.delete('/api/bots/:id', authenticateToken, async (req, res) => {
  try {
    const botId = req.params.id;
    
    // Find bot
    const bot = await BotConfig.findOne({ _id: botId, owner: req.user.id });
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }
    
    // If bot is active, disconnect it
    if (activeBots.has(botId)) {
      const botInstance = activeBots.get(botId);
      await botInstance.client.destroy();
      activeBots.delete(botId);
    }
    
    // Delete bot
    await BotConfig.deleteOne({ _id: botId });
    
    // Delete messages
    await Message.deleteMany({ botId });
    
    res.json({ message: 'Bot deleted successfully' });
  } catch (error) {
    console.error('Error deleting bot:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a bot
app.get('/api/bots/:id/messages', authenticateToken, async (req, res) => {
  try {
    const botId = req.params.id;
    const { limit = 50, offset = 0 } = req.query;
    
    // Find bot
    const bot = await BotConfig.findOne({ _id: botId, owner: req.user.id });
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }
    
    // Get messages
    const messages = await Message.find({ botId })
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    const total = await Message.countDocuments({ botId });
    
    res.json({
      messages,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
app.post('/api/bots/:id/send', authenticateToken, async (req, res) => {
  try {
    const botId = req.params.id;
    const { number, message, mediaUrl } = req.body;
    
    // Validation
    if (!number || !message) {
      return res.status(400).json({ message: 'Number and message are required' });
    }
    
    // Find bot
    const bot = await BotConfig.findOne({ _id: botId, owner: req.user.id });
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }
    
    // Check if bot is active
    if (!activeBots.has(botId)) {
      return res.status(400).json({ message: 'Bot is not connected' });
    }
    
    const botInstance = activeBots.get(botId);
    
    // Format number
    let formattedNumber = number.replace(/\D/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '98' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('98')) {
      formattedNumber = '98' + formattedNumber;
    }
    formattedNumber = `${formattedNumber}@c.us`;
    
    let result;
    
    // Send message
    if (mediaUrl) {
      const media = await MessageMedia.fromUrl(mediaUrl);
      result = await botInstance.client.sendMessage(formattedNumber, media, { caption: message });
    } else {
      result = await botInstance.client.sendMessage(formattedNumber, message);
    }
    
    // Save message
    const newMessage = new Message({
      botId,
      type: 'outgoing',
      fromNumber: botInstance.client.info.wid._serialized,
      toNumber: formattedNumber,
      message,
      hasMedia: !!mediaUrl,
      mediaUrl
    });
    
    await newMessage.save();
    
    res.json({
      message: 'Message sent successfully',
      messageId: result.id._serialized
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message', details: error.message });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Authenticate socket
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      socket.userId = decoded.id;
      socket.join(`user-${decoded.id}`);
      console.log(`Socket authenticated for user ${decoded.id}`);
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('auth_error', 'Authentication failed');
    }
  });
  
  // Start a bot
  socket.on('start_bot', async ({ botId }) => {
    try {
      if (!socket.userId) {
        return socket.emit('bot_error', { botId, error: 'Authentication required' });
      }
      
      // Find bot
      const bot = await BotConfig.findOne({ _id: botId, owner: socket.userId });
      if (!bot) {
        return socket.emit('bot_error', { botId, error: 'Bot not found' });
      }
      
      // Check if bot is already active
      if (activeBots.has(botId)) {
        return socket.emit('bot_error', { botId, error: 'Bot is already running' });
      }
      
      // Update status
      bot.status = 'connecting';
      await bot.save();
      
      // Initialize client
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: `multi-bot-${botId}` }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });
      
      // Create bot instance
      const botInstance = {
        client,
        autoReplies: bot.autoReplies || {}
      };
      
      // Store bot instance
      activeBots.set(botId, botInstance);
      
      // QR code event
      client.on('qr', async (qr) => {
        try {
          const qrCode = await qrcode.toDataURL(qr);
          io.to(`user-${socket.userId}`).emit('bot_qr', { botId, qr: qrCode });
        } catch (error) {
          console.error('Error generating QR:', error);
        }
      });
      
      // Ready event
      client.on('ready', async () => {
        try {
          bot.status = 'connected';
          bot.lastConnected = new Date();
          await bot.save();
          
          io.to(`user-${socket.userId}`).emit('bot_status', { botId, status: 'connected' });
        } catch (error) {
          console.error('Error updating bot status:', error);
        }
      });
      
      // Disconnected event
      client.on('disconnected', async (reason) => {
        try {
          console.log(`Bot ${botId} disconnected: ${reason}`);
          
          bot.status = 'disconnected';
          await bot.save();
          
          io.to(`user-${socket.userId}`).emit('bot_status', { botId, status: 'disconnected' });
          
          // Remove from active bots
          activeBots.delete(botId);
        } catch (error) {
          console.error('Error handling disconnection:', error);
        }
      });
      
      // Message event
      client.on('message', async (msg) => {
        try {
          const fromNumber = msg.from;
          const messageBody = msg.body;
          
          console.log(`Bot ${botId} received message from ${fromNumber}: ${messageBody}`);
          
          // Auto-reply
          const autoReplies = botInstance.autoReplies;
          if (autoReplies && autoReplies instanceof Map && autoReplies.has(messageBody.toLowerCase())) {
            const reply = autoReplies.get(messageBody.toLowerCase());
            await msg.reply(reply);
            
            // Save outgoing message
            const outgoingMsg = new Message({
              botId,
              type: 'outgoing',
              fromNumber: client.info.wid._serialized,
              toNumber: fromNumber,
              message: reply,
              hasMedia: false
            });
            
            await outgoingMsg.save();
            
            io.to(`user-${socket.userId}`).emit('new_message', { botId, message: outgoingMsg });
          }
          
          // Save incoming message
          const newMessage = new Message({
            botId,
            type: 'incoming',
            fromNumber,
            toNumber: client.info.wid._serialized,
            message: messageBody,
            hasMedia: msg.hasMedia,
            mediaUrl: msg.hasMedia ? '' : undefined
          });
          
          await newMessage.save();
          
          // Emit message to dashboard
          io.to(`user-${socket.userId}`).emit('new_message', { botId, message: newMessage });
        } catch (error) {
          console.error('Error processing incoming message:', error);
        }
      });
      
      // Initialize client
      await client.initialize();
      
      socket.emit('bot_starting', { botId });
    } catch (error) {
      console.error('Error starting bot:', error);
      socket.emit('bot_error', { botId, error: error.message });
      
      // Update bot status
      try {
        const bot = await BotConfig.findById(botId);
        if (bot) {
          bot.status = 'disconnected';
          await bot.save();
        }
      } catch (dbError) {
        console.error('Error updating bot status:', dbError);
      }
    }
  });
  
  // Stop a bot
  socket.on('stop_bot', async ({ botId }) => {
    try {
      if (!socket.userId) {
        return socket.emit('bot_error', { botId, error: 'Authentication required' });
      }
      
      // Find bot
      const bot = await BotConfig.findOne({ _id: botId, owner: socket.userId });
      if (!bot) {
        return socket.emit('bot_error', { botId, error: 'Bot not found' });
      }
      
      // Check if bot is active
      if (!activeBots.has(botId)) {
        return socket.emit('bot_error', { botId, error: 'Bot is not running' });
      }
      
      // Destroy client
      const botInstance = activeBots.get(botId);
      await botInstance.client.destroy();
      
      // Remove from active bots
      activeBots.delete(botId);
      
      // Update status
      bot.status = 'disconnected';
      await bot.save();
      
      socket.emit('bot_status', { botId, status: 'disconnected' });
    } catch (error) {
      console.error('Error stopping bot:', error);
      socket.emit('bot_error', { botId, error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 