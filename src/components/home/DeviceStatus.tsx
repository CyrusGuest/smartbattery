import React from 'react';
import { View, Text } from 'react-native';
import { useBLE } from '../../context/BLEContext';
import { StatusBadge } from '../common';
import { Card } from '../common';

export const DeviceStatus: React.FC = () => {
  const { connectedDevice, deviceState } = useBLE();
  const isConnected = connectedDevice !== null;

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    switch (deviceState) {
      case 'idle':
        return 'Ready to use';
      case 'firing':
        return 'Device active';
      default:
        return 'Unknown state';
    }
  };

  return (
    <Card className="items-center py-8">
      <StatusBadge state={deviceState} size="lg" />
      <Text className="text-white text-xl font-semibold mt-4">
        {isConnected ? `Status: ${deviceState}` : 'Disconnected'}
      </Text>
      <Text className="text-gray-400 mt-1">{getStatusText()}</Text>
    </Card>
  );
};
