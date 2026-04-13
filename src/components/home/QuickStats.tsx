import React from 'react';
import { View, Text } from 'react-native';
import { useSessions } from '../../hooks/useSessions';
import { formatDuration } from '../../utils/time';

const C = {
  card: '#0C0E1A',
  border: '#1A1D2E',
  cyan: '#00D4FF',
  purple: '#7B61FF',
  fire: '#FF6B35',
  text: '#C8D3F5',
  muted: '#3D4266',
};

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 14,
      borderTopWidth: 2,
      borderTopColor: accent,
      shadowColor: accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    }}
  >
    <Text style={{ color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 2 }}>{label}</Text>
    <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginTop: 6 }}>{value}</Text>
    <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{sub}</Text>
  </View>
);

export const QuickStats: React.FC = () => {
  const { todayCount, todayDuration, totalCount } = useSessions();

  return (
    <View style={{ flexDirection: 'row' }}>
      <StatCard label="TODAY" value={String(todayCount)} sub="sessions" accent={C.cyan} />
      <View style={{ width: 10 }} />
      <StatCard label="TIME" value={formatDuration(todayDuration)} sub="today" accent={C.purple} />
      <View style={{ width: 10 }} />
      <StatCard label="ALL TIME" value={String(totalCount)} sub="sessions" accent={C.fire} />
    </View>
  );
};
