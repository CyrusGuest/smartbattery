import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { useBLE } from '../../context/BLEContext';

const C = {
  card: '#0C0E1A',
  border: '#1A1D2E',
  cyan: '#00D4FF',
  text: '#C8D3F5',
  muted: '#3D4266',
  dim: '#2A2D42',
};

export const PowerSlider: React.FC = () => {
  const { connectedDevice, pwmValue, sendPwmCommand } = useBLE();
  const [localValue, setLocalValue] = useState(pwmValue);
  const isConnected = connectedDevice !== null;

  useEffect(() => { setLocalValue(pwmValue); }, [pwmValue]);

  const MAX_V = 4.2;
  const voltage = ((localValue / 255) * MAX_V).toFixed(2);
  const pct = Math.round((localValue / 255) * 100);

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: C.border,
        shadowColor: C.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isConnected ? 0.08 : 0,
        shadowRadius: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
        <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>POWER</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ color: C.cyan, fontSize: 28, fontWeight: '800' }}>{voltage}</Text>
          <Text style={{ color: C.muted, fontSize: 13, fontWeight: '700', marginLeft: 3 }}>V</Text>
          <Text style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{pct}%</Text>
        </View>
      </View>
      <Slider
        style={{ width: '100%', height: 36, marginTop: 2 }}
        minimumValue={0}
        maximumValue={255}
        value={localValue}
        onValueChange={(v) => setLocalValue(Math.round(v))}
        onSlidingComplete={(v) => {
          const r = Math.round(v);
          setLocalValue(r);
          sendPwmCommand(r);
        }}
        minimumTrackTintColor={C.cyan}
        maximumTrackTintColor={C.border}
        thumbTintColor={C.cyan}
        disabled={!isConnected}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: C.dim, fontSize: 10 }}>0.00V</Text>
        <Text style={{ color: C.dim, fontSize: 10 }}>{MAX_V}V</Text>
      </View>
    </View>
  );
};
