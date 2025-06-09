import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService from '../../services/auth.service';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  countryCode?: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResetPasswordRequest {
  userId: string;
  code: string;
  newPassword: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  passwordResetRequested: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  passwordResetRequested: false,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials.identifier, credentials.password);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unexpected error occurred');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unexpected error occurred');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (identifier: string, { rejectWithValue }) => {
    try {
      await authService.requestPasswordReset(identifier);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unexpected error occurred');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (resetData: ResetPasswordRequest, { rejectWithValue }) => {
    try {
      await authService.resetPassword(resetData.userId, resetData.code, resetData.newPassword);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unexpected error occurred');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unexpected error occurred');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    await authService.logout();
    return true;
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    resetPasswordStatus: (state) => {
      state.passwordResetRequested = false;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      if (action.payload && action.payload.user) {
        state.isAuthenticated = true;
        state.user = action.payload.user;
      } else {
        state.isAuthenticated = false;
        state.user = null;
      }
      state.loading = false;
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = action.payload ? (action.payload as string) : 'Login failed';
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      // Registration usually doesn't log the user in automatically
      // They need to verify their account first
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ? (action.payload as string) : 'Registration failed';
    });

    // Forgot Password
    builder.addCase(forgotPassword.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.passwordResetRequested = false;
    });
    builder.addCase(forgotPassword.fulfilled, (state) => {
      state.loading = false;
      state.passwordResetRequested = true;
    });
    builder.addCase(forgotPassword.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ? (action.payload as string) : 'Password reset request failed';
      state.passwordResetRequested = false;
    });

    // Fetch Current User
    builder.addCase(fetchCurrentUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.isAuthenticated = !!action.payload;
      state.user = action.payload || null;
      state.loading = false;
      state.error = null;
    });
    builder.addCase(fetchCurrentUser.rejected, (state, action) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = action.payload ? (action.payload as string) : 'Failed to fetch user data';
    });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = null;
    });
  },
});

export const {
  clearError,
  updateUserProfile,
  resetPasswordStatus,
} = authSlice.actions;

export default authSlice.reducer;
