import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const cardWidth = (width - 52) / 2; // Account for padding and gap

export interface RiderMetricsCardProps {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  onPress?: () => void;
}

const RiderMetricsCard: React.FC<RiderMetricsCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  color,
  trend,
  onPress,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    const trendConfig = {
      up: { icon: 'trending-up', color: '#4CAF50' },
      down: { icon: 'trending-down', color: '#F44336' },
      neutral: { icon: 'remove', color: '#9E9E9E' }
    };
    
    return (
      <View style={[styles.trendContainer, { backgroundColor: `${trendConfig[trend].color}20` }]}>
        <Icon name={trendConfig[trend].icon} size={16} color={trendConfig[trend].color} />
      </View>
    );
  };

  const cardContent = (
    <View style={[styles.card, { width: cardWidth }]}>
      <LinearGradient
        colors={['#FFFFFF', '#FAFAFA']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <Icon name={icon} size={24} color={color} />
          </View>
          {getTrendIcon()}
        </View>
        
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={[styles.value, { color }]}>{value}</Text>
        
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </LinearGradient>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default RiderMetricsCard;
