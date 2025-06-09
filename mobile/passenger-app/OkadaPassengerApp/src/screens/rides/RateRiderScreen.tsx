import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../navigation/types';
import { API_BASE_URL } from '../../api/config';
import SuccessScreen from '../../components/common/SuccessScreen';

type RateRiderScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RateRider'
>;

type RateRiderScreenRouteProp = RouteProp<
  RootStackParamList,
  'RateRider'
>;

interface Props {
  navigation: RateRiderScreenNavigationProp;
  route: RateRiderScreenRouteProp;
}

const RateRiderScreen: React.FC<Props> = ({ navigation, route }) => {
  const { rideId, riderName } = route.params;
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const handleStarPress = (selectedRating: number) => {
    setRating(selectedRating);
  };
  
  const handleSubmit = async () => {
    if (rating < 1) {
      Alert.alert('Rating Required', 'Please select at least one star to rate the rider');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating,
          feedback
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }
      
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert(
        'Error',
        'Failed to submit rating. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSuccessComplete = () => {
    // Return to home after delay
    setTimeout(() => {
      navigation.navigate('Home');
    }, 1000);
  };
  
  if (submitted) {
    return (
      <SuccessScreen
        title="Thank You!"
        message="Your rating has been submitted successfully"
        onAnimationComplete={handleSuccessComplete}
      />
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Rider</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.riderInfoContainer}>
          <Image
            source={require('../../../assets/images/default-avatar.png')}
            style={styles.riderImage}
          />
          <Text style={styles.riderName}>{riderName}</Text>
        </View>
        
        <Text style={styles.ratingLabel}>How was your experience?</Text>
        
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              onPress={() => handleStarPress(star)}
              style={styles.starButton}
            >
              <Image
                source={
                  star <= rating
                    ? require('../../../assets/images/star-filled.png')
                    : require('../../../assets/images/star-outline.png')
                }
                style={styles.starIcon}
              />
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackLabel}>Additional feedback (optional)</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Tell us about your experience"
            placeholderTextColor="#AAAAAA"
            multiline
            textAlignVertical="top"
            value={feedback}
            onChangeText={setFeedback}
          />
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('Home')}
          disabled={isSubmitting}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0066CC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  riderInfoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  riderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  riderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  starButton: {
    padding: 8,
  },
  starIcon: {
    width: 36,
    height: 36,
  },
  feedbackContainer: {
    marginBottom: 24,
  },
  feedbackLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  feedbackInput: {
    height: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666666',
    fontSize: 16,
  },
});

export default RateRiderScreen;
