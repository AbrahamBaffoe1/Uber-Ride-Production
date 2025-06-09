import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

interface SuccessScreenProps {
  title: string;
  message: string;
  onAnimationComplete?: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ 
  title = 'Success!', 
  message = 'Your request was completed successfully',
  onAnimationComplete
}) => {
  const checkmarkScale = new Animated.Value(0);
  const checkmarkOpacity = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);

  useEffect(() => {
    // Animate check mark
    Animated.sequence([
      Animated.timing(checkmarkScale, {
        toValue: 1,
        duration: 500,
        easing: Easing.elastic(1),
        useNativeDriver: true
      }),
      Animated.timing(checkmarkOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      })
    ]).start(() => {
      // Callback when animation completes
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 1000);
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.checkmarkCircle,
            {
              opacity: checkmarkOpacity,
              transform: [{ scale: checkmarkScale }]
            }
          ]}
        >
          <View style={styles.checkmark}>
            <View style={styles.checkmarkStem} />
            <View style={styles.checkmarkKick} />
          </View>
        </Animated.View>
        
        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmark: {
    height: 50,
    width: 25,
    marginLeft: 8,
  },
  checkmarkStem: {
    height: 36,
    width: 6,
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 10,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  checkmarkKick: {
    height: 6,
    width: 20,
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 14,
    left: -4,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default SuccessScreen;
