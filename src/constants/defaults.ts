import { Settings, DeviceStats } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  usageLimits: {
    dailySessionLimit: null,
    dailyTimeLimit: null,
  },
  pinEnabled: false,
  pinHash: null,
};

export const DEFAULT_STATS: DeviceStats = {
  totalSessions: 0,
  totalSeconds: 0,
};
