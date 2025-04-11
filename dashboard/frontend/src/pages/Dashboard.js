import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Chip,
  Paper,
  Fab,
  Skeleton,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  QrCode as QrCodeIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import moment from 'moment';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { botStatuses, qrCodes, startBot, stopBot, clearQrCode } = useSocket();
  
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New bot dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotDescription, setNewBotDescription] = useState('');
  
  // QR code dialog state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [currentQrBot, setCurrentQrBot] = useState(null);
  
  // Alert state
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  
  // Fetch bots on component mount
  useEffect(() => {
    fetchBots();
  }, []);
  
  // Update bot statuses when socket data changes
  useEffect(() => {
    if (!loading && botStatuses) {
      setBots(prevBots => 
        prevBots.map(bot => ({
          ...bot,
          status: botStatuses[bot._id] || bot.status
        }))
      );
    }
  }, [botStatuses, loading]);
  
  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/bots');
      setBots(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching bots:', error);
      setError('Failed to fetch bots. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateBot = async () => {
    try {
      if (!newBotName.trim()) {
        setAlert({
          open: true,
          message: 'Bot name is required',
          severity: 'error'
        });
        return;
      }
      
      const response = await axios.post('/api/bots', {
        name: newBotName.trim(),
        description: newBotDescription.trim()
      });
      
      setAlert({
        open: true,
        message: 'Bot created successfully',
        severity: 'success'
      });
      
      setBots(prevBots => [...prevBots, response.data.bot]);
      setOpenDialog(false);
      resetNewBotForm();
    } catch (error) {
      console.error('Error creating bot:', error);
      setAlert({
        open: true,
        message: error.response?.data?.message || 'Failed to create bot',
        severity: 'error'
      });
    }
  };
  
  const handleDeleteBot = async (botId) => {
    if (!window.confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`/api/bots/${botId}`);
      
      setAlert({
        open: true,
        message: 'Bot deleted successfully',
        severity: 'success'
      });
      
      setBots(prevBots => prevBots.filter(bot => bot._id !== botId));
    } catch (error) {
      console.error('Error deleting bot:', error);
      setAlert({
        open: true,
        message: error.response?.data?.message || 'Failed to delete bot',
        severity: 'error'
      });
    }
  };
  
  const handleStartBot = (botId) => {
    startBot(botId);
    
    // Update local state immediately for better UX
    setBots(prevBots => 
      prevBots.map(bot => 
        bot._id === botId 
          ? { ...bot, status: 'connecting' } 
          : bot
      )
    );
    
    // Show QR code dialog
    setCurrentQrBot(bots.find(bot => bot._id === botId));
    setQrDialogOpen(true);
  };
  
  const handleStopBot = (botId) => {
    stopBot(botId);
    
    // Update local state immediately for better UX
    setBots(prevBots => 
      prevBots.map(bot => 
        bot._id === botId 
          ? { ...bot, status: 'disconnected' } 
          : bot
      )
    );
  };
  
  const handleCloseQrDialog = () => {
    setQrDialogOpen(false);
    setCurrentQrBot(null);
    // Clear QR code from memory
    if (currentQrBot) {
      clearQrCode(currentQrBot._id);
    }
  };
  
  const handleViewBot = (botId) => {
    navigate(`/bots/${botId}`);
  };
  
  const resetNewBotForm = () => {
    setNewBotName('');
    setNewBotDescription('');
  };
  
  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
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
  
  const renderSkeleton = () => (
    <>
      {[1, 2, 3].map((i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <Card elevation={3}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={40} />
              <Skeleton variant="text" width="90%" height={20} />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton variant="rectangular" width={80} height={24} />
                <Skeleton variant="text" width="40%" />
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <Skeleton variant="rectangular" width={40} height={40} sx={{ mr: 1 }} />
              <Skeleton variant="rectangular" width={40} height={40} sx={{ mr: 1 }} />
              <Skeleton variant="rectangular" width={40} height={40} />
            </CardActions>
          </Card>
        </Grid>
      ))}
    </>
  );
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          WhatsApp Bots
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create New Bot
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button color="inherit" size="small" onClick={fetchBots} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {loading ? (
          renderSkeleton()
        ) : bots.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No WhatsApp Bots Yet
              </Typography>
              <Typography variant="body1" color="textSecondary" paragraph>
                Create your first WhatsApp bot to get started!
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Create New Bot
              </Button>
            </Paper>
          </Grid>
        ) : (
          bots.map((bot) => (
            <Grid item xs={12} sm={6} md={4} key={bot._id}>
              <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" noWrap title={bot.name}>
                    {bot.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }} noWrap>
                    {bot.description || 'No description'}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getStatusChip(bot.status)}
                    <Typography variant="caption" color="textSecondary">
                      Created: {moment(bot.createdAt).format('MMM D, YYYY')}
                    </Typography>
                  </Box>
                  {bot.lastConnected && (
                    <Typography variant="caption" display="block" color="textSecondary">
                      Last connected: {moment(bot.lastConnected).format('MMM D, YYYY HH:mm')}
                    </Typography>
                  )}
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  {bot.status === 'connected' ? (
                    <Tooltip title="Stop Bot">
                      <IconButton color="error" onClick={() => handleStopBot(bot._id)}>
                        <StopIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Start Bot">
                      <IconButton color="success" onClick={() => handleStartBot(bot._id)}>
                        <StartIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="View Details">
                    <IconButton color="primary" onClick={() => handleViewBot(bot._id)}>
                      <MessageIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Bot">
                    <IconButton color="error" onClick={() => handleDeleteBot(bot._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
      
      {/* Create new bot dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New WhatsApp Bot</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Bot Name"
            type="text"
            fullWidth
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
            required
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            value={newBotDescription}
            onChange={(e) => setNewBotDescription(e.target.value)}
            variant="outlined"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleCreateBot} color="primary" variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* QR Code dialog */}
      <Dialog open={qrDialogOpen} onClose={handleCloseQrDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentQrBot ? `Connect ${currentQrBot.name}` : 'Connect WhatsApp'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', p: 2 }}>
            {currentQrBot && qrCodes[currentQrBot._id] ? (
              <>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Scan this QR code with your WhatsApp app to connect the bot
                </Typography>
                <Box 
                  component="img" 
                  src={qrCodes[currentQrBot._id]} 
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
                <Typography variant="caption" color="textSecondary">
                  This may take a few moments
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQrDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Alert Snackbar */}
      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alert.severity} 
          variant="filled"
          elevation={6}
        >
          {alert.message}
        </Alert>
      </Snackbar>
      
      {/* Mobile FAB for adding new bot */}
      <Box sx={{ display: { xs: 'block', sm: 'none' }, position: 'fixed', bottom: 16, right: 16 }}>
        <Fab color="primary" onClick={() => setOpenDialog(true)}>
          <AddIcon />
        </Fab>
      </Box>
    </Box>
  );
};

export default Dashboard; 