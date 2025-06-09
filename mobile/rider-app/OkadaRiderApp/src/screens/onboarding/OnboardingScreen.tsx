import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  SafeAreaView,
  Animated,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { 
  Path, 
  Circle, 
  Rect, 
  Ellipse,
  Defs,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Mask,
  Use,
  Text as SvgText
} from 'react-native-svg';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

type OnboardingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const { width, height } = Dimensions.get('window');

// Enhanced premium color palette
const COLORS = {
  PRIMARY: '#FF5B2D',      // Vibrant orange
  PRIMARY_LIGHT: '#FF8D6B', // Light orange
  PRIMARY_DARK: '#D63E12', // Dark orange
  
  SECONDARY: '#6C63FF',    // Purple
  SECONDARY_LIGHT: '#9590FF', // Light purple
  SECONDARY_DARK: '#4840D6', // Dark purple
  
  ACCENT: '#FFCB11',       // Yellow 
  ACCENT_LIGHT: '#FFE56B', // Light yellow
  ACCENT_DARK: '#D6A800',  // Dark yellow
  
  SUCCESS: '#00C17C',      // Green
  SUCCESS_LIGHT: '#7AEFC1', // Light green
  
  BLACK: '#1A1B1F',        // Deep black
  DARK_GRAY: '#2A2B31',    // Dark gray
  MEDIUM_GRAY: '#63656D',  // Medium gray
  LIGHT_GRAY: '#9A9CA6',   // Light gray
  
  WHITE: '#FFFFFF',
  OFF_WHITE: '#F9F9F9',
  
  TEXT_PRIMARY: '#1A1B1F',
  TEXT_SECONDARY: '#63656D',
  TEXT_TERTIARY: '#9A9CA6',
  
  GRADIENT: {
    ORANGE: ['#FF5B2D', '#FF8D6B'],
    PURPLE: ['#6C63FF', '#9590FF'],
    YELLOW: ['#FFCB11', '#FFE56B'],
    GREEN: ['#00C17C', '#7AEFC1']
  },
  
  SHADOW: 'rgba(0, 0, 0, 0.08)',
};

// SVG Illustrations - Enhanced and professional
const EarningsIllustration: React.FC = () => (
  <Svg width="300" height="300" viewBox="0 0 300 300">
    <Defs>
      <RadialGradient id="bgGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <Stop offset="0%" stopColor={COLORS.ACCENT_LIGHT} stopOpacity="0.3" />
        <Stop offset="100%" stopColor={COLORS.ACCENT} stopOpacity="0" />
      </RadialGradient>
      <SvgLinearGradient id="coinGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor={COLORS.ACCENT} />
        <Stop offset="100%" stopColor={COLORS.ACCENT_DARK} />
      </SvgLinearGradient>
      <SvgLinearGradient id="bikeGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor={COLORS.PRIMARY} />
        <Stop offset="100%" stopColor={COLORS.PRIMARY_DARK} />
      </SvgLinearGradient>
    </Defs>
    
    {/* Background elements */}
    <Circle cx="150" cy="150" r="130" fill="url(#bgGradient)" />
    
    {/* Flying coins */}
    <G transform="translate(80, 60)">
      <Circle cx="0" cy="0" r="20" fill="url(#coinGradient)" />
      <Circle cx="0" cy="0" r="15" fill={COLORS.ACCENT_LIGHT} stroke={COLORS.ACCENT} strokeWidth="1" />
      <SvgText x="0" y="5" fontSize="12" fontWeight="bold" textAnchor="middle" fill={COLORS.PRIMARY_DARK}>$</SvgText>
    </G>
    
    <G transform="translate(220, 80)">
      <Circle cx="0" cy="0" r="16" fill="url(#coinGradient)" />
      <Circle cx="0" cy="0" r="12" fill={COLORS.ACCENT_LIGHT} stroke={COLORS.ACCENT} strokeWidth="1" />
      <SvgText x="0" y="4" fontSize="10" fontWeight="bold" textAnchor="middle" fill={COLORS.PRIMARY_DARK}>$</SvgText>
    </G>
    
    <G transform="translate(180, 160)">
      <Circle cx="0" cy="0" r="22" fill="url(#coinGradient)" />
      <Circle cx="0" cy="0" r="17" fill={COLORS.ACCENT_LIGHT} stroke={COLORS.ACCENT} strokeWidth="1" />
      <SvgText x="0" y="5" fontSize="14" fontWeight="bold" textAnchor="middle" fill={COLORS.PRIMARY_DARK}>$</SvgText>
    </G>
    
    {/* Growth chart */}
    <Rect x="70" y="190" width="160" height="60" rx="8" fill={COLORS.WHITE} />
    <Path d="M80,230 L100,210 L120,220 L140,180 L160,190 L180,170 L200,150 L220,160" 
      stroke={COLORS.SUCCESS} 
      strokeWidth="3" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <Circle cx="100" cy="210" r="4" fill={COLORS.SUCCESS} />
    <Circle cx="140" cy="180" r="4" fill={COLORS.SUCCESS} />
    <Circle cx="180" cy="170" r="4" fill={COLORS.SUCCESS} />
    <Circle cx="220" cy="160" r="4" fill={COLORS.SUCCESS} />
    
    {/* Rider with money bag */}
    <G transform="translate(60,120) scale(1.1)">
      {/* Money bag */}
      <Path 
        d="M70,60 C90,50 110,50 130,60 L120,120 L80,120 Z" 
        fill={COLORS.ACCENT_LIGHT} 
        stroke={COLORS.ACCENT} 
        strokeWidth="2" 
      />
      <Path 
        d="M90,80 L110,80 M90,95 L110,95" 
        stroke={COLORS.ACCENT_DARK} 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* Rider */}
      <Circle cx="70" cy="55" r="15" fill={COLORS.SECONDARY} />
      <Path 
        d="M60,70 C60,70 60,85 70,95 C80,85 80,70 80,70" 
        fill={COLORS.SECONDARY}
      />
      <Path 
        d="M62,45 L66,50 M78,45 L74,50" 
        stroke={COLORS.BLACK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path 
        d="M67,60 C67,60 70,63 73,60" 
        stroke={COLORS.BLACK}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </G>
  </Svg>
);

const GrowthIllustration: React.FC = () => (
  <Svg width="300" height="300" viewBox="0 0 300 300">
    <Defs>
      <RadialGradient id="bgGradient2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <Stop offset="0%" stopColor={COLORS.SECONDARY_LIGHT} stopOpacity="0.3" />
        <Stop offset="100%" stopColor={COLORS.SECONDARY} stopOpacity="0" />
      </RadialGradient>
      <SvgLinearGradient id="ladderGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor={COLORS.SECONDARY} />
        <Stop offset="100%" stopColor={COLORS.SECONDARY_DARK} />
      </SvgLinearGradient>
    </Defs>
    
    {/* Background elements */}
    <Circle cx="150" cy="150" r="130" fill="url(#bgGradient2)" />
    
    {/* Career ladder */}
    <Rect x="100" y="60" width="10" height="200" rx="2" fill="url(#ladderGradient)" />
    <Rect x="190" y="60" width="10" height="200" rx="2" fill="url(#ladderGradient)" />
    
    {/* Ladder steps */}
    {[0, 1, 2, 3, 4, 5].map(i => (
      <Rect 
        key={i} 
        x="100" 
        y={90 + i * 30} 
        width="100" 
        height="5" 
        rx="2" 
        fill="url(#ladderGradient)" 
      />
    ))}
    
    {/* Level badges */}
    <G transform="translate(70, 90)">
      <Circle cx="0" cy="0" r="15" fill={COLORS.WHITE} />
      <SvgText x="0" y="5" fontSize="12" fontWeight="bold" textAnchor="middle">1</SvgText>
    </G>
    
    <G transform="translate(70, 150)">
      <Circle cx="0" cy="0" r="15" fill={COLORS.WHITE} />
      <SvgText x="0" y="5" fontSize="12" fontWeight="bold" textAnchor="middle">2</SvgText>
    </G>
    
    <G transform="translate(70, 210)">
      <Circle cx="0" cy="0" r="15" fill={COLORS.WHITE} />
      <SvgText x="0" y="5" fontSize="12" fontWeight="bold" textAnchor="middle">3</SvgText>
    </G>
    
    <G transform="translate(230, 90)">
      <Circle cx="0" cy="0" r="15" fill={COLORS.WHITE} />
      <SvgText x="0" y="5" fontSize="12" fontWeight="bold" textAnchor="middle">4</SvgText>
    </G>
    
    <G transform="translate(230, 150)">
      <Circle cx="0" cy="0" r="15" fill={COLORS.PRIMARY_LIGHT} />
      <SvgText x="0" y="5" fontSize="12" fontWeight="bold" textAnchor="middle">5</SvgText>
    </G>
    
    <G transform="translate(230, 210)">
      <Circle cx="0" cy="0" r="22" fill={COLORS.ACCENT} />
      <Circle cx="0" cy="0" r="18" fill={COLORS.ACCENT_LIGHT} />
      <SvgText x="0" y="5" fontSize="14" fontWeight="bold" textAnchor="middle">★</SvgText>
    </G>
    
    {/* Climbing person */}
    <G transform="translate(150, 120)">
      <Circle cx="0" cy="0" r="15" fill={COLORS.PRIMARY} />
      <Path 
        d="M-8,0 L8,0 M-5,-8 L-3,-5 M5,-8 L3,-5" 
        stroke={COLORS.WHITE}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path 
        d="M0,5 C-3,10 3,10 0,5" 
        stroke={COLORS.WHITE}
        strokeWidth="2"
        fill="none"
      />
      <Path 
        d="M-15,15 L-5,5 M15,15 L5,5" 
        stroke={COLORS.PRIMARY}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <Path 
        d="M0,15 L0,40" 
        stroke={COLORS.PRIMARY}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <Path 
        d="M-10,40 L0,30 L10,40" 
        stroke={COLORS.PRIMARY}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

const CommunityIllustration: React.FC = () => (
  <Svg width="300" height="300" viewBox="0 0 300 300">
    <Defs>
      <RadialGradient id="bgGradient3" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <Stop offset="0%" stopColor={COLORS.WHITE} stopOpacity="0.3" />
        <Stop offset="100%" stopColor={COLORS.WHITE} stopOpacity="0" />
      </RadialGradient>
      <SvgLinearGradient id="sunGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor={COLORS.ACCENT_LIGHT} />
        <Stop offset="100%" stopColor={COLORS.ACCENT} />
      </SvgLinearGradient>
    </Defs>
    
    {/* Background elements */}
    <Circle cx="150" cy="150" r="130" fill="url(#bgGradient3)" />
    
    {/* Sun/Success Icon */}
    <Circle cx="150" cy="80" r="30" fill="url(#sunGradient)" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
      <Path
        key={i}
        d={`M150,${80 - 40} L150,${80 - 50}`}
        stroke={COLORS.ACCENT}
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${i * 45}, 150, 80)`}
      />
    ))}
    
    {/* Group of people */}
    <G transform="translate(90, 150)">
      <Circle cx="0" cy="0" r="20" fill={COLORS.PRIMARY} />
      <Circle cx="0" cy="-8" r="8" fill={COLORS.PRIMARY_LIGHT} />
      <Path 
        d="M-7,0 C-7,10 7,10 7,0" 
        stroke={COLORS.PRIMARY_LIGHT}
        strokeWidth="2"
        fill="none"
      />
    </G>
    
    <G transform="translate(140, 180)">
      <Circle cx="0" cy="0" r="20" fill={COLORS.SECONDARY} />
      <Circle cx="0" cy="-8" r="8" fill={COLORS.SECONDARY_LIGHT} />
      <Path 
        d="M-7,0 C-7,10 7,10 7,0" 
        stroke={COLORS.SECONDARY_LIGHT}
        strokeWidth="2"
        fill="none"
      />
    </G>
    
    <G transform="translate(190, 150)">
      <Circle cx="0" cy="0" r="20" fill={COLORS.SUCCESS} />
      <Circle cx="0" cy="-8" r="8" fill={COLORS.SUCCESS_LIGHT} />
      <Path 
        d="M-7,0 C-7,10 7,10 7,0" 
        stroke={COLORS.SUCCESS_LIGHT}
        strokeWidth="2"
        fill="none"
      />
    </G>
    
    {/* Connection lines */}
    <Path 
      d="M110,150 L140,180 M140,180 L190,150" 
      stroke={COLORS.WHITE}
      strokeWidth="3"
      strokeDasharray="5,5"
    />
    
    {/* Rating stars */}
    <G transform="translate(100, 210)">
      {[0, 1, 2, 3, 4].map(i => (
        <Path
          key={i}
          d="M0,-10 L2,-3 L9,-3 L4,1 L6,8 L0,4 L-6,8 L-4,1 L-9,-3 L-2,-3 Z"
          fill={COLORS.ACCENT}
          transform={`translate(${i * 20}, 0)`}
        />
      ))}
    </G>
  </Svg>
);

// Define slides with the illustrations
interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  illustration: React.ReactNode;
  backgroundColor: string;
  mainColor: string;
  cardColor: string;
  buttonColor: string;
  textColor: string;
}

const onboardingSlides: OnboardingSlide[] = [
  {
    id: 1,
    title: "Earn More with Okada",
    description: "Join thousands of riders making reliable income with guaranteed fares, instant payouts, and bonuses for top performers.",
    illustration: <EarningsIllustration />,
    backgroundColor: COLORS.OFF_WHITE,
    mainColor: COLORS.PRIMARY,
    cardColor: COLORS.WHITE,
    buttonColor: COLORS.PRIMARY,
    textColor: COLORS.TEXT_PRIMARY
  },
  {
    id: 2,
    title: "Grow Your Career",
    description: "Advance from Rookie to Star Rider with exclusive perks, training opportunities, and leadership roles as you build your reputation.",
    illustration: <GrowthIllustration />,
    backgroundColor: COLORS.WHITE,
    mainColor: COLORS.SECONDARY,
    cardColor: COLORS.WHITE,
    buttonColor: COLORS.SECONDARY,
    textColor: COLORS.TEXT_PRIMARY
  },
  {
    id: 3,
    title: "Join Our Community",
    description: "Connect with fellow riders, share tips, and access support from our team committed to your success and wellbeing.",
    illustration: <CommunityIllustration />,
    backgroundColor: COLORS.BLACK,
    mainColor: COLORS.ACCENT,
    cardColor: COLORS.WHITE,
    buttonColor: COLORS.ACCENT,
    textColor: COLORS.WHITE
  }
];

// Enhanced animated progress indicator
const ProgressIndicator: React.FC<{current: number, total: number, mainColor: string}> = 
  ({current, total, mainColor}) => {
  
  // Refs for animation
  const animatedValues = useRef(
    Array(total).fill(0).map(() => new Animated.Value(0))
  ).current;
  
  // Update animation when current changes
  useEffect(() => {
    Animated.parallel(
      animatedValues.map((anim, index) => {
        return Animated.timing(anim, {
          toValue: index === current ? 1 : 0.2,
          duration: 300,
          useNativeDriver: true,
        });
      })
    ).start();
  }, [current, animatedValues]);
  
  return (
    <View style={styles.progressContainer}>
      {Array.from({length: total}).map((_, index) => {
        // Interpolate the scale and opacity
        const scale = animatedValues[index].interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [1, 1, 3]
        });
        
        const opacity = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 1]
        });
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor: index === current ? mainColor : COLORS.TEXT_TERTIARY,
                opacity,
                transform: [{ scale }]
              }
            ]}
          />
        );
      })}
    </View>
  );
};

// Main Onboarding Component
const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonBgAnim = useRef(new Animated.Value(0)).current;
  
  // Handle scroll events
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    
    if (index !== currentIndex) {
      setCurrentIndex(index);
      
      // Fade out and in animation
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  };
  
  // Button animation
  const animateButton = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonBgAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(buttonBgAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  };
  
  // Handle next button press
  const handleNext = () => {
    animateButton();
    
    if (currentIndex < onboardingSlides.length - 1) {
      // Go to next slide
      const nextIndex = currentIndex + 1;
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: width * nextIndex,
          animated: true
        });
      }
    } else {
      // Final slide, complete onboarding
      completeOnboarding();
    }
  };
  
  // Handle skip button press
  const handleSkip = () => {
    // Skip to last slide with animation
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: width * (onboardingSlides.length - 1),
          animated: true
        });
      }
      
      // Fade back in
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 300);
    });
  };
  
  // Complete onboarding and navigate to home
  const completeOnboarding = async () => {
    try {
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        // Mark onboarding as completed
        await AsyncStorage.setItem('@onboarded', 'true');
        
        // Navigate to Auth stack with Login screen
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'Auth',
            params: { screen: 'Login' }
          }]
        });
      });
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.reset({
        index: 0,
        routes: [{ 
          name: 'Auth',
          params: { screen: 'Login' }
        }]
      });
    }
  };
  
  const currentSlide = onboardingSlides[currentIndex];
  
  // Calculate button background color based on animation
  const buttonBgColor = buttonBgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [currentSlide.buttonColor, currentSlide.buttonColor === COLORS.ACCENT ? COLORS.ACCENT_DARK : (currentSlide.buttonColor === COLORS.PRIMARY ? COLORS.PRIMARY_DARK : COLORS.SECONDARY_DARK)]
  });
  
  return (
    <View style={[styles.container, { backgroundColor: currentSlide.backgroundColor }]}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle={currentSlide.backgroundColor === COLORS.BLACK ? "light-content" : "dark-content"} 
      />
      
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <ProgressIndicator 
            current={currentIndex} 
            total={onboardingSlides.length} 
            mainColor={currentSlide.mainColor} 
          />
          
          {currentIndex < onboardingSlides.length - 1 && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text 
                style={[
                  styles.skipButtonText,
                  { color: currentSlide.backgroundColor === COLORS.BLACK ? COLORS.WHITE : COLORS.TEXT_SECONDARY }
                ]}
              >
                Skip
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
      
      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={styles.slideScroll}
        contentContainerStyle={styles.slideScrollContent}
      >
        {onboardingSlides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            {/* Content */}
            <View style={styles.slideContent}>
              {/* Illustration */}
              <Animated.View 
                style={[
                  styles.illustrationContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY }]
                  }
                ]}
              >
                {slide.illustration}
              </Animated.View>
              
              {/* Text Content in Card */}
              <Animated.View 
                style={[
                  styles.textCardContainer,
                  {
                    backgroundColor: slide.cardColor,
                    opacity: fadeAnim,
                    transform: [{ translateY: translateY }]
                  }
                ]}
              >
                <View style={styles.textContent}>
                  <Text 
                    style={[
                      styles.slideTitle,
                      { color: slide.backgroundColor === COLORS.BLACK ? COLORS.BLACK : slide.mainColor }
                    ]}
                  >
                    {slide.title}
                  </Text>
                  
                  <Text style={styles.slideDescription}>
                    {slide.description}
                  </Text>
                  
                  <Animated.View 
                    style={{ 
                      width: '100%',
                      transform: [{ scale: buttonScaleAnim }]
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleNext}
                      style={styles.buttonContainer}
                    >
                      <Animated.View 
                        style={[
                          styles.actionButton,
                          { backgroundColor: buttonBgColor }
                        ]}
                      >
                        <Text style={styles.actionButtonText}>
                          {currentIndex < onboardingSlides.length - 1 ? "Continue" : "Start Earning Now"}
                        </Text>
                        <Ionicons 
                          name={currentIndex < onboardingSlides.length - 1 ? "arrow-forward" : "checkmark"} 
                          size={22} 
                          color={COLORS.WHITE} 
                          style={{ marginLeft: 8 }}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </Animated.View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 50,
    paddingHorizontal: 25,
    paddingBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  skipButton: {
    padding: 10,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  slideScroll: {
    flex: 1,
  },
  slideScrollContent: {
    flexGrow: 1,
  },
  slide: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 100,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  textCardContainer: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 5,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  textContent: {
    padding: 32,
    paddingBottom: Platform.OS === 'ios' ? 50 : 32,
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  slideDescription: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 26,
    marginBottom: 36,
    textAlign: 'center',
    paddingHorizontal: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonContainer: {
    width: '100%',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderRadius: 30,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
  },
  actionButtonText: {
    color: COLORS.WHITE,
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default OnboardingScreen;
