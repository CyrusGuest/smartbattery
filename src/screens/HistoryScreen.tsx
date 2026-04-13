import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Share,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSessions } from '../hooks/useSessions';
import { Session } from '../types';
import { formatTime, formatDuration } from '../utils/time';

const C = {
  bg: '#07080F',
  card: '#0C0E1A',
  cardAlt: '#131628',
  border: '#1A1D2E',
  cyan: '#00D4FF',
  text: '#C8D3F5',
  muted: '#3D4266',
  dim: '#2A2D42',
  green: '#00FF94',
  red: '#FF3366',
};

export const HistoryScreen: React.FC = () => {
  const { groupedSessions, isLoading, updateSession, deleteSession } = useSessions();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');

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

  const handleSessionPress = (session: Session) => {
    setSelectedSession(session);
    setEditNotes(session.notes);
    setEditTags(session.tags.join(', '));
  };

  const handleSaveSession = async () => {
    if (selectedSession) {
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      await updateSession(selectedSession.id, { notes: editNotes, tags });
      setSelectedSession(null);
    }
  };

  const handleDeleteSession = (session: Session) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSession(session.id),
      },
    ]);
  };

  const handleExport = async () => {
    const allSessions = groupedSessions.flatMap((g) => g.data);
    if (allSessions.length === 0) {
      Alert.alert('No Data', 'No sessions to export');
      return;
    }

    const csvHeader = 'Date,Time,Duration (s),Notes,Tags\n';
    const csvRows = allSessions
      .map((s) => {
        const date = new Date(s.startTime).toLocaleDateString();
        const time = formatTime(s.startTime);
        const notes = s.notes.replace(/,/g, ';');
        const tags = s.tags.join(';');
        return `${date},${time},${s.duration},"${notes}","${tags}"`;
      })
      .join('\n');

    try {
      await Share.share({
        message: csvHeader + csvRows,
        title: 'Smart Battery Sessions Export',
      });
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const renderSessionItem = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={{
        backgroundColor: C.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        marginHorizontal: 24,
        borderLeftWidth: 2,
        borderLeftColor: C.cyan,
        borderWidth: 1,
        borderColor: C.border,
      }}
      onPress={() => handleSessionPress(item)}
      onLongPress={() => handleDeleteSession(item)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={16} color={C.muted} />
          <Text style={{ color: C.muted, marginLeft: 4 }}>{formatTime(item.startTime)}</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(0,255,148,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ color: C.green, fontWeight: '600' }}>{formatDuration(item.duration)}</Text>
        </View>
      </View>
      {item.notes ? (
        <Text style={{ color: C.text, marginTop: 8 }}>{item.notes}</Text>
      ) : null}
      {item.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {item.tags.map((tag, index) => (
            <View
              key={index}
              style={{
                backgroundColor: 'rgba(0,212,255,0.1)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                marginRight: 8,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: C.cyan, fontSize: 12 }}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={{ paddingHorizontal: 24, paddingVertical: 8, backgroundColor: C.bg }}>
      <Text style={{ color: C.dim, fontWeight: '600' }}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* Header */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>Session History</Text>
        <TouchableOpacity onPress={handleExport} style={{ padding: 8 }}>
          <Ionicons name="share-outline" size={24} color={C.cyan} />
        </TouchableOpacity>
      </Animated.View>

      {/* Session List */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <SectionList
          sections={groupedSessions}
          renderItem={renderSessionItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Ionicons name="document-text-outline" size={48} color={C.dim} />
              <Text style={{ color: C.dim, marginTop: 16 }}>No sessions recorded yet</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Use your device to start tracking</Text>
            </View>
          }
        />
      </Animated.View>

      {/* Edit Modal */}
      <Modal
        visible={selectedSession !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSession(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setSelectedSession(null)}
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
              Edit Session
            </Text>

            <Text style={{ color: C.muted, marginBottom: 8 }}>Notes</Text>
            <TextInput
              style={{
                backgroundColor: C.cardAlt,
                color: C.text,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: C.border,
              }}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Add notes..."
              placeholderTextColor={C.dim}
              multiline
            />

            <Text style={{ color: C.muted, marginBottom: 8 }}>Tags (comma separated)</Text>
            <TextInput
              style={{
                backgroundColor: C.cardAlt,
                color: C.text,
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: C.border,
              }}
              value={editTags}
              onChangeText={setEditTags}
              placeholder="morning, relaxing, etc."
              placeholderTextColor={C.dim}
            />

            <TouchableOpacity
              style={{
                backgroundColor: C.cyan,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              onPress={handleSaveSession}
            >
              <Text style={{ color: C.bg, fontWeight: '700', fontSize: 16 }}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 16, alignItems: 'center' }}
              onPress={() => setSelectedSession(null)}
            >
              <Text style={{ color: C.muted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
