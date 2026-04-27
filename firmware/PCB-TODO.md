# PCB Design — Open Questions

Punch list of decisions / part selections that aren't pinned down by the firmware. The firmware tells us what nets exist; this document tracks what hardware to put on each net when a real PCB is laid out. See `HARDWARE.md` for the full pin map and topology.

## Power path

- [ ] **Type-C charger module** — exact part. Currently described as "off-the-shelf TP4056-with-USB-C or similar". Decisions needed:
  - Is the module a bare TP4056 + USB-C breakout, or an integrated charger like IP5306 / TP4057 / MCP73871?
  - Does it have integrated battery protection (over-discharge, over-current, short-circuit) or do we need a separate DW01 + dual-MOSFET protection circuit between cell and load?
  - Module's BAT+/BAT- output connects to **V− side of INA219** (not directly to cell+) — see `HARDWARE.md` topology section. Verify this is wired correctly on the prototype.

- [ ] **ESP32 supply rail** — boost converter, LDO, or direct?
  - Cell voltage range is ~3.0–4.2 V; ESP32-WROOM-32 spec is 3.0–3.6 V on the 3V3 pin or 5 V on VIN.
  - Cleanest: a 3.3 V buck-boost (TPS63020 / similar) so it works across the full cell range.
  - Cheapest: feed VIN through the dev board's onboard LDO (handles down to ~3.6 V; below that, brownouts).
  - Note: low-cost ESP32 dev boards already have an AMS1117-3.3 onboard. If we're using a bare module, we need to add our own.

- [ ] **3.3 V rail for peripherals** — OLED, INA219 logic (Vs pin). Almost certainly the same rail as ESP32 supply. Confirm in schematic that `INA219.Vs` is on 3.3 V, **not** on V+ (cell rail) — see HARDWARE.md note.

## Coil drive

- [ ] **MOSFET part** — needs to handle:
  - Cart coil resistance ~1.0–1.8 Ω → up to ~4 A peak at 4.2 V on a 1 Ω coil.
  - Gate driven directly from ESP32 (3.3 V logic) — must be **logic-level** N-channel (e.g. AO3400, SI2302 for low current; IRLML2502, IRLZ44N, AO3404 for higher). Pick `Vgs(th)` ≤ 2.5 V to ensure full enhancement at 3.3 V.
  - Switching at 5 kHz PWM → switching losses are negligible vs. conduction losses; pick on `Rds(on)` at Vgs=3.3 V.
- [ ] **Gate resistor** — typical 100–470 Ω in series with gate to limit ringing. Pull-down (10–100 kΩ) gate-to-source for safe defaults during boot (firmware also pulls GPIO 27 LOW first thing in `setup()`, but a hardware pull-down is belt-and-suspenders).
- [ ] **Flyback / catch diode** — coil is mostly resistive (no big inductance), so probably unnecessary. Confirm with scope on prototype before committing PCB.
- [ ] **Coil connector** — what mechanical interface? 510 thread? Spring contacts? Direct solder pads?

## Current sensing

- [ ] **INA219 calibration vs. shunt resistor** — current firmware uses `setCalibration_16V_400mA()` which assumes the **0.1 Ω shunt** that ships on the Adafruit/clone INA219 breakouts. If the PCB integrates the INA219 chip directly with a different shunt value, the calibration call needs to change.
  - At full-power firing the coil can pull >400 mA, saturating the shunt reading. For battery-gauge purposes this doesn't matter (we only care about idle voltage), but if real-time current readout during fire is wanted, swap to a lower shunt (e.g. 0.01 Ω) and recalibrate to ~5 A range.

## I/O & UX

- [ ] **Fire switch** — momentary, normally-open, pulled up to 3.3 V via internal pullup; pressing connects GPIO 4 to GND. Mechanical part needs to handle expected click count.
- [ ] **OLED** — SSD1306 128×64, **SPI** wiring (firmware uses software SPI on GPIOs 23/18/5/17/16). Most cheap modules are I²C-only; make sure to source SPI variant or jumper-configurable.

## Mechanical

- [ ] Enclosure — fits cell, PCB, OLED, USB-C jack, fire switch, coil connector. Largest dimension is OLED (typically 27 × 27 mm for 128×64 modules).
- [ ] USB-C jack location — on the charger module by default; if integrated, separate footprint on PCB.
- [ ] Cell holder vs. soldered tabs — solder tabs save space, holder simplifies replacement.

## Schematic / layout deliverables

When ready to draw the PCB:

- [ ] KiCad project at `firmware/pcb/` (or wherever)
- [ ] Schematic PDF committed for review
- [ ] BOM (CSV) with Digi-Key / LCSC part numbers
- [ ] Gerbers + drill files in a release tag

Until then, `HARDWARE.md` is the single source of truth for what's on what pin.
