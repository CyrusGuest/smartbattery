import { Device } from 'react-native-ble-plx';

export type DeviceState = 'idle' | 'firing' | '--';

export interface DeviceStats {
  totalSessions: number;
  totalSeconds: number;
}

export interface BatteryInfo {
  percent: number;
  voltage: number;
}

export interface BLEContextValue {
  // Connection state
  connectedDevice: Device | null;
  isScanning: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Device state (from BLE notifications)
  deviceState: DeviceState;
  stats: DeviceStats;
  pwmValue: number; // 0-255
  sessionDuration: number; // seconds, 1-30
  isFiring: boolean;
  batteryPercent: number | null; // 0-100, null = not yet read
  isCharging: boolean;

  // Actions
  scanForDevices: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendFireCommand: (active: boolean) => Promise<void>;
  sendPwmCommand: (value: number) => Promise<void>;
  sendDurationCommand: (seconds: number) => Promise<void>;
}
