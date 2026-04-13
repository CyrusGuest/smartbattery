// BLE UUIDs - must match ESP32 firmware
export const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';

export const CHAR_UUIDS = {
  STATE: '12345678-1234-1234-1234-123456789ab1', // Notify: idle|firing
  STATS: '12345678-1234-1234-1234-123456789ab2', // Notify: JSON stats
  FIRE: '12345678-1234-1234-1234-123456789ab4', // Write: fire on/off
  PWM: '12345678-1234-1234-1234-123456789ab5', // Read/Write: PWM value (0-255)
  DURATION: '12345678-1234-1234-1234-123456789ab6', // Read/Write: session duration in seconds (1-30)
  BATTERY: '12345678-1234-1234-1234-123456789ab7', // Notify: JSON {pct, v}
};

export const DEVICE_NAME = 'SmartBattery';

// Safety limits
export const MAX_FIRE_DURATION_MS = 10000; // 10 seconds max fire time
export const SCAN_TIMEOUT_MS = 10000; // 10 seconds scan timeout
