// src/screens/auth/RiderInfoScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
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
  INPUT_BORDER: '#EEEEEE', // Light Gray
  INPUT_BG: '#F9F9F9',     // Off-White background
  INPUT_ACTIVE: '#FCF5E8', // Light yellow when active
  ERROR: '#FF5252',        // Error Red
  SUCCESS: '#4CAF50',      // Success Green
  SHADOW: 'rgba(249, 168, 38, 0.15)', // Shadow color with primary color tint
  CARD_BG: '#FFFFFF',      // Card background
  SECTION_BG: '#FAFAFA',   // Section background
};

type RiderInfoScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'RiderInfo'>;

// Create an enhanced dropdown component
const EnhancedDropdown = ({
  label,
  value,
  options,
  onSelect,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownAnimation = useRef(new Animated.Value(0)).current;

  const toggleDropdown = () => {
    const toValue = isOpen ? 0 : 1;
    
    setIsOpen(!isOpen);
    setIsFocused(!isOpen);
    
    Animated.spring(dropdownAnimation, {
      toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  // Close dropdown when option is selected
  const handleSelect = (option: string) => {
    onSelect(option);
    toggleDropdown();
  };

  // Get input status styling
  const getBorderColor = () => {
    if (isFocused) return COLORS.PRIMARY;
    if (value) return COLORS.SUCCESS;
    return COLORS.INPUT_BORDER;
  };

  const getBackgroundColor = () => {
    if (isFocused) return COLORS.INPUT_ACTIVE;
    return COLORS.INPUT_BG;
  };

  const maxHeight = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const iconRotation = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.dropdownContainer}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.dropdownSelector,
          { 
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor()
          }
        ]}
        onPress={toggleDropdown}
      >
        <Text 
          style={value ? styles.dropdownText : styles.dropdownPlaceholder}
        >
          {value || placeholder || `Select ${label}`}
        </Text>
        <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={isFocused ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
          />
        </Animated.View>
      </TouchableOpacity>
      
      <Animated.View style={[styles.optionsContainer, { maxHeight }]}>
        {isOpen && (
          <ScrollView
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            style={styles.optionsScrollView}
          >
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionItem,
                  index === options.length - 1 && styles.lastOptionItem
                ]}
                onPress={() => handleSelect(option)}
              >
                <Text style={[
                  styles.optionText,
                  option === value && styles.selectedOptionText
                ]}>
                  {option}
                </Text>
                {option === value && (
                  <Ionicons name="checkmark" size={18} color={COLORS.PRIMARY} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};

// Enhanced TextInput component
const EnhancedTextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  required?: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Get input status styling
  const getBorderColor = () => {
    if (isFocused) return COLORS.PRIMARY;
    if (value) return COLORS.SUCCESS;
    return COLORS.INPUT_BORDER;
  };

  const getBackgroundColor = () => {
    if (isFocused) return COLORS.INPUT_ACTIVE;
    return COLORS.INPUT_BG;
  };

  return (
    <View style={styles.inputContainer}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor()
          }
        ]}
        placeholder={placeholder || `Enter ${label}`}
        placeholderTextColor={COLORS.TEXT_SECONDARY}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
};

// Progress stepper component
const ProgressStepper = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { id: 1, title: 'Account' },
    { id: 2, title: 'Verify' },
    { id: 3, title: 'Details' },
    { id: 4, title: 'Documents' }
  ];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <View style={styles.stepItem}>
            <View 
              style={[
                styles.stepCircle,
                step.id < currentStep && styles.completedStepCircle,
                step.id === currentStep && styles.currentStepCircle
              ]}
            >
              {step.id < currentStep ? (
                <Ionicons name="checkmark" size={16} color={COLORS.BACKGROUND} />
              ) : (
                <Text 
                  style={[
                    styles.stepNumber,
                    step.id === currentStep && styles.currentStepNumber
                  ]}
                >
                  {step.id}
                </Text>
              )}
            </View>
            <Text 
              style={[
                styles.stepTitle,
                step.id === currentStep && styles.currentStepTitle
              ]}
            >
              {step.title}
            </Text>
          </View>
          
          {index < steps.length - 1 && (
            <View 
              style={[
                styles.stepConnector,
                index < currentStep - 1 && styles.completedStepConnector
              ]} 
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

// Section Card Component
const SectionCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

const RiderInfoScreen = () => {
  const navigation = useNavigation<RiderInfoScreenNavigationProp>();
  const [riderData, setRiderData] = useState({
    licenseNumber: '',
    licenseType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    vehiclePlateNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const licenseTypes = ['A - Motorcycle', 'B - Car', 'C - Commercial', 'D - Heavy Duty'];
  const years = Array.from({ length: 21 }, (_, i) => `${2025 - i}`); // Current year down to 20 years ago
  const vehicleColors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Silver', 'Gray', 'Brown', 'Orange', 'Purple', 'Gold', 'Other'];

  const handleChange = (field: string, value: string) => {
    setRiderData({
      ...riderData,
      [field]: value,
    });
  };

  const validateForm = () => {
    const requiredFields = [
      { field: 'licenseNumber', label: 'License Number' },
      { field: 'licenseType', label: 'License Type' },
      { field: 'vehicleMake', label: 'Vehicle Make' },
      { field: 'vehicleModel', label: 'Vehicle Model' },
      { field: 'vehicleYear', label: 'Vehicle Year' },
      { field: 'vehicleColor', label: 'Vehicle Color' },
      { field: 'vehiclePlateNumber', label: 'Vehicle Plate Number' },
    ];

    const emptyFields = requiredFields.filter(
      ({ field }) => !riderData[field]
    );

    if (emptyFields.length > 0) {
      Alert.alert(
        'Required Fields',
        `Please fill in the following fields: ${emptyFields.map(f => f.label).join(', ')}`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('DocumentUpload');
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Submission Failed', 'An error occurred. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidView}
        >
          {/* Top Blob */}
          <View style={styles.topBlobContainer}>
            <View style={styles.topBlob} />
          </View>
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Rider Information</Text>
              <Text style={styles.subtitle}>
                Please provide your license and vehicle details
              </Text>
            </View>

            {/* Progress Stepper */}
            <ProgressStepper currentStep={3} />

            <View style={styles.formContainer}>
              {/* License Information Section */}
              <SectionCard title="License Information">
                <EnhancedTextInput
                  label="License Number"
                  value={riderData.licenseNumber}
                  onChangeText={(value) => handleChange('licenseNumber', value)}
                  placeholder="Enter your license number"
                  required
                />

                <EnhancedDropdown
                  label="License Type"
                  value={riderData.licenseType}
                  options={licenseTypes}
                  onSelect={(value) => handleChange('licenseType', value)}
                  placeholder="Select license type"
                  required
                />
              </SectionCard>

              {/* Vehicle Information Section */}
              <SectionCard title="Vehicle Information">
                <EnhancedTextInput
                  label="Vehicle Make"
                  value={riderData.vehicleMake}
                  onChangeText={(value) => handleChange('vehicleMake', value)}
                  placeholder="E.g., Honda, Suzuki, Yamaha"
                  autoCapitalize="words"
                  required
                />

                <EnhancedTextInput
                  label="Vehicle Model"
                  value={riderData.vehicleModel}
                  onChangeText={(value) => handleChange('vehicleModel', value)}
                  placeholder="Enter vehicle model"
                  autoCapitalize="words"
                  required
                />

                <View style={styles.rowContainer}>
                  <View style={styles.halfColumn}>
                    <EnhancedDropdown
                      label="Vehicle Year"
                      value={riderData.vehicleYear}
                      options={years}
                      onSelect={(value) => handleChange('vehicleYear', value)}
                      placeholder="Select year"
                      required
                    />
                  </View>
                  <View style={styles.halfColumn}>
                    <EnhancedDropdown
                      label="Vehicle Color"
                      value={riderData.vehicleColor}
                      options={vehicleColors}
                      onSelect={(value) => handleChange('vehicleColor', value)}
                      placeholder="Select color"
                      required
                    />
                  </View>
                </View>

                <EnhancedTextInput
                  label="Vehicle Plate Number"
                  value={riderData.vehiclePlateNumber}
                  onChangeText={(value) => handleChange('vehiclePlateNumber', value)}
                  placeholder="Enter plate number"
                  autoCapitalize="characters"
                  required
                />
              </SectionCard>

              <TouchableOpacity
                style={[
                  styles.button, 
                  isLoading && styles.buttonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.BACKGROUND} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>CONTINUE</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.BACKGROUND} style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.formFooter}>
                <Text style={styles.noteText}>
                  All fields marked with <Text style={styles.requiredStar}>*</Text> are required
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    marginTop: 60,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  stepItem: {
    alignItems: 'center',
    width: 70,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.INPUT_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.INPUT_BORDER,
  },
  currentStepCircle: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  completedStepCircle: {
    backgroundColor: COLORS.SUCCESS,
    borderColor: COLORS.SUCCESS,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
  },
  currentStepNumber: {
    color: COLORS.BACKGROUND,
  },
  stepTitle: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  currentStepTitle: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  stepConnector: {
    height: 2,
    backgroundColor: COLORS.INPUT_BORDER,
    flex: 1,
    marginTop: -14,
  },
  completedStepConnector: {
    backgroundColor: COLORS.SUCCESS,
  },
  formContainer: {
    width: '100%',
  },
  sectionCard: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  sectionContent: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  requiredStar: {
    color: COLORS.ERROR,
    fontSize: 15,
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.TEXT_PRIMARY,
    borderWidth: 1.5,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownSelector: {
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  dropdownText: {
    fontSize: 15,
    color: COLORS.TEXT_PRIMARY,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
  },
  optionsContainer: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.INPUT_BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  optionsScrollView: {
    maxHeight: 200,
  },
  optionItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.INPUT_BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastOptionItem: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.TEXT_PRIMARY,
  },
  selectedOptionText: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfColumn: {
    width: '48%',
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    flexDirection: 'row',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: COLORS.PRIMARY_LIGHT,
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  formFooter: {
    marginTop: 16,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default RiderInfoScreen;