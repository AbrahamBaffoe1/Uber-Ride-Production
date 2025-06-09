import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RegistrationErrorModalProps {
  visible: boolean;
  onClose: () => void;
  onRetry: () => void;
  errorMessage: string;
}

const { width } = Dimensions.get('window');

// Enhanced color palette
const COLORS = {
  PRIMARY: '#F9A826',      // Orange/Yellow
  PRIMARY_LIGHT: '#FFCB66', // Light Orange/Yellow
  PRIMARY_DARK: '#E08D12', // Darker Orange for pressed states
  BACKGROUND: '#FFFFFF',   // White
  TEXT_PRIMARY: '#333333', // Dark Gray
  TEXT_SECONDARY: '#999999', // Medium Gray
  ERROR: '#FF5252',        // Error Red
  ERROR_LIGHT: '#FFEBEE',  // Light error background
};

const RegistrationErrorModal: React.FC<RegistrationErrorModalProps> = ({
  visible,
  onClose,
  onRetry,
  errorMessage,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const errorIconOpacity = useRef(new Animated.Value(0)).current;
  const errorIconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      errorIconOpacity.setValue(0);
      errorIconScale.setValue(0);
      
      // Start animations
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(errorIconOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(errorIconScale, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible, scaleAnim, errorIconOpacity, errorIconScale]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modalContent}>
            <View style={styles.errorIconContainer}>
              <View style={styles.outerCircle}>
                <Animated.View
                  style={[
                    styles.errorIconWrapper,
                    {
                      opacity: errorIconOpacity,
                      transform: [{ scale: errorIconScale }],
                    },
                  ]}
                >
                  <Ionicons
                    name="alert"
                    size={42}
                    color={COLORS.BACKGROUND}
                  />
                </Animated.View>
              </View>
            </View>

            <Text style={styles.title}>Registration Failed</Text>
            
            <Text style={styles.message}>
              {errorMessage || 'There was a problem creating your account. Please try again.'}
            </Text>
            
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={22} color={COLORS.ERROR} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Please check your internet connection and verify that you're using valid information.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  errorIconContainer: {
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.ERROR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ERROR_LIGHT,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
  },
});

export default RegistrationErrorModal;
