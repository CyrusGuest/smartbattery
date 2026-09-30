---
name: cad-control-setup
description: "How Claude controls KiCad and Fusion 360 on this Mac (kipy via IPC, fusion360 MCP + add-in)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4bed76b7-a3f4-458d-8176-7ba39885c4a1
  modified: 2026-09-06T23:13:58.986Z
---

Set up 2026-09-06 so Claude can operate CAD apps on this Mac:

- **KiCad 10.0.1** (`/Applications/KiCad/`): NO MCP server — drive it directly with the official Python client: `uv run --with kicad-python python3 <script>` using `from kipy import KiCad`. Requires KiCad running and `api.enable_server: true` in `~/Library/Preferences/kicad/10.0/kicad_common.json` (already enabled). Socket: `/tmp/kicad/api.sock`; if connection refused after a crash, delete stale `/tmp/kicad/api.lock`. The PyPI package `kicad-mcp` (Huaqiu) does NOT work on macOS — it needs a proprietary plugin; don't reinstall it.
- **Fusion 360**: user-scope MCP server `fusion360` = `uvx --with 'mcp<2' fusion360-mcp-server --mode socket` (the `mcp<2` pin is required — package is written for mcp 1.x SDK). It bridges over TCP localhost:9876 to the **Fusion360MCP add-in** installed at `~/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/Fusion360MCP` (from github.com/faust-machines/fusion360-mcp-server). User must start the add-in inside Fusion each session: Shift+S → Add-Ins → Fusion360MCP → Run.
- Vision fallback: enable the built-in `computer-use` MCP via /mcp for pixel-level work the APIs don't cover.
