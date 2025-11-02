# CNC UI Structure - Quick Reference Guide

## Key Files Location
All template files are in `/templates/` directory:
```
templates/
├── components/sidebar.html      - Left panel with machine controls
├── tabs/                        - Right panel content
│   ├── all-tabs.html           - Tabs container
│   ├── elements-tab.html       - Design element management
│   ├── jog-tab.html            - Manual movement controls
│   ├── gcode-tab.html          - G-code viewer
│   ├── viewer-tab.html         - 3D visualization controls
│   └── console-tab.html        - GRBL command interface
└── modals/                      - Configuration dialogs
    ├── work-area-modal.html    - Workspace size settings
    ├── grbl-settings-modal.html - Machine parameters
    ├── help-modal.html          - Documentation
    └── tools-modal.html         - Tool library editor
```

---

## Three-Column Layout Breakdown

### LEFT SIDEBAR (384px)
**File:** `templates/components/sidebar.html`
- Logo & Version (🏠)
- Connection Status & Baud Rate
- Machine State (Idle, Running, etc.)
- Position Display (X, Y, Z)
- Quick Control Buttons (Home, Unlock, Reset, Stop)
- Workspace Offset (G54-G59 selection, Set Zero)
- Settings Menu (GRBL Config, Tools, Materials)

### CENTER CANVAS (Flexible)
**Files:** `index.html` main area
- **Toolbar:** View mode, position/size inputs, zoom controls, flip/transform
- **Canvas:** SVG design view (Fabric.js) or 3D view (Three.js)
- **Footer:** Current position, scale, rotation info

### RIGHT PANEL (384px)
**Files:** `templates/tabs/*.html`
- 5 Tabs: Elements, Jog, G-code, Viewer 3D, Console
- Each tab has different content (see below)

---

## The 5 Right-Panel Tabs

### 1. ELEMENTS (📋) - Design Management
**File:** `elements-tab.html`

**Global Config Section:**
- Operation Type: CNC / Laser / Plotter / Pencil
- Tool Selection (filtered by type)
- Type-specific parameters (depth, power, pressure, etc.)
- "Apply to All" button

**Elements List:**
- "Add" menu: Load SVG or create Maker.js shapes
- Element cards with:
  - Visibility/Lock toggles
  - Config expand button
  - Delete button
- Expandable config panel per element
- "Generate G-code" sticky button

### 2. JOG (🎮) - Manual Control
**File:** `jog-tab.html`

- Distance buttons: 0.1, 1, 10, 100 mm
- Speed slider: 100-5000 mm/min
- Movement pad: Y+, X-, Home, X+, Y-
- Z controls: Z+, Z-
- Buttons: Go to Origin, Probe Z
- "Send to Machine" button

### 3. G-CODE (📝) - Code Viewer
**File:** `gcode-tab.html`

- Readonly textarea with generated G-code
- Download button
- Cloud save button
- Progress bar during sending

### 4. VIEWER 3D (🎬) - 3D Preview
**File:** `viewer-tab.html`

- Quick info box
- Statistics (distance, time, passes, lines)
- Send to Machine button
- Pass selector (if multiple passes)
- Animation controls: Play, Pause, Stop, Speed slider
- Legend: Blue=fast, Red=cut, Yellow=tool

### 5. CONSOLE (💻) - Direct Commands
**File:** `console-tab.html`

- Dark terminal display (green text)
- Command history scrolling
- Manual input field
- Send button

---

## Element Management System

### Element Types
```javascript
{
  type: "svg",      // Loaded SVG file
  type: "maker",    // Generated shape (Rectangle, Star, etc.)
  type: "rect",     // Basic rectangle
  type: "circle",   // Basic circle
  type: "line"      // Basic line
}
```

### Configuration Inheritance
**Each element has:**
- `config: null` → Uses globalConfig
- `config: {...}` → Custom config (overrides global)

**Checkbox in element config panel toggles between:**
- "Inherit global config" (checkbox=ON)
- "Custom config" (checkbox=OFF)

### Maker.js Models (13 types available)
Rectangle, Square, RoundRectangle, Oval, Ellipse, Ring, Polygon, Star, Slot, Dome, BoltCircle, BoltRectangle, Text

Each has shape-specific parameters that appear in "Parámetros Maker.js" panel.

---

## Tools Library Organization

### Three Tool Categories
1. **CNC Tools** - Cutting bits (End Mill, Ball Nose, V-Bit)
2. **Plotter Tools** - Cutting blades (30°, 45°, 60°)
3. **Pencil Tools** - Writing instruments with color

### Tool Database Features
- Password-protected (required to save)
- Category-based filtering
- Edit existing tools
- Delete tools
- Create new tools

### Tool Parameters by Type
**CNC:**
- Type: End Mill, Ball Nose, V-Bit
- Diameter (mm)
- Angle (for V-bits)
- Feed Rate, Plunge Rate (mm/min)
- Spindle RPM

**Plotter:**
- Blade Angle: 30°, 45°, 60°
- Pressure: 1-33
- Speed: mm/s

**Pencil:**
- Thickness: mm
- Speed: mm/min
- Color: picker

---

## Modal Dialogs

### Work Area Modal (📐)
**Trigger:** Edit button in canvas toolbar
**Presets:** 300x300, 400x400, 600x400, 800x600, 1000x600, 1200x800
**Custom:** Width & Height inputs
**Action:** Cancel / Apply

### Tools Modal (🔧)
**Trigger:** Tools button in sidebar
**Layout:** 2-column (left=list, right=form)
**Tabs:** CNC, Plotter, Pencil
**Form:** Dynamic fields based on category
**Password:** Required for save

### GRBL Settings Modal (⚙️)
**Trigger:** Config GRBL button in sidebar
**Features:** Edit GRBL parameters, search, help info

### Help Modal (?)
**General information and documentation**

---

## Styling & Colors

### Purple Theme (Tailwind CSS)
```
purple-dark:      #2D1B69  - Header/dark elements
purple-medium:    #5B4B9F  - Buttons/active states
purple-light:     #7B6BB8  - Hover states
purple-pale:      #B5A8D6  - Borders
purple-ultra-pale: #E8E4F3 - Panel backgrounds
purple-bg:        #F5F3FA  - Page background
```

### Common Styling
- Buttons: `bg-purple-medium hover:bg-purple-dark text-white`
- Cards: `rounded-lg p-4 bg-white`
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`
- Transitions: Smooth color/size changes

---

## State Variables (From app.js)

### UI State
```javascript
currentTab: "elements"    // Which tab is open
viewMode: "svg"          // SVG or 3D view
connected: false         // Machine connection
gcodeGenerated: false    // G-code available
selectedElement: null    // Which element selected
```

### Machine State
```javascript
machineState: "Idle"
position: { x: "0.000", y: "0.000", z: "0.000" }
feedOverride: 100  // %
spindleOverride: 100  // %
```

### Design State
```javascript
elements: []      // Array of design elements
globalConfig: {}  // Default settings for all elements
svgLoaded: false
svgPosition: "X: 0, Y: 0"
svgScale: "100%"
svgRotation: "0°"
```

### G-Code State
```javascript
gcode: ""         // Generated G-code string
gcodeLines: 0     // Number of lines
sending: false    // Send in progress
sendProgress: 0   // % complete
```

### Tools & Config
```javascript
tools: []         // Tool library
configStatus: "unified"  // How configs are organized
globalConfig: { /* CNC/Laser/Plotter/Pencil params */ }
```

---

## JavaScript Managers

### canvasManager (Fabric.js)
Handles 2D canvas manipulation:
- Load SVG files
- Create shapes
- Transform elements
- Canvas rendering

### gcodeGenerator
Creates G-code from elements:
- Process element configs
- Look up tool parameters
- Generate commands
- Calculate estimates

### serialControl
Communicates with GRBL:
- Serial connection
- Send commands
- Receive feedback
- Status updates

### libraryManager
Manages tools & materials:
- Save/load tools
- Category filtering
- Persistence

---

## Common Interactions

### Adding an Element
1. Click "Agregar" button in Elements tab
2. Select from: Load SVG or Maker.js models
3. New element appears in list
4. Can expand config, change tool, etc.

### Configuring an Element
1. Click ⚙️ button on element card
2. Config panel expands below element
3. Toggle "Inherit global config" checkbox
4. If custom: select operation type and tool
5. Adjust parameters
6. Click "✓ Listo" to close

### Creating a Tool
1. Click "Tools Library" button in sidebar
2. Click "➕ Nueva" button
3. Select category (CNC/Plotter/Pencil)
4. Fill in form fields
5. Enter password
6. Click "💾 Guardar Herramienta"

### Generating G-code
1. Add elements to design
2. Configure global settings OR element-by-element config
3. Click "⚙️ Generar G-code" button
4. G-code appears in "G-code" tab
5. "Vista 3D" button becomes enabled
6. Can download or send to machine

### Sending to Machine
**Requires:**
- Machine connected
- G-code generated
- (Jog tab or Viewer tab)

**Methods:**
1. Jog tab: "▶️ Enviar a Máquina" button
2. Viewer tab: Same button with 3D preview
3. Progress bar shows % complete

---

## File Access Paths

All files relative to `/home/nick/Escritorio/Proyectos/cnc/`

| File | Purpose |
|------|---------|
| `index.html` | Main entry point |
| `js/app.js` | Alpine.js app state |
| `js/template-loader.js` | Template injection |
| `js/canvas-manager.js` | Fabric.js wrapper |
| `js/gcode-generator.js` | G-code creation |
| `js/gcode-viewer.js` | Three.js visualization |
| `js/serial-control.js` | GRBL communication |
| `js/library-manager.js` | Tools/materials DB |
| `css/style.css` | Custom styles |

---

## Quick Troubleshooting

### Why can't I see 3D view?
- Need to generate G-code first
- Click "⚙️ Generar G-code" in Elements tab
- Then Vista 3D button enables

### Element config not changing?
- Check if "Inherit global config" is checked
- If checked: you're using global, not element config
- Uncheck to get custom element config

### Tool not showing in dropdown?
- Make sure tool category matches operation type
- CNC tools only appear when operation type = CNC
- Similar for Plotter and Pencil

### Can't connect to machine?
- Check baud rate (115200 or 9600)
- Verify serial port selection
- Check machine power and USB cable

---

## Summary

The CNC UI is organized into:
1. **Left Sidebar** - Machine status & quick controls
2. **Center Canvas** - Design workspace (dual-mode)
3. **Right Tabs** - Element management, manual control, G-code viewing
4. **Modals** - Configuration dialogs
5. **Tools Library** - Reusable tool definitions

Elements support **configuration inheritance** where:
- Global config is default
- Individual elements can override with custom config
- Tools are stored in a library and referenced by name

The interface supports **4 operation types**:
- CNC (milling/cutting)
- Laser (engraving/cutting)
- Plotter (vinyl cutting)
- Pencil/Marker (drawing)

