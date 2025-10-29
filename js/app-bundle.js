// GRBL Web Control Pro - App Bundle ARREGLADO
// Canvas con grid visible, origen claro, y carga SVG funcional

// ============================================
// CANVAS MANAGER (Fabric.js) - ARREGLADO
// ============================================
class CanvasManager {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.fabricCanvas = null;
        this.svgGroup = null;

        // Work area config (mm)
        this.workArea = { width: 400, height: 400 };
        this.pixelsPerMM = 2;

        // Grid
        this.gridSize = 10;
        this.showGrid = true;

        // Origin marker
        this.originMarker = null;
    }

    init(canvasElement) {
        if (!window.fabric) {
            console.error('❌ Fabric.js no está cargado');
            return;
        }

        this.canvas = canvasElement;

        const parent = canvasElement.parentElement;
        const width = parent.clientWidth || 800;
        const height = parent.clientHeight || 600;

        console.log('🎨 Initializing Canvas Manager');
        console.log('   Parent size:', width, 'x', height);

        // Initialize Fabric.js canvas
        this.fabricCanvas = new fabric.Canvas(canvasElement, {
            width: width,
            height: height,
            backgroundColor: '#F5F3FA',
            selection: true,
            preserveObjectStacking: true
        });

        console.log('   Canvas created:', this.fabricCanvas.width, 'x', this.fabricCanvas.height);

        // AJUSTAR área de trabajo si es muy grande para el canvas
        const workAreaPx = this.workArea.width * this.pixelsPerMM;
        const minDimension = Math.min(width, height);

        if (workAreaPx > minDimension * 0.9) {
            // Ajustar pixelsPerMM para que quepa
            this.pixelsPerMM = (minDimension * 0.8) / this.workArea.width;
            console.log('   ⚠️ Adjusted pixelsPerMM to:', this.pixelsPerMM.toFixed(2), 'to fit canvas');
        }

        // Setup grid and origin
        this.setupGrid();
        this.setupOrigin();

        // Handle window resize
        window.addEventListener('resize', () => this.resize());

        // Tool handlers
        this.setupTools();

        // Force render
        this.fabricCanvas.renderAll();

        console.log('✅ Canvas Manager initialized');
    }

    resize() {
        const container = this.canvas.parentElement;
        this.fabricCanvas.setWidth(container.clientWidth);
        this.fabricCanvas.setHeight(container.clientHeight);
        this.fabricCanvas.renderAll();
    }

    setupGrid() {
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;

        console.log('🎨 Setting up grid:');
        console.log('   Canvas size:', this.fabricCanvas.width, 'x', this.fabricCanvas.height);
        console.log('   Work area:', workW, 'x', workH, 'pixels');
        console.log('   Center:', centerX, centerY);

        // Work area rectangle - VISIBLE Y BLANCO
        const workRect = new fabric.Rect({
            left: centerX - workW / 2,
            top: centerY - workH / 2,
            width: workW,
            height: workH,
            fill: '#FFFFFF',
            stroke: '#5B4B9F',
            strokeWidth: 3,
            selectable: false,
            evented: false,
            name: 'workArea'
        });

        this.fabricCanvas.add(workRect);
        this.fabricCanvas.sendToBack(workRect);
        console.log('   ✅ Work area rect added');

        // Grid lines - MÁS VISIBLES
        if (this.showGrid) {
            const gridSpacing = this.gridSize * this.pixelsPerMM;
            let lineCount = 0;

            // Vertical lines
            for (let x = 0; x <= workW; x += gridSpacing) {
                const isMainLine = (x % (50 * this.pixelsPerMM)) === 0;
                const line = new fabric.Line([
                    centerX - workW / 2 + x, centerY - workH / 2,
                    centerX - workW / 2 + x, centerY + workH / 2
                ], {
                    stroke: isMainLine ? 'rgba(91, 75, 159, 0.5)' : 'rgba(181, 168, 214, 0.3)',
                                             strokeWidth: isMainLine ? 1.5 : 0.5,
                                             selectable: false,
                                             evented: false,
                                             name: 'gridLine'
                });
                this.fabricCanvas.add(line);
                this.fabricCanvas.sendToBack(line);
                lineCount++;
            }

            // Horizontal lines
            for (let y = 0; y <= workH; y += gridSpacing) {
                const isMainLine = (y % (50 * this.pixelsPerMM)) === 0;
                const line = new fabric.Line([
                    centerX - workW / 2, centerY - workH / 2 + y,
                    centerX + workW / 2, centerY - workH / 2 + y
                ], {
                    stroke: isMainLine ? 'rgba(91, 75, 159, 0.5)' : 'rgba(181, 168, 214, 0.3)',
                                             strokeWidth: isMainLine ? 1.5 : 0.5,
                                             selectable: false,
                                             evented: false,
                                             name: 'gridLine'
                });
                this.fabricCanvas.add(line);
                this.fabricCanvas.sendToBack(line);
                lineCount++;
            }

            console.log('   ✅ Grid lines added:', lineCount);
        }
    }

    setupOrigin() {
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;

        // Origin is bottom-left corner
        const originX = centerX - workW / 2;
        const originY = centerY + workH / 2;

        console.log('📍 Setting up origin at:', originX.toFixed(1), originY.toFixed(1));

        const axisLength = 50;

        // X axis (red) - MÁS GRUESO
        const xAxis = new fabric.Line([originX, originY, originX + axisLength, originY], {
            stroke: '#FF0000',
            strokeWidth: 5,
            selectable: false,
            evented: false,
            name: 'xAxis'
        });

        // Y axis (green) - MÁS GRUESO
        const yAxis = new fabric.Line([originX, originY, originX, originY - axisLength], {
            stroke: '#00FF00',
            strokeWidth: 5,
            selectable: false,
            evented: false,
            name: 'yAxis'
        });

        // Origin dot - MÁS GRANDE
        const origin = new fabric.Circle({
            left: originX - 10,
            top: originY - 10,
            radius: 10,
            fill: '#FFD700',
            stroke: '#2D1B69',
            strokeWidth: 3,
            selectable: false,
            evented: false,
            name: 'origin'
        });

        // Flecha en X (triángulo)
        const arrowX = new fabric.Triangle({
            left: originX + axisLength - 5,
            top: originY - 5,
            width: 10,
            height: 10,
            fill: '#FF0000',
            angle: 90,
            selectable: false,
            evented: false
        });

        // Flecha en Y (triángulo)
        const arrowY = new fabric.Triangle({
            left: originX - 5,
            top: originY - axisLength - 5,
            width: 10,
            height: 10,
            fill: '#00FF00',
            angle: 0,
            selectable: false,
            evented: false
        });

        this.fabricCanvas.add(xAxis, yAxis, origin, arrowX, arrowY);
        console.log('   ✅ Origin markers added (X axis RED →, Y axis GREEN ↑)');

        this.originMarker = { xAxis, yAxis, origin, arrowX, arrowY };
    }

    setupTools() {
        // Mouse wheel zoom
        this.fabricCanvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.fabricCanvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 10) zoom = 10;
            if (zoom < 0.1) zoom = 0.1;
            this.fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        // Pan with middle mouse
        let isPanning = false;
        let lastPosX = 0;
        let lastPosY = 0;

        this.fabricCanvas.on('mouse:down', (opt) => {
            const evt = opt.e;
            if (evt.button === 1 || (evt.button === 0 && evt.shiftKey)) {
                isPanning = true;
                this.fabricCanvas.selection = false;
                lastPosX = evt.clientX;
                lastPosY = evt.clientY;
            }
        });

        this.fabricCanvas.on('mouse:move', (opt) => {
            if (isPanning) {
                const evt = opt.e;
                const vpt = this.fabricCanvas.viewportTransform;
                vpt[4] += evt.clientX - lastPosX;
                vpt[5] += evt.clientY - lastPosY;
                this.fabricCanvas.requestRenderAll();
                lastPosX = evt.clientX;
                lastPosY = evt.clientY;
            }
        });

        this.fabricCanvas.on('mouse:up', () => {
            isPanning = false;
            this.fabricCanvas.selection = true;
        });
    }

    zoomIn() {
        let zoom = this.fabricCanvas.getZoom();
        zoom *= 1.2;
        if (zoom > 10) zoom = 10;
        this.fabricCanvas.setZoom(zoom);
        this.fabricCanvas.renderAll();
    }

    zoomOut() {
        let zoom = this.fabricCanvas.getZoom();
        zoom *= 0.8;
        if (zoom < 0.1) zoom = 0.1;
        this.fabricCanvas.setZoom(zoom);
        this.fabricCanvas.renderAll();
    }

    fitView() {
        if (!this.svgGroup) {
            // Fit work area
            const workW = this.workArea.width * this.pixelsPerMM;
            const workH = this.workArea.height * this.pixelsPerMM;

            const zoom = Math.min(
                (this.fabricCanvas.width * 0.9) / workW,
                                  (this.fabricCanvas.height * 0.9) / workH
            );

            this.fabricCanvas.setZoom(zoom);
            this.fabricCanvas.viewportTransform[4] = (this.fabricCanvas.width - workW * zoom) / 2;
            this.fabricCanvas.viewportTransform[5] = (this.fabricCanvas.height - workH * zoom) / 2;
            this.fabricCanvas.renderAll();
        } else {
            // Fit SVG
            const obj = this.svgGroup;
            const objWidth = obj.width * obj.scaleX;
            const objHeight = obj.height * obj.scaleY;

            const zoom = Math.min(
                (this.fabricCanvas.width * 0.8) / objWidth,
                                  (this.fabricCanvas.height * 0.8) / objHeight
            );

            this.fabricCanvas.setZoom(zoom);

            // Center the object
            const centerX = obj.left + objWidth / 2;
            const centerY = obj.top + objHeight / 2;

            this.fabricCanvas.viewportTransform[4] = this.fabricCanvas.width / 2 - centerX * zoom;
            this.fabricCanvas.viewportTransform[5] = this.fabricCanvas.height / 2 - centerY * zoom;
            this.fabricCanvas.renderAll();
        }
    }

    resetOrigin() {
        if (!this.svgGroup) return;

        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;
        const originX = centerX - workW / 2;
        const originY = centerY + workH / 2;

        this.svgGroup.set({
            left: originX,
            top: originY - this.svgGroup.height,
            scaleX: 1,
            scaleY: 1,
            angle: 0
        });

        this.fabricCanvas.renderAll();
    }

    async loadSVG(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const svgString = e.target.result;

                fabric.loadSVGFromString(svgString, (objects, options) => {
                    if (!objects || objects.length === 0) {
                        reject(new Error('No objects in SVG'));
                        return;
                    }

                    console.log('📦 SVG objects loaded:', objects.length);

                    // Clear previous
                    if (this.svgGroup) {
                        this.fabricCanvas.remove(this.svgGroup);
                    }

                    // Change color of all objects BEFORE grouping
                    objects.forEach(obj => {
                        // Hacer objetos MÁS VISIBLES
                        if (obj.stroke) {
                            obj.set('stroke', '#2D1B69');
                            obj.set('strokeWidth', 2);
                        }
                        if (!obj.stroke && obj.fill) {
                            obj.set('fill', '#5B4B9F');
                        }
                        if (!obj.stroke && !obj.fill) {
                            obj.set('stroke', '#2D1B69');
                            obj.set('strokeWidth', 2);
                        }
                    });

                    // Create group from objects
                    if (objects.length === 1) {
                        this.svgGroup = objects[0];
                    } else {
                        this.svgGroup = new fabric.Group(objects, options);
                    }

                    // Position at origin (bottom-left)
                    const workW = this.workArea.width * this.pixelsPerMM;
                    const workH = this.workArea.height * this.pixelsPerMM;
                    const centerX = this.fabricCanvas.width / 2;
                    const centerY = this.fabricCanvas.height / 2;
                    const originX = centerX - workW / 2;
                    const originY = centerY + workH / 2;

                    // Scale SVG if too big
                    const maxSize = Math.min(workW, workH) * 0.8;
                    const currentSize = Math.max(this.svgGroup.width, this.svgGroup.height);
                    let scale = 1;
                    if (currentSize > maxSize) {
                        scale = maxSize / currentSize;
                    }

                    this.svgGroup.set({
                        left: originX + 20, // Pequeño offset del origen
                        top: originY - (this.svgGroup.height * scale) - 20,
                                      scaleX: scale,
                                      scaleY: scale,
                                      selectable: true,
                                      hasControls: true
                    });

                    this.fabricCanvas.add(this.svgGroup);
                    this.fabricCanvas.setActiveObject(this.svgGroup);
                    this.fabricCanvas.renderAll();

                    console.log('✅ SVG positioned at origin');
                    console.log('   Size:', this.svgGroup.width.toFixed(1), 'x', this.svgGroup.height.toFixed(1), 'px');
                    console.log('   Scale:', scale.toFixed(2));

                    resolve();
                });
            };

            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    getPaths() {
        // Simplified - return empty for now
        // TODO: Implement full path extraction
        return [];
    }
}

// ============================================
// G-CODE GENERATOR
// ============================================
class GCodeGenerator {
    constructor() {
        this.gcode = '';
    }

    generate(paths, config) {
        const lines = [];

        // Header
        lines.push('(Generated by GRBL Web Control Pro v3.0)');
        lines.push(`(Date: ${new Date().toISOString()})`);
        lines.push('');
        lines.push('G21 ; mm');
        lines.push('G90 ; absolute');
        lines.push('G17 ; XY plane');
        lines.push('');

        if (config.operationType === 'cnc') {
            lines.push(`M3 S${config.spindleRPM} ; Start spindle`);
            lines.push('G4 P2 ; Wait 2s');
        }

        lines.push('G0 Z5 ; Safe height');
        lines.push('G0 X0 Y0 ; Move to origin');
        lines.push('');

        // TODO: Add actual path commands here

        // End
        lines.push('');
        lines.push('G0 Z10 ; Raise');
        lines.push('M5 ; Stop spindle');
        lines.push('G0 X0 Y0 ; Return');
        lines.push('M2 ; End program');

        this.gcode = lines.join('\n');
        return this.gcode;
    }

    calculateEstimates(gcode, config) {
        const lines = gcode.split('\n').filter(l => l.trim() && !l.startsWith('('));
        return {
            distance: 0,
            time: lines.length * 0.1 // Estimación simple
        };
    }
}

// ============================================
// SERIAL CONTROL
// ============================================
class SerialControl {
    constructor(app) {
        this.app = app;
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.connected = false;
    }

    async connect() {
        if (!('serial' in navigator)) {
            alert('Web Serial API no soportada. Usa Chrome/Edge/Opera');
            return false;
        }

        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });

            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            this.connected = true;

            this.startReading();

            return true;
        } catch (error) {
            console.error('Connection error:', error);
            return false;
        }
    }

    async disconnect() {
        if (this.reader) {
            await this.reader.cancel();
            this.reader = null;
        }

        if (this.writer) {
            await this.writer.close();
            this.writer = null;
        }

        if (this.port) {
            await this.port.close();
            this.port = null;
        }

        this.connected = false;
    }

    async startReading() {
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;

                const text = new TextDecoder().decode(value);
                this.app.addConsoleLine(text); // ARREGLADO: era addConsoleL
            }
        } catch (error) {
            console.error('Read error:', error);
        }
    }

    async sendCommand(cmd) {
        if (!this.writer) return;

        const encoder = new TextEncoder();
        await this.writer.write(encoder.encode(cmd + '\n'));
    }
}

// ============================================
// LIBRARY MANAGER
// ============================================
class LibraryManager {
    constructor(app) {
        this.app = app;
        this.tools = [];
        this.materials = [];
    }

    async loadTools() {
        // Fallback defaults
        this.tools = [
            { id: '1', name: 'End Mill 3.175mm', diameter: 3.175, feedRate: 800, rpm: 10000 },
            { id: '2', name: 'End Mill 6mm', diameter: 6, feedRate: 1200, rpm: 12000 },
            { id: '3', name: 'V-Bit 60°', diameter: 6.35, feedRate: 600, rpm: 18000 }
        ];
        return this.tools;
    }

    async loadMaterials() {
        this.materials = [
            { id: '1', name: 'Madera Pine', thickness: 6, feedRate: 1200, rpm: 12000, depthPerPass: 2 },
            { id: '2', name: 'MDF', thickness: 6, feedRate: 1000, rpm: 16000, depthPerPass: 1.5 },
            { id: '3', name: 'Acrilico', thickness: 3, feedRate: 1500, rpm: 18000, depthPerPass: 1 }
        ];
        return this.materials;
    }
}

// ============================================
// ALPINE APP
// ============================================
window.grblApp = function() {
    return {
        // Managers
        canvasManager: null,
        gcodeGenerator: null,
        serialControl: null,
        libraryManager: null,

        // State
        connected: false,
        svgLoaded: false,
        gcodeGenerated: false,
        sending: false,

        // Machine
        machineState: 'Idle',
        feedOverride: 100,
        spindleOverride: 100,

        // Position
        position: { x: '0.000', y: '0.000', z: '0.000' },
        posMode: 'WPos',

        // UI
        currentTab: 'config',
        currentTool: 'select',
        tabs: [
            { id: 'config', name: 'Config', icon: '⚙️' },
            { id: 'jog', name: 'Jog', icon: '🎮' },
            { id: 'gcode', name: 'G-code', icon: '📝' },
            { id: 'console', name: 'Consola', icon: '💻' }
        ],

        // SVG info
        svgPosition: 'X: 0, Y: 0',
        svgScale: '100%',
        svgRotation: '0°',
        workAreaSize: '400 x 400',

        // Config
        operationType: 'cnc',
        selectedTool: '',
        selectedMaterial: '',
        tools: [],
        materials: [],
        config: {
            depth: -3,
            depthStep: 1,
            toolDiameter: 3.175,
            compensation: 'center',
            feedRate: 800,
            plungeRate: 400,
            spindleRPM: 10000,
            laserPower: 60
        },

        // Jog
        jogDistance: 1,
        jogSpeed: 1000,

        // G-code
        gcode: '',
        gcodeLines: 0,
        sendProgress: 0,
        estimates: { time: '-', distance: '-' },

        // Console
        consoleLines: [],
        consoleInput: '',

        // Init
        async init() {
            console.log('🚀 Initializing GRBL Web Control Pro v3.0...');

            // Create managers
            this.canvasManager = new CanvasManager(this);
            this.gcodeGenerator = new GCodeGenerator();
            this.serialControl = new SerialControl(this);
            this.libraryManager = new LibraryManager(this);

            // Init canvas
            const canvas = this.$refs.canvas;
            if (canvas) {
                this.canvasManager.init(canvas);
                console.log('✅ Canvas inicializado');
            } else {
                console.error('❌ Canvas element not found');
            }

            // Load libraries
            this.tools = await this.libraryManager.loadTools();
            this.materials = await this.libraryManager.loadMaterials();
            console.log('✅ Libraries loaded:', this.tools.length, 'tools,', this.materials.length, 'materials');

            console.log('✅ App initialized successfully!');
        },

        // Connection
        async toggleConnection() {
            if (this.connected) {
                await this.serialControl.disconnect();
                this.connected = false;
                this.addConsoleLine('Disconnected');
            } else {
                const result = await this.serialControl.connect();
                this.connected = result;
                if (result) {
                    this.addConsoleLine('✅ Connected to GRBL');
                }
            }
        },

        // SVG
        loadSVG() {
            this.$refs.svgInput.click();
        },

        async handleSVGUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            console.log('📂 Loading SVG:', file.name);

            try {
                await this.canvasManager.loadSVG(file);
                this.svgLoaded = true;
                this.addConsoleLine('✅ SVG cargado: ' + file.name);

                // Auto fit view after a moment
                setTimeout(() => {
                    this.canvasManager.fitView();
                }, 100);

            } catch (error) {
                console.error('Error loading SVG:', error);
                this.addConsoleLine('❌ Error loading SVG: ' + error.message);
                alert('Error loading SVG: ' + error.message);
            }
        },

        // Tools
        selectTool(tool) {
            this.currentTool = tool;
            if (this.canvasManager && this.canvasManager.fabricCanvas) {
                switch(tool) {
                    case 'move':
                        this.canvasManager.fabricCanvas.defaultCursor = 'move';
                        break;
                    case 'rotate':
                        this.canvasManager.fabricCanvas.defaultCursor = 'grab';
                        break;
                    default:
                        this.canvasManager.fabricCanvas.defaultCursor = 'default';
                }
            }
        },

        zoomIn() {
            if (this.canvasManager) {
                this.canvasManager.zoomIn();
            }
        },

        zoomOut() {
            if (this.canvasManager) {
                this.canvasManager.zoomOut();
            }
        },

        fitView() {
            if (this.canvasManager) {
                this.canvasManager.fitView();
            }
        },

        resetOrigin() {
            if (this.canvasManager) {
                this.canvasManager.resetOrigin();
                this.svgPosition = 'X: 0, Y: 0';
                this.svgScale = '100%';
                this.svgRotation = '0°';
            }
        },

        // G-code
        generateGCode() {
            if (!this.svgLoaded) {
                alert('Carga un SVG primero');
                return;
            }

            const paths = this.canvasManager.getPaths();
            this.gcode = this.gcodeGenerator.generate(paths, this.config);
            this.gcodeLines = this.gcode.split('\n').length;
            this.gcodeGenerated = true;

            const est = this.gcodeGenerator.calculateEstimates(this.gcode, this.config);
            this.estimates.time = est.time.toFixed(0) + 's';
            this.estimates.distance = est.distance.toFixed(2) + ' mm';

            this.addConsoleLine('✅ G-code generated: ' + this.gcodeLines + ' lines');
            this.currentTab = 'gcode';
        },

        downloadGCode() {
            if (!this.gcodeGenerated) return;

            const blob = new Blob([this.gcode], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'output.gcode';
            a.click();
            URL.revokeObjectURL(url);

            this.addConsoleLine('✅ G-code downloaded');
        },

        sendToGRBL() {
            if (!this.connected || !this.gcodeGenerated) return;
            alert('Send to GRBL - En desarrollo');
        },

        // Commands
        sendCommand(cmd) {
            if (!this.connected) return;
            this.serialControl.sendCommand(cmd);
            this.addConsoleLine('> ' + cmd);
        },

        reset() {
            if (confirm('¿Reset GRBL?')) {
                this.sendCommand('\x18');
            }
        },

        emergencyStop() {
            if (confirm('🛑 ¿STOP INMEDIATO?')) {
                this.sendCommand('!');
                this.addConsoleLine('🛑 EMERGENCY STOP');
            }
        },

        togglePosMode() {
            this.posMode = this.posMode === 'WPos' ? 'MPos' : 'WPos';
        },

        // Jog
        jog(axis, distance) {
            const cmd = `$J=G91 ${axis}${distance} F${this.jogSpeed}`;
            this.sendCommand(cmd);
        },

        // Console
        sendConsoleCommand() {
            if (!this.consoleInput.trim()) return;
            this.sendCommand(this.consoleInput);
            this.consoleInput = '';
        },

        addConsoleLine(line) {
            const timestamp = new Date().toLocaleTimeString();
            this.consoleLines.push(`[${timestamp}] ${line}`);

            if (this.consoleLines.length > 200) {
                this.consoleLines.shift();
            }

            // Auto scroll
            this.$nextTick(() => {
                const el = this.$refs.consoleOutput;
                if (el) {
                    el.scrollTop = el.scrollHeight;
                }
            });
        },

        clearConsole() {
            this.consoleLines = [];
        },

        // Settings
        applyToolSettings() {
            const tool = this.tools.find(t => t.name === this.selectedTool);
            if (tool) {
                this.config.toolDiameter = tool.diameter;
                this.config.feedRate = tool.feedRate;
                this.config.spindleRPM = tool.rpm;
                this.addConsoleLine('✅ Tool applied: ' + tool.name);
            }
        },

        applyMaterialSettings() {
            const mat = this.materials.find(m => m.name === this.selectedMaterial);
            if (mat) {
                this.config.feedRate = mat.feedRate;
                this.config.spindleRPM = mat.rpm;
                this.config.depthStep = mat.depthPerPass;
                this.addConsoleLine('✅ Material applied: ' + mat.name);
            }
        },

        updateConfigVisibility() {
            // Auto handled by Alpine
        },

        updateTransformInfo(transform) {
            this.svgPosition = `X: ${transform.x.toFixed(1)}, Y: ${transform.y.toFixed(1)}`;
            this.svgScale = `${(transform.scale * 100).toFixed(0)}%`;
            this.svgRotation = `${transform.rotation.toFixed(0)}°`;
        },

        openModal(modalId) {
            console.log('Opening modal:', modalId);
            alert('Modal ' + modalId + ' - En desarrollo');
        }
    };
};

console.log('✅ App bundle loaded - ARREGLADO v3.0.3');
