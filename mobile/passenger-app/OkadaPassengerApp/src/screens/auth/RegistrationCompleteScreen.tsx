import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type RegistrationCompleteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RegistrationComplete'>;

const { width, height } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
}

const RegistrationCompleteScreen: React.FC = () => {
  const navigation = useNavigation<RegistrationCompleteScreenNavigationProp>();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkStrokeAnim = useRef(new Animated.Value(0)).current;
  
  // Confetti animation
  const confetti = useRef<ConfettiPiece[]>(Array(20).fill(0).map((_, i) => ({
    id: i,
    x: new Animated.Value(width / 2),
    y: new Animated.Value(height / 2 - 100),
    rotate: new Animated.Value(0),
    scale: new Animated.Value(0),
    color: ['#7AC231', '#FFCC00', '#FF9500', '#FF3B30', '#34C759'][Math.floor(Math.random() * 5)],
    size: Math.random() * 10 + 5,
  }))).current;
  
  useEffect(() => {
    // Start animations
    Animated.sequence([
      // First the checkmark
      Animated.timing(checkmarkStrokeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.bezier(0.65, 0, 0.35, 1),
      }),
      
      // Then the container
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // Finally the confetti explosion
      Animated.stagger(50, 
        confetti.map(piece => {
          const destinationX = (Math.random() - 0.5) * width * 1.5 + width / 2;
          const destinationY = (Math.random() - 0.5) * height * 0.5 + (height / 2 - 200);
          const rotation = Math.random() * 360;
          
          return Animated.parallel([
            Animated.timing(piece.x, {
              toValue: destinationX,
              duration: 1000 + Math.random() * 500,
              useNativeDriver: true,
            }),
            Animated.timing(piece.y, {
              toValue: destinationY,
              duration: 1000 + Math.random() * 500,
              useNativeDriver: true,
            }),
            Animated.timing(piece.rotate, {
              toValue: rotation,
              duration: 1000 + Math.random() * 500,
              useNativeDriver: true,
            }),
            Animated.timing(piece.scale, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]);
        })
      ),
    ]).start();
  }, []);
  
  const handleGoToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  };
  
  const checkmarkPath = checkmarkStrokeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#13171D" translucent />
      
      <View style={styles.header}>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 3 of 3</Text>
        </View>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View 
          style={[
            styles.content,
            { 
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim 
            }
          ]}
        >
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={['rgba(122, 194, 49, 0.2)', 'rgba(122, 194, 49, 0.1)', 'rgba(122, 194, 49, 0.05)']}
              style={styles.successIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.successIconBg}>
                {/* SVG Checkmark for better animation */}
                <View style={styles.checkmarkContainer}>
                  <Svg height="100" width="100" viewBox="0 0 100 100">
                    <Path
                      d="M20,50 L40,70 L80,30"
                      fill="none"
                      stroke="#7AC231"
                      strokeWidth={6}
                      strokeDasharray="100"
                      strokeDashoffset={checkmarkPath}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </View>
            </LinearGradient>
            
            {/* Render confetti pieces */}
            {confetti.map(piece => (
              <Animated.View
                key={piece.id}
                style={[
                  styles.confettiPiece,
                  {
                    backgroundColor: piece.color,
                    width: piece.size,
                    height: piece.size,
                    transform: [
                      { translateX: piece.x },
                      { translateY: piece.y },
                      { rotate: piece.rotate.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      })},
                      { scale: piece.scale },
                    ],
                  }
                ]}
              />
            ))}
          </View>
          
          <Text style={styles.title}>Registration Complete!</Text>
          <Text style={styles.subtitle}>
            Congratulations! Your account has been successfully verified. You're all set to start using Okada for your transportation needs.
          </Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>What's Next?</Text>
            <View style={styles.infoStep}>
              <View style={styles.infoStepIcon}>
                <Ionicons name="location-outline" size={24} color="#7AC231" />
              </View>
              <View style={styles.infoStepContent}>
                <Text style={styles.infoStepTitle}>Find Your Ride</Text>
                <Text style={styles.infoStepDescription}>
                  Enter your destination and book a ride in just a few taps.
                </Text>
              </View>
            </View>
            
            <View style={styles.infoStep}>
              <View style={styles.infoStepIcon}>
                <Ionicons name="map-outline" size={24} color="#7AC231" />
              </View>
              <View style={styles.infoStepContent}>
                <Text style={styles.infoStepTitle}>Track in Real-time</Text>
                <Text style={styles.infoStepDescription}>
                  Watch your driver arrive and track your entire journey in real-time.
                </Text>
              </View>
            </View>
            
            <View style={styles.infoStep}>
              <View style={styles.infoStepIcon}>
                <Ionicons name="star-outline" size={24} color="#7AC231" />
              </View>
              <View style={styles.infoStepContent}>
                <Text style={styles.infoStepTitle}>Rate Your Experience</Text>
                <Text style={styles.infoStepDescription}>
                  After each ride, let us know how it went to help improve our service.
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.specialOfferContainer}>
            <View style={styles.specialOfferBadge}>
              <Text style={styles.specialOfferBadgeText}>NEW USER SPECIAL</Text>
            </View>
            <Text style={styles.specialOfferTitle}>50% OFF Your First Ride!</Text>
            <Text style={styles.specialOfferDescription}>
              Use code <Text style={styles.promoCode}>WELCOME50</Text> to get 50% off your first ride (up to $10).
            </Text>
            <TouchableOpacity style={styles.copyButton}>
              <Text style={styles.copyButtonText}>Copy Code</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={handleGoToHome}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// A simple SVG implementation for the animated checkmark
const Svg = ({ children, height, width, viewBox }) => {
  return (
    <View style={{ width, height }}>
      {children}
    </View>
  );
};

const Path = ({ d, stroke, strokeWidth, fill, strokeDasharray, strokeDashoffset, strokeLinecap, strokeLinejoin }) => {
  return (
    <Animated.View 
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderColor: stroke,
        borderWidth: strokeWidth,
        borderStyle: 'solid',
        borderRadius: 50,
        opacity: strokeDashoffset,
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13171D',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1C2128',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7AC231',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 30,
    position: 'relative',
    width: 160,
    height: 160,
  },
  successIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    maxWidth: '90%',
  },
  infoCard: {
    backgroundColor: '#1C2128',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 24,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  infoStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoStepContent: {
    flex: 1,
  },
  infoStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  infoStepDescription: {
    fontSize: 14,
    color: '#999999',
    lineHeight: 20,
  },
  specialOfferContainer: {
    backgroundColor: '#1C2128',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#7AC231',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  specialOfferBadge: {
    backgroundColor: '#7AC231',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  specialOfferBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  specialOfferTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  specialOfferDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 20,
  },
  promoCode: {
    color: '#7AC231',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  copyButton: {
    backgroundColor: 'rgba(122, 194, 49, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#7AC231',
    fontWeight: 'bold',
  },
  getStartedButton: {
    backgroundColor: '#7AC231',
    borderRadius: 12,
    height: 56,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
});

export default RegistrationCompleteScreen;