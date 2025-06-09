import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TouchableWithoutFeedback 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CountryPicker, { Country, CountryCode } from '@perttu/react-native-country-picker-modal';

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCountryCode?: CountryCode;
  title: string;
  pickerType: 'countryCode' | 'countryOfResidence';
}

export const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedCountryCode = 'US',
  title,
  pickerType
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.contentWrapper}>
              <View style={styles.countryPickerContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                  >
                    <Feather name="x" size={24} color="#4B5563" />
                  </TouchableOpacity>
                </View>
                
                <CountryPicker
                  visible={true}
                  withFilter
                  withFlag
                  withCountryNameButton={false}
                  withAlphaFilter
                  withCallingCode
                  withEmoji
                  countryCode={selectedCountryCode}
                  containerButtonStyle={styles.countryPickerButton}
                  renderFlagButton={() => <View />} // Render nothing for flag button
                  onSelect={onSelect}
                  onClose={onClose}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100, // Add some space between top and content
  },
  countryPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  countryPickerButton: {
    padding: 10,
  },
});

export default CountryPickerModal;
