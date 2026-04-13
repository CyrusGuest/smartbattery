import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSessions } from '../hooks/useSessions';
import { TimeRange } from '../types';
import { formatDuration, getDateKey } from '../utils/time';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  parseISO,
  getHours,
  getDay,
} from 'date-fns';

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
  green: '#00FF94',
  red: '#FF3366',
};

const screenWidth = Dimensions.get('window').width;

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Bar chart ────────────────────────────────────────────────────────────────
const BarChart: React.FC<{
  data: { label: string; value: number }[];
  maxValue: number;
  color?: string;
}> = ({ data, maxValue, color = C.cyan }) => {
  const barWidth = Math.max(14, (screenWidth - 80) / data.length - 4);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 112, paddingHorizontal: 4 }}>
      {data.map((item, index) => {
        const height = maxValue > 0 ? (item.value / maxValue) * 96 : 0;
        return (
          <View key={index} style={{ alignItems: 'center', width: barWidth }}>
            {item.value > 0 && (
              <Text style={{ color: C.dim, fontSize: 10, marginBottom: 4 }}>{item.value}</Text>
            )}
            <View
              style={{
                height: Math.max(4, height),
                width: barWidth - 4,
                backgroundColor: color,
                borderRadius: 4,
              }}
            />
            <Text style={{ color: C.dim, marginTop: 4, fontSize: 10 }}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Stat box ─────────────────────────────────────────────────────────────────
const StatBox: React.FC<{ label: string; value: string; sub?: string; accentColor?: string }> = ({
  label,
  value,
  sub,
  accentColor,
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    }}
  >
    <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>{label}</Text>
    <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 4, color: accentColor ?? C.text }}>{value}</Text>
    {sub ? <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{sub}</Text> : null}
  </View>
);

// ── Time-of-day row ───────────────────────────────────────────────────────────
const TimeOfDayBar: React.FC<{ label: string; count: number; total: number; color: string }> = ({
  label,
  count,
  total,
  color,
}) => {
  const pct = total > 0 ? count / total : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: C.text, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>{count} sessions</Text>
      </View>
      <View style={{ height: 8, backgroundColor: C.cardAlt, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, backgroundColor: color, height: 8, borderRadius: 4 }} />
      </View>
    </View>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const toD = (hour: number) => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const peakHourLabel = (hour: number) => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

const trendLabel = (pct: number) => {
  if (pct === 0) return 'same as last period';
  const abs = Math.abs(Math.round(pct));
  return pct > 0 ? `↑ ${abs}% vs last period` : `↓ ${abs}% vs last period`;
};

const trendColor = (pct: number): string =>
  pct > 0 ? C.green : pct < 0 ? C.red : C.muted;

// ── Screen ────────────────────────────────────────────────────────────────────
export const AnalyticsScreen: React.FC = () => {
  const { sessions, totalCount, totalDuration } = useSessions();
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');

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

  const analytics = useMemo(() => {
    const now = new Date();
    let days: number;
    switch (timeRange) {
      case 'daily':   days = 1;  break;
      case 'weekly':  days = 7;  break;
      case 'monthly': days = 30; break;
    }

    const periodStart = startOfDay(subDays(now, days - 1));
    const periodEnd   = endOfDay(now);
    const prevStart   = startOfDay(subDays(now, days * 2 - 1));
    const prevEnd     = endOfDay(subDays(now, days));

    const periodMs = { start: periodStart.getTime(), end: periodEnd.getTime() };
    const prevMs   = { start: prevStart.getTime(),   end: prevEnd.getTime() };

    const inRange = (t: number, r: typeof periodMs) => t >= r.start && t <= r.end;
    const periodSess = sessions.filter((s) => inRange(s.startTime, periodMs));
    const prevSess   = sessions.filter((s) => inRange(s.startTime, prevMs));

    // Daily aggregates for chart
    const dayInterval = eachDayOfInterval({ start: periodStart, end: periodEnd });
    const aggregates = dayInterval.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const ds = periodSess.filter((s) => getDateKey(s.startTime) === key);
      return {
        date: key,
        sessionCount: ds.length,
        totalSeconds: ds.reduce((sum, s) => sum + s.duration, 0),
      };
    });

    // Core period stats
    const periodCount   = periodSess.length;
    const periodSeconds = periodSess.reduce((sum, s) => sum + s.duration, 0);
    const prevCount     = prevSess.length;
    const trend         = prevCount > 0 ? ((periodCount - prevCount) / prevCount) * 100 : 0;
    const avgSession    = periodCount > 0 ? periodSeconds / periodCount : 0;
    const avgPerDay     = periodCount / days;
    const maxSessions   = Math.max(...aggregates.map((a) => a.sessionCount), 1);

    // Longest session in period
    const longest = periodSess.length > 0 ? Math.max(...periodSess.map((s) => s.duration)) : 0;

    // Peak hour (all-time)
    const hourCounts = Array(24).fill(0);
    sessions.forEach((s) => { hourCounts[getHours(new Date(s.startTime))]++; });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    // Time of day breakdown for period
    const tod = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    periodSess.forEach((s) => { tod[toD(getHours(new Date(s.startTime)))]++; });

    // Day of week breakdown for period
    const dowCounts = Array(7).fill(0);
    periodSess.forEach((s) => { dowCounts[getDay(new Date(s.startTime))]++; });
    const peakDow = dowCounts.indexOf(Math.max(...dowCounts));

    // Current streak
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const key = format(subDays(now, i), 'yyyy-MM-dd');
      const hasSessions = sessions.some((s) => getDateKey(s.startTime) === key);
      if (hasSessions) streak++;
      else if (i > 0) break;
    }

    // All-time best day
    const allDayCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      const k = getDateKey(s.startTime);
      allDayCounts[k] = (allDayCounts[k] ?? 0) + 1;
    });
    const bestDay = Object.values(allDayCounts).length > 0
      ? Math.max(...Object.values(allDayCounts))
      : 0;

    return {
      aggregates,
      periodCount,
      periodSeconds,
      prevCount,
      trend,
      avgSession,
      avgPerDay,
      maxSessions,
      longest,
      peakHour,
      tod,
      dowCounts,
      peakDow,
      streak,
      bestDay,
    };
  }, [sessions, timeRange]);

  const chartData = analytics.aggregates.map((a) => ({
    label: timeRange === 'daily'
      ? format(parseISO(a.date), 'ha').toLowerCase()
      : timeRange === 'monthly'
      ? format(parseISO(a.date), 'd')
      : format(parseISO(a.date), 'EEE'),
    value: a.sessionCount,
  }));

  const displayChart = timeRange === 'monthly'
    ? chartData.filter((_, i) => i % 3 === 0)
    : chartData;

  const todTotal = Object.values(analytics.tod).reduce((a, b) => a + b, 0);

  const TimeRangeBtn = ({ range, label }: { range: TimeRange; label: string }) => {
    const isActive = timeRange === range;
    return (
      <TouchableOpacity
        style={{
          flex: 1,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: isActive ? 'rgba(0,212,255,0.12)' : 'transparent',
          alignItems: 'center',
        }}
        onPress={() => setTimeRange(range)}
      >
        <Text
          style={{
            textAlign: 'center',
            fontWeight: '700',
            color: isActive ? C.cyan : C.muted,
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ color: C.text, fontSize: 28, fontWeight: '700' }}>Analytics</Text>
        </View>

        {/* Time range */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            flexDirection: 'row',
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <TimeRangeBtn range="daily" label="Today" />
          <TimeRangeBtn range="weekly" label="Week" />
          <TimeRangeBtn range="monthly" label="Month" />
        </View>

        {/* Hero: sessions + trend */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            backgroundColor: C.card,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: C.cyan + '33',
          }}
        >
          <Text style={{ color: C.muted, fontSize: 13 }}>Sessions this period</Text>
          <Text style={{ color: C.text, fontSize: 48, fontWeight: '700', marginTop: 4 }}>
            {analytics.periodCount}
          </Text>
          <Text
            style={{
              fontSize: 13,
              marginTop: 8,
              fontWeight: '600',
              color: trendColor(analytics.trend),
            }}
          >
            {analytics.prevCount === 0 && analytics.periodCount === 0
              ? 'No data yet'
              : trendLabel(analytics.trend)}
          </Text>
        </View>

        {/* Bar chart */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>Sessions per day</Text>
          {analytics.periodCount > 0 ? (
            <BarChart data={displayChart} maxValue={analytics.maxSessions} color={C.cyan} />
          ) : (
            <View style={{ height: 112, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bar-chart-outline" size={40} color={C.dim} />
              <Text style={{ color: C.dim, marginTop: 8, fontSize: 13 }}>No sessions this period</Text>
            </View>
          )}
        </View>

        {/* 4 key stats */}
        <View style={{ marginHorizontal: 24, marginTop: 16, flexDirection: 'row' }}>
          <StatBox
            label="AVG / DAY"
            value={analytics.avgPerDay.toFixed(1)}
            sub="sessions"
          />
          <View style={{ width: 12 }} />
          <StatBox
            label="AVG SESSION"
            value={formatDuration(Math.round(analytics.avgSession))}
          />
        </View>
        <View style={{ marginHorizontal: 24, marginTop: 12, flexDirection: 'row' }}>
          <StatBox
            label="LONGEST"
            value={analytics.longest > 0 ? formatDuration(analytics.longest) : '--'}
            sub="this period"
          />
          <View style={{ width: 12 }} />
          <StatBox
            label="PEAK TIME"
            value={sessions.length > 0 ? peakHourLabel(analytics.peakHour) : '--'}
            sub="most active hour"
          />
        </View>

        {/* Streak + best day */}
        <View style={{ marginHorizontal: 24, marginTop: 12, flexDirection: 'row' }}>
          <StatBox
            label="STREAK"
            value={`${analytics.streak}d`}
            sub="consecutive days"
            accentColor={analytics.streak >= 3 ? '#FF6B35' : C.text}
          />
          <View style={{ width: 12 }} />
          <StatBox
            label="BEST DAY"
            value={analytics.bestDay > 0 ? String(analytics.bestDay) : '--'}
            sub="sessions in one day"
            accentColor={C.cyan}
          />
        </View>

        {/* Time of day */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 16 }}>
            Time of Day
          </Text>
          {todTotal > 0 ? (
            <>
              <TimeOfDayBar label="Morning (5am–12pm)"  count={analytics.tod.morning}   total={todTotal} color="#F59E0B" />
              <TimeOfDayBar label="Afternoon (12–5pm)"  count={analytics.tod.afternoon} total={todTotal} color={C.cyan} />
              <TimeOfDayBar label="Evening (5–9pm)"     count={analytics.tod.evening}   total={todTotal} color={C.purple} />
              <TimeOfDayBar label="Night (9pm–5am)"     count={analytics.tod.night}     total={todTotal} color="#1D4ED8" />
            </>
          ) : (
            <Text style={{ color: C.dim, fontSize: 13 }}>No data for this period</Text>
          )}
        </View>

        {/* Day of week (weekly/monthly only) */}
        {timeRange !== 'daily' && (
          <View
            style={{
              marginHorizontal: 24,
              marginTop: 16,
              backgroundColor: C.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 16 }}>
              Day of Week
            </Text>
            {analytics.periodCount > 0 ? (
              <BarChart
                data={DAYS_OF_WEEK.map((d, i) => ({
                  label: d,
                  value: analytics.dowCounts[i],
                }))}
                maxValue={Math.max(...analytics.dowCounts, 1)}
                color={C.purple}
              />
            ) : (
              <Text style={{ color: C.dim, fontSize: 13 }}>No data for this period</Text>
            )}
          </View>
        )}

        {/* Lifetime */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
            Lifetime
          </Text>
          {[
            { label: 'Total Sessions', value: String(totalCount) },
            { label: 'Total Time', value: formatDuration(totalDuration) },
            {
              label: 'Average Session',
              value: totalCount > 0 ? formatDuration(Math.round(totalDuration / totalCount)) : '0s',
            },
            {
              label: 'Best Single Day',
              value: analytics.bestDay > 0 ? `${analytics.bestDay} sessions` : '--',
            },
            {
              label: 'Most Active Hour',
              value: totalCount > 0 ? peakHourLabel(analytics.peakHour) : '--',
            },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: C.border,
              }}
            >
              <Text style={{ color: C.muted }}>{row.label}</Text>
              <Text style={{ color: C.text, fontWeight: '600' }}>{row.value}</Text>
            </View>
          ))}
        </View>

      </Animated.ScrollView>
    </SafeAreaView>
  );
};
