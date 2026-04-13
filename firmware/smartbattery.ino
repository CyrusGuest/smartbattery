// ============================================================================
// Medical Marijuana Smart Battery - Framework with BLE
// ============================================================================

#include <SPI.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>
#include <Adafruit_INA219.h>
#include <Preferences.h>

// ============================================================================
// BLE Configuration
// ============================================================================
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define STATE_CHAR_UUID     "12345678-1234-1234-1234-123456789ab1"
#define STATS_CHAR_UUID     "12345678-1234-1234-1234-123456789ab2"
#define FIRE_CHAR_UUID      "12345678-1234-1234-1234-123456789ab4"
#define PWM_CHAR_UUID       "12345678-1234-1234-1234-123456789ab5"
#define DURATION_CHAR_UUID  "12345678-1234-1234-1234-123456789ab6"
#define BATTERY_CHAR_UUID   "12345678-1234-1234-1234-123456789ab7"

BLEServer* pServer = NULL;
BLECharacteristic* pStateChar = NULL;
BLECharacteristic* pStatsChar = NULL;
BLECharacteristic* pFireChar = NULL;
BLECharacteristic* pPwmChar = NULL;
BLECharacteristic* pDurationChar = NULL;
BLECharacteristic* pBatteryChar = NULL;
bool bleDeviceConnected = false;
bool oldBleDeviceConnected = false;

// Remote fire control
bool bleFireActive = false;
unsigned long bleFireStartTime = 0;

// PWM control
int pwmValue = 255;  // Default to 100% (0-255)

// Session duration control
int maxSessionSeconds = 10;  // Default 10s, configurable via BLE

// ============================================================================
// Pin Definitions
// ============================================================================
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64

#define OLED_CS    5
#define OLED_DC    17
#define OLED_RST   16
#define OLED_MOSI  23
#define OLED_CLK   18

#define SWITCH_PIN    4
#define NEOPIXEL_PIN  2
#define NUM_PIXELS    8
#define PWM_PIN       27    // PWM output for power control
// INA219 uses I2C on GPIO 21 (SDA) and GPIO 22 (SCL)

// PWM Configuration
#define PWM_FREQ      5000  // 5 kHz
#define PWM_RESOLUTION 8    // 8-bit (0-255)

// ============================================================================
// Configuration
// ============================================================================
#define LED_BRIGHTNESS       50      // 0-255

// ============================================================================
// Device States
// ============================================================================
enum DeviceState {
    STATE_IDLE,
    STATE_FIRING
};

// ============================================================================
// Global Objects
// ============================================================================
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, OLED_MOSI, OLED_CLK, OLED_DC, OLED_RST, OLED_CS);
Adafruit_NeoPixel strip(NUM_PIXELS, NEOPIXEL_PIN, NEO_GRBW + NEO_KHZ800);
Adafruit_INA219 ina219;
Preferences preferences;

// Battery tracking
int batteryPercent = -1;
float batteryVoltage = 0.0;
bool batteryCharging = false;
unsigned long lastBatteryReadMs = 0;
#define BATTERY_READ_INTERVAL_MS 5000
#define CHARGING_THRESHOLD_MV -5.0  // Negative shunt = charging

// ============================================================================
// State Variables
// ============================================================================
DeviceState currentState = STATE_IDLE;
bool lastSwitchState = HIGH;

// Session tracking
unsigned long sessionStartTime = 0;
unsigned long lastSessionDuration = 0;
unsigned long lastSessionEndTime = 0;
#define SESSION_COOLDOWN_MS 3000

// Usage statistics (persisted)
unsigned long totalSessions = 0;
unsigned long totalSeconds = 0;

// Screen timeout
#define SCREEN_TIMEOUT_MS 15000  // 15 seconds
unsigned long lastActivityTime = 0;
bool screenOn = true;

// ============================================================================
// BLE Callbacks & Pending Commands
// ============================================================================

// Forward declaration for screen wake
void wakeScreen();

class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        bleDeviceConnected = true;
        wakeScreen();
        Serial.println("[BLE] Device connected");
    }

    void onDisconnect(BLEServer* pServer) {
        bleDeviceConnected = false;
        bleFireActive = false;  // Stop firing on disconnect for safety
        Serial.println("[BLE] Device disconnected");
    }
};

class FireCharCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String value = pCharacteristic->getValue();
        wakeScreen();

        if (value.length() > 0) {
            if (value == "1") {
                Serial.println("[BLE] Fire ON");
                bleFireActive = true;
                bleFireStartTime = millis();
            } else if (value == "0") {
                Serial.println("[BLE] Fire OFF");
                bleFireActive = false;
            }
        }
    }
};

// Forward declaration for display update
void drawIdleScreen();

class PwmCharCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String value = pCharacteristic->getValue();
        wakeScreen();

        if (value.length() > 0) {
            int newPwm = value.toInt();
            newPwm = constrain(newPwm, 0, 255);
            pwmValue = newPwm;
            Serial.printf("[BLE] PWM set to %d (%.1fV)\n", pwmValue, (pwmValue / 255.0) * 4.2);

            // Update display in real-time if in idle state
            if (currentState == STATE_IDLE) {
                drawIdleScreen();
            }
        }
    }
};

class DurationCharCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String value = pCharacteristic->getValue();
        wakeScreen();

        if (value.length() > 0) {
            int newDuration = value.toInt();
            newDuration = constrain(newDuration, 1, 30);
            maxSessionSeconds = newDuration;
            Serial.printf("[BLE] Session duration set to %ds\n", maxSessionSeconds);
            pDurationChar->setValue(String(maxSessionSeconds).c_str());
        }
    }
};

// ============================================================================
// Battery Functions
// ============================================================================

// Direct I2C register read with repeated start

int voltageToBatteryPercent(float v) {
    if (v >= 4.20) return 100;
    if (v >= 4.00) return (int)map((long)(v * 100), 400, 420, 75, 100);
    if (v >= 3.80) return (int)map((long)(v * 100), 380, 400, 50, 75);
    if (v >= 3.60) return (int)map((long)(v * 100), 360, 380, 25, 50);
    if (v >= 3.20) return (int)map((long)(v * 100), 320, 360, 0, 25);
    return 0;
}

void updateBleBattery() {
    if (pBatteryChar) {
        StaticJsonDocument<64> doc;
        doc["pct"] = batteryPercent;
        doc["v"] = batteryVoltage;
        doc["chg"] = batteryCharging ? 1 : 0;
        String json;
        serializeJson(doc, json);
        pBatteryChar->setValue(json.c_str());
        if (bleDeviceConnected) {
            pBatteryChar->notify();
        }
    }
}

// ============================================================================
// BLE Functions
// ============================================================================

void setupBLE() {
    Serial.println("Starting BLE...");

    BLEDevice::init("SmartBattery");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);

    // State characteristic (read + notify)
    pStateChar = pService->createCharacteristic(
        STATE_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pStateChar->addDescriptor(new BLE2902());

    // Stats characteristic (read + notify)
    pStatsChar = pService->createCharacteristic(
        STATS_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pStatsChar->addDescriptor(new BLE2902());

    // Fire characteristic (write without response for low latency)
    pFireChar = pService->createCharacteristic(
        FIRE_CHAR_UUID,
        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
    );
    pFireChar->setCallbacks(new FireCharCallbacks());

    // PWM characteristic (read + write)
    pPwmChar = pService->createCharacteristic(
        PWM_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
    );
    pPwmChar->setCallbacks(new PwmCharCallbacks());
    pPwmChar->setValue(String(pwmValue).c_str());

    // Duration characteristic (read + write)
    pDurationChar = pService->createCharacteristic(
        DURATION_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
    );
    pDurationChar->setCallbacks(new DurationCharCallbacks());
    pDurationChar->setValue(String(maxSessionSeconds).c_str());

    // Battery characteristic (read + notify)
    pBatteryChar = pService->createCharacteristic(
        BATTERY_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pBatteryChar->addDescriptor(new BLE2902());
    pBatteryChar->setValue("{\"pct\":-1,\"v\":0}");

    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("[BLE] Advertising as 'SmartBattery'");
}

void updateBleState(const char* state) {
    if (pStateChar) {
        pStateChar->setValue(state);
        if (bleDeviceConnected) {
            pStateChar->notify();
        }
    }
}

void updateBleStats() {
    if (pStatsChar) {
        StaticJsonDocument<64> doc;
        doc["totalSessions"] = totalSessions;
        doc["totalSeconds"] = totalSeconds;

        String json;
        serializeJson(doc, json);

        pStatsChar->setValue(json.c_str());
        if (bleDeviceConnected) {
            pStatsChar->notify();
        }
    }
}


void handleBleReconnect() {
    if (!bleDeviceConnected && oldBleDeviceConnected) {
        delay(500);
        pServer->startAdvertising();
        Serial.println("[BLE] Restarting advertising");
        oldBleDeviceConnected = bleDeviceConnected;
    }

    if (bleDeviceConnected && !oldBleDeviceConnected) {
        oldBleDeviceConnected = bleDeviceConnected;
    }
}

// ============================================================================
// Display Functions
// ============================================================================

void drawIdleScreen() {
    display.clearDisplay();

    // Title with BLE indicator
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.print("Smart Battery");

    if (bleDeviceConnected) {
        display.setCursor(116, 0);
        display.print("B");
    }

    display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

    display.setCursor(0, 16);
    display.print("Total: ");
    display.print(totalSessions);
    display.print(" (");
    printTime(totalSeconds);
    display.println(")");

    display.setCursor(0, 28);
    display.print("Power: ");
    display.print((pwmValue / 255.0) * 4.2, 1);
    display.print("V");

    if (batteryPercent >= 0) {
        display.setCursor(80, 28);
        display.print(batteryPercent);
        display.print("%");
        if (batteryCharging) display.print("+");
    }

    display.setTextSize(2);
    display.setCursor(28, 46);
    display.println("READY");

    display.display();
}

void drawFiringScreen(unsigned long elapsedMs) {
    display.clearDisplay();

    unsigned long elapsedSec = elapsedMs / 1000;

    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(28, 8);
    display.println("ACTIVE");

    display.setTextSize(3);
    display.setCursor(52, 28);
    display.print(elapsedSec);
    display.setTextSize(1);
    display.print("s");

    int barWidth = map(elapsedMs, 0, maxSessionSeconds * 1000, 0, 120);
    display.drawRect(4, 54, 120, 8, SSD1306_WHITE);
    display.fillRect(4, 54, barWidth, 8, SSD1306_WHITE);

    display.display();
}

void printTime(unsigned long totalSec) {
    if (totalSec >= 60) {
        display.print(totalSec / 60);
        display.print("m ");
    }
    display.print(totalSec % 60);
    display.print("s");
}

// ============================================================================
// Screen Timeout Functions
// ============================================================================

void wakeScreen() {
    lastActivityTime = millis();
    if (!screenOn) {
        screenOn = true;
        display.ssd1306_command(SSD1306_DISPLAYON);
        // Redraw current screen
        if (currentState == STATE_IDLE) {
            drawIdleScreen();
        }
        Serial.println("[Display] Screen ON");
    }
}

void sleepScreen() {
    if (screenOn) {
        screenOn = false;
        display.ssd1306_command(SSD1306_DISPLAYOFF);
        Serial.println("[Display] Screen OFF");
    }
}

void checkScreenTimeout() {
    // Don't timeout while firing
    if (currentState == STATE_FIRING) {
        lastActivityTime = millis();
        return;
    }

    if (screenOn && (millis() - lastActivityTime >= SCREEN_TIMEOUT_MS)) {
        sleepScreen();
    }
}

// ============================================================================
// LED Functions
// ============================================================================

void setLedsIdle() {
    for (int i = 0; i < NUM_PIXELS; i++) {
        strip.setPixelColor(i, strip.Color(0, 0, 0, 30));
    }
    strip.show();
}

void setLedsFiring() {
    for (int i = 0; i < NUM_PIXELS; i++) {
        strip.setPixelColor(i, strip.Color(0, 255, 0, 0));
    }
    strip.show();
}

// ============================================================================
// Storage Functions
// ============================================================================

void loadStats() {
    preferences.begin("battery", true);
    totalSessions = preferences.getULong("totalSess", 0);
    totalSeconds = preferences.getULong("totalSec", 0);
    maxSessionSeconds = preferences.getInt("maxSessSec", 10);
    preferences.end();

    Serial.println("Stats loaded");
    Serial.print("Total sessions: ");
    Serial.println(totalSessions);
}

void saveStats() {
    preferences.begin("battery", false);
    preferences.putULong("totalSess", totalSessions);
    preferences.putULong("totalSec", totalSeconds);
    preferences.putInt("maxSessSec", maxSessionSeconds);
    preferences.end();
}


// ============================================================================
// State Machine
// ============================================================================

void enterState(DeviceState newState) {
    currentState = newState;

    const char* stateName;
    switch (newState) {
        case STATE_IDLE:
            stateName = "idle";
            Serial.println("State: IDLE");
            ledcWrite(PWM_PIN, 0);  // PWM off
            setLedsIdle();
            drawIdleScreen();
            break;

        case STATE_FIRING:
            stateName = "firing";
            Serial.printf("State: FIRING - PWM pin %d, value %d (%.1fV)\n", PWM_PIN, pwmValue, (pwmValue / 255.0) * 4.2);
            sessionStartTime = millis();
            ledcWrite(PWM_PIN, pwmValue);  // Apply PWM
            Serial.println("PWM output enabled - check GPIO 27 with multimeter");
            setLedsFiring();
            break;
    }

    updateBleState(stateName);
}

void endSession() {
    ledcWrite(PWM_PIN, 0);  // Ensure PWM is off

    unsigned long duration = (millis() - sessionStartTime) / 1000;
    lastSessionDuration = duration;

    totalSessions++;
    totalSeconds += duration;

    Serial.print("Session ended: ");
    Serial.print(duration);
    Serial.println("s");

    lastSessionEndTime = millis();
    saveStats();
    updateBleStats();
    enterState(STATE_IDLE);
}

void handleIdleState(bool switchOn) {
    // Fire from physical switch or BLE remote
    bool cooledDown = (millis() - lastSessionEndTime) >= SESSION_COOLDOWN_MS;
    if ((switchOn || bleFireActive) && cooledDown) {
        enterState(STATE_FIRING);
    }
}

void handleFiringState(bool switchOn) {
    unsigned long elapsed = millis() - sessionStartTime;

    drawFiringScreen(elapsed);

    // Auto-cutoff after max duration
    if (elapsed >= (maxSessionSeconds * 1000)) {
        Serial.println("Auto-cutoff");
        bleFireActive = false;  // Reset BLE fire state
        endSession();
        return;
    }

    // Safety timeout for BLE fire (10 seconds)
    if (bleFireActive && (millis() - bleFireStartTime) >= (maxSessionSeconds * 1000)) {
        Serial.println("[BLE] Fire safety timeout");
        bleFireActive = false;
    }

    // End session when both physical switch AND BLE fire are off
    if (!switchOn && !bleFireActive) {
        endSession();
    }
}

// ============================================================================
// Setup & Loop
// ============================================================================

void setup() {
    // Drive PWM pin LOW immediately to prevent MOSFET firing during boot
    pinMode(PWM_PIN, OUTPUT);
    digitalWrite(PWM_PIN, LOW);

    Serial.begin(115200);
    Wire.begin(21, 22);  // Init I2C early
    delay(1000);
    Serial.println("\n=== Smart Battery ===");

    pinMode(SWITCH_PIN, INPUT_PULLUP);

    // Display init
    pinMode(OLED_RST, OUTPUT);
    digitalWrite(OLED_RST, HIGH);
    delay(10);
    digitalWrite(OLED_RST, LOW);
    delay(10);
    digitalWrite(OLED_RST, HIGH);
    delay(10);

    if (!display.begin(SSD1306_SWITCHCAPVCC)) {
        Serial.println("Display FAILED!");
        while (1);
    }
    Serial.println("Display OK");
    display.ssd1306_command(SSD1306_DISPLAYON);
    display.ssd1306_command(0x81);  // Set contrast command
    display.ssd1306_command(0xFF);  // Max contrast

    // LEDs init
    strip.begin();
    strip.setBrightness(LED_BRIGHTNESS);
    strip.show();
    Serial.println("LEDs OK");

    // PWM init
    ledcAttach(PWM_PIN, PWM_FREQ, PWM_RESOLUTION);
    ledcWrite(PWM_PIN, 0);  // Start with PWM off
    Serial.println("PWM OK");

    // INA219 init - full bus scan needed to warm up I2C before begin()
    for (byte addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        Wire.endTransmission();
    }
    if (!ina219.begin()) {
        Serial.println("INA219 FAILED!");
    } else {
        Serial.println("INA219 OK");
        ina219.setCalibration_16V_400mA();
        delay(500);
    }

    // BLE init
    setupBLE();

    // Load stats
    loadStats();

    // Start
    enterState(STATE_IDLE);
    updateBleStats();

    // Initialize screen timeout
    lastActivityTime = millis();

    Serial.println("=== Ready ===\n");
}

void loop() {
    bool switchOn = (digitalRead(SWITCH_PIN) == LOW);

    // Wake screen on button press
    if (switchOn && lastSwitchState == HIGH) {
        wakeScreen();
    }
    lastSwitchState = switchOn ? LOW : HIGH;

    switch (currentState) {
        case STATE_IDLE:
            handleIdleState(switchOn);
            break;
        case STATE_FIRING:
            handleFiringState(switchOn);
            break;
    }

    handleBleReconnect();

    // Poll INA219 every 5 seconds
    if (millis() - lastBatteryReadMs >= BATTERY_READ_INTERVAL_MS) {
        lastBatteryReadMs = millis();
        float busV = ina219.getBusVoltage_V();
        float shuntMv = ina219.getShuntVoltage_mV();
        float shuntV = shuntMv / 1000.0;
        batteryVoltage = busV + shuntV;
        batteryPercent = voltageToBatteryPercent(batteryVoltage);
        batteryCharging = shuntMv < CHARGING_THRESHOLD_MV;
        Serial.printf("[INA219] %.2fV %d%% %s\n", batteryVoltage, batteryPercent, batteryCharging ? "CHG" : "");
        updateBleBattery();
        if (currentState == STATE_IDLE && screenOn) {
            drawIdleScreen();
        }
    }

    // Check screen timeout
    checkScreenTimeout();

    delay(50);
}
