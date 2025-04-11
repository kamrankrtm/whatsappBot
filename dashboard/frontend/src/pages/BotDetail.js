import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Divider,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  QrCode as QrCodeIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bot-tabpanel-${index}`}
      aria-labelledby={`bot-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BotDetail = () => {
  const { id: botId } = useParams();
  const navigate = useNavigate();
  const { botStatuses, qrCodes, startBot, stopBot } = useSocket();
  
  const [bot, setBot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // New message form
  const [messageRecipient, setMessageRecipient] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  
  // QR code dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  // Auto-replies dialog
  const [autoRepliesDialogOpen, setAutoRepliesDialogOpen] = useState(false);
  const [autoReplies, setAutoReplies] = useState({});
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');
  
  // Fetch bot details and messages on component mount
  useEffect(() => {
    fetchBotDetails();
    fetchMessages();
  }, [botId]);
  
  // Update bot status when socket data changes
  useEffect(() => {
    if (bot && botStatuses && botStatuses[botId]) {
      setBot(prevBot => ({
        ...prevBot,
        status: botStatuses[botId]
      }));
    }
  }, [botStatuses, botId, bot]);
  
  const fetchBotDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/bots/${botId}`);
      setBot(response.data);
      
      // Initialize auto-replies from the bot configuration
      if (response.data.autoReplies) {
        const replies = {};
        // Convert Map to object
        for (const [key, value] of Object.entries(response.data.autoReplies)) {
          replies[key] = value;
        }
        setAutoReplies(replies);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching bot details:', error);
      setError('Failed to fetch bot details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/bots/${botId}/messages`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't set error for messages, as it would replace the main error
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleStartBot = () => {
    startBot(botId);
    setQrDialogOpen(true);
  };
  
  const handleStopBot = () => {
    stopBot(botId);
  };
  
  const handleSendMessage = async () => {
    if (!messageRecipient.trim() || !messageText.trim()) {
      setSendError('Phone number and message are required');
      return;
    }
    
    if (bot.status !== 'connected') {
      setSendError('Bot must be connected to send messages');
      return;
    }
    
    try {
      setSending(true);
      setSendError(null);
      
      await axios.post(`/api/bots/${botId}/send`, {
        number: messageRecipient.trim(),
        message: messageText.trim()
      });
      
      // Clear form and refresh messages
      setMessageText('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  const handleUpdateAutoReplies = async () => {
    try {
      await axios.put(`/api/bots/${botId}`, {
        autoReplies: autoReplies
      });
      
      setAutoRepliesDialogOpen(false);
      fetchBotDetails(); // Refresh bot details
    } catch (error) {
      console.error('Error updating auto-replies:', error);
    }
  };
  
  const handleAddAutoReply = () => {
    if (!newTrigger.trim() || !newResponse.trim()) {
      return;
    }
    
    setAutoReplies({
      ...autoReplies,
      [newTrigger.toLowerCase().trim()]: newResponse.trim()
    });
    
    // Clear form
    setNewTrigger('');
    setNewResponse('');
  };
  
  const handleDeleteAutoReply = (trigger) => {
    const updatedReplies = { ...autoReplies };
    delete updatedReplies[trigger];
    setAutoReplies(updatedReplies);
  };
  
  const getStatusChip = (status) => {
    let color;
    let label = status;
    
    switch (status) {
      case 'connected':
        color = 'success';
        break;
      case 'connecting':
        color = 'warning';
        break;
      case 'disconnected':
      default:
        color = 'error';
        label = 'disconnected';
        break;
    }
    
    return <Chip size="small" color={color} label={label} />;
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchBotDetails}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }
  
  if (!bot) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="warning">Bot not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {bot.name}
          </Typography>
          <Box sx={{ ml: 2 }}>
            {getStatusChip(bot.status)}
          </Box>
        </Box>
        <Box>
          {bot.status === 'connected' ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStopBot}
              sx={{ mr: 1 }}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="success"
              startIcon={<StartIcon />}
              onClick={handleStartBot}
              sx={{ mr: 1 }}
            >
              Start
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setAutoRepliesDialogOpen(true)}
          >
            Auto-Replies
          </Button>
        </Box>
      </Box>
      
      {bot.description && (
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          {bot.description}
        </Typography>
      )}
      
      <Paper sx={{ mb: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Messages" />
          <Tab label="Send Message" />
          <Tab label="Bot Info" />
        </Tabs>
        
        {/* Messages Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <Button 
              startIcon={<RefreshIcon />} 
              variant="outlined"
              onClick={fetchMessages}
            >
              Refresh Messages
            </Button>
          </Box>
          
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body1" color="textSecondary">
                No messages yet.
              </Typography>
            </Box>
          ) : (
            <List>
              {messages.map((message) => (
                <ListItem
                  key={message._id}
                  alignItems="flex-start"
                  sx={{
                    bgcolor: message.type === 'incoming' ? 'action.hover' : 'background.paper',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: message.type === 'incoming' ? 'primary.light' : 'secondary.light' }}>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">
                          {message.type === 'incoming' ? 'From: ' : 'To: '}
                          {message.type === 'incoming' ? message.fromNumber : message.toNumber}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {moment(message.timestamp).format('MMM D, YYYY HH:mm:ss')}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography
                          variant="body2"
                          color="textPrimary"
                          component="span"
                        >
                          {message.message}
                        </Typography>
                        {message.hasMedia && (
                          <Typography variant="caption" color="primary" component="div">
                            [Contains media]
                          </Typography>
                        )}
                      </React.Fragment>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>
        
        {/* Send Message Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box component="form" noValidate>
            <Typography variant="h6" gutterBottom>
              Send New Message
            </Typography>
            
            {sendError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSendError(null)}>
                {sendError}
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Recipient Phone Number"
                  placeholder="e.g. 989123456789"
                  value={messageRecipient}
                  onChange={(e) => setMessageRecipient(e.target.value)}
                  disabled={sending || bot.status !== 'connected'}
                  helperText="Include country code without + (e.g. 989123456789)"
                  InputProps={{
                    startAdornment: (
                      <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
                        +
                      </Typography>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending || bot.status !== 'connected'}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
                  onClick={handleSendMessage}
                  disabled={sending || !messageRecipient.trim() || !messageText.trim() || bot.status !== 'connected'}
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Bot Info Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Bot Details</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="span">Name:</Typography>
                  <Typography variant="body1" component="span" sx={{ ml: 1 }}>{bot.name}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="span">Status:</Typography>
                  <Typography component="span" sx={{ ml: 1 }}>{getStatusChip(bot.status)}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="span">Created:</Typography>
                  <Typography variant="body1" component="span" sx={{ ml: 1 }}>
                    {moment(bot.createdAt).format('MMM D, YYYY HH:mm')}
                  </Typography>
                </Box>
                {bot.lastConnected && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" component="span">Last Connected:</Typography>
                    <Typography variant="body1" component="span" sx={{ ml: 1 }}>
                      {moment(bot.lastConnected).format('MMM D, YYYY HH:mm')}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Auto-Replies</Typography>
                {Object.keys(autoReplies).length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No auto-replies configured yet.
                  </Typography>
                ) : (
                  <List>
                    {Object.entries(autoReplies).map(([trigger, response]) => (
                      <ListItem key={trigger} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <ListItemText
                          primary={<Typography fontWeight="bold">"{trigger}"</Typography>}
                          secondary={<Typography>→ "{response}"</Typography>}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setAutoRepliesDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  Edit Auto-Replies
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
      
      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect WhatsApp</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', p: 2 }}>
            {qrCodes[botId] ? (
              <>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Scan this QR code with your WhatsApp app to connect the bot
                </Typography>
                <Box 
                  component="img" 
                  src={qrCodes[botId]} 
                  alt="WhatsApp QR Code"
                  sx={{ maxWidth: '100%', height: 'auto', mb: 2 }}
                />
                <Typography variant="caption" color="textSecondary">
                  This QR code will expire after a few minutes
                </Typography>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <QrCodeIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Waiting for QR code...
                </Typography>
                <CircularProgress size={24} sx={{ mb: 2 }} />
                <Typography variant="caption" color="textSecondary">
                  This may take a few moments
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Auto-Replies Dialog */}
      <Dialog 
        open={autoRepliesDialogOpen} 
        onClose={() => setAutoRepliesDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Auto-Replies Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Configure automatic responses to specific messages. When someone sends a message that exactly matches the trigger, the bot will automatically reply with the response.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Current Auto-Replies
            </Typography>
            {Object.keys(autoReplies).length === 0 ? (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                No auto-replies configured yet.
              </Typography>
            ) : (
              <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                {Object.entries(autoReplies).map(([trigger, response]) => (
                  <ListItem
                    key={trigger}
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={() => handleDeleteAutoReply(trigger)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                    sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    <ListItemText
                      primary={<Typography fontWeight="bold">"{trigger}"</Typography>}
                      secondary={<Typography>→ "{response}"</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Add New Auto-Reply
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Trigger Message"
                placeholder="e.g. hello"
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                helperText="The message that will trigger this auto-reply"
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Response"
                placeholder="e.g. Hello! How can I help you?"
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                helperText="The message that will be sent in response"
              />
            </Grid>
            <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={handleAddAutoReply}
                fullWidth
                disabled={!newTrigger.trim() || !newResponse.trim()}
              >
                Add
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoRepliesDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleUpdateAutoReplies} color="primary" variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BotDetail; 