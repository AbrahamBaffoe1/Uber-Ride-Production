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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  LockOpen as LockOpenIcon,
  Lock as LockIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  VerifiedUser as VerifiedUserIcon,
  VpnKey as VpnKeyIcon,
  VerifiedOutlined as VerifiedIcon,
  GppBad as UnverifiedIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import userService from '../services/userService';

const UserManagement = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  // These state variables are used by the fetchUsers function, but setters will be used in a future implementation
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState('desc');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Dialog state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  
  // User form state
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    roles: []
  });
  
  // Verification form state
  const [verificationFormData, setVerificationFormData] = useState({
    verifyEmail: false,
    verifyPhone: false
  });
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Available user roles
  const availableRoles = [
    { value: 'user', label: 'User' },
    { value: 'rider', label: 'Rider' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'admin', label: 'Admin' }
  ];
  
  // Fetch users from the API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        limit: pageSize,
        page: page + 1, // API uses 1-based indexing
        sort: `${sortOrder === 'desc' ? '-' : ''}${sortBy}`,
      };
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      if (filterRole !== 'all') {
        params.role = filterRole;
      }
      
      if (filterStatus !== 'all') {
        params.isActive = filterStatus === 'active';
      }
      
      const response = await userService.getUsers(params);
      
      if (response.success) {
        setUsers(response.data.users);
        setTotalUsers(response.data.pagination.total);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  }, [pageSize, page, sortBy, sortOrder, searchQuery, filterRole, filterStatus]);
  
  // Load users when component mounts or when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshKey]);
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  // Handle search submit
  const handleSearch = (event) => {
    event.preventDefault();
    setPage(0);
    setRefreshKey(oldKey => oldKey + 1);
  };
  
  // Handle refresh click
  const handleRefresh = () => {
    setRefreshKey(oldKey => oldKey + 1);
  };
  
  // Handle filter role change
  const handleFilterRoleChange = (event) => {
    setFilterRole(event.target.value);
    setPage(0);
  };
  
  // Handle filter status change
  const handleFilterStatusChange = (event) => {
    setFilterStatus(event.target.value);
    setPage(0);
  };
  
  // Sort functionality will be implemented in a future version
  
  // Handle create user dialog open
  const handleCreateUserDialogOpen = () => {
    setUserFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      roles: ['user']
    });
    setIsCreateDialogOpen(true);
  };
  
  // Handle edit user dialog open
  const handleEditUserDialogOpen = (user) => {
    setSelectedUser(user);
    setUserFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      roles: user.roles || []
    });
    setIsEditDialogOpen(true);
  };
  
  // Handle delete user dialog open
  const handleDeleteUserDialogOpen = (user) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle roles dialog open
  const handleRolesDialogOpen = (user) => {
    setSelectedUser(user);
    setUserFormData({
      ...userFormData,
      roles: user.roles || []
    });
    setIsRolesDialogOpen(true);
  };
  
  // Handle reset password dialog open
  const handleResetPasswordDialogOpen = (user) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  };
  
  // Handle verification dialog open
  const handleVerificationDialogOpen = (user) => {
    setSelectedUser(user);
    setVerificationFormData({
      verifyEmail: user.isEmailVerified || false,
      verifyPhone: user.isPhoneVerified || false
    });
    setIsVerificationDialogOpen(true);
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setIsRolesDialogOpen(false);
    setIsResetPasswordDialogOpen(false);
    setIsVerificationDialogOpen(false);
    setSelectedUser(null);
  };
  
  // Handle form input change
  const handleFormInputChange = (event) => {
    const { name, value } = event.target;
    setUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle verification toggle change
  const handleVerificationChange = (event) => {
    const { name, checked } = event.target;
    setVerificationFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  
  // Handle user create submit
  const handleCreateUser = async () => {
    try {
      const response = await userService.createUser(userFormData);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'User created successfully',
          severity: 'success'
        });
        handleDialogClose();
        setRefreshKey(oldKey => oldKey + 1);
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Failed to create user',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setSnackbar({
        open: true,
        message: err.message || 'An error occurred while creating user',
        severity: 'error'
      });
    }
  };
  
  // Handle user update submit
  const handleUpdateUser = async () => {
    try {
      const response = await userService.updateUser(selectedUser._id, userFormData);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'User updated successfully',
          severity: 'success'
        });
        handleDialogClose();
        setRefreshKey(oldKey => oldKey + 1);
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Failed to update user',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setSnackbar({
        open: true,
        message: err.message || 'An error occurred while updating user',
        severity: 'error'
      });
    }
  };
  
  // Handle user delete submit
  const handleDeleteUser = async () => {
    try {
      const response = await userService.deleteUser(selectedUser._id);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'User deleted successfully',
          severity: 'success'
        });
        handleDialogClose();
        setRefreshKey(oldKey => oldKey + 1);
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Failed to delete user',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setSnackbar({
        open: true,
        message: err.message || 'An error occurred while deleting user',
        severity: 'error'
      });
    }
  };
  
  // Handle update user role
  const handleUpdateRoles = async () => {
    try {
      const response = await userService.updateUserRoles(selectedUser._id, userFormData.role);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'User role updated successfully',
          severity: 'success'
        });
        handleDialogClose();
        setRefreshKey(oldKey => oldKey + 1);
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Failed to update user role',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setSnackbar({
        open: true,
        message: err.message || 'An error occurred while updating user role',
        severity: 'error'
      });
    }
  };
  
  // Handle update user verification status
  const handleUpdateVerification = async () => {
    try {
      const response = await userService.toggleVerification(selectedUser._id, verificationFormData);
      
      if (response.status === 'success') {
        setSnackbar({
          open: true,
          message: 'User verification status updated successfully',
          severity: 'success'
        });
        handleDialogClose();
        setRefreshKey(oldKey => oldKey + 1);
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Failed to update user verification status',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error updating user verification:', err);
      setSnackbar({
        open: true,
        message: err.message || 'An error occurred while updating user verification',
        severity: 'error'
      });
    }
  };
  
  // Handle reset password
  const handleResetPassword = async () => {
    try {
      const response = await userService.resetUserPassword(selectedUser._id);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Password reset email sent successfully',
          severity: 'success'
        });
        handleDialogClose();
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Failed to reset password',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setSnackbar({
        open: true,
        message: err.message || 'An error occurred while resetting password',
        severity: 'error'
      });
    }
  };
  
  // Handle toggle user lock status
  const handleToggleLockStatus = async (user) => {
    try {
      const response = await userService.setUserLockStatus(user._id, !user.isLocked);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: `User ${user.isLocked ? 'unlocked' : 'locked'} successfully`,
          severity: 'success'
        });
        setRefreshKey(oldKey => oldKey + 1);
      } else {
        setSnackbar({
          open: true,
          message: response.message || `Failed to ${user.isLocked ? 'unlock' : 'lock'} user`,
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error toggling lock status:', err);
      setSnackbar({
        open: true,
        message: err.message || `An error occurred while ${user.isLocked ? 'unlocking' : 'locking'} user`,
        severity: 'error'
      });
    }
  };
  
  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Render role chip
  const renderRoleChip = (role = '') => {
    let color = 'default';
    
    switch (role) {
      case 'admin':
        color = 'error';
        break;
      case 'moderator':
        color = 'warning';
        break;
      case 'rider':
        color = 'info';
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip
        key={role}
        label={role.charAt(0).toUpperCase() + role.slice(1)}
        color={color}
        size="small"
        sx={{ mr: 0.5, mb: 0.5 }}
      />
    );
  };
  
  // Render verification status indicators
  const renderVerificationStatus = (user) => {
    return (
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={0.5}>
        <Chip
          icon={<EmailIcon />}
          label={user.isEmailVerified ? "Email Verified" : "Email Unverified"}
          color={user.isEmailVerified ? "success" : "default"}
          size="small"
          sx={{ mr: 0.5 }}
        />
        {user.phoneNumber && (
          <Chip
            icon={<PhoneIcon />}
            label={user.isPhoneVerified ? "Phone Verified" : "Phone Unverified"}
            color={user.isPhoneVerified ? "success" : "default"}
            size="small"
          />
        )}
      </Box>
    );
  };
  
  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateUserDialogOpen}
        >
          Add User
        </Button>
      </Box>
      
      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <form onSubmit={handleSearch}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="submit"
                        edge="end"
                        aria-label="search"
                      >
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </form>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="role-filter-label">Role</InputLabel>
              <Select
                labelId="role-filter-label"
                id="role-filter"
                value={filterRole}
                onChange={handleFilterRoleChange}
                label="Role"
              >
                <MenuItem value="all">All Roles</MenuItem>
                {availableRoles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                id="status-filter"
                value={filterStatus}
                onChange={handleFilterStatusChange}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="locked">Locked</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Refresh
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
      
      {/* Users Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Verification</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phoneNumber}</TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap">
                        {renderRoleChip(user.role)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isLocked ? 'Locked' : (user.isActive ? 'Active' : 'Inactive')}
                        color={user.isLocked ? 'error' : (user.isActive ? 'success' : 'default')}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {renderVerificationStatus(user)}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        aria-label="edit"
                        color="primary"
                        onClick={() => handleEditUserDialogOpen(user)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        aria-label="manage verification"
                        color={(!user.isEmailVerified && !user.isPhoneVerified) ? "warning" : "success"}
                        onClick={() => handleVerificationDialogOpen(user)}
                        size="small"
                      >
                        {(!user.isEmailVerified && !user.isPhoneVerified) ? <UnverifiedIcon /> : <VerifiedIcon />}
                      </IconButton>
                      <IconButton
                        aria-label="manage roles"
                        color="info"
                        onClick={() => handleRolesDialogOpen(user)}
                        size="small"
                      >
                        <VerifiedUserIcon />
                      </IconButton>
                      <IconButton
                        aria-label="reset password"
                        color="warning"
                        onClick={() => handleResetPasswordDialogOpen(user)}
                        size="small"
                      >
                        <VpnKeyIcon />
                      </IconButton>
                      <IconButton
                        aria-label="toggle lock"
                        color={user.isLocked ? 'success' : 'error'}
                        onClick={() => handleToggleLockStatus(user)}
                        size="small"
                      >
                        {user.isLocked ? <LockOpenIcon /> : <LockIcon />}
                      </IconButton>
                      <IconButton
                        aria-label="delete"
                        color="error"
                        onClick={() => handleDeleteUserDialogOpen(user)}
                        size="small"
                      >
                        <DeleteIcon />
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
          count={totalUsers}
          rowsPerPage={pageSize}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Fill in the details to create a new user.
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                name="firstName"
                label="First Name"
                fullWidth
                variant="outlined"
                value={userFormData.firstName}
                onChange={handleFormInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="lastName"
                label="Last Name"
                fullWidth
                variant="outlined"
                value={userFormData.lastName}
                onChange={handleFormInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={userFormData.email}
                onChange={handleFormInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="phoneNumber"
                label="Phone Number"
                fullWidth
                variant="outlined"
                value={userFormData.phoneNumber}
                onChange={handleFormInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="roles-label">Role</InputLabel>
                <Select
                  labelId="roles-label"
                  id="roles"
                  value={userFormData.role || 'user'}
                  onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                  label="Role"
                >
                  {availableRoles.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleCreateUser} color="primary" variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Update the user details.
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                name="firstName"
                label="First Name"
                fullWidth
                variant="outlined"
                value={userFormData.firstName}
                onChange={handleFormInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="lastName"
                label="Last Name"
                fullWidth
                variant="outlined"
                value={userFormData.lastName}
                onChange={handleFormInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={userFormData.email}
                onChange={handleFormInputChange}
                required
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="phoneNumber"
                label="Phone Number"
                fullWidth
                variant="outlined"
                value={userFormData.phoneNumber}
                onChange={handleFormInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleUpdateUser} color="primary" variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* User Role Dialog */}
      <Dialog open={isRolesDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Manage User Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Assign a role to the user.
          </DialogContentText>
          <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
            <InputLabel id="edit-role-label">Role</InputLabel>
            <Select
              labelId="edit-role-label"
              id="edit-role"
              value={userFormData.role || (selectedUser ? selectedUser.role : 'user')}
              onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
              label="Role"
            >
              {availableRoles.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleUpdateRoles} color="primary" variant="contained">
            Update Role
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Reset User Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset the password for this user? 
            An email with password reset instructions will be sent to the user.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleResetPassword} color="warning" variant="contained">
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Verification Dialog */}
      <Dialog open={isVerificationDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Manage User Verification</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Toggle verification status for this user.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={verificationFormData.verifyEmail}
                  onChange={handleVerificationChange}
                  name="verifyEmail"
                  color="success"
                />
              }
              label="Email Verified"
            />
            {selectedUser && selectedUser.phoneNumber && (
              <FormControlLabel
                control={
                  <Switch
                    checked={verificationFormData.verifyPhone}
                    onChange={handleVerificationChange}
                    name="verifyPhone"
                    color="success"
                  />
                }
                label="Phone Verified"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleUpdateVerification} color="primary" variant="contained">
            Update Verification
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

export default UserManagement;
