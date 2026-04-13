import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '../../types';

const SESSIONS_STORAGE_KEY = '@smartbattery/sessions';

export const SessionStorage = {
  async getSessions(): Promise<Session[]> {
    try {
      const stored = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as Session[];
      }
      return [];
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return [];
    }
  },

  async saveSessions(sessions: Session[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  },

  async addSession(session: Session): Promise<void> {
    const sessions = await this.getSessions();
    sessions.unshift(session); // Add to beginning
    await this.saveSessions(sessions);
  },

  async updateSession(id: string, updates: Partial<Session>): Promise<void> {
    const sessions = await this.getSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates };
      await this.saveSessions(sessions);
    }
  },

  async deleteSession(id: string): Promise<void> {
    const sessions = await this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await this.saveSessions(filtered);
  },

  async clearAllSessions(): Promise<void> {
    await AsyncStorage.removeItem(SESSIONS_STORAGE_KEY);
  },

  async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<Session[]> {
    const sessions = await this.getSessions();
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    return sessions.filter((s) => s.startTime >= startMs && s.startTime <= endMs);
  },

  async getTodaySessions(): Promise<Session[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return this.getSessionsByDateRange(startOfDay, endOfDay);
  },
};
