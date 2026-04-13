import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { BLEContextValue, DeviceState, DeviceStats } from '../types';
import { SERVICE_UUID, CHAR_UUIDS, DEVICE_NAME, SCAN_TIMEOUT_MS, MAX_FIRE_DURATION_MS } from '../constants';
import { DEFAULT_STATS } from '../constants/defaults';
import { decode, decodeJSON, encode } from '../utils/base64';

let BleManager: any;
let State: any;
if (Platform.OS !== 'web') {
  const blePlx = require('react-native-ble-plx');
  BleManager = blePlx.BleManager;
  State = blePlx.State;
}

type Device = any;

const BLEContext = createContext<BLEContextValue | null>(null);

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
};

interface BLEProviderProps {
  children: React.ReactNode;
}

export const BLEProvider: React.FC<BLEProviderProps> = ({ children }) => {
  const bleManager = useRef(Platform.OS !== 'web' ? new BleManager() : null).current;
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceState>('--');
  const [stats, setStats] = useState<DeviceStats>(DEFAULT_STATS);
  const [pwmValue, setPwmValue] = useState(255); // Default 100%
  const [sessionDuration, setSessionDuration] = useState(10); // Default 10s
  const [isFiring, setIsFiring] = useState(false);
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const fireTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoConnectedRef = useRef(false);
  const manualDisconnectRef = useRef(false);
  const scanFnRef = useRef<((silent: boolean) => Promise<void>) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fireTimeoutRef.current) {
        clearTimeout(fireTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      bleManager?.destroy();
    };
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      // On Android, we rely on the permissions in app.json
      // expo-device doesn't have isAvailableAsync for BLE
      return true;
    }
    return true;
  };

  // Auto-connect on app launch when BLE is ready
  useEffect(() => {
    if (!bleManager) return;

    const tryAutoConnect = () => {
      if (!hasAutoConnectedRef.current) {
        hasAutoConnectedRef.current = true;
        console.log('[BLE] Auto-scanning on startup...');
        setTimeout(() => scanForDevicesInternal(false), 500);
      }
    };

    // Check if BLE is already on right now
    bleManager.state().then((state: any) => {
      if (state === State.PoweredOn) {
        tryAutoConnect();
      }
    });

    // Also listen for state changes (e.g. user turns BT on after launch)
    const subscription = bleManager.onStateChange((state: any) => {
      if (state === State.PoweredOn) tryAutoConnect();
    }, false);

    return () => subscription.remove();
  }, []);

  // Internal scan function (silent mode for auto-connect)
  const scanForDevicesInternal = useCallback(async (silent: boolean = false) => {
    if (!bleManager) return;

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      if (!silent) Alert.alert('Permission Error', 'Bluetooth permissions are required');
      return;
    }

    const state = await bleManager.state();
    if (state !== State.PoweredOn) {
      if (!silent) Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to scan for devices');
      return;
    }

    // Reset manual disconnect flag when scanning
    manualDisconnectRef.current = false;
    setIsScanning(true);
    setConnectionError(null);

    bleManager.startDeviceScan(null, null, (error: any, device: any) => {
      if (error) {
        console.error('Scan error:', error);
        setIsScanning(false);
        return;
      }

      if (device?.name === DEVICE_NAME) {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        connectToDevice(device);
      }
    });

    // Stop scan after timeout
    setTimeout(() => {
      bleManager?.stopDeviceScan();
      setIsScanning(false);
    }, SCAN_TIMEOUT_MS);
  }, []);

  // Store scan function in ref for use in callbacks
  useEffect(() => {
    scanFnRef.current = scanForDevicesInternal;
  }, [scanForDevicesInternal]);

  const connectToDevice = useCallback(async (device: Device) => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(connected);

      // Subscribe to state notifications
      connected.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_UUIDS.STATE,
        (error, characteristic) => {
          if (error) {
            console.error('State notification error:', error);
            return;
          }
          if (characteristic?.value) {
            const decoded = decode(characteristic.value);
            setDeviceState(decoded as DeviceState);
          }
        }
      );

      // Subscribe to stats notifications
      connected.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_UUIDS.STATS,
        (error, characteristic) => {
          if (error) {
            console.error('Stats notification error:', error);
            return;
          }
          if (characteristic?.value) {
            try {
              const parsed = decodeJSON<DeviceStats>(characteristic.value);
              setStats(parsed);
            } catch (e) {
              console.error('Failed to parse stats:', e);
            }
          }
        }
      );

      // Read initial values
      try {
        const stateChar = await connected.readCharacteristicForService(SERVICE_UUID, CHAR_UUIDS.STATE);
        if (stateChar?.value) {
          setDeviceState(decode(stateChar.value) as DeviceState);
        }
      } catch (e) {
        console.error('Failed to read initial state:', e);
      }

      try {
        const statsChar = await connected.readCharacteristicForService(SERVICE_UUID, CHAR_UUIDS.STATS);
        if (statsChar?.value) {
          setStats(decodeJSON<DeviceStats>(statsChar.value));
        }
      } catch (e) {
        console.error('Failed to read initial stats:', e);
      }

      try {
        const pwmChar = await connected.readCharacteristicForService(SERVICE_UUID, CHAR_UUIDS.PWM);
        if (pwmChar?.value) {
          const value = parseInt(decode(pwmChar.value), 10);
          if (!isNaN(value)) setPwmValue(value);
        }
      } catch (e) {
        console.error('Failed to read initial PWM:', e);
      }

      try {
        const durChar = await connected.readCharacteristicForService(SERVICE_UUID, CHAR_UUIDS.DURATION);
        if (durChar?.value) {
          const value = parseInt(decode(durChar.value), 10);
          if (!isNaN(value)) setSessionDuration(value);
        }
      } catch (e) {
        console.error('Failed to read initial duration:', e);
      }

      try {
        const batChar = await connected.readCharacteristicForService(SERVICE_UUID, CHAR_UUIDS.BATTERY);
        if (batChar?.value) {
          const parsed = decodeJSON<{ pct: number; v: number; chg: number }>(batChar.value);
          if (parsed.pct >= 0) setBatteryPercent(parsed.pct);
          setIsCharging(parsed.chg === 1);
        }
      } catch (e) {
        // Battery characteristic optional - ignore if unavailable
      }

      // Subscribe to battery notifications
      connected.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_UUIDS.BATTERY,
        (error, characteristic) => {
          if (error) {
            // Silently ignore battery notification errors - feature is optional
            return;
          }
          if (characteristic?.value) {
            try {
              const parsed = decodeJSON<{ pct: number; v: number; chg: number }>(characteristic.value);
              if (parsed.pct >= 0) setBatteryPercent(parsed.pct);
              setIsCharging(parsed.chg === 1);
            } catch (e) {
              console.error('Failed to parse battery:', e);
            }
          }
        }
      );

      // Handle disconnection with auto-reconnect
      connected.onDisconnected(() => {
        console.log('[BLE] Device disconnected');
        setConnectedDevice(null);
        setDeviceState('--');
        setIsFiring(false);
        setBatteryPercent(null);
        setIsCharging(false);
        if (fireTimeoutRef.current) {
          clearTimeout(fireTimeoutRef.current);
        }

        // Only auto-reconnect if not manually disconnected
        if (!manualDisconnectRef.current) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[BLE] Attempting auto-reconnect...');
            scanFnRef.current?.(true);
          }, 2000);
        }
      });

      setIsConnecting(false);
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError('Could not connect to device');
      setIsConnecting(false);
      Alert.alert('Connection Failed', 'Could not connect to device');
    }
  }, []);

  const scanForDevices = useCallback(async () => {
    await scanForDevicesInternal(false);
  }, [scanForDevicesInternal]);

  const disconnect = useCallback(async () => {
    if (connectedDevice) {
      // Mark as manual disconnect to prevent auto-reconnect
      manualDisconnectRef.current = true;

      // Cancel any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Stop firing if active
      if (isFiring) {
        await sendFireCommand(false);
      }
      await connectedDevice.cancelConnection();
      setConnectedDevice(null);
      setDeviceState('--');
    }
  }, [connectedDevice, isFiring]);

  const sendFireCommand = useCallback(async (active: boolean) => {
    if (!connectedDevice) return;

    try {
      // Clear any existing timeout
      if (fireTimeoutRef.current) {
        clearTimeout(fireTimeoutRef.current);
        fireTimeoutRef.current = null;
      }

      // Use writeWithoutResponse for lower latency
      await connectedDevice.writeCharacteristicWithoutResponseForService(
        SERVICE_UUID,
        CHAR_UUIDS.FIRE,
        encode(active ? '1' : '0')
      );

      setIsFiring(active);

      // Safety timeout - auto-stop after max duration
      if (active) {
        fireTimeoutRef.current = setTimeout(async () => {
          try {
            await connectedDevice.writeCharacteristicWithoutResponseForService(
              SERVICE_UUID,
              CHAR_UUIDS.FIRE,
              encode('0')
            );
            setIsFiring(false);
          } catch (e) {
            console.error('Fire timeout stop error:', e);
          }
        }, MAX_FIRE_DURATION_MS);
      }
    } catch (error) {
      console.error('Fire error:', error);
      setIsFiring(false);
    }
  }, [connectedDevice]);

  const sendPwmCommand = useCallback(async (value: number) => {
    if (!connectedDevice) return;

    const clampedValue = Math.max(0, Math.min(255, Math.round(value)));

    try {
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHAR_UUIDS.PWM,
        encode(clampedValue.toString())
      );
      setPwmValue(clampedValue);
    } catch (error) {
      console.error('PWM error:', error);
    }
  }, [connectedDevice]);

  const sendDurationCommand = useCallback(async (seconds: number) => {
    if (!connectedDevice) return;

    const clamped = Math.max(1, Math.min(30, Math.round(seconds)));

    try {
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHAR_UUIDS.DURATION,
        encode(clamped.toString())
      );
      setSessionDuration(clamped);
    } catch (error) {
      console.error('Duration error:', error);
    }
  }, [connectedDevice]);

  // Auto-stop firing on disconnect
  useEffect(() => {
    if (!connectedDevice && isFiring) {
      setIsFiring(false);
    }
  }, [connectedDevice, isFiring]);

  const value: BLEContextValue = {
    connectedDevice,
    isScanning,
    isConnecting,
    connectionError,
    deviceState,
    stats,
    pwmValue,
    sessionDuration,
    isFiring,
    batteryPercent,
    isCharging,
    scanForDevices,
    disconnect,
    sendFireCommand,
    sendPwmCommand,
    sendDurationCommand,
  };

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
};
