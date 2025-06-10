import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  // FormControl, InputLabel, Select, MenuItem - removed unused imports
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  LinearProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Refresh as RefreshIcon,
  PlayArrow as RunIcon,
  Link as LinkIcon,
  Timeline as TimelineIcon,
  List as ListIcon
} from '@mui/icons-material';
import axios from 'axios';
import authService from '../services/authService';

// Base API URL should be set based on environment
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1/mongo';

// Create a configured axios instance that handles authentication
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 300000, // 5 minute timeout to account for potential MongoDB delays
});

// Apply the same authentication interceptor as in authService
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const PaymentReconciliationDashboard = () => {
  // State for date range
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
  const [endDate, setEndDate] = useState(new Date());

  // State for data
  const [reconciliationStatus, setReconciliationStatus] = useState(null);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState([]);
  const [unreconciledRides, setUnreconciledRides] = useState([]);
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Pagination for transactions
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionRowsPerPage, setTransactionRowsPerPage] = useState(10);
  
  // Pagination for rides
  const [ridePage, setRidePage] = useState(0);
  const [rideRowsPerPage, setRideRowsPerPage] = useState(10);
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // State for dialogs
  const [isRunningReconciliation, setIsRunningReconciliation] = useState(false);
  const [isMatchTransactionDialogOpen, setIsMatchTransactionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedRideId, setSelectedRideId] = useState('');

  // Fetch reconciliation status
  const fetchReconciliationStatus = useCallback(async () => {
    try {
      const response = await apiClient.get(`/reconciliation/status`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      
      if (response.data.success) {
        setReconciliationStatus(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch reconciliation status');
      }
    } catch (err) {
      console.error('Error fetching reconciliation status:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch reconciliation status');
    }
  }, [startDate, endDate]);
  
  // Fetch unmatched transactions
  const fetchUnmatchedTransactions = useCallback(async () => {
    try {
      const response = await apiClient.get(`/reconciliation/unmatched-transactions`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      
      if (response.data.success) {
        setUnmatchedTransactions(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to fetch unmatched transactions');
      }
    } catch (err) {
      console.error('Error fetching unmatched transactions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch unmatched transactions');
    }
  }, [startDate, endDate]);
  
  // Fetch unreconciled rides
  const fetchUnreconciledRides = useCallback(async () => {
    try {
      const response = await apiClient.get(`/reconciliation/unreconciled-rides`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      
      if (response.data.success) {
        setUnreconciledRides(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to fetch unreconciled rides');
      }
    } catch (err) {
      console.error('Error fetching unreconciled rides:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch unreconciled rides');
    }
  }, [startDate, endDate]);
  
  // Load data when component mounts or when dependencies change
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetchReconciliationStatus(),
      activeTab === 'transactions' && fetchUnmatchedTransactions(),
      activeTab === 'rides' && fetchUnreconciledRides()
    ].filter(Boolean))
      .finally(() => {
        setLoading(false);
      });
  }, [fetchReconciliationStatus, fetchUnmatchedTransactions, fetchUnreconciledRides, activeTab, refreshKey]);
  
  // Handle refresh click
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  // Handle date change
  const handleDateChange = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  // Handle tab change
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    
    if (tabName === 'transactions' && unmatchedTransactions.length === 0) {
      fetchUnmatchedTransactions();
    } else if (tabName === 'rides' && unreconciledRides.length === 0) {
      fetchUnreconciledRides();
    }
  };
  
  // Handle run reconciliation
  const handleRunReconciliation = async () => {
    try {
      setIsRunningReconciliation(true);
      setError(null);
      
      const response = await apiClient.post(`/reconciliation/run-full`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Reconciliation process started successfully',
          severity: 'success'
        });
      } else {
        setError(response.data.message || 'Failed to start reconciliation process');
      }
    } catch (err) {
      console.error('Error running reconciliation:', err);
      setError(err.response?.data?.message || err.message || 'Failed to run reconciliation');
    } finally {
      setIsRunningReconciliation(false);
    }
  };
  
  // Handle transaction row click
  const handleTransactionRowClick = (transaction) => {
    setSelectedTransaction(transaction);
    setIsMatchTransactionDialogOpen(true);
  };
  
  // Handle match transaction
  const handleMatchTransaction = async () => {
    if (!selectedTransaction || !selectedRideId) {
      setSnackbar({
        open: true,
        message: 'Please select a transaction and enter a ride ID',
        severity: 'error'
      });
      return;
    }
    
    try {
      const response = await apiClient.post(`/reconciliation/match-transaction`, {
        transactionId: selectedTransaction._id,
        rideId: selectedRideId
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Transaction matched successfully',
          severity: 'success'
        });
        setIsMatchTransactionDialogOpen(false);
        setSelectedTransaction(null);
        setSelectedRideId('');
        
        // Refresh unmatched transactions
        fetchUnmatchedTransactions();
      } else {
        setError(response.data.message || 'Failed to match transaction');
      }
    } catch (err) {
      console.error('Error matching transaction:', err);
      setError(err.response?.data?.message || err.message || 'Failed to match transaction');
    }
  };
  
  // Handle reconcile ride
  const handleReconcileRide = async (rideId) => {
    try {
      const response = await apiClient.post(`/reconciliation/reconcile-ride/${rideId}`, {});
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.requiresManualAction 
            ? 'Ride marked for manual reconciliation' 
            : 'Ride reconciled successfully',
          severity: 'success'
        });
        
        // Refresh unreconciled rides
        fetchUnreconciledRides();
      } else {
        setError(response.data.message || 'Failed to reconcile ride');
      }
    } catch (err) {
      console.error('Error reconciling ride:', err);
      setError(err.response?.data?.message || err.message || 'Failed to reconcile ride');
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Render status overview tab
  const renderOverviewTab = () => {
    if (!reconciliationStatus) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress />
        </Box>
      );
    }
    
    const { reconciliationStatus: rideStatus, transactionStatus } = reconciliationStatus;
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ride Reconciliation Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Completed Rides:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">
                    {rideStatus.completedRides}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Reconciled Rides:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">
                    {rideStatus.reconciledRides}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Unreconciled Rides:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" color="error">
                    {rideStatus.unreconciledRides}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Reconciliation Rate:
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={rideStatus.reconciledPercentage} 
                    color={rideStatus.reconciledPercentage > 90 ? "success" : rideStatus.reconciledPercentage > 70 ? "info" : "warning"}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                    {rideStatus.reconciledPercentage}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Transaction Matching Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Total Transactions:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">
                    {transactionStatus.totalTransactions}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Matched Transactions:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">
                    {transactionStatus.matchedTransactions}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Unmatched Transactions:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" color="error">
                    {transactionStatus.unmatchedTransactions}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Matching Rate:
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={transactionStatus.matchedPercentage} 
                    color={transactionStatus.matchedPercentage > 90 ? "success" : transactionStatus.matchedPercentage > 70 ? "info" : "warning"}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                    {transactionStatus.matchedPercentage}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">
                  Run Reconciliation Process
                </Typography>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RunIcon />}
                  onClick={handleRunReconciliation}
                  disabled={isRunningReconciliation}
                >
                  {isRunningReconciliation ? 'Running...' : 'Run Reconciliation'}
                </Button>
              </Box>
              
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Running the reconciliation process will attempt to match all unreconciled transactions 
                    and mark all unreconciled rides. The process runs in the background and may take several minutes 
                    to complete.
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    After completion, refresh this dashboard to see updated statistics.
                  </Typography>
              
              {isRunningReconciliation && (
                <LinearProgress sx={{ mt: 2 }} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };
  
  // Render unmatched transactions tab
  const renderTransactionsTab = () => {
    return (
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="unmatched transactions table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Gateway</TableCell>
                <TableCell>Gateway ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : unmatchedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No unmatched transactions found
                  </TableCell>
                </TableRow>
              ) : (
                unmatchedTransactions
                  .slice(
                    transactionPage * transactionRowsPerPage,
                    transactionPage * transactionRowsPerPage + transactionRowsPerPage
                  )
                  .map((transaction) => (
                    <TableRow 
                      key={transaction._id}
                      hover
                      onClick={() => handleTransactionRowClick(transaction)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{transaction._id.substring(0, 8)}...</TableCell>
                      <TableCell>{transaction.amount} {transaction.currency}</TableCell>
                      <TableCell>{transaction.gateway}</TableCell>
                      <TableCell>{transaction.gatewayTransactionId?.substring(0, 12)}...</TableCell>
                      <TableCell>
                        <Chip 
                          label={transaction.status} 
                          color={transaction.status === 'completed' ? 'success' : 'warning'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <IconButton color="primary" onClick={(e) => {
                          e.stopPropagation();
                          handleTransactionRowClick(transaction);
                        }}>
                          <LinkIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={unmatchedTransactions.length}
          rowsPerPage={transactionRowsPerPage}
          page={transactionPage}
          onPageChange={(event, newPage) => setTransactionPage(newPage)}
          onRowsPerPageChange={(event) => {
            setTransactionRowsPerPage(parseInt(event.target.value, 10));
            setTransactionPage(0);
          }}
        />
      </Paper>
    );
  };
  
  // Render unreconciled rides tab
  const renderRidesTab = () => {
    return (
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="unreconciled rides table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Origin</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Completed At</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : unreconciledRides.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No unreconciled rides found
                  </TableCell>
                </TableRow>
              ) : (
                unreconciledRides
                  .slice(
                    ridePage * rideRowsPerPage,
                    ridePage * rideRowsPerPage + rideRowsPerPage
                  )
                  .map((ride) => (
                    <TableRow key={ride._id}>
                      <TableCell>{ride._id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <Chip 
                          label={ride.paymentStatus || ride.status} 
                          color={ride.paymentStatus === 'reconciled' ? 'success' : 
                                 ride.paymentStatus === 'manual_reconciliation_required' ? 'warning' : 'primary'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{ride.origin?.address?.substring(0, 20) || "N/A"}...</TableCell>
                      <TableCell>{ride.destination?.address?.substring(0, 20) || "N/A"}...</TableCell>
                      <TableCell>{ride.completedAt ? new Date(ride.completedAt).toLocaleString() : "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleReconcileRide(ride._id)}
                        >
                          Reconcile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={unreconciledRides.length}
          rowsPerPage={rideRowsPerPage}
          page={ridePage}
          onPageChange={(event, newPage) => setRidePage(newPage)}
          onRowsPerPageChange={(event) => {
            setRideRowsPerPage(parseInt(event.target.value, 10));
            setRidePage(0);
          }}
        />
      </Paper>
    );
  };
  
  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Payment Reconciliation</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>
      
      {/* Date Range Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => {
                  setStartDate(newValue);
                }}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} sm={5} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => {
                  setEndDate(newValue);
                }}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} sm={2} md={4}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleDateChange}
            >
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={1}>
          <Grid item>
            <Button
              variant={activeTab === 'overview' ? 'contained' : 'outlined'}
              startIcon={<TimelineIcon />}
              onClick={() => handleTabChange('overview')}
            >
              Overview
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant={activeTab === 'transactions' ? 'contained' : 'outlined'}
              startIcon={<ListIcon />}
              onClick={() => handleTabChange('transactions')}
            >
              Unmatched Transactions
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant={activeTab === 'rides' ? 'contained' : 'outlined'}
              startIcon={<ListIcon />}
              onClick={() => handleTabChange('rides')}
            >
              Unreconciled Rides
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      {/* Active Tab Content */}
      <Box mb={3}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'transactions' && renderTransactionsTab()}
        {activeTab === 'rides' && renderRidesTab()}
      </Box>
      
      {/* Match Transaction Dialog */}
      <Dialog open={isMatchTransactionDialogOpen} onClose={() => setIsMatchTransactionDialogOpen(false)}>
        <DialogTitle>Match Transaction to Ride</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the Ride ID to match with this transaction.
          </DialogContentText>
          
          {selectedTransaction && (
            <Box sx={{ mt: 2, mb: 3 }}>
              <Typography variant="subtitle2">Transaction Details:</Typography>
              <Typography variant="body2">
                ID: {selectedTransaction._id}
              </Typography>
              <Typography variant="body2">
                Amount: {selectedTransaction.amount} {selectedTransaction.currency}
              </Typography>
              <Typography variant="body2">
                Gateway ID: {selectedTransaction.gatewayTransactionId}
              </Typography>
            </Box>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            id="rideId"
            label="Ride ID"
            type="text"
            fullWidth
            variant="outlined"
            value={selectedRideId}
            onChange={(e) => setSelectedRideId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsMatchTransactionDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleMatchTransaction} color="primary" variant="contained">
            Match
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PaymentReconciliationDashboard;
