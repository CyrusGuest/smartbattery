import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { useBLE } from '../context/BLEContext';

const C = {
  bg: '#07080F',
  card: '#0C0E1A',
  cardAlt: '#131628',
  border: '#1A1D2E',
  cyan: '#00D4FF',
  text: '#C8D3F5',
  muted: '#3D4266',
  dim: '#2A2D42',
  red: '#FF3366',
};

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, setPin, clearPin } = useSettings();
  const { connectedDevice } = useBLE();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  const handleSetPin = () => {
    if (pinInput.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== pinConfirm) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    setPin(pinInput);
    setShowPinModal(false);
    setPinInput('');
    setPinConfirm('');
    Alert.alert('Success', 'PIN has been set');
  };

  const handleClearPin = () => {
    Alert.alert('Remove PIN', 'Are you sure you want to remove the PIN protection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => clearPin(),
      },
    ]);
  };

  const renderSettingsRow = (
    label: string,
    value: React.ReactNode,
    onPress?: () => void,
    icon?: string,
    isLast?: boolean,
  ) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
      }}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon ? (
          <Ionicons name={icon as any} size={20} color={C.muted} style={{ marginRight: 12 }} />
        ) : null}
        <Text style={{ color: C.text, fontSize: 15 }}>{label}</Text>
      </View>
      {typeof value === 'string' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: C.muted, marginRight: 8 }}>{value}</Text>
          {onPress ? <Ionicons name="chevron-forward" size={20} color={C.dim} /> : null}
        </View>
      ) : (
        value
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>Settings</Text>
        </View>

        {/* Usage Limits */}
        <View style={{ marginHorizontal: 24, marginTop: 16 }}>
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
            USAGE LIMITS
          </Text>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {renderSettingsRow(
              'Daily Session Limit',
              settings.usageLimits.dailySessionLimit?.toString() || 'Off',
              () => {
                Alert.alert('Set Daily Session Limit', 'Maximum sessions per day', [
                  { text: 'Off', onPress: () => updateSettings({ usageLimits: { ...settings.usageLimits, dailySessionLimit: null } }) },
                  { text: '5',  onPress: () => updateSettings({ usageLimits: { ...settings.usageLimits, dailySessionLimit: 5 } }) },
                  { text: '10', onPress: () => updateSettings({ usageLimits: { ...settings.usageLimits, dailySessionLimit: 10 } }) },
                  { text: '15', onPress: () => updateSettings({ usageLimits: { ...settings.usageLimits, dailySessionLimit: 15 } }) },
                  { text: '20', onPress: () => updateSettings({ usageLimits: { ...settings.usageLimits, dailySessionLimit: 20 } }) },
                ]);
              },
              'fitness-outline',
              true,
            )}
          </View>
        </View>

        {/* Security */}
        <View style={{ marginHorizontal: 24, marginTop: 24 }}>
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
            SECURITY
          </Text>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {renderSettingsRow(
              'PIN Protection',
              settings.pinEnabled ? 'Enabled' : 'Disabled',
              () => (settings.pinEnabled ? handleClearPin() : setShowPinModal(true)),
              'key-outline',
              true,
            )}
          </View>
        </View>

        {/* Device Info */}
        <View style={{ marginHorizontal: 24, marginTop: 24, marginBottom: 24 }}>
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
            ABOUT
          </Text>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {renderSettingsRow('Version', '2.0.0', undefined, 'information-circle-outline', false)}
            {renderSettingsRow(
              'Device',
              connectedDevice ? 'SmartBattery' : 'Not connected',
              undefined,
              'bluetooth-outline',
              true,
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPinModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowPinModal(false)}
        >
          <View
            style={{
              backgroundColor: C.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
              Set PIN
            </Text>

            <Text style={{ color: C.muted, marginBottom: 8 }}>Enter PIN (4+ digits)</Text>
            <TextInput
              style={{
                backgroundColor: C.cardAlt,
                color: C.text,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                textAlign: 'center',
                fontSize: 24,
                letterSpacing: 8,
                borderWidth: 1,
                borderColor: C.border,
              }}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="****"
              placeholderTextColor={C.dim}
            />

            <Text style={{ color: C.muted, marginBottom: 8 }}>Confirm PIN</Text>
            <TextInput
              style={{
                backgroundColor: C.cardAlt,
                color: C.text,
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                textAlign: 'center',
                fontSize: 24,
                letterSpacing: 8,
                borderWidth: 1,
                borderColor: C.border,
              }}
              value={pinConfirm}
              onChangeText={setPinConfirm}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="****"
              placeholderTextColor={C.dim}
            />

            <TouchableOpacity
              style={{
                backgroundColor: C.cyan,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              onPress={handleSetPin}
            >
              <Text style={{ color: C.bg, fontWeight: '700', fontSize: 16 }}>Set PIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 16, alignItems: 'center' }}
              onPress={() => setShowPinModal(false)}
            >
              <Text style={{ color: C.muted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
