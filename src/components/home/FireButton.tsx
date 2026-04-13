import React, { useRef, useEffect } from 'react';
import { Pressable, Text, Animated, View } from 'react-native';
import { useBLE } from '../../context/BLEContext';
import { Ionicons } from '@expo/vector-icons';

export const FireButton: React.FC = () => {
  const { connectedDevice, deviceState, isFiring, sendFireCommand } = useBLE();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isEnabled = connectedDevice !== null && deviceState === 'idle';

  useEffect(() => {
    if (isFiring) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.stopAnimation();
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isFiring]);

  const handlePressIn = async () => {
    if (!isEnabled) return;
    await sendFireCommand(true);
  };

  const handlePressOut = async () => {
    if (isFiring) {
      await sendFireCommand(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isEnabled && !isFiring}
        className={`
          rounded-2xl py-6 px-8 items-center justify-center flex-row
          ${isFiring ? 'bg-orange-500' : 'bg-red-600'}
          ${!isEnabled && !isFiring ? 'opacity-50' : ''}
        `}
      >
        <Ionicons
          name={isFiring ? 'flame' : 'flame-outline'}
          size={28}
          color="white"
          style={{ marginRight: 8 }}
        />
        <Text className="text-white font-bold text-xl">
          {isFiring ? 'FIRING...' : 'HOLD TO FIRE'}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
