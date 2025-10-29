// GRBL Web Control Pro - App Bundle
// Todos los módulos incluidos para compatibilidad con Alpine.js

// ============================================
// CANVAS MANAGER (Fabric.js)
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
            console.error('Fabric.js no está cargado');
            return;
        }

        this.canvas = canvasElement;

        // Initialize Fabric.js canvas
        this.fabricCanvas = new fabric.Canvas(canvasElement, {
            width: canvasElement.parentElement.clientWidth,
            height: canvasElement.parentElement.clientHeight,
            backgroundColor: '#F5F3FA',
            selection: true,
            preserveObjectStacking: true
        });

        // Setup grid and origin
        this.setupGrid();
        this.setupOrigin();

        // Handle window resize
        window.addEventListener('resize', () => this.resize());

        // Tool handlers
        this.setupTools();

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

        // Work area rectangle
        const workRect = new fabric.Rect({
            left: centerX - workW / 2,
            top: centerY - workH / 2,
            width: workW,
            height: workH,
            fill: 'transparent',
            stroke: '#7B6BB8',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });

        this.fabricCanvas.add(workRect);

        // Grid lines
        if (this.showGrid) {
            const gridSpacing = this.gridSize * this.pixelsPerMM;

            // Vertical lines
            for (let x = 0; x <= workW; x += gridSpacing) {
                const line = new fabric.Line([
                    centerX - workW / 2 + x, centerY - workH / 2,
                    centerX - workW / 2 + x, centerY + workH / 2
                ], {
                    stroke: 'rgba(123, 107, 184, 0.2)',
                                             strokeWidth: 1,
                                             selectable: false,
                                             evented: false
                });
                this.fabricCanvas.add(line);
            }

            // Horizontal lines
            for (let y = 0; y <= workH; y += gridSpacing) {
                const line = new fabric.Line([
                    centerX - workW / 2, centerY - workH / 2 + y,
                    centerX + workW / 2, centerY - workH / 2 + y
                ], {
                    stroke: 'rgba(123, 107, 184, 0.2)',
                                             strokeWidth: 1,
                                             selectable: false,
                                             evented: false
                });
                this.fabricCanvas.add(line);
            }
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

        const axisLength = 30;

        // X axis (red)
        const xAxis = new fabric.Line([originX, originY, originX + axisLength, originY], {
            stroke: '#FF0000',
            strokeWidth: 3,
            selectable: false,
            evented: false
        });

        // Y axis (green)
        const yAxis = new fabric.Line([originX, originY, originX, originY - axisLength], {
            stroke: '#00FF00',
            strokeWidth: 3,
            selectable: false,
            evented: false
        });

        // Origin dot
        const origin = new fabric.Circle({
            left: originX - 5,
            top: originY - 5,
            radius: 5,
            fill: '#FFFFFF',
            selectable: false,
            evented: false
        });

        this.fabricCanvas.add(xAxis, yAxis, origin);
    }

    setupTools() {
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

                    // Clear previous
                    if (this.svgGroup) {
                        this.fabricCanvas.remove(this.svgGroup);
                    }

                    // Change color of all objects BEFORE grouping
                    objects.forEach(obj => {
                        if (obj.stroke) obj.set('stroke', '#5B4B9F');
                        if (!obj.stroke && obj.fill) obj.set('fill', '#5B4B9F');
                    });

                        // Create group from objects
                        if (objects.length === 1) {
                            this.svgGroup = objects[0];
                        } else {
                            this.svgGroup = new fabric.Group(objects, options);
                        }

                        // Position at origin
                        const workW = this.workArea.width * this.pixelsPerMM;
                        const workH = this.workArea.height * this.pixelsPerMM;
                        const centerX = this.fabricCanvas.width / 2;
                        const centerY = this.fabricCanvas.height / 2;
                        const originX = centerX - workW / 2;
                        const originY = centerY + workH / 2;

                        this.svgGroup.set({
                            left: originX,
                            top: originY - this.svgGroup.height,
                            selectable: true,
                            hasControls: true
                        });

                        this.fabricCanvas.add(this.svgGroup);
                        this.fabricCanvas.setActiveObject(this.svgGroup);
                        this.fabricCanvas.renderAll();

                        console.log('✅ SVG loaded:', objects.length, 'objects');
                        resolve();
                });
            };

            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    getPaths() {
        // Simplified - return empty for now
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
        lines.push('G21 ; mm');
        lines.push('G90 ; absolute');
        lines.push('G17 ; XY plane');

        if (config.operationType === 'cnc') {
            lines.push(`M3 S${config.spindleRPM}`);
            lines.push(`F${config.feedRate}`);
        }

        lines.push('G0 Z5');
        lines.push('G0 X0 Y0');

        // End
        lines.push('G0 Z5');
        lines.push('M5');
        lines.push('G0 X0 Y0');
        lines.push('M30');

        this.gcode = lines.join('\n');
        return this.gcode;
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
                this.app.addConsoleL(text);
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
            { id: '1', name: 'End Mill 3mm', diameter: 3, feedRate: 800, rpm: 10000 },
            { id: '2', name: 'End Mill 6mm', diameter: 6, feedRate: 1200, rpm: 12000 }
        ];
        return this.tools;
    }

    async loadMaterials() {
        this.materials = [
            { id: '1', name: 'Madera Pine', feedRate: 1200, rpm: 12000 },
            { id: '2', name: 'MDF', feedRate: 1000, rpm: 16000 }
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
            console.log('Initializing GRBL Web Control Pro...');

            // Create managers
            this.canvasManager = new CanvasManager(this);
            this.gcodeGenerator = new GCodeGenerator();
            this.serialControl = new SerialControl(this);
            this.libraryManager = new LibraryManager(this);

            // Init canvas
            const canvas = this.$refs.canvas;
            if (canvas) {
                this.canvasManager.init(canvas);
            }

            // Load libraries
            this.tools = await this.libraryManager.loadTools();
            this.materials = await this.libraryManager.loadMaterials();

            console.log('✅ App initialized');
        },

        // Connection
        async toggleConnection() {
            if (this.connected) {
                await this.serialControl.disconnect();
                this.connected = false;
            } else {
                const result = await this.serialControl.connect();
                this.connected = result;
            }
        },

        // SVG
        loadSVG() {
            this.$refs.svgInput.click();
        },

        async handleSVGUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            try {
                await this.canvasManager.loadSVG(file);
                this.svgLoaded = true;

                // Auto fit view
                setTimeout(() => {
                    this.canvasManager.fitView();
                }, 100);

                console.log('✅ SVG loaded');
            } catch (error) {
                alert('Error loading SVG: ' + error.message);
            }
        },

        // Tools
        selectTool(tool) {
            this.currentTool = tool;
            if (this.canvasManager && this.canvasManager.fabricCanvas) {
                // Update cursor based on tool
                switch(tool) {
                    case 'pan':
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

            console.log('✅ G-code generated');
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
        },

        sendToGRBL() {
            if (!this.connected || !this.gcodeGenerated) return;
            alert('Función en desarrollo');
        },

        // Commands
        sendCommand(cmd) {
            if (!this.connected) return;
            this.serialControl.sendCommand(cmd);
            this.addConsoleLine('> ' + cmd);
        },

        reset() {
            this.sendCommand('\x18'); // Ctrl-X
        },

        emergencyStop() {
            if (confirm('¿Stop inmediato?')) {
                this.sendCommand('!');
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
            this.consoleLines.push(line);
            if (this.consoleLines.length > 100) {
                this.consoleLines.shift();
            }

            // Auto scroll
            this.$nextTick(() => {
                const console = this.$refs.consoleOutput;
                if (console) {
                    console.scrollTop = console.scrollHeight;
                }
            });
        },

        clearConsole() {
            this.consoleLines = [];
        },

        // Settings
        applyToolSettings() {
            // TODO
        },

        applyMaterialSettings() {
            // TODO
        },

        updateConfigVisibility() {
            // TODO
        },

        updateTransformInfo(transform) {
            this.svgPosition = `X: ${transform.x.toFixed(1)}, Y: ${transform.y.toFixed(1)}`;
            this.svgScale = `${(transform.scale * 100).toFixed(0)}%`;
            this.svgRotation = `${transform.rotation.toFixed(0)}°`;
        }
    };
};

console.log('✅ App bundle loaded');
