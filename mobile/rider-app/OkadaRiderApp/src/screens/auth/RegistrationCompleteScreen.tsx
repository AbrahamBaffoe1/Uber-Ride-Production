// src/screens/auth/RegistrationCompleteScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Linking,
  Easing,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Enhanced color palette
const COLORS = {
  PRIMARY: '#F9A826',      // Orange/Yellow
  PRIMARY_LIGHT: '#FFCB66', // Light Orange/Yellow
  PRIMARY_DARK: '#E08D12', // Darker Orange for pressed states
  BACKGROUND: '#FFFFFF',   // White
  TEXT_PRIMARY: '#333333', // Dark Gray
  TEXT_SECONDARY: '#999999', // Medium Gray
  SUCCESS: '#4CAF50',      // Success Green
  SHADOW: 'rgba(249, 168, 38, 0.15)', // Shadow color with primary color tint
  CARD_BG: '#FFFFFF',      // Card background
  SECTION_BG: '#FAFAFA',   // Section background
};

type RegistrationCompleteScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'RegistrationComplete'
>;

// Animated Motorcycle Component
const AnimatedMotorcycle = () => {
  const bikePositionX = useRef(new Animated.Value(-80)).current;
  const bikeBounce = useRef(new Animated.Value(0)).current;
  const bikeDirection = useRef(1); // 1 = right, -1 = left
  
  useEffect(() => {
    // Create animated ride sequence
    const startRideAnimation = () => {
      // Ride to center first
      Animated.timing(bikePositionX, {
        toValue: width / 2 - 30,
        duration: 1500,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1)),
      }).start(() => {
        // Wait a bit in center
        setTimeout(() => {
          // Start the back and forth animation
          rideBackAndForth();
        }, 500);
      });
    };
    
    // Continuous back and forth animation
    const rideBackAndForth = () => {
      // Set the target based on current direction
      const toValue = bikeDirection.current > 0 ? width - 80 : -20;
      
      Animated.timing(bikePositionX, {
        toValue: toValue,
        duration: 3000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }).start(() => {
        // Flip direction for next ride
        bikeDirection.current *= -1;
        rideBackAndForth();
      });
    };
    
    // Bouncing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bikeBounce, {
          toValue: -3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bikeBounce, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ])
    ).start();
    
    // Start the sequence
    startRideAnimation();
    
    // Clean up animations on unmount
    return () => {
      bikePositionX.stopAnimation();
      bikeBounce.stopAnimation();
    };
  }, []);
  
  // Derive the scale from the position for proper bike direction
  const bikeScaleX = bikePositionX.interpolate({
    inputRange: [0, width / 2, width],
    outputRange: [1, 1, -1], // Flip horizontally when going left
    extrapolate: 'clamp'
  });
  
  // Derive rotation from the bounce for natural movement
  const bikeRotation = bikeBounce.interpolate({
    inputRange: [-3, 0],
    outputRange: ['-2deg', '2deg'],
    extrapolate: 'clamp'
  });

  return (
    <View style={styles.bikeContainer}>
      {/* Road */}
      <View style={styles.bikeRoad} />
      
      {/* Motorcycle */}
      <Animated.View style={[
        styles.bikeWrapper,
        { 
          transform: [
            { translateX: bikePositionX },
            { translateY: bikeBounce },
            { scaleX: bikeScaleX },
            { rotate: bikeRotation }
          ] 
        }
      ]}>
        {/* Shadow */}
        <View style={styles.bikeShadow} />
        
        {/* Bike and rider */}
        <View style={styles.bikeIconContainer}>
          <Ionicons name="bicycle" size={40} color={COLORS.PRIMARY} />
        </View>
        <View style={styles.bikeDriver}>
          <Ionicons name="person" size={20} color={COLORS.PRIMARY_DARK} />
        </View>
        
        {/* Motion lines */}
        <Animated.View style={[styles.motionLine, styles.motionLine1]} />
        <Animated.View style={[styles.motionLine, styles.motionLine2]} />
      </Animated.View>
    </View>
  );
};

// Step component with progress number
const StepItem = ({ number, text }: { number: number, text: string }) => {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepNumberContainer}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <View style={styles.stepTextContainer}>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
};

// Success illustration component
const SuccessIllustration = () => {
  // Animations for the checkmark
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const checkRotation = useRef(new Animated.Value(0)).current;
  const pulsateAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // First animation: Appear with scale and rotation
    Animated.sequence([
      // Delay for document stack to settle
      Animated.delay(300),
      // Scale, rotate and fade in together
      Animated.parallel([
        Animated.timing(checkScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.back(1.2),
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(checkRotation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]),
      // After appearing, start pulsating
      Animated.delay(200),
    ]).start(() => {
      // Continuous gentle pulsating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulsateAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulsateAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          })
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.illustrationContainer}>
      {/* This is a custom SVG-style illustration created with Ionicons */}
      <View style={styles.illustrationCircle}>
        <View style={styles.documentsStack}>
          <View style={[styles.documentSheet, styles.documentSheet1]}>
            <Ionicons name="document-text" size={24} color={COLORS.PRIMARY_LIGHT} />
          </View>
          <View style={[styles.documentSheet, styles.documentSheet2]}>
            <Ionicons name="document-text" size={24} color={COLORS.PRIMARY} />
          </View>
          <View style={[styles.documentSheet, styles.documentSheet3]}>
            <Ionicons name="document-text" size={24} color={COLORS.PRIMARY_DARK} />
          </View>
        </View>
        
        {/* Animated checkmark circle */}
        <Animated.View 
          style={[
            styles.checkmarkCircle,
            {
              opacity: checkOpacity,
              transform: [
                { scale: checkScale },
                { rotate: checkRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-45deg', '0deg']
                  })
                },
                { scale: pulsateAnim } // Add pulsating effect
              ]
            }
          ]}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.BACKGROUND} />
        </Animated.View>
      </View>
    </View>
  );
};

const RegistrationCompleteScreen = () => {
  const navigation = useNavigation<RegistrationCompleteScreenNavigationProp>();
  const successAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const messageAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Trigger animations in sequence
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(messageAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
    
    // Button animation with delay
    Animated.sequence([
      Animated.delay(2000),
      Animated.spring(buttonAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleContact = (type: 'email' | 'phone') => {
    if (type === 'email') {
      Linking.openURL('mailto:support@okadasolution.com');
    } else {
      Linking.openURL('tel:+2348000000000');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Top Blob */}
        <View style={styles.topBlobContainer}>
          <View style={styles.topBlob} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.topSection}>
            {/* Success Animation */}
            <Animated.View 
              style={[
                styles.successContainer,
                {
                  opacity: successAnim,
                  transform: [
                    { scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1]
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={styles.successCircle}>
                <Ionicons name="checkmark-sharp" size={45} color={COLORS.BACKGROUND} />
              </View>
            </Animated.View>
            
            {/* Animated Motorcycle */}
            <AnimatedMotorcycle />
            
            {/* Title Animation */}
            <Animated.Text 
              style={[
                styles.title,
                {
                  opacity: titleAnim,
                  transform: [
                    { translateY: titleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              Registration Complete!
            </Animated.Text>
          </View>
          
          <View style={styles.middleSection}>
            {/* Registration Success Illustration */}
            <SuccessIllustration />
            
            {/* Message Animation in the middle */}
            <Animated.View 
              style={[
                styles.messageContainer,
                {
                  opacity: messageAnim,
                  transform: [
                    { translateY: messageAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              <Text style={styles.message}>
                Thank you for registering as an Okada rider. Your application has been submitted and is now under review.
              </Text>
              
              {/* Status Badge */}
              <View style={styles.statusBadge}>
                <Ionicons name="time-outline" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.statusText}>Typical review time: 24-48 hours</Text>
              </View>
            </Animated.View>
            
            {/* Next Steps Section */}
            <Animated.View 
              style={[
                styles.cardContainer,
                {
                  opacity: cardAnim,
                  transform: [
                    { translateY: cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              <Text style={styles.cardTitle}>What happens next?</Text>
              
              <StepItem 
                number={1} 
                text="Our team will review your application and documents"
              />
              
              <StepItem 
                number={2} 
                text="You will receive an SMS notification when approved"
              />
              
              <StepItem 
                number={3} 
                text="Once approved, you can start accepting ride requests"
              />
            </Animated.View>
          </View>
          
          <View style={styles.bottomSection}>
            {/* Button Animation */}
            <Animated.View
              style={[
                styles.buttonContainer,
                {
                  opacity: buttonAnim,
                  transform: [
                    { scale: buttonAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1]
                      })
                    }
                  ]
                }
              ]}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>GO TO LOGIN</Text>
                <Ionicons name="log-in-outline" size={18} color={COLORS.BACKGROUND} style={styles.buttonIcon} />
              </TouchableOpacity>
            </Animated.View>
            
            {/* Contact Section */}
            <View style={styles.contactContainer}>
              <View style={styles.contactRow}>
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => handleContact('email')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={16} color={COLORS.PRIMARY} />
                  <Text style={styles.contactText}>Email Support</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => handleContact('phone')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={16} color={COLORS.PRIMARY} />
                  <Text style={styles.contactText}>Call Support</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 20,
  },
  topSection: {
    alignItems: 'center',
  },
  middleSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    alignItems: 'center',
  },
  topBlobContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
    overflow: 'hidden',
    zIndex: 1,
  },
  topBlob: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.PRIMARY_LIGHT,
  },
  successContainer: {
    marginBottom: 5,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.SUCCESS,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bikeContainer: {
    width: width - 40, // Account for horizontal padding
    height: 70,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 5,
  },
  bikeRoad: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    position: 'absolute',
    bottom: 15,
    borderRadius: 1,
  },
  bikeWrapper: {
    position: 'absolute',
    bottom: 20,
    zIndex: 2,
  },
  bikeShadow: {
    width: 40,
    height: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    position: 'absolute',
    bottom: -6,
    left: 14,
  },
  bikeIconContainer: {
    position: 'relative',
  },
  bikeDriver: {
    position: 'absolute',
    top: -3,
    left: 8,
  },
  motionLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(249, 168, 38, 0.4)',
    borderRadius: 1,
  },
  motionLine1: {
    width: 12,
    right: -15,
    top: 22,
  },
  motionLine2: {
    width: 20,
    right: -25,
    top: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 6,
    textAlign: 'center',
  },
  // Success illustration styles
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  illustrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  documentsStack: {
    width: 40,
    height: 40,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentSheet: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
  },
  documentSheet1: {
    transform: [{ rotate: '-10deg' }, { translateX: -5 }],
  },
  documentSheet2: {
    transform: [{ rotate: '0deg' }],
  },
  documentSheet3: {
    transform: [{ rotate: '10deg' }, { translateX: 5 }],
  },
  checkmarkCircle: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.SUCCESS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 10,
    marginBottom: 12,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  stepNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumber: {
    color: COLORS.BACKGROUND,
    fontSize: 13,
    fontWeight: 'bold',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 13,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  statusText: {
    color: COLORS.PRIMARY,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 12,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: COLORS.BACKGROUND,
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  contactContainer: {
    width: '100%',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
  },
  contactText: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default RegistrationCompleteScreen;