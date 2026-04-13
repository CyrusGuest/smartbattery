import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDay, getHours, getMinutes } from 'date-fns';
import { TimeBlock, DaySchedule, ScheduleContextValue } from '../types';

const STORAGE_KEY = '@smart_battery_schedules';

const initSchedules = (): DaySchedule[] =>
  Array.from({ length: 7 }, (_, day) => ({ day, blocks: [] }));

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export const useSchedule = () => {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be within ScheduleProvider');
  return ctx;
};

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schedules, setSchedules] = useState<DaySchedule[]>(initSchedules);
  const [activeBlock, setActiveBlock] = useState<TimeBlock | null>(null);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setSchedules(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = async (updated: DaySchedule[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSchedules(updated);
  };

  // Recompute active block every 30 seconds
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const day = getDay(now);
      const mins = getHours(now) * 60 + getMinutes(now);
      const daySchedule = schedules.find((s) => s.day === day);
      const block = daySchedule?.blocks.find((b) => {
        const start = b.startHour * 60 + b.startMinute;
        const end = b.endHour * 60 + b.endMinute;
        return mins >= start && mins < end;
      }) ?? null;
      setActiveBlock(block);
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [schedules]);

  const addBlock = useCallback(async (day: number, block: Omit<TimeBlock, 'id'>) => {
    const updated = schedules.map((s) =>
      s.day === day
        ? { ...s, blocks: [...s.blocks, { ...block, id: Date.now().toString() }] }
        : s,
    );
    await persist(updated);
  }, [schedules]);

  const updateBlock = useCallback(async (
    day: number, blockId: string, updates: Partial<Omit<TimeBlock, 'id'>>,
  ) => {
    const updated = schedules.map((s) =>
      s.day === day
        ? { ...s, blocks: s.blocks.map((b) => b.id === blockId ? { ...b, ...updates } : b) }
        : s,
    );
    await persist(updated);
  }, [schedules]);

  const deleteBlock = useCallback(async (day: number, blockId: string) => {
    const updated = schedules.map((s) =>
      s.day === day ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) } : s,
    );
    await persist(updated);
  }, [schedules]);

  return (
    <ScheduleContext.Provider value={{ schedules, activeBlock, addBlock, updateBlock, deleteBlock }}>
      {children}
    </ScheduleContext.Provider>
  );
};
