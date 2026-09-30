---
name: smart-battery-project
description: "Smart battery (ESP32-S3 510 vape) — PCB ordered at JLC, Fusion enclosure v1 done; state, gotchas, next steps"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4bed76b7-a3f4-458d-8176-7ba39885c4a1
  modified: 2026-09-30T15:07:33.749Z
---

Smart battery device: 30×85mm PCB, ESP32-S3-MINI-1, TP4056 charger + DW01A/FS8205A protection, INA219 current sense, TPS63031 buck-boost, OLED, 510 coil output. Repo: github.com/CyrusGuest/smartbattery (pcb/v2-integrated/ = current board; its README.md is the state-of-the-world doc).

**PCB (done 2026-09-21):** DRC 0 errors / 0 warnings / 0 unconnected. PCBA order SMT026092263342_Y3 placed + approved 2026-09-22. JLC engineering review found bad schematic LCSC codes — C3/C4/C8 + R14 were 0402 parts, LED2 was 0805, J3 wrong JST variant; replaced via JLC "Replace Component" (correct codes NOT yet written back into fab/smart-battery-bom.csv — rows are flagged REPLACE; get final codes from the JLC order page). L1 was matched to a wrong part entirely (UA9638CP driver IC) → replaced with Murata LQH32PN1R5NN0L (C113080). U4 → 8205A C22458966.

**Enclosure (Fusion 360, v1 done):** doc in Autodesk cloud project "SmartCart" (alongside user-measured "LiPo Battery Rev #1", "OLED Screen Rev #1" models). Tub 41×99×19mm + lid; battery is 35×62×5 (NOT 603450 as J3 value suggests); OLED is a ~1.5" module (35.7mm wide, glass 35.7×24.5, one-block header ~20.7mm in model); 510 mounts through lid face via Ø13 turret near south end (user's choice), generic spring-510 placeholder Ø9.4×11. All interference checks zero. KiCad board STEP at pcb/v2-integrated/fab/smart-battery-board.step, imported via importToNewDocument (importToTarget throws InternalValidationError).

**Assembly-day gotchas:**
- Verify battery pigtail polarity before first plug-in (JST-PH pigtails are randomly wired; reverse kills TP4056/DW01).
- OLED: count pins — model measures like 8-pin but board J2 has 7 pads; map before soldering. Trim header tails to ~2mm (they'd hit the battery).
- Kapton tape over J5 debug pads — the 510 barrel sits 2mm above them.
- 510 turret bore/counterbore sized for a generic connector; re-measure when real part arrives.

**Fusion MCP gotchas:** unsaved "Untitled" doc got Cmd+Z'd back 15 steps once, redo dead — rebuilt from recorded code. Always save early. See [[cad-control-setup]] for the KiCad/Fusion control plumbing.
