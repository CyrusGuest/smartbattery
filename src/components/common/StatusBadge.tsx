import React from 'react';
import { View, Text } from 'react-native';
import { DeviceState } from '../../types';

interface StatusBadgeProps {
  state: DeviceState;
  size?: 'sm' | 'lg';
}

const stateColors = {
  idle: 'bg-green-600',
  firing: 'bg-yellow-500',
  '--': 'bg-gray-700',
};

const stateLabels = {
  idle: 'READY',
  firing: 'ACTIVE',
  '--': '--',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, size = 'lg' }) => {
  const sizeClasses = size === 'lg' ? 'w-32 h-32' : 'w-20 h-20';
  const textSize = size === 'lg' ? 'text-2xl' : 'text-sm';

  return (
    <View
      className={`${sizeClasses} rounded-full items-center justify-center ${stateColors[state]}`}
    >
      <Text className={`text-white ${textSize} font-bold`}>{stateLabels[state]}</Text>
    </View>
  );
};
