import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useBLE } from '../context/BLEContext';
import { useSchedule } from '../context/ScheduleContext';
import { useSessions } from '../hooks/useSessions';
import { QuickStats, PowerSlider, ConnectionControls, DurationPicker } from '../components/home';

const C = {
  bg: '#07080F',
  card: '#0C0E1A',
  border: '#1A1D2E',
  cyan: '#00D4FF',
  fire: '#FF6B35',
  text: '#C8D3F5',
  muted: '#3D4266',
  dim: '#2A2D42',
  red: '#FF3366',
};

const fmtTime = (h: number, m: number) =>
  `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m === 0 ? '00' : '30'} ${h < 12 ? 'AM' : 'PM'}`;

// ── Status Ring ───────────────────────────────────────────────────────────────
const RING_ARC_R = 80;
const RING_ARC_CIRC = 2 * Math.PI * RING_ARC_R;

const StatusRing: React.FC<{
  connected: boolean;
  firing: boolean;
  scanning: boolean;
}> = ({ connected, firing, scanning }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const color = firing ? C.fire : connected ? C.cyan : C.dim;

  useEffect(() => {
    pulse.stopAnimation();
    rotate.stopAnimation();
    pulse.setValue(0);
    rotate.setValue(0);

    if (scanning) {
      Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
      return;
    }

    if (connected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(800),
        ])
      ).start();
    }
  }, [connected, firing, scanning]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.7, 0.3, 0] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });

  const iconName = scanning
    ? 'radio'
    : connected
    ? firing
      ? 'flash'
      : 'bluetooth'
    : 'bluetooth-outline';

  return (
    <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      {/* Pulse ring */}
      {connected && (
        <Animated.View
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 1.5,
            borderColor: color,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />
      )}

      {/* Outer static ring */}
      <View
        style={{
          position: 'absolute',
          width: 170,
          height: 170,
          borderRadius: 85,
          borderWidth: 1,
          borderColor: connected ? color : C.border,
          opacity: connected ? 0.25 : 0.15,
        }}
      />

      {/* Scanning rotating arc */}
      {scanning && (
        <Animated.View style={{ position: 'absolute', transform: [{ rotate: spin }] }}>
          <Svg width={180} height={180}>
            <Circle
              cx={90}
              cy={90}
              r={RING_ARC_R}
              stroke={C.cyan}
              strokeWidth={2.5}
              fill="none"
              strokeDasharray={`${RING_ARC_CIRC * 0.28} ${RING_ARC_CIRC * 0.72}`}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      )}

      {/* Inner glow circle */}
      <View
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          backgroundColor: C.card,
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: connected ? 0.65 : 0.15,
          shadowRadius: firing ? 24 : 14,
          elevation: 10,
        }}
      >
        <Ionicons name={iconName as any} size={36} color={connected ? color : C.muted} />
      </View>
    </View>
  );
};

// ── HomeScreen ─────────────────────────────────────────────────────────────────
export const HomeScreen: React.FC = () => {
  const { connectedDevice, deviceState, isScanning, isConnecting, batteryPercent, isCharging, sendPwmCommand, sendDurationCommand } = useBLE();
  const { activeBlock } = useSchedule();
  const { todayCount } = useSessions();

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

  const isConnected = connectedDevice !== null;
  const isFiring = deviceState === 'firing';

  const isScheduleLocked = activeBlock?.locked ?? false;
  const isOverLimit = activeBlock?.sessionLimit != null && todayCount >= activeBlock.sessionLimit;
  const isBlocked = isScheduleLocked || isOverLimit;

  useEffect(() => {
    if (!isConnected) return;
    if (isBlocked) {
      sendPwmCommand(0);
    } else if (activeBlock) {
      sendPwmCommand(activeBlock.pwmValue);
      if (activeBlock.sessionDuration != null) {
        sendDurationCommand(activeBlock.sessionDuration);
      }
    }
  }, [activeBlock?.id, isBlocked, isConnected]);

  const statusColor = isFiring
    ? C.fire
    : isConnected
    ? C.cyan
    : C.muted;

  const statusLabel = isScanning || isConnecting
    ? 'CONNECTING'
    : !isConnected
    ? 'OFFLINE'
    : isFiring
    ? 'ACTIVE'
    : 'READY';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar style="light" />
      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 18,
            paddingBottom: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 3 }}
          >
            SMART BATTERY
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: statusColor,
                marginRight: 7,
                shadowColor: statusColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 4,
              }}
            />
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Status Ring */}
        <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 8 }}>
          <StatusRing connected={isConnected} firing={isFiring} scanning={isScanning || isConnecting} />
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', marginTop: 14, letterSpacing: 0.5 }}>
            {isConnected ? 'SmartBattery' : 'Not Connected'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: statusColor,
                marginRight: 6,
                shadowColor: statusColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 3,
              }}
            />
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600', letterSpacing: 2 }}>
              {statusLabel}
            </Text>
            {batteryPercent !== null && (
              <>
                <Text style={{ color: C.dim, marginHorizontal: 8, fontSize: 12 }}>·</Text>
                <Ionicons
                  name={isCharging ? 'battery-charging' : batteryPercent > 20 ? 'battery-half' : 'battery-dead'}
                  size={14}
                  color={isCharging ? '#00FF88' : batteryPercent > 20 ? C.cyan : C.red}
                />
                <Text style={{ color: isCharging ? '#00FF88' : batteryPercent > 20 ? C.cyan : C.red, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                  {batteryPercent}%{isCharging ? ' ⚡' : ''}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Active Schedule Banner */}
        {activeBlock && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              borderRadius: 16,
              padding: 14,
              backgroundColor: isBlocked ? 'rgba(255,51,102,0.08)' : 'rgba(0,212,255,0.06)',
              borderWidth: 1,
              borderColor: isBlocked ? 'rgba(255,51,102,0.25)' : 'rgba(0,212,255,0.2)',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={isBlocked ? 'lock-closed' : 'calendar'}
                size={13}
                color={isBlocked ? C.red : C.cyan}
              />
              <Text
                style={{
                  marginLeft: 7,
                  color: isBlocked ? C.red : C.cyan,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1,
                }}
              >
                {isBlocked
                  ? isScheduleLocked
                    ? 'DEVICE LOCKED'
                    : 'LIMIT REACHED'
                  : 'SCHEDULE ACTIVE'}
              </Text>
              {!isBlocked && activeBlock.sessionLimit != null && (
                <Text style={{ marginLeft: 6, color: C.muted, fontSize: 11 }}>
                  · {activeBlock.sessionLimit - todayCount} left
                </Text>
              )}
            </View>
            <Text style={{ color: C.muted, fontSize: 11 }}>
              Until {fmtTime(activeBlock.endHour, activeBlock.endMinute)}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={{ marginHorizontal: 20, marginTop: 20 }}>
          <QuickStats />
        </View>

        {/* Duration */}
        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <DurationPicker />
        </View>

        {/* Power */}
        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <PowerSlider />
        </View>

        {/* Connection */}
        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <ConnectionControls />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};
