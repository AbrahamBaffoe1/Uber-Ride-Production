import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import networkService, { NetworkStatus, QueuedOperation } from '../../services/network.service';
import { colors } from '../../styles/theme';

interface NetworkStatusIndicatorProps {
  showDetails?: boolean;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showDetails = true,
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkService.getNetworkStatus()
  );
  const [queuedOperations, setQueuedOperations] = useState<QueuedOperation[]>([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [animatedOpacity] = useState(new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Set up network status listener
    const unsubscribe = networkService.addListener((status) => {
      setNetworkStatus(status);

      // Show indicator when disconnected, hide when connected
      if (status === NetworkStatus.DISCONNECTED) {
        setIsVisible(true);
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (status === NetworkStatus.CONNECTED) {
        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setIsVisible(false);
        });
      }
    });

    // Initial check for queued operations
    updateQueuedOperations();

    // Set up an interval to update queued operations
    const interval = setInterval(updateQueuedOperations, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [animatedOpacity]);

  // Update the list of queued operations
  const updateQueuedOperations = () => {
    const operations = networkService.getPendingOperations();
    setQueuedOperations(operations);
  };

  // Handle tap on the indicator to show queued operations
  const handleIndicatorPress = () => {
    if (showDetails && networkStatus === NetworkStatus.DISCONNECTED) {
      updateQueuedOperations();
      setShowQueueModal(true);
    }
  };

  // Get indicator text based on network status
  const getStatusText = () => {
    switch (networkStatus) {
      case NetworkStatus.CONNECTED:
        return 'Online';
      case NetworkStatus.DISCONNECTED:
        return 'Offline';
      default:
        return 'Checking connection...';
    }
  };

  // Get icon based on network status
  const getStatusIcon = () => {
    switch (networkStatus) {
      case NetworkStatus.CONNECTED:
        return 'cloud-done-outline';
      case NetworkStatus.DISCONNECTED:
        return 'cloud-offline-outline';
      default:
        return 'help-outline';
    }
  };

  // Format the operation endpoint for display
  const formatEndpoint = (endpoint: string) => {
    // Extract the resource type from endpoint
    const parts = endpoint.split('/').filter(part => part.length > 0);
    if (parts.length === 0) return 'API Request';
    
    // Format the resource name nicely
    const resource = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return resource.replace(/-/g, ' ');
  };

  // If not visible, don't render anything
  if (!isVisible && networkStatus !== NetworkStatus.DISCONNECTED) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animatedOpacity,
            backgroundColor: networkStatus === NetworkStatus.DISCONNECTED ? colors.danger : colors.success,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.content}
          onPress={handleIndicatorPress}
          activeOpacity={showDetails ? 0.7 : 1}
        >
          <Ionicons name={getStatusIcon()} size={16} color="#fff" />
          <Text style={styles.text}>{getStatusText()}</Text>
          {networkStatus === NetworkStatus.DISCONNECTED && queuedOperations.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{queuedOperations.length}</Text>
            </View>
          )}
          {showDetails && networkStatus === NetworkStatus.DISCONNECTED && (
            <Ionicons name="chevron-down" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Modal to show queued operations */}
      <Modal
        visible={showQueueModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQueueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pending Operations</Text>
              <TouchableOpacity onPress={() => setShowQueueModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {queuedOperations.length === 0 ? (
              <Text style={styles.emptyMessage}>No pending operations</Text>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  These operations will be processed when you're back online
                </Text>
                <ScrollView style={styles.operationsList}>
                  {queuedOperations.map((op) => (
                    <View key={op.id} style={styles.operationItem}>
                      <View style={styles.operationHeader}>
                        <Text style={styles.operationMethod}>{op.method}</Text>
                        <Text style={styles.operationEndpoint}>
                          {formatEndpoint(op.endpoint)}
                        </Text>
                      </View>
                      <Text style={styles.operationTime}>
                        {new Date(op.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQueueModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    zIndex: 999,
    marginHorizontal: 20,
    borderRadius: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  operationsList: {
    maxHeight: 300,
  },
  operationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  operationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  operationMethod: {
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  operationEndpoint: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  operationTime: {
    fontSize: 12,
    color: '#666',
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NetworkStatusIndicator;
