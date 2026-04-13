import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, SettingsContextValue } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaults';

const SETTINGS_STORAGE_KEY = '@smartbattery/settings';

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

// Simple hash function for PIN (not cryptographically secure, but good enough for local use)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
};

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<Settings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage
  const saveSettings = useCallback(async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  const verifyPin = useCallback((pin: string): boolean => {
    if (!settings.pinEnabled || !settings.pinHash) {
      return true;
    }
    return hashPin(pin) === settings.pinHash;
  }, [settings.pinEnabled, settings.pinHash]);

  const setPin = useCallback(async (pin: string) => {
    await updateSettings({
      pinEnabled: true,
      pinHash: hashPin(pin),
    });
  }, [updateSettings]);

  const clearPin = useCallback(async () => {
    await updateSettings({
      pinEnabled: false,
      pinHash: null,
    });
  }, [updateSettings]);

  const value: SettingsContextValue = {
    settings,
    updateSettings,
    verifyPin,
    setPin,
    clearPin,
  };

  // Don't render children until settings are loaded
  if (isLoading) {
    return null;
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
