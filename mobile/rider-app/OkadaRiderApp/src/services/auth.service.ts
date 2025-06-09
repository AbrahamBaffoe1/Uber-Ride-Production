import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/config';

export const getAuthToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem('authToken');
  return token || '';
};

export const handleTokenRefresh = async (): Promise<void> => {
  try {
    const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    if (!refreshTokenValue) throw new Error('No refresh token available');
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) throw new Error('Token refresh failed');
    
    const { token, refreshToken: newRefreshToken } = await response.json();
    await AsyncStorage.multiSet([
      ['authToken', token],
      ['refreshToken', newRefreshToken],
    ]);
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};
