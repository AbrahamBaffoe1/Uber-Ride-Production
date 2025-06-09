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
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { 
  Path, 
  Circle, 
  Rect, 
  Ellipse,
  Defs,
  ClipPath,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText
} from 'react-native-svg';

type OnboardingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const { width, height } = Dimensions.get('window');

// Color Palette - keeping consistent with previous
const COLORS = {
  PRIMARY: '#6B4EFF',      // Purple
  PRIMARY_LIGHT: '#9B85FF', // Lighter purple
  ACCENT: '#FF6B6B',       // Pink/Red accent
  ACCENT_LIGHT: '#FFA5A5', // Light pink
  YELLOW: '#FFB930',       // Bright yellow
  YELLOW_LIGHT: '#FFD68A', // Light yellow
  BLACK: '#121212',        // Deep black  
  WHITE: '#FFFFFF',        // White
  BACKGROUND: '#E5DBFF',   // Light purple background
  TEXT_GRAY: '#666666'     // Gray text
};

// SVG Illustrations - Improved sleeker versions
const BikeIllustration: React.FC = () => (
  <Svg width={220} height={220} viewBox="0 0 220 220">
    <Defs>
      <SvgLinearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.PRIMARY} />
        <Stop offset="1" stopColor={COLORS.PRIMARY_LIGHT} />
      </SvgLinearGradient>
      <SvgLinearGradient id="yellowGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.YELLOW} />
        <Stop offset="1" stopColor={COLORS.YELLOW_LIGHT} />
      </SvgLinearGradient>
      <SvgLinearGradient id="pinkGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.ACCENT} />
        <Stop offset="1" stopColor={COLORS.ACCENT_LIGHT} />
      </SvgLinearGradient>
    </Defs>
    
    {/* Yellow oval */}
    <Ellipse cx={130} cy={50} rx={30} ry={35} fill="url(#yellowGradient)" />
    
    {/* Pink oval */}
    <Ellipse cx={160} cy={60} rx={18} ry={22} fill="url(#pinkGradient)" />
    
    {/* Card with purple gradient */}
    <Rect x={40} y={40} width={120} height={100} rx={18} fill="url(#cardGradient)" />
    
    {/* Smiley face */}
    <Circle cx={70} cy={70} r={14} fill={COLORS.YELLOW} />
    <Circle cx={65} cy={67} r={2.5} fill={COLORS.BLACK} />
    <Circle cx={75} cy={67} r={2.5} fill={COLORS.BLACK} />
    <Path d="M63,73 Q70,78 77,73" stroke={COLORS.BLACK} strokeWidth={2} fill="none" />
    
    {/* H letter */}
    <SvgText x={100} y={70} fontSize={26} fontWeight="bold" fill={COLORS.WHITE}>H</SvgText>
    
    {/* Flower */}
    <Circle cx={85} cy={95} r={6} fill={COLORS.WHITE} />
    <Ellipse cx={79} cy={89} rx={6} ry={5} fill={COLORS.WHITE} />
    <Ellipse cx={91} cy={89} rx={6} ry={5} fill={COLORS.WHITE} />
    <Ellipse cx={79} cy={101} rx={6} ry={5} fill={COLORS.WHITE} />
    <Ellipse cx={91} cy={101} rx={6} ry={5} fill={COLORS.WHITE} />
    
    {/* Sparkle */}
    <Path d="M125,70 L132,77 L125,84 L118,77 Z" fill={COLORS.ACCENT} />
    
    {/* Pink blob below */}
    <Ellipse cx={70} cy={150} rx={20} ry={25} fill="url(#pinkGradient)" opacity={0.7} />
  </Svg>
);

const ClockIllustration: React.FC = () => (
  <Svg width={220} height={220} viewBox="0 0 220 220">
    <Defs>
      <SvgLinearGradient id="clockGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.YELLOW} />
        <Stop offset="1" stopColor={COLORS.YELLOW_LIGHT} />
      </SvgLinearGradient>
      <SvgLinearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.ACCENT} />
        <Stop offset="1" stopColor={COLORS.ACCENT_LIGHT} />
      </SvgLinearGradient>
      <SvgLinearGradient id="purpleGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.PRIMARY} />
        <Stop offset="1" stopColor={COLORS.PRIMARY_LIGHT} />
      </SvgLinearGradient>
    </Defs>
    
    {/* Sparkle */}
    <Path d="M75,50 L82,40 L89,50 L99,57 L89,64 L82,74 L75,64 L65,57 Z" fill="url(#accentGradient)" />
    
    {/* Alarm clock body */}
    <Circle cx={110} cy={120} r={55} fill="url(#clockGradient)" />
    <Circle cx={110} cy={120} r={50} fill="url(#clockGradient)" stroke={COLORS.ACCENT} strokeWidth={2.5} />
    
    {/* Clock face */}
    <Circle cx={110} cy={120} r={42} fill={COLORS.YELLOW_LIGHT} opacity={0.4} />
    
    {/* Clock tick marks */}
    <Path d="M110,85 L110,90" stroke={COLORS.ACCENT} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M110,150 L110,155" stroke={COLORS.ACCENT} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M75,120 L80,120" stroke={COLORS.ACCENT} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M140,120 L145,120" stroke={COLORS.ACCENT} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M86,96 L90,100" stroke={COLORS.ACCENT} strokeWidth={2} strokeLinecap="round" />
    <Path d="M130,140 L134,144" stroke={COLORS.ACCENT} strokeWidth={2} strokeLinecap="round" />
    <Path d="M86,144 L90,140" stroke={COLORS.ACCENT} strokeWidth={2} strokeLinecap="round" />
    <Path d="M130,100 L134,96" stroke={COLORS.ACCENT} strokeWidth={2} strokeLinecap="round" />
    
    {/* Clock hands */}
    <Path d="M110,120 L110,90" stroke={COLORS.WHITE} strokeWidth={4} strokeLinecap="round" />
    <Path d="M110,120 L140,130" stroke="url(#purpleGradient)" strokeWidth={6} strokeLinecap="round" />
    
    {/* Clock center */}
    <Circle cx={110} cy={120} r={6} fill={COLORS.WHITE} />
    <Circle cx={110} cy={120} r={3} fill={COLORS.ACCENT} />
    
    {/* Clock stand */}
    <Rect x={95} y={175} width={30} height={8} rx={4} fill="url(#accentGradient)" />
    <Rect x={107} y={175} width={6} height={15} fill="url(#accentGradient)" />
    
    {/* Clock bells */}
    <Circle cx={85} cy={75} r={6} fill="url(#accentGradient)" />
    <Circle cx={135} cy={75} r={6} fill="url(#accentGradient)" />
    <Rect x={85} y={69} width={50} height={6} rx={3} fill="url(#accentGradient)" />
  </Svg>
);

const SafetyIllustration: React.FC = () => (
  <Svg width={220} height={220} viewBox="0 0 220 220">
    <Defs>
      <SvgLinearGradient id="safetyPurple" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.PRIMARY} />
        <Stop offset="1" stopColor={COLORS.PRIMARY_LIGHT} />
      </SvgLinearGradient>
      <SvgLinearGradient id="safetyYellow" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.YELLOW} />
        <Stop offset="1" stopColor={COLORS.YELLOW_LIGHT} />
      </SvgLinearGradient>
      <SvgLinearGradient id="safetyPink" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.ACCENT} />
        <Stop offset="1" stopColor={COLORS.ACCENT_LIGHT} />
      </SvgLinearGradient>
    </Defs>
    
    {/* Star shape */}
    <Path 
      d="M110,40 L125,80 L170,80 L135,105 L150,150 L110,125 L70,150 L85,105 L50,80 L95,80 Z" 
      fill="url(#safetyYellow)" 
    />
    
    {/* Circle highlights */}
    <Circle cx={65} cy={60} r={15} fill="url(#safetyPink)" opacity={0.7} />
    <Circle cx={150} cy={65} r={20} fill="url(#safetyPurple)" opacity={0.5} />
    
    {/* Shield shape */}
    <Path 
      d="M110,70 C130,85 160,80 170,75 C170,130 140,160 110,180 C80,160 50,130 50,75 C60,80 90,85 110,70 Z" 
      fill="url(#safetyPurple)" 
      opacity={0.8}
    />
    
    {/* Check mark */}
    <Path 
      d="M85,120 L100,135 L135,100" 
      stroke={COLORS.WHITE} 
      strokeWidth={8} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      fill="none" 
    />
  </Svg>
);

// Define slides with illustrations
interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  illustration: React.ReactNode;
  buttonText: string;
  isDark?: boolean;
}

const onboardingSlides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Welcome to Okada',
    description: 'Your reliable motorcycle transportation service for fast travel across the city.',
    illustration: <BikeIllustration />,
    buttonText: 'Continue Now'
  },
  {
    id: 2,
    title: 'Beat the Traffic',
    description: 'Skip congestion and reach your destination quickly with our experienced riders.',
    illustration: <ClockIllustration />,
    buttonText: 'Next'
  },
  {
    id: 3,
    title: 'Safety First',
    description: 'All our riders are trained professionals with verified identities and safety equipment.',
    illustration: <SafetyIllustration />,
    buttonText: 'Get Started',
    isDark: true
  }
];

// Progress indicator component
const ProgressIndicator: React.FC<{current: number, total: number}> = ({current, total}) => {
  return (
    <View style={styles.progressContainer}>
      {Array.from({length: total}).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.progressDot,
            {
              width: index === current ? 18 : 6,
              opacity: index === current ? 1 : 0.4,
              backgroundColor: index === current ? COLORS.PRIMARY : COLORS.BLACK
            }
          ]}
        />
      ))}
    </View>
  );
};

// Progress indicator for dark theme
const DarkProgressIndicator: React.FC<{current: number, total: number}> = ({current, total}) => {
  return (
    <View style={styles.progressContainer}>
      {Array.from({length: total}).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.progressDot,
            {
              width: index === current ? 18 : 6,
              opacity: index === current ? 1 : 0.4,
              backgroundColor: index === current ? COLORS.PRIMARY : COLORS.WHITE
            }
          ]}
        />
      ))}
    </View>
  );
};

// Main Onboarding Screen Component
const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;
  
  // Handle scroll events
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    
    if (index !== currentIndex) {
      setCurrentIndex(index);
      
      // Run animations
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(moveAnim, {
            toValue: -20,
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
          Animated.timing(moveAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  };
  
  // Handle button press
  const handleButtonPress = () => {
    if (currentIndex < onboardingSlides.length - 1) {
      // Go to next slide
      const nextIndex = currentIndex + 1;
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: width * nextIndex,
          animated: true
        });
      }
      setCurrentIndex(nextIndex);
    } else {
      // Final slide, complete onboarding
      completeOnboarding();
    }
  };
  
  // Handle skip button press
  const handleSkip = () => {
    completeOnboarding();
  };
  
  // Complete onboarding and navigate to login
  const completeOnboarding = async () => {
    try {
      // Mark onboarding as completed
      await AsyncStorage.setItem('@onboarded', 'true');
      
      // Navigate to Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      });
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      });
    }
  };
  
  const currentSlide = onboardingSlides[currentIndex];
  const isDarkTheme = currentSlide.isDark;
  
  return (
    <View style={styles.container}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
      />
      
      {/* Main content - Slides */}
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
        {onboardingSlides.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            {/* Background color */}
            <View 
              style={[
                styles.slideBackground, 
                { backgroundColor: slide.isDark ? COLORS.BLACK : COLORS.BACKGROUND }
              ]} 
            />
            
            {/* Header - Skip button and progress indicator */}
            <SafeAreaView style={styles.header}>
              <View style={styles.headerContent}>
                {slide.isDark ? (
                  <DarkProgressIndicator current={currentIndex} total={onboardingSlides.length} />
                ) : (
                  <ProgressIndicator current={currentIndex} total={onboardingSlides.length} />
                )}
                
                {index < onboardingSlides.length - 1 && (
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={[
                        styles.skipButtonText,
                        { color: slide.isDark ? COLORS.WHITE : COLORS.BLACK }
                      ]}
                    >
                      Skip
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </SafeAreaView>
            
            {/* Content */}
            <View style={styles.slideContent}>
              {/* Illustration Section */}
              <View style={styles.illustrationContainer}>
                <Animated.View
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: moveAnim }]
                  }}
                >
                  {slide.illustration}
                </Animated.View>
              </View>
              
              {/* Text Content Section */}
              <View style={styles.textContentWrapper}>
                <View style={styles.textContent}>
                  <Animated.View
                    style={{
                      opacity: fadeAnim,
                      transform: [{ translateY: moveAnim }]
                    }}
                  >
                    <Text style={styles.slideTitle}>{slide.title}</Text>
                    <Text style={styles.slideDescription}>{slide.description}</Text>
                    
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: slide.isDark ? COLORS.WHITE : COLORS.PRIMARY }
                      ]}
                      activeOpacity={0.7}
                      onPress={handleButtonPress}
                    >
                      <Text 
                        style={[
                          styles.actionButtonText,
                          { color: slide.isDark ? COLORS.BLACK : COLORS.WHITE }
                        ]}
                      >
                        {slide.buttonText}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
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
    backgroundColor: COLORS.BACKGROUND
  },
  slideScroll: {
    flex: 1
  },
  slideScrollContent: {
    flexGrow: 1
  },
  slide: {
    width: width,
    height: '100%'
  },
  slideBackground: {
    ...StyleSheet.absoluteFillObject
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 50,
    paddingHorizontal: 25,
    paddingBottom: 10
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 8
  },
  progressDot: {
    height: 6,
    borderRadius: 4,
    marginHorizontal: 3
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  skipButtonText: {
    fontWeight: '600',
    fontSize: 16
  },
  slideContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60
  },
  textContentWrapper: {
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5
  },
  textContent: {
    padding: 36,
    paddingBottom: Platform.OS === 'ios' ? 50 : 36
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: -0.5
  },
  slideDescription: {
    fontSize: 16,
    color: COLORS.TEXT_GRAY,
    lineHeight: 24,
    marginBottom: 36,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    paddingHorizontal: 15
  },
  actionButton: {
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
  }
});

export default OnboardingScreen;
