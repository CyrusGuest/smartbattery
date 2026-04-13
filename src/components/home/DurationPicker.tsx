import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useBLE } from '../../context/BLEContext';

const C = {
  card: '#0C0E1A',
  border: '#1A1D2E',
  cyan: '#00D4FF',
  text: '#C8D3F5',
  muted: '#3D4266',
  dim: '#2A2D42',
};

const PRESETS = [3, 5, 8, 10, 15];

const Pill: React.FC<{
  seconds: number;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}> = ({ seconds, selected, disabled, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, tension: 200, friction: 7 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      activeOpacity={1}
      style={{ flex: 1, marginHorizontal: 3 }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          paddingVertical: 11,
          borderRadius: 14,
          alignItems: 'center',
          backgroundColor: selected ? 'rgba(0,212,255,0.1)' : '#0F1020',
          borderWidth: 1.5,
          borderColor: selected ? C.cyan : C.border,
          shadowColor: selected ? C.cyan : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          opacity: disabled ? 0.35 : 1,
        }}
      >
        <Text
          style={{
            color: selected ? C.cyan : C.muted,
            fontWeight: '700',
            fontSize: 13,
            letterSpacing: 0.5,
          }}
        >
          {seconds}s
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const DurationPicker: React.FC = () => {
  const { connectedDevice, sessionDuration, sendDurationCommand } = useBLE();
  const isConnected = connectedDevice !== null;

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
          DURATION
        </Text>
        <Text style={{ color: C.cyan, fontSize: 20, fontWeight: '800' }}>{sessionDuration}s</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {PRESETS.map((s) => (
          <Pill
            key={s}
            seconds={s}
            selected={sessionDuration === s}
            disabled={!isConnected}
            onPress={() => sendDurationCommand(s)}
          />
        ))}
      </View>
    </View>
  );
};
