import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth.service';

// Define user interface
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  profilePicture?: string | null;
  country?: string;
  preferredCurrency?: string;
  passengerProfile?: {
    totalRides: number;
    savedAddresses: any[];
    preferredPaymentMethod: string | null;
  };
}

// Define context interface
interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserData: (userData: Partial<User>) => Promise<boolean>;
  refreshUserData: () => Promise<boolean>;
  token: string | null;
  updateToken: (newToken: string) => void;
  updatePreferredCurrency: (currencyCode: string) => Promise<boolean>;
}

// Create context with default values
export const AuthContext = createContext<AuthContextProps>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  updateUserData: async () => false,
  refreshUserData: async () => false,
  token: null,
  updateToken: () => {},
  updatePreferredCurrency: async () => false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for existing session on app start
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        setIsLoading(true);
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const storedToken = await AsyncStorage.getItem('auth_token');
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.login(email, password);
      
      if (response.success) {
        setUser(response.user);
        setToken(response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.register(userData);
      
      if (response.success) {
        // Auto-login after registration
        setUser(response.user);
        setToken(response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user data
  const updateUserData = async (userData: Partial<User>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.updateProfile(userData);
      
      if (response.success) {
        setUser(prevUser => {
          if (!prevUser) return response.user;
          return { ...prevUser, ...response.user };
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update user data error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh user data from server
  const refreshUserData = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Refresh user data error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update token
  const updateToken = (newToken: string) => {
    setToken(newToken);
    AsyncStorage.setItem('auth_token', newToken);
  };

  // Update preferred currency
  const updatePreferredCurrency = async (currencyCode: string): Promise<boolean> => {
    try {
      // First store in local storage
      await AsyncStorage.setItem('preferredCurrency', currencyCode);
      
      // If user is logged in, also update on server
      if (user) {
        return await updateUserData({ preferredCurrency: currencyCode });
      }
      return true;
    } catch (error) {
      console.error('Error updating preferred currency:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUserData,
        refreshUserData,
        token,
        updateToken,
        updatePreferredCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
