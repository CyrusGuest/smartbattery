export interface UsageLimits {
  dailySessionLimit: number | null;
  dailyTimeLimit: number | null; // seconds
}

export interface Settings {
  // Limits
  usageLimits: UsageLimits;

  // Security
  pinEnabled: boolean;
  pinHash: string | null; // hashed PIN
}

export interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  setPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
}
