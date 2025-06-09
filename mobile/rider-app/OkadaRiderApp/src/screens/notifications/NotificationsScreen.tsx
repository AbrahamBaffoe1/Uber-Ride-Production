// src/screens/notifications/NotificationsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/types';
import { notificationsService, Notification } from '../../api/services/notifications.service';
import { useFocusEffect } from '@react-navigation/native';

type NotificationsScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Notifications'>;

// Extended notification interface with UI properties
interface UINotification extends Notification {
  id: string; // Add id field explicitly
  actionable: boolean;
  actionText?: string;
  data?: any;
}

const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<UINotification[]>([]);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Fetch notifications whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchNotifications = async () => {
        try {
          setIsLoading(true);
          setNotifications([]); // Clear existing notifications first
          const notificationsData = await notificationsService.getNotifications();
          
          // Process notifications to add UI-specific properties
          const processedNotifications = notificationsData.map(notification => {
            const uiNotification: UINotification = {
              ...notification,
              id: notification._id, // Map MongoDB _id to id
              actionable: false,
              actionText: '',
              data: {}
            };
            
            // Add action properties based on notification type
            switch (notification.type) {
              case 'ride':
                uiNotification.actionable = true;
                uiNotification.actionText = 'View Details';
                uiNotification.data = { rideId: extractIdFromMessage(notification.message) };
                break;
              case 'payment':
                uiNotification.actionable = true;
                uiNotification.actionText = 'View Earnings';
                uiNotification.data = { paymentId: extractIdFromMessage(notification.message) };
                break;
              case 'system':
                if (notification.message.toLowerCase().includes('document')) {
                  uiNotification.actionable = true;
                  uiNotification.actionText = 'Update Document';
                  uiNotification.data = { documentId: extractIdFromMessage(notification.message) };
                }
                break;
              case 'promo':
                // No action for promo notifications
                break;
            }
            
            return uiNotification;
          });
          
          setNotifications(processedNotifications);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching notifications:', error);
          setIsLoading(false);
        }
      };

      // Helper function to extract IDs from notification messages
      function extractIdFromMessage(message: string): string {
        // Extract a potential ID from the message
        // This is a simple implementation - in a real app, the backend would provide structured data
        const matches = message.match(/ID:?\s*([A-Za-z0-9-]+)/i);
        return matches ? matches[1] : 'unknown';
      }
      
      fetchNotifications();
      
      return () => {
        // Any cleanup if needed
      };
    }, [])
  );

  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0) return;

    const unreadExists = notifications.some(notification => !notification.isRead);
    if (!unreadExists) {
      Alert.alert('Info', 'All notifications are already read');
      return;
    }

    try {
      setIsClearingAll(true);
      // Call the real API to mark all notifications as read
      await notificationsService.markAllAsRead();
      
      // Update the local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true,
        }))
      );
      setIsClearingAll(false);
    } catch (error) {
      setIsClearingAll(false);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const handleNotificationPress = async (notification: UINotification) => {
    // Mark notification as read if it isn't already
    if (!notification.isRead) {
      try {
        await notificationsService.markOneAsRead(notification.id);
        
        // Update the local state
        setNotifications(prevNotifications =>
          prevNotifications.map(item =>
            item.id === notification.id ? { ...item, isRead: true } : item
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'ride':
        navigation.navigate('RideDetails', { rideId: notification.data.rideId });
        break;
      case 'payment':
        navigation.navigate('Earnings');
        break;
      case 'system':
        if (notification.data.documentId) {
          navigation.navigate('Compliance');
        }
        break;
      case 'promo':
        // Just mark as read, no action
        break;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    // Make sure we're working with a valid Date object
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'ride':
        return require('../../../assets/images/ride-icon.png');
      case 'payment':
        return require('../../../assets/images/payment-icon.png');
      case 'system':
        return require('../../../assets/images/system-icon.png');
      case 'promo':
        return require('../../../assets/images/promotion-icon.png');
      default:
        return require('../../../assets/images/notification-icon.png');
    }
  };

  const renderNotificationItem = ({ item }: { item: UINotification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIconContainer}>
        <Image
          source={getNotificationIcon(item.type)}
          style={styles.notificationIcon}
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{formatTimestamp(item.createdAt)}</Text>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        {item.actionable && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleNotificationPress(item)}
          >
            <Text style={styles.actionButtonText}>{item.actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyNotifications = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('../../../assets/images/empty-notifications.png')}
        style={styles.emptyImage}
      />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        You don't have any notifications at the moment.
        Check back later for updates.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleMarkAllAsRead}
          disabled={isClearingAll || notifications.length === 0}
        >
          {isClearingAll ? (
            <ActivityIndicator size="small" color="#2E86DE" />
          ) : (
            <Text style={styles.clearButtonText}>Mark All Read</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && { flex: 1 }
        ]}
        ListEmptyComponent={renderEmptyNotifications}
        refreshing={isLoading}
        onRefresh={() => {
          setIsLoading(true);
          // Immediately refetch notifications when user pulls to refresh
          notificationsService.getNotifications()
            .then(notificationsData => {
              const processedData = notificationsData.map(notification => ({
                ...notification,
                id: notification._id,
                actionable: false,
                actionText: '',
                data: {}
              }));
              
              setNotifications(processedData);
              setIsLoading(false);
            })
            .catch(error => {
              console.error('Error refreshing notifications:', error);
              setIsLoading(false);
              Alert.alert('Error', 'Failed to refresh notifications. Please try again.');
            });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2E86DE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#2E86DE',
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  unreadNotification: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 3,
    borderLeftColor: '#2E86DE',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    width: 20,
    height: 20,
    tintColor: '#2E86DE',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2E86DE',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;
