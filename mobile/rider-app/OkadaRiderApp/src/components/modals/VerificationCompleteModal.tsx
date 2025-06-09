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

interface VerificationCompleteModalProps {
  visible: boolean;
  onContinue: () => void;
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
  SUCCESS: '#4CAF50',      // Success Green
  SUCCESS_LIGHT: '#E8F5E9', // Light success background
};

const VerificationCompleteModal: React.FC<VerificationCompleteModalProps> = ({
  visible,
  onContinue,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      checkmarkOpacity.setValue(0);
      checkmarkScale.setValue(0);
      
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
          Animated.timing(checkmarkOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(checkmarkScale, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible, scaleAnim, checkmarkOpacity, checkmarkScale]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onContinue}
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
            <View style={styles.successIconContainer}>
              <View style={styles.outerCircle}>
                <Animated.View
                  style={[
                    styles.checkmarkContainer,
                    {
                      opacity: checkmarkOpacity,
                      transform: [{ scale: checkmarkScale }],
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-sharp"
                    size={42}
                    color={COLORS.BACKGROUND}
                  />
                </Animated.View>
              </View>
            </View>

            <Text style={styles.title}>Verification Complete!</Text>
            
            <Text style={styles.message}>
              Your phone number has been successfully verified. 
              You can now use all features of the Okada Rider app.
            </Text>
            
            <View style={styles.verificationInfoContainer}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.SUCCESS} style={styles.verificationIcon} />
              <Text style={styles.verificationText}>
                Your account has been officially verified and your profile is ready to use.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
              <Text style={styles.primaryButtonText}>Continue</Text>
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
  successIconContainer: {
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.SUCCESS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkContainer: {
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
  verificationInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_LIGHT,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  verificationIcon: {
    marginRight: 12,
  },
  verificationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VerificationCompleteModal;
