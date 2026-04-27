# Smart Battery PCB

KiCad project for the Smart Battery carrier PCB. The board is a **carrier** that off-the-shelf modules plug into via pin headers — no bare ICs in v1.

> **Source of truth for connections**: `firmware/HARDWARE.md` in the repo root. Anything here that contradicts that file is wrong; HARDWARE.md wins.

## First-time KiCad setup

1. **Open KiCad** (`/Applications/KiCad/KiCad.app`).
2. KiCad will ask whether to import settings from a previous version — pick **"Start with default settings"**.
3. KiCad will ask about library paths — accept the defaults.
4. **File → New Project…** → navigate to `~/programming/smart-battery/pcb/` → name it `smart-battery` → uncheck "Create a new folder" (we already have one) → save.
5. You should now see `smart-battery.kicad_pro` and `smart-battery.kicad_sch` in this directory.

That's it for setup. Now we draw the schematic.

## Schematic plan

This translates `firmware/HARDWARE.md` into KiCad symbols and nets. **Read HARDWARE.md first** to understand the topology — especially the INA219 in-line-with-cell+ wiring.

### Symbols to place

You won't find ready-made symbols for module breakouts in KiCad's stock library. For a carrier PCB, the right move is to use generic **pin header** symbols (`Connector_Generic:Conn_01x06`, etc.) and label them with the module name.

| Symbol                       | Module it represents                | Pin count | KiCad symbol                        |
| ---------------------------- | ----------------------------------- | --------- | ----------------------------------- |
| **U1 — ESP32**               | ESP32 dev board (whichever you have) | varies (15, 19, or 20 per side) | `Connector_Generic:Conn_02x15_Odd_Even` (or matching count) |
| **U2 — INA219 breakout**     | Adafruit/clone INA219               | 6         | `Connector_Generic:Conn_01x06`      |
| **U3 — TP4056 USB-C charger**| TP4056 module                       | 4–6 (varies) | `Connector_Generic:Conn_01x05` or `01x06` depending on module |
| **U4 — SSD1306 OLED (SPI)**  | 128×64 SPI OLED                     | 7         | `Connector_Generic:Conn_01x07`      |
| **U5 — MOSFET**              | Logic-level N-channel               | 3 (G/D/S) | `Device:Q_NMOS_GSD` (real symbol, not header) |
| **SW1 — Fire switch**        | Momentary, normally-open            | 2         | `Switch:SW_Push`                    |
| **J1 — Coil connector**      | Whatever you pick (510 thread / pads / connector) | 2 | `Connector_Generic:Conn_01x02` |
| **BT1 — LiPo cell**          | Single cell via JST-PH              | 2         | `Connector:Conn_01x02_Pin` (label as JST-PH) |

> Why headers? Because in v1 you're soldering pin headers onto each module and onto the carrier PCB. The "symbol" is just the row of holes the module plugs into. Footprint matches.

### Nets (connections)

Pulled straight from `firmware/HARDWARE.md`. **Power topology is critical** — the INA219 sits in series with the cell+, so loads connect to V−, NOT V+.

**Power rail (the high-current path)**

```
BT1 (cell)   ─[+]─▶ U2.V+ (INA219)
                    │
                    [internal shunt]
                    │
                   U2.V- ──┬──▶ U3.OUT+ (TP4056 BAT+ side, charger output to "system")
                            ├──▶ U1.VIN  (ESP32 dev board VIN)
                            ├──▶ U5.D    (MOSFET drain)
                            └──▶ J1.1    (coil + terminal — the OTHER side goes to U5.S)

BT1 (cell)   ─[−]─▶ GND  ───┬── U2.GND, U3.GND, U1.GND, J1.2, etc.
U3 USB-C input ─── (handled internally by the TP4056 module)
```

Then `U5.G` (MOSFET gate) is driven by `U1.GPIO27`, and `U5.S` (source) returns to GND through the coil. So the coil is between **V−rail** and the **MOSFET drain**, with the source on GND. (Standard low-side switch.)

**3.3 V rail (logic)**

```
U1 (ESP32) 3V3 pin ──┬── U2.Vcc (INA219 logic supply, 3.3V — NOT cell rail)
                      └── U4.VCC (OLED)
```

**I²C (INA219)**

```
U1.GPIO21 ── U2.SDA
U1.GPIO22 ── U2.SCL
```

(Optional but recommended: 4.7 kΩ pull-ups from SDA → 3V3 and SCL → 3V3. The Adafruit INA219 breakout already has them — if you're using one, skip.)

**SPI (OLED)**

```
U1.GPIO5  ── U4.CS
U1.GPIO17 ── U4.DC
U1.GPIO16 ── U4.RST
U1.GPIO23 ── U4.MOSI  (labelled "D1" or "SDA" on some OLED boards)
U1.GPIO18 ── U4.CLK   (labelled "D0" or "SCL" on some OLED boards)
```

**Fire switch**

```
U1.GPIO4 ── SW1.1
SW1.2 ──── GND
```

(Internal pull-up on GPIO 4 is enabled in firmware — no external resistor needed.)

**MOSFET gate**

```
U1.GPIO27 ──[Rg, ~220 Ω]── U5.G
                            │
                           [Rgs, 100 kΩ to GND]   <-- pull-down so the gate is OFF
                            │                          before ESP32 boots / on reset
                            ▼
                           GND
```

This is belt-and-suspenders with the firmware's `digitalWrite(27, LOW)` first thing in `setup()`. The pull-down keeps the MOSFET off during the few ms before the ESP32 even reaches `setup()`.

## Workflow checklist

Each step has a finish line — when you can check the box, move on.

- [ ] **Project created** — `pcb/smart-battery.kicad_pro` exists.
- [ ] **Schematic drawn** — open `smart-battery.kicad_sch`, place all symbols above, wire them per the nets above. Use net labels (the green `<` arrow tool) for power rails (`+BATT_V+`, `+SYS`, `+3V3`, `GND`) — they're cleaner than running long wires.
- [ ] **ERC pass** — Inspect → Electrical Rules Checker → Run. Should be 0 errors. (Warnings about no-connect on unused header pins are fine.)
- [ ] **Footprints assigned** — Tools → Assign Footprints. For headers use `Connector_PinHeader_2.54mm:PinHeader_1x{N}_P2.54mm_Vertical`. For the MOSFET, pick `Package_TO_SOT_SMD:SOT-23` (assuming surface-mount) or `Package_TO_SOT_THT:TO-220-3_Vertical` (through-hole).
- [ ] **PCB layout** — File → Switch to PCB Editor. Update from schematic (the green ↓ arrow). Place modules. Route. Run DRC.
- [ ] **Manufacturing files** — once happy, File → Fabrication Outputs → Gerbers (and drill files). Send to JLCPCB / PCBWay / OSH Park.

## Tips for first-time PCB layout

- **Set a board outline first** before placing parts. Edit the `Edge.Cuts` layer with a rectangle (your Geekbar form factor — see chat with Claude for current target dimensions).
- **Place mechanical parts first**: USB-C jack on one short edge, fire switch on a long edge, OLED in the center, coil connector on the opposite short edge.
- **Power traces wider than signal**: 1.0–2.0 mm for the cell/coil rail (carries amps), 0.25 mm is fine for I²C / SPI / GPIO.
- **Keep INA219 close to the cell connector** — its sense path is part of the high-current loop, and any wire between the cell and INA V+ is shunt resistance you didn't measure.
- **DRC must be clean** before exporting gerbers. Always.

## When you're stuck

`HARDWARE.md` and this README cover *what* to wire. If KiCad UI is the question, check:

- KiCad's built-in "Getting Started in KiCad" tutorial: Help → Getting Started.
- Digi-Key's KiCad video series on YouTube — short, current, and free.
- Or just ask Claude — paste the saved `.kicad_sch` / `.kicad_pcb` content (they're plain-text S-expressions) and I can read and suggest changes.
