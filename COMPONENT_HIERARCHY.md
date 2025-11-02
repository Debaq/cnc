# CNC UI Component Hierarchy & Architecture

## Overall Application Structure

```
grblApp (Alpine.js Root Object)
│
├─ State Management
│  ├─ Machine State: connected, machineState, position, feedOverride, spindleOverride
│  ├─ UI State: currentTab, viewMode, selectedElement
│  ├─ Canvas State: svgLoaded, svgPosition, svgScale, svgRotation
│  ├─ G-code State: gcode, gcodeGenerated, gcodeLines
│  ├─ Elements: elements[] (array of design elements)
│  ├─ Configuration: globalConfig, configStatus
│  ├─ Tools: tools[] (tool library)
│  └─ Modals: showWorkAreaModal, showGRBLModal, showToolsModal
│
├─ Manager Instances
│  ├─ canvasManager (Fabric.js wrapper)
│  ├─ gcodeGenerator (G-code creation logic)
│  ├─ serialControl (GRBL communication)
│  └─ libraryManager (Tools/materials persistence)
│
└─ Alpine.js Methods
   ├─ UI Event Handlers
   ├─ Data Mutations
   ├─ Manager Calls
   └─ State Computations
```

---

## DOM Component Tree

```
<body> [Alpine.js Root: x-data="grblApp()"]
│
└─ <div class="flex h-screen">
   │
   ├─ <aside class="w-72"> [LEFT SIDEBAR]
   │  │  x-template="templates/components/sidebar.html"
   │  │
   │  ├─ Header
   │  │  ├─ Logo Section
   │  │  └─ GitHub Link
   │  │
   │  ├─ Connection Panel
   │  │  ├─ Status Indicator
   │  │  ├─ Connect Button
   │  │  └─ Baud Rate Selector
   │  │
   │  ├─ Machine State (x-show="connected")
   │  │  ├─ State Display
   │  │  ├─ Feed Override
   │  │  └─ Spindle Override
   │  │
   │  ├─ Position Display (x-show="connected")
   │  │  ├─ X Position
   │  │  ├─ Y Position
   │  │  ├─ Z Position
   │  │  └─ Position Mode Toggle
   │  │
   │  ├─ Quick Controls (x-show="connected")
   │  │  ├─ Home Button
   │  │  ├─ Unlock Button
   │  │  ├─ Reset Button
   │  │  └─ Emergency Stop Button
   │  │
   │  ├─ Workspace Offset (x-show="connected")
   │  │  ├─ WCS Selector
   │  │  ├─ Set Zero Button
   │  │  └─ Clear Button
   │  │
   │  └─ Settings Section
   │     ├─ GRBL Config Button
   │     ├─ Tools Library Button
   │     └─ Materials Library Button
   │
   ├─ <main class="flex-1"> [MAIN CONTENT AREA]
   │  │
   │  ├─ Hidden Input
   │  │  └─ SVG File Input (x-ref="svgInput")
   │  │
   │  └─ <div class="flex"> [WORKSPACE CONTAINER]
   │     │
   │     ├─ <div class="flex-1"> [CENTER CANVAS AREA]
   │     │  │
   │     │  ├─ Canvas Toolbar
   │     │  │  ├─ View Mode Selector
   │     │  │  │  ├─ Design Button (📐 Diseño)
   │     │  │  │  └─ 3D View Button (🎬 Vista 3D)
   │     │  │  │
   │     │  │  ├─ Position Controls
   │     │  │  │  ├─ X Input
   │     │  │  │  └─ Y Input
   │     │  │  │
   │     │  │  ├─ Size Controls
   │     │  │  │  ├─ Width Input
   │     │  │  │  ├─ Lock Toggle
   │     │  │  │  └─ Height Input
   │     │  │  │
   │     │  │  ├─ Work Area Display
   │     │  │  │  ├─ Area Size
   │     │  │  │  └─ Edit Button (opens modal)
   │     │  │  │
   │     │  │  ├─ Transform Tools
   │     │  │  │  ├─ Flip Horizontal
   │     │  │  │  └─ Flip Vertical
   │     │  │  │
   │     │  │  └─ Zoom Tools
   │     │  │     ├─ Zoom In
   │     │  │     ├─ Zoom Out
   │     │  │     └─ Fit View
   │     │  │
   │     │  ├─ Canvas Area
   │     │  │  ├─ SVG View Mode (x-show="viewMode === 'svg'")
   │     │  │  │  └─ <canvas x-ref="canvas">
   │     │  │  │
   │     │  │  └─ 3D View Mode (x-show="viewMode === '3d'")
   │     │  │     ├─ <canvas x-ref="viewer3d">
   │     │  │     └─ Loading Overlay (x-show="!gcodeGenerated")
   │     │  │
   │     │  └─ Canvas Footer
   │     │     ├─ Position Info
   │     │     ├─ Scale Info
   │     │     └─ Rotation Info
   │     │
   │     └─ <div class="w-96"> [RIGHT PANEL - TABS]
   │        │
   │        ├─ Tab Navigation
   │        │  ├─ Tab: Elements (📋) [id="elements"]
   │        │  ├─ Tab: Jog (🎮) [id="jog"]
   │        │  ├─ Tab: G-code (📝) [id="gcode"]
   │        │  ├─ Tab: Viewer 3D (🎬) [id="viewer"]
   │        │  └─ Tab: Console (💻) [id="console"]
   │        │
   │        └─ Tab Content Container
   │           │  x-template="templates/tabs/all-tabs.html"
   │           │
   │           ├─ ELEMENTS TAB (x-show="currentTab === 'elements'")
   │           │  │  source: elements-tab.html
   │           │  │
   │           │  ├─ Global Config Section
   │           │  │  ├─ Header with "Apply to All" button
   │           │  │  ├─ Operation Type Selector
   │           │  │  │  ├─ CNC
   │           │  │  │  ├─ Laser
   │           │  │  │  ├─ Plotter
   │           │  │  │  └─ Pencil
   │           │  │  │
   │           │  │  ├─ Tool Selection (dynamic by operation type)
   │           │  │  │  └─ Tool Dropdown (filtered)
   │           │  │  │
   │           │  │  └─ Operation-Type-Specific Params
   │           │  │     ├─ CNC: Work Type, Compensation, Depth, Tool Diameter, Feed Rate, RPM
   │           │  │     ├─ Laser: Power, Passes, Feed Rate
   │           │  │     ├─ Plotter: Pressure, Speed, Passes
   │           │  │     └─ Pencil: Pressure Z, Speed
   │           │  │
   │           │  ├─ Elements List
   │           │  │  ├─ Header with "Add" button (dropdown menu)
   │           │  │  │  ├─ Load SVG
   │           │  │  │  └─ Maker.js Models
   │           │  │  │     ├─ Rectangle
   │           │  │  │     ├─ Square
   │           │  │  │     ├─ Rounded Rectangle
   │           │  │  │     ├─ Oval
   │           │  │  │     ├─ Ellipse
   │           │  │  │     ├─ Ring
   │           │  │  │     ├─ Polygon
   │           │  │  │     ├─ Star
   │           │  │  │     ├─ Slot
   │           │  │  │     ├─ Dome
   │           │  │  │     ├─ Bolt Circle
   │           │  │  │     ├─ Bolt Rectangle
   │           │  │  │     └─ Text
   │           │  │  │
   │           │  │  └─ Element Cards (template x-for="element in elements")
   │           │  │     ├─ Element Header Row
   │           │  │     │  ├─ Visibility Toggle
   │           │  │     │  ├─ Lock Toggle
   │           │  │     │  ├─ Type Icon
   │           │  │     │  ├─ Element Name
   │           │  │     │  ├─ Expand Config Button
   │           │  │     │  ├─ Expand Children Button (SVG only)
   │           │  │     │  └─ Delete Button
   │           │  │     │
   │           │  │     ├─ Config Panel (x-show="element.showConfig")
   │           │  │     │  ├─ Inherit Global Config Checkbox
   │           │  │     │  ├─ When Custom Config Enabled:
   │           │  │     │  │  ├─ Operation Type Selector
   │           │  │     │  │  ├─ Tool Selection
   │           │  │     │  │  └─ Operation-specific parameters
   │           │  │     │  ├─ Reset Button
   │           │  │     │  └─ Done Button
   │           │  │     │
   │           │  │     ├─ Config Status Summary (x-show="!element.showConfig")
   │           │  │     │  ├─ "[hereda global]" or custom mode indicator
   │           │  │     │  └─ Tool name (if set)
   │           │  │     │
   │           │  │     └─ Maker.js Parameters Panel (x-show="element.type === 'maker'")
   │           │  │        ├─ Expand Button
   │           │  │        ├─ Type-Specific Parameters
   │           │  │        └─ Regenerate Button
   │           │  │
   │           │  └─ Generate G-code Button (Sticky Footer)
   │           │
   │           ├─ JOG TAB (x-show="currentTab === 'jog'")
   │           │  │  source: jog-tab.html
   │           │  │
   │           │  ├─ Distance Selection (4 buttons)
   │           │  ├─ Speed Control (range slider)
   │           │  ├─ Movement Grid
   │           │  │  ├─ Y+/Y- Buttons
   │           │  │  ├─ X-/Home/X+ Buttons
   │           │  │  ├─ Z+ Button
   │           │  │  └─ Z- Button
   │           │  ├─ Navigation Buttons
   │           │  │  ├─ Go to Origin
   │           │  │  └─ Probe Z
   │           │  └─ Send to Machine Button
   │           │
   │           ├─ G-CODE TAB (x-show="currentTab === 'gcode'")
   │           │  │  source: gcode-tab.html
   │           │  │
   │           │  ├─ Header (title + line count)
   │           │  ├─ G-code Textarea (readonly)
   │           │  ├─ Action Buttons
   │           │  │  ├─ Download Button
   │           │  │  └─ Cloud Save Button
   │           │  └─ Progress Bar (x-show="sending")
   │           │
   │           ├─ VIEWER 3D TAB (x-show="currentTab === 'viewer'")
   │           │  │  source: viewer-tab.html
   │           │  │
   │           │  ├─ Quick Info Box
   │           │  ├─ Statistics Box
   │           │  ├─ Send to Machine Button
   │           │  ├─ Pass Control (if multiple passes)
   │           │  │  └─ Slider + Display
   │           │  ├─ Animation Controls
   │           │  │  ├─ Progress Bar
   │           │  │  ├─ Play Button
   │           │  │  ├─ Pause Button
   │           │  │  ├─ Stop Button
   │           │  │  └─ Speed Slider
   │           │  └─ Legend
   │           │
   │           └─ CONSOLE TAB (x-show="currentTab === 'console'")
   │              │  source: console-tab.html
   │              │
   │              ├─ Header (title + Clear button)
   │              ├─ Console Output Display
   │              │  └─ template x-for="(line, index) in consoleLines"
   │              │
   │              └─ Console Input
   │                 ├─ Text Input Field
   │                 └─ Send Button
│
└─ MODAL DIALOGS
   │
   ├─ Work Area Modal (x-show="showWorkAreaModal")
   │  │  source: modals/work-area-modal.html
   │  │  trigger: Edit button in canvas toolbar
   │  │
   │  ├─ Modal Backdrop
   │  ├─ Modal Header
   │  ├─ Preset Sizes (6 buttons)
   │  ├─ Custom Size Inputs
   │  │  ├─ Width
   │  │  └─ Height
   │  ├─ Size Preview
   │  └─ Action Buttons
   │     ├─ Cancel
   │     └─ Apply
   │
   ├─ GRBL Settings Modal (x-show="showGRBLModal")
   │  │  source: modals/grbl-settings-modal.html
   │  │  trigger: Config GRBL button in sidebar
   │  │
   │  ├─ Modal Header
   │  ├─ Settings List
   │  │  └─ template x-for="setting in grblSettings"
   │  ├─ Search/Filter Input
   │  └─ Help Section
   │
   ├─ Tools Modal (x-show="showToolsModal")
   │  │  source: modals/tools-modal.html
   │  │  trigger: Tools Library button in sidebar
   │  │
   │  ├─ Modal Header
   │  ├─ Category Tabs
   │  │  ├─ CNC Tab
   │  │  ├─ Plotter Tab
   │  │  └─ Pencil Tab
   │  │
   │  ├─ Left Column - Tools List
   │  │  ├─ Header with "New Tool" button
   │  │  └─ Tools (template x-for="tool in getToolsByCategory()")
   │  │     ├─ Tool Name
   │  │     ├─ Tool-specific Info Display
   │  │     ├─ Edit Button
   │  │     └─ Delete Button
   │  │
   │  └─ Right Column - Tool Form
   │     ├─ Form Header
   │     ├─ Common Fields
   │     │  └─ Tool Name Input
   │     ├─ Category-Specific Fields
   │     │  ├─ CNC Fields:
   │     │  │  ├─ Tool Type Selector
   │     │  │  ├─ Diameter Input
   │     │  │  ├─ Angle Input (V-bit only)
   │     │  │  ├─ Feed Rate Input
   │     │  │  ├─ Plunge Rate Input
   │     │  │  └─ RPM Input
   │     │  │
   │     │  ├─ Plotter Fields:
   │     │  │  ├─ Blade Angle Selector
   │     │  │  ├─ Pressure Input
   │     │  │  └─ Speed Input
   │     │  │
   │     │  └─ Pencil Fields:
   │     │     ├─ Thickness Input
   │     │     ├─ Speed Input
   │     │     └─ Color Picker
   │     │
   │     ├─ Common Fields (continued)
   │     │  └─ Notes Textarea
   │     │
   │     ├─ Password Input (required for save)
   │     ├─ Save Button
   │     └─ Status Message Display
   │
   └─ Help Modal (x-show="showGRBLHelpModal")
      │  source: modals/help-modal.html
      │
      └─ Help Content
```

---

## Elements Array Structure (In Detail)

```javascript
elements: [
  {
    id: "elem_001",
    name: "My SVG Design",
    type: "svg",  // | "maker" | "rect" | "circle" | "line"
    
    // Visibility & Interaction
    visible: true,
    locked: false,
    showConfig: false,
    expanded: false,  // for SVG with children
    
    // Configuration (null = inherit global)
    config: null || {
      operationType: "cnc",       // "cnc" | "laser" | "plotter" | "pencil"
      tool: "End Mill 3mm",
      material: "Wood",
      
      // CNC-specific
      workType: "outline",        // "outline" | "inside" | "outside" | "pocket"
      compensation: "center",     // "center" | "inside" | "outside"
      depth: -3,                  // mm
      depthStep: 1,               // mm per pass
      toolDiameter: 3.175,        // mm
      feedRate: 800,              // mm/min
      plungeRate: 400,            // mm/min
      spindleRPM: 10000,
      
      // Laser-specific
      laserPower: 80,             // 0-100%
      
      // Plotter-specific
      pressure: 15,               // 1-33
      
      // Pencil-specific
      pressureZ: -1,              // mm
      
      // Common
      speed: 100,                 // mm/s (plotter) or mm/min (pencil)
      passes: 1
    },
    
    // Maker.js-specific (if type === "maker")
    makerType: "Rectangle",
    makerParams: {
      width: 100,
      height: 50,
      // ... shape-specific params
    },
    
    // Position & Transform
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    
    // SVG-specific
    svgData: "...",  // SVG string
    children: [      // nested elements for grouped SVGs
      // ... child elements
    ]
  },
  // ... more elements
]
```

---

## Global Configuration Structure

```javascript
globalConfig: {
  // Operation Mode
  operationType: "cnc",       // "cnc" | "laser" | "plotter" | "pencil"
  tool: "",                   // Selected tool name
  material: "",               // Selected material name
  
  // CNC Parameters
  workType: "outline",        // "outline" | "inside" | "outside" | "pocket"
  compensation: "center",     // "center" | "inside" | "outside"
  depth: -3,                  // mm
  depthStep: 1,               // mm per pass
  toolDiameter: 3.175,        // mm
  feedRate: 800,              // mm/min
  plungeRate: 400,            // mm/min
  spindleRPM: 10000,
  
  // Laser Parameters
  laserPower: 80,             // 0-100%
  passes: 1,
  
  // Plotter Parameters
  pressure: 15,               // 1-33
  speed: 100,                 // mm/s
  
  // Pencil Parameters
  pressureZ: -1,              // mm
  
  // Can be applied to all elements via "Apply to All" button
}
```

---

## Tool Structure (In Tools Array)

```javascript
tools: [
  {
    id: "tool_001",
    name: "End Mill 3mm",
    category: "cnc",           // "cnc" | "plotter" | "pencil"
    
    // CNC Tool
    type: "endmill",           // "endmill" | "ballnose" | "vbit"
    diameter: 3.175,
    angle: 0,                  // For V-bits
    feedRate: 800,
    plungeRate: 400,
    rpm: 12000,
    
    // Plotter Tool
    // (uses same structure)
    // angle: 45,
    // pressure: 15,
    // speed: 100,
    
    // Pencil Tool
    // thickness: 0.5,
    // color: "#FF0000",
    
    notes: "General purpose mill",
    
    // Metadata
    createdAt: timestamp,
    updatedAt: timestamp
  },
  // ... more tools
]
```

---

## Data Flow During G-code Generation

```
User clicks "Generar G-code" button
        ↓
Call generateGCode() method
        ↓
For each element in elements array:
  ├─ Get element's config (or inherit globalConfig)
  ├─ Look up tool in tools array by name
  ├─ Get tool parameters (feedRate, rpm, diameter, etc.)
  ├─ Determine operation type
  ├─ Generate G-code commands
  │  ├─ Tool selection
  │  ├─ Spindle start
  │  ├─ Movement commands
  │  ├─ Cutting operations
  │  └─ Spindle stop
  └─ Accumulate into gcode string
        ↓
Update DOM:
  ├─ Set gcode variable
  ├─ Set gcodeGenerated = true
  ├─ Set gcodeLines = count
  ├─ Enable "Vista 3D" button
  └─ Show in gcode tab textarea
        ↓
Generate 3D visualization:
  ├─ Parse G-code commands
  ├─ Create Three.js paths
  ├─ Color by command type (G0=blue, G1=red)
  └─ Animate tool position
```

---

## Event Flow Example: Creating a New Element

```
User clicks "Agregar" dropdown
        ↓
Click "Rectángulo" option
        ↓
Call addMakerModel('Rectangle')
        ↓
Create new element object:
  {
    id: generateId(),
    name: "Rectángulo",
    type: "maker",
    makerType: "Rectangle",
    makerParams: { width: 100, height: 50 },
    config: null,  // inherit global
    visible: true,
    locked: false,
    ...
  }
        ↓
Add to elements array: elements.push(newElement)
        ↓
Alpine.js detects array change → Re-render
        ↓
New element card appears in list with:
  ├─ Visibility/lock toggles
  ├─ Type icon (🔷)
  ├─ Name input
  ├─ Config expand button
  └─ Delete button
        ↓
User can:
  ├─ Modify on canvas (Fabric.js)
  ├─ Click config button to expand settings
  ├─ Select tool and operation parameters
  └─ Delete element
```

---

## Modal State Management

```
Modal Open/Close Pattern:

For Work Area Modal:
  showWorkAreaModal: boolean
  tempWorkArea: { width, height }
  
  openModal('workArea') {
    tempWorkArea = copy of current workArea
    showWorkAreaModal = true
  }
  
  closeWorkAreaModal() {
    showWorkAreaModal = false
  }
  
  applyWorkArea() {
    Update actual workArea
    closeWorkAreaModal()
  }

For Tools Modal:
  showToolsModal: boolean
  toolsModalTab: "cnc" | "plotter" | "pencil"
  editingTool: null | tool object
  toolForm: { name, type, diameter, ... }
  authPassword: string
  
  openToolsModal() {
    resetToolForm()
    editingTool = null
    showToolsModal = true
  }
  
  editTool(tool) {
    editingTool = tool
    populateToolForm(tool)
  }
  
  saveTool() {
    Verify password
    Add/update tool in tools array
    Reset form
    Show success message
  }
```

---

## Summary: Component Interaction

1. **User Interface** (Index.html + Templates)
   - Structured as three-column layout
   - Modular template loading
   - Alpine.js directives for reactivity

2. **State Management** (app.js)
   - Centralized in grblApp() object
   - Reactive data binding
   - Configuration inheritance system

3. **Managers** (Specialized JS modules)
   - canvasManager: Handles Fabric.js operations
   - gcodeGenerator: Creates G-code from elements
   - serialControl: Communicates with GRBL
   - libraryManager: Persists tools/materials

4. **Data Models**
   - Elements: Design objects with hierarchical config
   - Global Config: Defaults for all elements
   - Tools: Reusable tool definitions
   - Machine State: Real-time GRBL feedback

5. **UI Features**
   - Tab-based interface for different modes
   - Modal dialogs for configuration
   - Real-time preview and feedback
   - Responsive canvas with dual views

