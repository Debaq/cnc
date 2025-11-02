# CNC GRBL Web Control Pro v4.0 - UI Documentation Index

## Overview
This directory now contains comprehensive documentation of the GRBL Web Control Pro v4.0 user interface structure, organization, and architecture.

## Documentation Files

### 1. UI_STRUCTURE_REPORT.md (19 KB)
**Most Comprehensive Reference**

Detailed breakdown of every UI component including:
- Complete layout structure (3-column design)
- Left sidebar sections and buttons
- Center canvas area with toolbar and controls
- Right panel with 5 tabs (Elements, Jog, G-code, Viewer 3D, Console)
- Modal dialogs (Work Area, Tools, GRBL Settings, Help)
- Element management system
- Configuration inheritance model
- Data structures (elements array, global config, tools)
- Styling system and color palette
- Template loading mechanism
- JavaScript architecture overview
- Complete data flow diagrams

**Best for:** Understanding the complete UI system, specific component locations, and detailed functionality.

---

### 2. COMPONENT_HIERARCHY.md (21 KB)
**Visual Architecture Deep Dive**

Extensive ASCII diagrams and code structures showing:
- Alpine.js application root object structure
- Full DOM component tree with hierarchy
- Detailed elements array structure with all properties
- Global configuration object layout
- Tool database structure
- Complete data flow during G-code generation
- Event flow example (creating new element)
- Modal state management patterns
- Component interaction summary

**Best for:** Understanding how components relate to each other, data models, and the overall system architecture.

---

### 3. QUICK_REFERENCE.md (11 KB)
**Quick Lookup Guide**

Fast reference information including:
- Template file locations and purposes
- Three-column layout summary
- Tab contents quick overview
- Element types and configuration inheritance
- Tools library organization
- Modal dialogs quick reference
- Color theme values
- State variables
- JavaScript managers overview
- Common interaction workflows
- File access paths
- Troubleshooting tips

**Best for:** Quick lookups, daily reference, remembering file paths and quick answers.

---

## Quick Navigation

### By Use Case

**"I need to understand the overall layout"**
- Start: QUICK_REFERENCE.md - Three-Column Layout section
- Then: UI_STRUCTURE_REPORT.md - Main Layout Structure section

**"I need to find a specific component"**
- Start: QUICK_REFERENCE.md - Key Files Location section
- Then: UI_STRUCTURE_REPORT.md - Locate in detailed breakdown

**"I need to modify element management"**
- Start: QUICK_REFERENCE.md - Element Management System section
- Then: COMPONENT_HIERARCHY.md - Elements Array Structure section
- Deep dive: UI_STRUCTURE_REPORT.md - Element Management System section

**"I need to understand how tools work"**
- Start: QUICK_REFERENCE.md - Tools Library Organization section
- Then: COMPONENT_HIERARCHY.md - Tool Structure section
- Deep dive: UI_STRUCTURE_REPORT.md - Tools Modal section

**"I need to trace data flow"**
- Start: COMPONENT_HIERARCHY.md - Data Flow During G-code Generation section
- Then: COMPONENT_HIERARCHY.md - Event Flow Example section

**"I need to work with modals"**
- Start: QUICK_REFERENCE.md - Modal Dialogs section
- Then: UI_STRUCTURE_REPORT.md - Modal Dialogs section
- Deep dive: COMPONENT_HIERARCHY.md - Modal State Management section

---

## Key Concepts Summary

### Three-Column Layout
```
Left Sidebar (384px) | Center Canvas (Flexible) | Right Panel (384px)
- Machine Status     | SVG Design or 3D View   | 5 Tabs
- Quick Controls     | Canvas Toolbar          | Tab Content
- Settings Menu      | Canvas + Footer         |
```

### Right Panel Tabs
1. **Elements** (📋) - Design element management, global config, add/edit elements
2. **Jog** (🎮) - Manual machine movement controls
3. **G-code** (📝) - View generated G-code, download, send to machine
4. **Viewer 3D** (🎬) - 3D visualization of G-code paths with animation controls
5. **Console** (💻) - Direct GRBL command interface

### Configuration System
- **Global Config:** Applies to all elements by default
- **Element Config:** Per-element overrides (can inherit or use custom)
- **Tools Library:** Separate database of tool definitions, referenced by name

### Four Operation Types
1. **CNC** - Milling/cutting (depth, feedrate, RPM parameters)
2. **Laser** - Engraving/cutting (power, passes, feedrate)
3. **Plotter** - Vinyl cutting (pressure, speed, passes)
4. **Pencil** - Drawing/marking (pressure, speed, color)

### Element Types
- **SVG** - Loaded SVG files (can have children/groups)
- **Maker.js** - Procedurally generated shapes (13 types)
- **Basic** - Direct rectangles, circles, lines

---

## File Structure Quick Reference

```
/home/nick/Escritorio/Proyectos/cnc/

templates/
├── components/
│   └── sidebar.html                 - Left panel
├── tabs/
│   ├── all-tabs.html               - Tabs container
│   ├── elements-tab.html           - Design management
│   ├── jog-tab.html                - Manual control
│   ├── gcode-tab.html              - Code viewer
│   ├── viewer-tab.html             - 3D controls
│   └── console-tab.html            - Command interface
└── modals/
    ├── work-area-modal.html        - Workspace config
    ├── tools-modal.html            - Tool library editor
    ├── grbl-settings-modal.html    - Machine settings
    └── help-modal.html             - Documentation

js/
├── app.js                          - Alpine.js app (state + methods)
├── template-loader.js              - Template injection system
├── canvas-manager.js               - Fabric.js wrapper
├── gcode-generator.js              - G-code creation logic
├── gcode-viewer.js                 - Three.js 3D viewer
├── serial-control.js               - GRBL communication
├── library-manager.js              - Tools/materials database
└── i18n.js                         - Internationalization

css/
└── style.css                       - Custom styles

index.html                          - Main entry point
```

---

## Key Technologies

- **Alpine.js v3.13.3** - Reactive UI framework (state + templating)
- **Tailwind CSS** - Utility-first CSS (styling)
- **Fabric.js** - 2D canvas manipulation (SVG editing)
- **Three.js** - 3D graphics (G-code visualization)
- **Maker.js** - Parametric shape generation
- **Custom Template System** - Dynamic HTML injection via x-template

---

## State Management

All application state is centralized in the Alpine.js app object (`grblApp()`):
- UI state (tabs, modals, view modes)
- Machine state (connected, position, status)
- Design state (elements array, selected element)
- Configuration state (globalConfig, per-element configs)
- Tools state (tools array, editing state)
- G-code state (generated code, sending progress)

---

## Color Palette

Purple theme using Tailwind CSS custom colors:
- **purple-dark** (#2D1B69) - Headers, dark elements
- **purple-medium** (#5B4B9F) - Buttons, active states
- **purple-light** (#7B6BB8) - Hover effects
- **purple-pale** (#B5A8D6) - Borders, accents
- **purple-ultra-pale** (#E8E4F3) - Panel backgrounds
- **purple-bg** (#F5F3FA) - Page background

---

## Common Workflows

### Creating a Design
1. Open Elements tab
2. Click "Agregar" button
3. Select SVG file or Maker.js shape
4. Element appears in list
5. Configure via "Apply to All" or per-element settings
6. Click "Generar G-code"

### Sending to Machine
1. Ensure machine is connected (check sidebar status)
2. Generate G-code (Elements tab)
3. Go to Jog or Viewer 3D tab
4. Click "Enviar a Máquina"
5. Monitor progress bar

### Managing Tools
1. Click "Tools Library" button in sidebar
2. Select category (CNC/Plotter/Pencil)
3. Create new or edit existing
4. Fill in parameters
5. Enter password
6. Save

---

## Debugging Tips

**Can't see something?**
- Check if it's hidden behind a condition: `x-show="condition"`
- Check if tab is active: `x-show="currentTab === 'tab-id'"`
- Check browser console for JavaScript errors

**Element config not updating?**
- Verify "Inherit global config" is unchecked if you want custom config
- Check that tool exists in tools array
- Verify operation type matches tool category

**G-code not generating?**
- Check that at least one element exists
- Check Elements tab for any error messages
- Verify global config has valid values
- Try downloading current G-code to see what was generated

**3D view not appearing?**
- G-code must be generated first
- Click "Vista 3D" button to switch view
- Check that viewer3D canvas is rendering (check browser console)

---

## Next Steps for Development

When modifying the UI:

1. **Adding a new tab:** Create file in `templates/tabs/`, add to all-tabs.html, add to tabs array in app.js

2. **Adding a modal:** Create file in `templates/modals/`, add show state to app.js, add to index.html

3. **Modifying element config:** Update element structure in app.js and elements-tab.html

4. **Adding operation type:** Add to globalConfig, add conditional sections to elements-tab.html

5. **Styling changes:** Modify CSS in `css/style.css` or update Tailwind classes in HTML

---

## Summary

This documentation package provides three complementary views of the GRBL Web Control Pro v4.0 UI:

1. **UI_STRUCTURE_REPORT.md** - Comprehensive reference with every component detailed
2. **COMPONENT_HIERARCHY.md** - Architectural overview with data models and flows
3. **QUICK_REFERENCE.md** - Fast lookup for common questions and workflows

Together, they provide complete coverage from high-level understanding to detailed implementation details.

---

**Generated:** November 2, 2024
**Version:** GRBL Web Control Pro v4.0
**Framework:** Alpine.js + Tailwind CSS + Fabric.js + Three.js
