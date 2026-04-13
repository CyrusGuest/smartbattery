import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBLE } from '../../context/BLEContext';

const C = {
  card: '#0C0E1A',
  border: '#1A1D2E',
  cyan: '#00D4FF',
  red: '#FF3366',
  muted: '#3D4266',
};

export const ConnectionControls: React.FC = () => {
  const { connectedDevice, isScanning, scanForDevices, disconnect } = useBLE();
  const isConnected = connectedDevice !== null;

  const scale = useRef(new Animated.Value(1)).current;
  const scanPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanPulse, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(scanPulse, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      scanPulse.stopAnimation();
      scanPulse.setValue(0);
    }
  }, [isScanning]);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 }).start();

  const color = isConnected ? C.red : C.cyan;
  const scanOpacity = scanPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <TouchableOpacity
      onPress={isConnected ? disconnect : scanForDevices}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      disabled={isScanning && !isConnected}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: 18,
          paddingVertical: 18,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          backgroundColor: isConnected ? 'rgba(255,51,102,0.05)' : 'rgba(0,212,255,0.05)',
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
          elevation: 6,
          opacity: isScanning ? scanOpacity : 1,
        }}
      >
        <Ionicons
          name={isConnected ? 'bluetooth-outline' : isScanning ? 'radio-outline' : 'scan-outline'}
          size={18}
          color={color}
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            color,
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 2.5,
          }}
        >
          {isConnected ? 'DISCONNECT' : isScanning ? 'SCANNING...' : 'SCAN FOR DEVICE'}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};
