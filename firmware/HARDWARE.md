# Smart Battery — Hardware Wiring

Two PCB generations targeted by the firmware:

- **v1 carrier** (`pcb/v1-carrier/`) — original ESP32 dev-board socket prototype. Uses the GPIO numbers in the table below as written.
- **v2 integrated** (`pcb/v2-integrated/`) — production target with ESP32-S3-MINI-1 soldered down. **Requires four `#define` updates** to the firmware because the S3 silicon doesn't expose GPIOs 22, 23, 27 (chip-level difference vs classic ESP32):
  - `PIN_I2C_SDA: 21 → 8`
  - `PIN_I2C_SCL: 22 → 9`
  - `PIN_OLED_MOSI: 23 → 11`
  - `PIN_COIL_PWM: 27 → 6`
  - `PIN_FIRE`, `PIN_OLED_CS`, `PIN_OLED_RST`, `PIN_OLED_DC`, `PIN_OLED_CLK` (4, 5, 16, 17, 18) stay the same.
  - Compile-time switch via build flag (e.g. `BOARD_V2`) is the recommended way to keep one source tree supporting both boards during the v1 → v2 transition.

ESP32-S3 USB programming uses the chip's native USB-Serial/JTAG controller (no external USB-UART chip on v2); flashing over USB-C works without auto-reset transistors. EN/IO0 can be probed via the 5-pin DEBUG pad row on v2 if anything ever gets wedged.

## Block diagram

```
                       ┌──────────────────────────────┐
                       │           ESP32              │
                       │                              │
   3-pin switch ──────▶│ GPIO 4   (INPUT_PULLUP)      │
   (fire button)       │                              │
                       │ GPIO 27 ───▶ MOSFET gate ────┼──▶ Vape coil
                       │            (5 kHz, 8-bit)    │     │
                       │                              │     │
                       │ GPIO 21 ◀──I²C SDA───┐       │     │
                       │ GPIO 22 ──▶I²C SCL──┐│       │     │
                       │                     ││       │     │
                       │   SPI to OLED:      ▼▼       │     │
                       │ GPIO 5   OLED_CS    INA219   │     │
                       │ GPIO 17  OLED_DC    @ 0x40   │     ▼
                       │ GPIO 16  OLED_RST     │      │   ┌────┐
                       │ GPIO 23  OLED_MOSI    │ V+/V-┼──▶│cell│ Li-ion 1S
                       │ GPIO 18  OLED_CLK     │      │   └────┘
                       └─────────┬─────────────┴──────┘
                                 │
                            128×64 SSD1306 OLED
```

## ESP32 pin map

| GPIO | Dir   | Net           | Peripheral / notes                               |
| ---- | ----- | ------------- | ------------------------------------------------ |
| 4    | IN    | SWITCH        | `INPUT_PULLUP`; LOW = pressed (fire)             |
| 5    | OUT   | OLED_CS       | SSD1306 SPI chip select                          |
| 16   | OUT   | OLED_RST      | SSD1306 reset                                    |
| 17   | OUT   | OLED_DC       | SSD1306 data/command                             |
| 18   | OUT   | OLED_CLK      | SSD1306 SPI clock (software SPI)                 |
| 21   | I/O   | I²C SDA       | Shared bus — INA219 only device (`Wire.begin(21,22)`) |
| 22   | OUT   | I²C SCL       | Same                                             |
| 23   | OUT   | OLED_MOSI     | SSD1306 SPI data (software SPI)                  |
| 27   | OUT   | COIL_PWM      | MOSFET gate. **Driven LOW first thing in `setup()`** to prevent boot-time fire. `ledcAttach(27, 5000 Hz, 8-bit)`. |

## I²C bus

- Single device: **INA219** at default address **0x40** (no AD0/AD1 jumpers shorted).
- Firmware does a full 1–126 address scan in `setup()` to "warm up" the bus before `ina219.begin()` — leftover workaround, leave it.
- Calibration: **`setCalibration_16V_400mA()`** — bus 0–16 V range, ~400 mA max, ~10 µV/bit shunt. Implies a **0.1 Ω** shunt on the INA219 breakout (Adafruit default).

## Coil drive

- 5 kHz / 8-bit hardware PWM on GPIO 27 via `ledcAttach`.
- App writes 0–255 over BLE → duty cycle.
- Software safety: max 10 s fire (configurable 1–30 s via BLE `DURATION` char). Phone-side mirrors with 10 s max.
- **Boot safety**: `pinMode(27, OUTPUT); digitalWrite(27, LOW)` is the *first* line of `setup()`, before `Serial.begin`, to keep the MOSFET off through reset.

## Battery sense (INA219)

- Polled every **5000 ms** in `loop()`.
- `voltage = busV + shuntV` (whole-cell voltage, since INA219 sits in series).
- Charging detection: `shuntMv < -5.0 mV` → `chg=1` (current flowing *into* the cell flips shunt sign).
- Voltage→% curve (`voltageToBatteryPercent` in `firmware/smartbattery.ino:203`):

  | Cell V    | %      |
  | --------- | ------ |
  | ≥ 4.20    | 100    |
  | 4.00–4.20 | 75–100 |
  | 3.80–4.00 | 50–75  |
  | 3.60–3.80 | 25–50  |
  | 3.20–3.60 | 0–25   |
  | < 3.20    | 0      |

  This is a piecewise linear approximation of a Li-ion discharge curve at light load — fine for a UI gauge, not for state-of-charge accuracy.

## Power tree

The INA219 sits in the cell+ lead. **Everything** — both the loads and the Type-C charger output — connects to V−, so all current (charge and discharge) passes through the shunt.

```
                ┌───────────────┐
                │ INA219        │
   Cell + ─────▶│ V+   [shunt]  │
                │               │
                │           V− ─┼────┬──▶ Type-C charger module ◀── USB-C in
                └───────────────┘    │     (CC/CV charge, off-the-shelf)
                                     ├──▶ ESP32 (VIN via boost, assumed)
                                     ├──▶ MOSFET drain → coil
                                     └──▶ 3.3 V LDO → OLED, INA219 logic

   Cell − ──────────────────────────── GND (common)
```

- **Discharge** (load active, USB unplugged): current flows cell+ → V+ → V− → loads → GND → cell−. `shuntMv` is positive.
- **Charge** (USB plugged in): charger pushes current the *other* way — USB → charger output → V− → V+ → cell+. `shuntMv` is negative. This is why `firmware/smartbattery.ino:678` uses `shuntMv < -5.0 mV` as the charging detector — the topology forces charge current through the shunt.
- **Both at once** (USB plugged in *and* firing): INA219 reads the algebraic sum. If charger current > load draw, net is negative ("charging"); otherwise positive. Detection threshold is ±5 mV to debounce.
- The Type-C charger module is off-the-shelf (TP4056-with-USB-C or similar). ESP32 has no involvement in charge control — it just observes via the INA219.

**Unknowns** (need to be filled in once a PCB is drawn):

- Boost converter part for ESP32 supply (cell can drop to ~3.0 V; ESP32 wants 3.3 V regulated)
- Type-C charger module exact part number + whether it has integrated protection or needs a separate DW01-style protection IC
- MOSFET part + gate resistor + flyback handling

## BLE GATT contract

Service UUID `12345678-1234-1234-1234-123456789abc`, advertised name `SmartBattery`. Characteristics:

| Char     | UUID suffix | Direction        | Payload                                   |
| -------- | ----------- | ---------------- | ----------------------------------------- |
| STATE    | `…ab1`      | Read + Notify    | `"idle"` / `"firing"`                     |
| STATS    | `…ab2`      | Read + Notify    | JSON `{totalSessions,totalSeconds,…}`     |
| FIRE     | `…ab4`      | Write w/o resp   | `"1"` / `"0"`                             |
| PWM      | `…ab5`      | Read + Write     | ASCII int 0–255                           |
| DURATION | `…ab6`      | Read + Write     | ASCII seconds, 1–30 (max session length)  |
| BATTERY  | `…ab7`      | Read + Notify    | JSON `{pct,v,chg}`                        |
