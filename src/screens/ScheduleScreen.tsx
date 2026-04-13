import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Switch, Alert, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSchedule } from '../context/ScheduleContext';
import { TimeBlock } from '../types';

const C = {
  bg: '#07080F',
  card: '#0C0E1A',
  cardAlt: '#131628',
  border: '#1A1D2E',
  cyan: '#00D4FF',
  purple: '#7B61FF',
  text: '#C8D3F5',
  muted: '#3D4266',
  dim: '#2A2D42',
  red: '#FF3366',
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_VOLTAGE = 4.2;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtHour = (h: number): string => {
  const d = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return String(d).padStart(2, '0');
};

const fmtAmPm = (h: number): string => (h < 12 ? 'AM' : 'PM');

const formatTime = (hour: number, minute: number): string =>
  `${fmtHour(hour)}:${minute === 0 ? '00' : '30'} ${fmtAmPm(hour)}`;

const pwmToVoltage = (pwm: number): string =>
  ((pwm / 255) * MAX_VOLTAGE).toFixed(1);

const pwmToPct = (pwm: number): number => Math.round((pwm / 255) * 100);

// ── TimeSelector ──────────────────────────────────────────────────────────────
const TimeSelector: React.FC<{
  label: string;
  hour: number;
  minute: number;
  onHour: (h: number) => void;
  onMinute: (m: number) => void;
}> = ({ label, hour, minute, onHour, onMinute }) => (
  <View style={{ flex: 1 }}>
    <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
      {label}
    </Text>
    <View
      style={{
        backgroundColor: C.cardAlt,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <TouchableOpacity
        style={{
          width: 32, height: 32,
          backgroundColor: C.card,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: C.border,
        }}
        onPress={() => onHour((hour + 23) % 24)}
      >
        <Ionicons name="chevron-up" size={14} color={C.muted} />
      </TouchableOpacity>
      <Text style={{ color: C.text, fontSize: 24, fontWeight: '700', marginVertical: 4 }}>
        {fmtHour(hour)}
      </Text>
      <TouchableOpacity
        style={{
          width: 32, height: 32,
          backgroundColor: C.card,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: C.border,
        }}
        onPress={() => onHour((hour + 1) % 24)}
      >
        <Ionicons name="chevron-down" size={14} color={C.muted} />
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {([0, 30] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={{
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginRight: 4,
              backgroundColor: minute === m ? C.cyan : C.card,
              borderWidth: 1,
              borderColor: minute === m ? C.cyan : C.border,
            }}
            onPress={() => onMinute(m)}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: minute === m ? C.bg : C.muted }}>
              :{m === 0 ? '00' : '30'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={{
            backgroundColor: C.card,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: C.border,
          }}
          onPress={() => onHour(hour < 12 ? hour + 12 : hour - 12)}
        >
          <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }}>{fmtAmPm(hour)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ── BlockCard ─────────────────────────────────────────────────────────────────
const BlockCard: React.FC<{
  block: TimeBlock;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ block, onEdit, onDelete }) => (
  <View
    style={{
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    }}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: C.text, fontWeight: '600' }}>
          {formatTime(block.startHour, block.startMinute)} – {formatTime(block.endHour, block.endMinute)}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
          <View
            style={{
              backgroundColor: C.cardAlt,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginRight: 8,
              marginBottom: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="flash" size={11} color="#FCD34D" />
            <Text style={{ color: C.text, fontSize: 11, marginLeft: 4 }}>{pwmToVoltage(block.pwmValue)}V</Text>
          </View>
          <View
            style={{
              backgroundColor: C.cardAlt,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginRight: 8,
              marginBottom: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="repeat" size={11} color={C.cyan} />
            <Text style={{ color: C.text, fontSize: 11, marginLeft: 4 }}>
              {block.sessionLimit !== null ? `${block.sessionLimit} sessions` : 'Unlimited'}
            </Text>
          </View>
          {block.sessionDuration !== null && block.sessionDuration !== undefined && (
            <View
              style={{
                backgroundColor: C.cardAlt,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginRight: 8,
                marginBottom: 4,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="timer-outline" size={11} color={C.purple} />
              <Text style={{ color: C.text, fontSize: 11, marginLeft: 4 }}>{block.sessionDuration}s</Text>
            </View>
          )}
          {block.locked && (
            <View
              style={{
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginBottom: 4,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,51,102,0.12)',
              }}
            >
              <Ionicons name="lock-closed" size={11} color={C.red} />
              <Text style={{ color: C.red, fontSize: 11, marginLeft: 4 }}>Locked</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity
          style={{
            width: 32, height: 32,
            backgroundColor: C.cardAlt,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
            borderWidth: 1,
            borderColor: C.border,
          }}
          onPress={onEdit}
        >
          <Ionicons name="pencil" size={14} color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            width: 32, height: 32,
            backgroundColor: C.cardAlt,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: C.border,
          }}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={14} color={C.red} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ── ScheduleScreen ────────────────────────────────────────────────────────────
export const ScheduleScreen: React.FC = () => {
  const { schedules, addBlock, updateBlock, deleteBlock, activeBlock } = useSchedule();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editor state
  const [startHour, setStartHour]     = useState(8);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour]         = useState(9);
  const [endMinute, setEndMinute]     = useState(0);
  const [pwmValue, setPwmValue]       = useState(255);
  const [sessLimit, setSessLimit]     = useState<number | null>(null);
  const [sessDur, setSessDur]         = useState<number | null>(null);
  const [locked, setLocked]           = useState(false);

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

  const dayBlocks = useMemo(() => {
    const ds = schedules.find((s) => s.day === selectedDay);
    return [...(ds?.blocks ?? [])].sort(
      (a, b) => (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute),
    );
  }, [schedules, selectedDay]);

  const openAdd = () => {
    setEditingId(null);
    setStartHour(8); setStartMinute(0);
    setEndHour(9);   setEndMinute(0);
    setPwmValue(255); setSessLimit(null); setSessDur(null); setLocked(false);
    setModalVisible(true);
  };

  const openEdit = (block: TimeBlock) => {
    setEditingId(block.id);
    setStartHour(block.startHour);     setStartMinute(block.startMinute);
    setEndHour(block.endHour);         setEndMinute(block.endMinute);
    setPwmValue(block.pwmValue);       setSessLimit(block.sessionLimit);
    setSessDur(block.sessionDuration); setLocked(block.locked);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (startHour * 60 + startMinute >= endHour * 60 + endMinute) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }
    const data = {
      startHour, startMinute, endHour, endMinute,
      pwmValue, sessionLimit: sessLimit, sessionDuration: sessDur, locked,
    };
    if (editingId) {
      await updateBlock(selectedDay, editingId, data);
    } else {
      await addBlock(selectedDay, data);
    }
    setModalVisible(false);
  };

  const handleDelete = (blockId: string) => {
    Alert.alert('Delete Block', 'Remove this schedule block?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBlock(selectedDay, blockId) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ color: C.text, fontSize: 28, fontWeight: '700' }}>Schedule</Text>
          {activeBlock && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View
                style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: C.cyan,
                  marginRight: 8,
                  shadowColor: C.cyan,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                }}
              />
              <Text style={{ color: C.cyan, fontSize: 13 }}>
                Active: {formatTime(activeBlock.startHour, activeBlock.startMinute)}
                {' – '}{formatTime(activeBlock.endHour, activeBlock.endMinute)}
                {activeBlock.locked ? ' · Locked' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Day pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 24 }}>
            {DAYS_SHORT.map((d, i) => (
              <TouchableOpacity
                key={d}
                style={{
                  marginRight: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: selectedDay === i ? 'rgba(0,212,255,0.12)' : C.card,
                  borderWidth: 1.5,
                  borderColor: selectedDay === i ? C.cyan : C.border,
                }}
                onPress={() => setSelectedDay(i)}
              >
                <Text
                  style={{
                    fontWeight: '700',
                    color: selectedDay === i ? C.cyan : C.muted,
                  }}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Blocks list */}
        <View style={{ marginHorizontal: 24, marginTop: 20 }}>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12, fontWeight: '700', letterSpacing: 1 }}>
            {DAYS_FULL[selectedDay].toUpperCase()}
          </Text>

          {dayBlocks.length === 0 ? (
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                marginBottom: 12,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Ionicons name="calendar-outline" size={40} color={C.dim} />
              <Text style={{ color: C.dim, marginTop: 8, fontSize: 13 }}>
                No blocks scheduled for this day
              </Text>
            </View>
          ) : (
            dayBlocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                onEdit={() => openEdit(block)}
                onDelete={() => handleDelete(block.id)}
              />
            ))
          )}

          <TouchableOpacity
            style={{
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: C.cyan,
              backgroundColor: 'rgba(0,212,255,0.08)',
            }}
            onPress={openAdd}
          >
            <Ionicons name="add" size={20} color={C.cyan} />
            <Text style={{ color: C.cyan, fontWeight: '700', marginLeft: 4 }}>Add Time Block</Text>
          </TouchableOpacity>
        </View>

      </Animated.ScrollView>

      {/* Block Editor Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View
            style={{
              backgroundColor: C.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 20 }}>
              {editingId ? 'Edit Block' : 'New Block'}
            </Text>

            {/* Start / End time row */}
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              <TimeSelector
                label="START"
                hour={startHour} minute={startMinute}
                onHour={setStartHour} onMinute={setStartMinute}
              />
              <View style={{ width: 12 }} />
              <TimeSelector
                label="END"
                hour={endHour} minute={endMinute}
                onHour={setEndHour} onMinute={setEndMinute}
              />
            </View>

            {/* Voltage slider */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>Voltage</Text>
                <Text style={{ color: C.text, fontWeight: '600' }}>
                  {pwmToVoltage(pwmValue)}V ({pwmToPct(pwmValue)}%)
                </Text>
              </View>
              <Slider
                style={{ width: '100%', height: 36 }}
                minimumValue={0}
                maximumValue={255}
                value={pwmValue}
                onValueChange={(v) => setPwmValue(Math.round(v))}
                onSlidingComplete={(v) => setPwmValue(Math.round(v))}
                minimumTrackTintColor={C.cyan}
                maximumTrackTintColor={C.border}
                thumbTintColor={C.cyan}
              />
            </View>

            {/* Session limit */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>Session Limit</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={{
                    width: 32, height: 32,
                    backgroundColor: C.cardAlt,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                  onPress={() => {
                    if (sessLimit === null) setSessLimit(10);
                    else if (sessLimit <= 1) setSessLimit(null);
                    else setSessLimit(sessLimit - 1);
                  }}
                >
                  <Ionicons name="remove" size={16} color={C.muted} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontWeight: '600', textAlign: 'center', width: 88 }}>
                  {sessLimit === null ? 'No limit' : sessLimit}
                </Text>
                <TouchableOpacity
                  style={{
                    width: 32, height: 32,
                    backgroundColor: C.cardAlt,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                  onPress={() => setSessLimit(sessLimit === null ? 1 : sessLimit + 1)}
                >
                  <Ionicons name="add" size={16} color={C.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Session duration */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Session Duration</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {([null, 3, 5, 8, 10, 15] as (number | null)[]).map((d) => {
                  const isSelected = sessDur === d;
                  return (
                    <TouchableOpacity
                      key={d ?? 'default'}
                      style={{
                        marginRight: 8,
                        marginBottom: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: isSelected ? 'rgba(123,97,255,0.15)' : C.cardAlt,
                        borderWidth: 1.5,
                        borderColor: isSelected ? C.purple : C.border,
                      }}
                      onPress={() => setSessDur(d)}
                    >
                      <Text style={{ fontWeight: '700', fontSize: 13, color: isSelected ? C.purple : C.muted }}>
                        {d === null ? 'Default' : `${d}s`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Block device toggle */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <View>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>Block Device</Text>
                <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
                  Prevent use during this period
                </Text>
              </View>
              <Switch
                value={locked}
                onValueChange={setLocked}
                trackColor={{ false: C.border, true: 'rgba(255,51,102,0.4)' }}
                thumbColor={locked ? C.red : C.muted}
              />
            </View>

            {/* Cancel / Save */}
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: C.cardAlt,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: C.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: C.cyan,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                }}
                onPress={handleSave}
              >
                <Text style={{ color: C.bg, fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
