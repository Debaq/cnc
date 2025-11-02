# CNC GRBL Web Control Pro v3.0 - UI Structure Analysis

## Project Overview
**Title:** GRBL Web Control Pro v3.0  
**Location:** `/home/nick/Escritorio/Proyectos/cnc/`  
**Main Framework:** Alpine.js v3.13.3 (Reactive UI)  
**Styling:** Tailwind CSS CDN  
**Canvas:** Fabric.js (2D SVG manipulation)  
**3D Visualization:** Three.js  
**G-code Generation:** Maker.js  

---

## 1. MAIN LAYOUT STRUCTURE

### Entry Point: `index.html`

The application follows a **three-column layout pattern**:

```
┌─────────────────────────────────────────────────────────────┐
│                    GRBL Control Pro v3.0                     │
├──────────────┬──────────────────────────────┬────────────────┤
│              │                              │                │
│ LEFT SIDEBAR │    CENTER CANVAS AREA        │  RIGHT PANEL   │
│  (w-72)      │    (flex-1)                  │  (w-96)        │
│              │                              │                │
│ • Logo       │  • Canvas Toolbar            │ • Tabs         │
│ • Connection │  • SVG Canvas or 3D Viewer   │ • Tab Content  │
│ • Machine    │  • Canvas Footer             │                │
│   State      │                              │                │
│ • Position   │                              │                │
│ • Quick      │                              │                │
│   Controls   │                              │                │
│ • Settings   │                              │                │
│              │                              │                │
└──────────────┴──────────────────────────────┴────────────────┘
```

---

## 2. LEFT SIDEBAR COMPONENT

**File:** `/templates/components/sidebar.html`  
**Width:** 384px (w-72)  
**Background:** White with borders  

### 2.1 Header Section
- **Logo & GitHub Link**
  - App Title: "GRBL Control Pro"
  - Version Badge: "v3.0"
  - GitHub Link with SVG icon

### 2.2 Connection Status Panel
- **Status Indicator:** Animated dot (green when connected)
- **Connect/Disconnect Button:** Dynamic text
- **Baud Rate Selector:** Dropdown (115200, 9600)

### 2.3 Machine State Section (visible when connected)
- **Machine State:** Status display (Idle, Running, etc.)
- **Feed Override:** Percentage value
- **Spindle Override:** Percentage value

### 2.4 Position Display (visible when connected)
- **X, Y, Z Position:** Individual axis display
- **Position Mode Toggle:** "WPos" or "MPos"

### 2.5 Quick Controls (visible when connected)
- **4-Button Grid:**
  - Home (🏠) - Command: $H
  - Unlock (🔓) - Command: $X
  - Reset (⚠️)
  - Emergency Stop (⏹️) - Red button

### 2.6 Workspace Offset Section (visible when connected)
- **WCS Selector:** Dropdown (G54-G59)
- **Set Zero Button:** G92 X0 Y0 Z0
- **Clear Button:** G92.1

### 2.7 Settings & Libraries Section
- **Three Main Buttons:**
  - Config GRBL (⚙️)
  - Tools Library (🔧)
  - Materials Library (📦)

---

## 3. CENTER CANVAS AREA

**Structure:** Flex column layout  
**Content:** 
1. Canvas Toolbar (header)
2. Canvas/Viewer Area (flex-1)
3. Canvas Footer

### 3.1 Canvas Toolbar
**Location:** Top of canvas area  

#### View Mode Selector
- **Design Button:** (📐 Diseño) - SVG view
- **3D View Button:** (🎬 Vista 3D) - Three.js viewer (disabled until G-code generated)

#### Position & Size Controls
- **X Position Input:** mm
- **Y Position Input:** mm
- **Separator line**
- **Width Input:** mm
- **Scale Lock Button:** 🔒/🔓 (proportional scaling toggle)
- **Height Input:** mm

#### Work Area Display
- **Area Size:** Shows current dimensions
- **Edit Button:** Opens work area modal

#### Transform Tools
- **Flip Horizontal:** ↔️
- **Flip Vertical:** ↕️

#### Zoom Tools
- **Zoom In:** 🔍+
- **Zoom Out:** 🔍-
- **Fit View:** 🎯 (center workspace)

### 3.2 Canvas Area - Two Display Modes

#### Mode 1: SVG Design View
- White canvas background
- Uses Fabric.js for manipulation
- Shows loaded SVG or created shapes
- Rounded corners with shadow

#### Mode 2: 3D Viewer
- Dark background (bg-gray-900)
- Three.js canvas
- Shows G-code path visualization
- Loading overlay when G-code not ready

### 3.3 Canvas Footer
**Information Display:**
- **Position:** Current SVG position
- **Scale:** Current zoom level
- **Rotation:** Current rotation angle

---

## 4. RIGHT PANEL - TABBED INTERFACE

**Width:** 384px (w-96)  
**Background:** White  
**5 Main Tabs:**

| Tab | Icon | ID | Purpose |
|-----|------|----|---------| 
| Elements | 📋 | elements | Manage design elements |
| Jog | 🎮 | jog | Manual machine control |
| G-code | 📝 | gcode | View generated G-code |
| 3D Viewer | 🎬 | viewer | Control 3D visualization |
| Console | 💻 | console | GRBL command interface |

### 4.2 Tab: ELEMENTS (📋)

**File:** `/templates/tabs/elements-tab.html`

#### Global Configuration Section
- **Header:** "⚙️ Configuración Global"
- **Apply to All Button**

**Configuration Options:**
1. **Operation Type:** CNC / Laser / Plotter / Pencil
2. **Tool Selection:** Dropdown filtered by operation type
3. **Operation-Specific Parameters:**

##### CNC Mode (🔧)
- Work Type: Outline / Inside / Outside / Pocket
- Compensation: Center / Inside / Outside
- Depth (mm), Depth Step (mm)
- Tool Diameter (mm)
- Feed Rate (mm/min), Plunge Rate (mm/min)
- Spindle RPM

##### Laser Mode (⚡)
- Laser Power (0-100%)
- Number of Passes
- Feed Rate (mm/min)

##### Plotter Mode (✂️)
- Pressure (1-33)
- Speed (mm/s)
- Number of Passes

##### Pencil Mode (✏️)
- Pressure Z (mm)
- Speed (mm/min)

#### Elements List
**Add Menu Options:**
1. Load SVG (📁)
2. Maker.js Models (🔷):
   - Rectangle, Square, Rounded Rectangle, Oval, Ellipse
   - Ring, Polygon, Star, Slot, Dome
   - Bolt Circle, Bolt Rectangle, Text

#### Element Cards
**For Each Element:**
- Visibility Toggle: 👁️/👁️‍🗨️
- Lock Toggle: 🔒/🔓
- Type Icon: 📁/🔷/🟦/⭕/➖
- Element Name
- Expand Config: ⚙️/🔼
- Expand Children: 📁/🔽 (SVG only)
- Delete: 🗑️

**Config Panel (expandable):**
- Inherit Global Config: Checkbox
- Operation Type: Selector
- Tool Selection
- Operation-specific parameters
- Reset Button: ⟲ Resetear
- Done Button: ✓ Listo

#### Generate G-code Button (Sticky Footer)
- Large gradient button: Blue to Purple gradient
- Disabled when no elements
- Icons: ⚙️ + text "Generar G-code"

### 4.3 Tab: JOG (🎮)

**File:** `/templates/tabs/jog-tab.html`

**Distance Selection:** [0.1] [1] [10] [100] mm

**Speed Control:** Range slider (100-5000 mm/min)

**Movement Grid:**
```
        ▲ (Y+)
   ◄ ⌂ ► (X-/Home/X+)
        ▼ (Y-)
   Z ▲  Z ▼
```

**Navigation Buttons:**
- Go to Origin: G0 X0 Y0 Z0
- Probe Z: G38.2 Z-20 F100

**Send to Machine:**
- Large green button: ▶️ Enviar a Máquina

### 4.4 Tab: G-CODE (📝)

**File:** `/templates/tabs/gcode-tab.html`

**G-code Display:** Large readonly textarea

**Action Buttons:**
- **Download:** Green button with 💾 icon
- **Cloud Save:** Blue button with ☁️ icon

**Send Progress Bar:** Green progress with percentage

### 4.5 Tab: VIEWER 3D (🎬)

**File:** `/templates/tabs/viewer-tab.html`

**Quick Info Box:** Tip about Vista 3D button

**Statistics Box:**
- Total Distance
- Estimated Time
- Number of Passes
- G-code Lines

**Send to Machine Button:** Large green button

**Pass Control (if multiple passes):**
- Slider for pass selection
- Current pass display: "Pasada X/Y"

**Animation Controls:**
- Progress bar (0-100%)
- Play button (green)
- Pause button (yellow)
- Stop button (red)
- Speed slider: 0.1x to 5x

**Legend:**
- Blue line: Fast movement (G0)
- Red line: Cutting (G1)
- Yellow dot: Tool position

### 4.6 Tab: CONSOLE (💻)

**File:** `/templates/tabs/console-tab.html`

**Console Output:**
- Dark background (bg-gray-900)
- Green text (text-green-400)
- Font mono, text-xs

**Console Input:**
- Text field for manual commands
- Send button
- Enter key support

---

## 5. MODAL DIALOGS

### 5.1 Work Area Modal
**File:** `/templates/modals/work-area-modal.html`

**Presets:** 6 predefined sizes (300x300 to 1200x800)
**Custom Size:** Width and Height inputs
**Preview:** Large display of selected size
**Actions:** Cancel / Apply

### 5.2 Tools Modal
**File:** `/templates/modals/tools-modal.html`

**Layout:** 2-column (list + form)
**Tabs:** CNC / Plotter / Pencil

**Left Column - Tools List:**
- List of tools by category
- Edit icon: ✏️
- Delete icon: 🗑️
- New button: ➕ Nueva

**Right Column - Tool Form:**
- Common field: Name
- Category-specific fields:
  - **CNC:** Type, Diameter, Angle, Feed Rate, Plunge Rate, RPM
  - **Plotter:** Angle, Pressure, Speed
  - **Pencil:** Thickness, Speed, Color picker
- Notes (textarea)
- Password field (required for saving)
- Save button: 💾 Guardar Herramienta

### 5.3 GRBL Settings Modal
**File:** `/templates/modals/grbl-settings-modal.html`

**Features:**
- Settings list (from GRBL machine)
- Search/filter functionality
- Edit and save settings
- Help information

### 5.4 Help Modal
**File:** `/templates/modals/help-modal.html`

**General information and documentation**

---

## 6. ELEMENT MANAGEMENT SYSTEM

### Element Data Structure
```javascript
{
  id: unique_id,
  name: "Element Name",
  type: "svg" | "maker" | "rect" | "circle" | "line",
  visible: true/false,
  locked: true/false,
  showConfig: false,
  expanded: false,
  
  config: null | {
    operationType: "cnc" | "laser" | "plotter" | "pencil",
    tool: "tool_name",
    workType: "outline" | "inside" | "outside" | "pocket",
    compensation: "center" | "inside" | "outside",
    depth: -3,
    depthStep: 1,
    toolDiameter: 3.175,
    feedRate: 800,
    plungeRate: 400,
    spindleRPM: 10000,
    laserPower: 80,
    pressure: 15,
    speed: 100,
    pressureZ: -1,
    passes: 1
  },
  
  makerType: "Rectangle" | "Square" | ... ,
  makerParams: { /* shape-specific params */ },
  
  x: 0, y: 0, width: 100, height: 100, rotation: 0
}
```

### Configuration Inheritance
**Two-level config system:**
1. **Global Config:** Applied to all elements by default
2. **Element-specific Config:** Overrides global when set

---

## 7. STYLING SYSTEM

### Tailwind CSS Configuration
**Custom Purple Color Palette:**
```
purple-dark:      #2D1B69
purple-medium:    #5B4B9F
purple-light:     #7B6BB8
purple-pale:      #B5A8D6
purple-ultra-pale: #E8E4F3
purple-bg:        #F5F3FA
```

### Component Styling Classes
- **Buttons:** `bg-purple-medium hover:bg-purple-dark text-white`
- **Borders:** `border border-gray-200`
- **Cards:** `rounded-lg p-4 bg-white`
- **Disabled:** `disabled:opacity-50 disabled:cursor-not-allowed`
- **Transitions:** `transition` class on interactive elements

---

## 8. TEMPLATE LOADING SYSTEM

**File:** `/js/template-loader.js`

**Mechanism:** Alpine.js `x-template` attribute

**Templates Loaded:**
1. `/templates/components/sidebar.html` - Left sidebar
2. `/templates/tabs/all-tabs.html` - Right panel tabs container
3. `/templates/modals/work-area-modal.html` - Work area config
4. `/templates/modals/grbl-settings-modal.html` - GRBL settings
5. `/templates/modals/help-modal.html` - Help documentation
6. `/templates/modals/tools-modal.html` - Tools library

---

## 9. JAVASCRIPT ARCHITECTURE

### Core Managers (Load Order)

1. **`i18n.js`** - Internationalization
2. **`template-loader.js`** - Dynamic template loading
3. **`canvas-manager.js`** - Fabric.js canvas management
4. **`gcode-generator.js`** - G-code generation logic
5. **`gcode-viewer.js`** - Three.js 3D viewer
6. **`serial-control.js`** - GRBL serial communication
7. **`library-manager.js`** - Tools and materials management
8. **`app.js`** - Main Alpine.js app (grblApp function)
9. **Alpine.js** - DOM framework (loaded last)

### Alpine.js Application Structure

**Main object:** `grblApp()`

**Key Data:**
- Managers: canvasManager, gcodeGenerator, serialControl, libraryManager
- UI State: currentTab, viewMode, connected, gcodeGenerated
- Machine State: position, machineState, feedOverride
- Elements: array of design elements
- Configuration: globalConfig, tools[], materials[]
- UI: tabs array, modal states

---

## 10. DATA FLOW

```
User Action
    ↓
Alpine.js Event Handler (@click, @change, etc.)
    ↓
Update State (elements, config, etc.)
    ↓
Manager Methods (canvas-manager, gcode-generator, etc.)
    ↓
Update DOM (through Alpine.js reactivity)
    ↓
Visual Feedback
```

---

## 11. KEY UI FEATURES

### 1. Responsive Tabs
- Dynamic tab system
- Tab content loaded from templates
- Active tab styling (bottom border)

### 2. Element Hierarchy
- Can have child elements (SVG with groups)
- Expandable/collapsible UI
- Nested configuration support

### 3. Multi-mode Operation
- **SVG Design Mode:** Fabric.js for editing
- **3D View Mode:** Three.js visualization
- **Manual Jog Mode:** Direct machine control
- **Console Mode:** Raw command interface

### 4. Configuration Flexibility
- Global defaults
- Per-element overrides
- Operation-type-specific parameters (CNC/Laser/Plotter/Pencil)

### 5. Real-time Feedback
- Console output display
- Position updates
- Machine state display
- G-code generation progress

---

## 12. FILE STRUCTURE SUMMARY

```
/home/nick/Escritorio/Proyectos/cnc/
├── index.html                           [Main entry point]
├── favicon.ico
├── css/
│   └── style.css                       [Custom styles]
├── js/
│   ├── app.js                          [Alpine.js app definition]
│   ├── template-loader.js              [Template loading]
│   ├── canvas-manager.js               [Fabric.js management]
│   ├── gcode-generator.js              [G-code generation]
│   ├── gcode-viewer.js                 [Three.js viewer]
│   ├── serial-control.js               [GRBL communication]
│   ├── library-manager.js              [Tools/materials]
│   └── i18n.js                         [Internationalization]
├── templates/
│   ├── components/
│   │   └── sidebar.html                [Left sidebar]
│   ├── tabs/
│   │   ├── all-tabs.html              [Tabs container]
│   │   ├── elements-tab.html          [Elements manager]
│   │   ├── jog-tab.html               [Manual control]
│   │   ├── gcode-tab.html             [G-code viewer]
│   │   ├── viewer-tab.html            [3D viewer controls]
│   │   └── console-tab.html           [Command console]
│   └── modals/
│       ├── work-area-modal.html       [Workspace config]
│       ├── grbl-settings-modal.html   [GRBL parameters]
│       ├── help-modal.html            [Documentation]
│       └── tools-modal.html           [Tools library]
```

---

## 13. CONCLUSION

The GRBL Web Control Pro v3.0 UI is a well-structured, component-based interface that provides:

1. **Left Sidebar:** Machine state and quick access controls
2. **Center Canvas:** Design workspace with dual view modes
3. **Right Tabs:** Comprehensive element management and machine control
4. **Modal System:** Configuration dialogs for advanced settings
5. **Flexible Element System:** Support for multiple operation types with inheritance
6. **Professional Styling:** Consistent purple theme with Tailwind CSS
7. **Modular Architecture:** Separate managers for different concerns
8. **Alpine.js Reactivity:** Responsive UI without complexity

The interface is designed for both design (SVG editing) and operation (CNC machine control), supporting multiple tool types (CNC, Laser, Plotter, Pencil) with appropriate configuration options for each.

---

## Element/Tools Management Details

### How Elements Are Managed

The application uses a comprehensive element management system organized around two key concepts:

#### 1. **Elements Array**
Located in `app.js`, the main application state includes:
- A reactive `elements` array
- A `selectedElement` reference
- A `globalConfig` object (defaults for all elements)

#### 2. **Configuration Hierarchy**
Each element can:
- **Inherit global config** (default behavior) - checkbox toggles this
- **Have custom config** - overrides global when checkbox unchecked
- **Override individual parameters** - for fine-tuning per element

#### 3. **Element Types**
- **SVG Files:** Loaded from disk, can contain groups/children
- **Maker.js Models:** Procedurally generated shapes (13 types)
- **Basic Shapes:** Direct rectangle, circle, line creation

#### 4. **Configuration Per Element**
The UI in `elements-tab.html` allows:
- Toggle inheritance with checkbox
- When inherited: shows "[hereda global]"
- When custom: shows operation type and tool name
- Expandable panel with full parameter controls
- Reset button to revert to global
- Done button to collapse and save

### Tools Library Organization

Tools are managed in the modals/tools-modal.html with:

#### Tool Categories
1. **CNC Tools**
   - Type: End Mill, Ball Nose, V-Bit
   - Parameters: Diameter, Angle, Feed Rate, Plunge Rate, RPM

2. **Plotter Tools**
   - Type: Cutting blade
   - Parameters: Angle (30/45/60), Pressure (1-33), Speed (mm/s)

3. **Pencil/Marker Tools**
   - Parameters: Thickness, Speed (mm/min), Color

#### Tool Database Features
- Password-protected save
- Category-based filtering
- Edit existing tools
- Delete tools
- Create new tools from form

### Integration Points

**Tools are referenced in:**
1. Global config (globalConfig.tool)
2. Individual element config (element.config.tool)
3. Elements tab dropdown (filtered by operation type)
4. G-code generation (uses tool parameters)

**When generating G-code:**
1. Get element's config (or inherit global)
2. Look up tool by name in tools array
3. Use tool parameters for feed rates, speeds
4. Apply element-specific overrides
5. Generate G-code commands

---

## Special Notes on Tools Modal Structure

The tools modal (`tools-modal.html`) is unique because:

1. **Two-column layout:**
   - Left: List of existing tools
   - Right: Form for creating/editing

2. **Category tabs:**
   - Switches between CNC, Plotter, Pencil
   - Filters the tools list
   - Shows relevant form fields

3. **Password protection:**
   - Required to save tool changes
   - Prevents accidental modifications

4. **Dynamic form:**
   - Fields change based on selected category
   - Shows relevant parameters only

5. **Status feedback:**
   - Shows save success/error messages
   - Indicates current editing mode

