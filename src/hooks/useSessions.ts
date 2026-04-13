import { useState, useEffect, useRef, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { Session, SessionGroup, DeviceState } from '../types';
import { SessionStorage } from '../services/storage/SessionStorage';
import { useBLE } from '../context/BLEContext';
import { formatDate, getDateKey } from '../utils/time';

export const useSessions = () => {
  const { deviceState } = useBLE();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sessionStartRef = useRef<number | null>(null);
  const previousStateRef = useRef<DeviceState>('--');

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      const loaded = await SessionStorage.getSessions();
      setSessions(loaded);
      setIsLoading(false);
    };
    loadSessions();
  }, []);

  // Auto-record sessions when device state changes
  useEffect(() => {
    const previousState = previousStateRef.current;

    if (deviceState === 'firing' && previousState !== 'firing') {
      // Session started
      sessionStartRef.current = Date.now();
    } else if (previousState === 'firing' && deviceState !== 'firing') {
      // Session ended
      if (sessionStartRef.current) {
        const endTime = Date.now();
        const duration = Math.round((endTime - sessionStartRef.current) / 1000);

        // Only record if duration is at least 1 second
        if (duration >= 1) {
          const newSession: Session = {
            id: Crypto.randomUUID(),
            startTime: sessionStartRef.current,
            endTime,
            duration,
            notes: '',
            tags: [],
            source: 'auto',
          };

          SessionStorage.addSession(newSession);
          setSessions((prev) => [newSession, ...prev]);
        }
        sessionStartRef.current = null;
      }
    }

    previousStateRef.current = deviceState;
  }, [deviceState]);

  const addSession = useCallback(async (session: Omit<Session, 'id'>) => {
    const newSession: Session = {
      ...session,
      id: Crypto.randomUUID(),
    };
    await SessionStorage.addSession(newSession);
    setSessions((prev) => [newSession, ...prev]);
    return newSession;
  }, []);

  const updateSession = useCallback(async (id: string, updates: Partial<Session>) => {
    await SessionStorage.updateSession(id, updates);
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await SessionStorage.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const refreshSessions = useCallback(async () => {
    setIsLoading(true);
    const loaded = await SessionStorage.getSessions();
    setSessions(loaded);
    setIsLoading(false);
  }, []);

  // Group sessions by date for display
  const groupedSessions: SessionGroup[] = sessions.reduce((groups, session) => {
    const dateKey = getDateKey(session.startTime);
    const title = formatDate(session.startTime);

    const existingGroup = groups.find((g) => g.title === title);
    if (existingGroup) {
      existingGroup.data.push(session);
    } else {
      groups.push({ title, data: [session] });
    }

    return groups;
  }, [] as SessionGroup[]);

  // Calculate totals
  const todaySessions = sessions.filter((s) => {
    const today = new Date();
    const sessionDate = new Date(s.startTime);
    return (
      sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear()
    );
  });

  const todayCount = todaySessions.length;
  const todayDuration = todaySessions.reduce((sum, s) => sum + s.duration, 0);
  const totalCount = sessions.length;
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);

  return {
    sessions,
    groupedSessions,
    isLoading,
    todayCount,
    todayDuration,
    totalCount,
    totalDuration,
    addSession,
    updateSession,
    deleteSession,
    refreshSessions,
  };
};
