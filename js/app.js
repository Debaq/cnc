// ============================================
// GRBL Web Control Pro v3.0 - Main App
// ============================================

// Store GCodeViewer outside Alpine's reactive system to avoid Three.js proxy conflicts
let globalGCodeViewer = null;

// ============================================
// ALPINE.JS APP
// ============================================
window.grblApp = function() {
    return {
        // Managers
        canvasManager: null,
        gcodeGenerator: null,
        // Note: gcodeViewer is stored outside Alpine's reactive system to avoid proxy conflicts with Three.js
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
        currentTab: 'elements',
        currentTool: 'select',
        tabs: [
            { id: 'elements', name: 'Elementos', icon: '📋' },
            //{ id: 'config', name: 'Config', icon: '⚙️' },
            { id: 'jog', name: 'Jog', icon: '🎮' },
            { id: 'gcode', name: 'G-code', icon: '📝' },
            { id: 'viewer', name: 'Visor 3D', icon: '🎬' },
            { id: 'console', name: 'Consola', icon: '💻' }
        ],
        // SVG info
        svgPosition: 'X: 0, Y: 0',
        svgScale: '100%',
        svgRotation: '0°',
        workAreaSize: '400 x 400',
        svgX: 0,
        svgY: 0,
        svgWidth: 0,
        svgHeight: 0,
        proportionalScale: true,

        // Config
        //operationType: 'cnc',
        //selectedTool: '',
        //selectedMaterial: '',
        tools: [],
        materials: [],

        elements: [],
        selectedElement: null,
        globalConfig: {
            operationType: 'cnc',
            tool: '',
            material: '',
            workType: 'outline', // outline, inside, outside, pocket
            feedRate: 800,
            plungeRate: 400,
            spindleRPM: 10000,
            laserPower: 80,
            passes: 1,
            depth: -3,
            depthStep: 1,
            toolDiameter: 3.175,
            compensation: 'center',
            pressure: 15, // para plotter
            speed: 100, // para plotter/pencil
            pressureZ: -1 // para pencil
        },
        configStatus: 'unified', // 'unified', 'multiple', 'none'
        showElementConfig: false,

        //config: {
        //    depth: -3,
         //   depthStep: 1,
         //   toolDiameter: 3.175,
         //   compensation: 'center',
          //  feedRate: 800,
           // plungeRate: 400,
           // spindleRPM: 10000,
           // laserPower: 60
        //},

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

        // 3D Viewer
        viewMode: 'svg', // 'svg' or '3d'
        viewer3DStats: {
            distance: '0 mm',
            time: '0s',
            passes: 0
        },
        viewer3DCurrentPass: 0,
        viewer3DPlaying: false,
        viewer3DAnimProgress: 0,
        viewer3DSpeed: 1.0,

        // Modal Work Area
        showWorkAreaModal: false,
        tempWorkArea: { width: 400, height: 400 },

        // Modal GRBL Settings
        showGRBLModal: false,
        grblSettings: [],
        grblSearchQuery: '',
        grblSettingsStatus: null,
        showGRBLHelpModal: false,
        currentGRBLHelp: {},


        showToolsModal: false,
toolsModalTab: 'cnc', // 'cnc', 'plotter', 'pencil'
editingTool: null,
toolForm: {
    name: '',
    type: 'endmill',
    diameter: 3.175,
    angle: 0,
    feedRate: 800,
    plungeRate: 400,
    rpm: 12000,
    pressure: 15,
    speed: 100,
    thickness: 0.5,
    color: '#000000',
    notes: ''
},
authPassword: '',
toolsStatus: null,

        // Init
        async init() {
            console.log('🚀 Initializing GRBL Web Control Pro v3.5...');

            // Verificar maker.js
            console.log('🔍 Checking maker.js...');
            if (typeof makerjs !== 'undefined') {
                console.log('✅ Maker.js loaded:', makerjs);
            } else if (typeof window.makerjs !== 'undefined') {
                console.log('✅ Maker.js loaded on window:', window.makerjs);
                window.makerjs = window.makerjs; // Asegurar acceso global
            } else if (typeof require !== 'undefined') {
                console.log('⚠️ Trying to require maker.js...');
                try {
                    window.makerjs = require('makerjs');
                    console.log('✅ Maker.js required:', window.makerjs);
                } catch(e) {
                    console.error('❌ Could not require maker.js:', e);
                }
            } else {
                console.error('❌ Maker.js not found!');
                console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('maker')));
            }

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

            // Init 3D viewer (stored globally to avoid Alpine reactivity issues with Three.js)
            const viewer3dCanvas = this.$refs.viewer3d;
            if (viewer3dCanvas) {
                globalGCodeViewer = new GCodeViewer(viewer3dCanvas);
                globalGCodeViewer.init();
                console.log('✅ 3D Viewer inicializado');
            } else {
                console.warn('⚠️ 3D Viewer canvas not found');
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
                const svgGroup = await this.canvasManager.loadSVG(file);
                this.svgLoaded = true;
                this.addSVGAsElement(file, svgGroup);
                this.addConsoleLine('✅ SVG cargado: ' + file.name);

                // Actualizar dimensiones iniciales
                this.updateSVGDimensions();

            } catch (error) {
                console.error('Error loading SVG:', error);
                this.addConsoleLine('❌ Error loading SVG: ' + error.message);
                alert('Error loading SVG: ' + error.message);
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
        updateSVGWidth() {
            const obj = this.canvasManager.fabricCanvas.getActiveObject();
            if (!obj) return;

            const targetWidthPx = this.svgWidth * this.canvasManager.pixelsPerMM;
            let newScaleX;

            // Para círculos
            if (obj.type === 'circle') {
                newScaleX = targetWidthPx / (obj.radius * 2);
            }
            // Para líneas, calcular nueva escala basada en la longitud original
            else if (obj.type === 'line') {
                const originalLength = Math.sqrt(
                    Math.pow(obj.x2 - obj.x1, 2) +
                    Math.pow(obj.y2 - obj.y1, 2)
                );
                newScaleX = targetWidthPx / originalLength;
            }
            // Para el resto de objetos
            else {
                newScaleX = targetWidthPx / obj.width;
            }

            if (this.proportionalScale) {
                // Escala proporcional
                obj.set({
                    scaleX: newScaleX,
                    scaleY: newScaleX
                });

                // Actualizar altura según el tipo
                if (obj.type === 'circle') {
                    this.svgHeight = Math.round((obj.radius * 2 * newScaleX) / this.canvasManager.pixelsPerMM);
                } else if (obj.type === 'line') {
                    this.svgHeight = 0;
                } else {
                    this.svgHeight = Math.round((obj.height * newScaleX) / this.canvasManager.pixelsPerMM);
                }
            } else {
                // Solo ancho
                obj.set('scaleX', newScaleX);
            }

            obj.setCoords(); // Actualizar los controles visuales
            this.canvasManager.fabricCanvas.renderAll();
            this.updateTransformInfo({
                x: obj.left,
                y: obj.top,
                scale: (obj.scaleX + obj.scaleY) / 2,
                rotation: obj.angle
            });
        },

        updateSVGHeight() {
            const obj = this.canvasManager.fabricCanvas.getActiveObject();
            if (!obj) return;

            // Las líneas no tienen altura, ignorar
            if (obj.type === 'line') return;

            const targetHeightPx = this.svgHeight * this.canvasManager.pixelsPerMM;
            let newScaleY;

            // Para círculos
            if (obj.type === 'circle') {
                newScaleY = targetHeightPx / (obj.radius * 2);
            }
            // Para el resto de objetos
            else {
                newScaleY = targetHeightPx / obj.height;
            }

            if (this.proportionalScale) {
                // Escala proporcional
                obj.set({
                    scaleX: newScaleY,
                    scaleY: newScaleY
                });

                // Actualizar ancho según el tipo
                if (obj.type === 'circle') {
                    this.svgWidth = Math.round((obj.radius * 2 * newScaleY) / this.canvasManager.pixelsPerMM);
                } else {
                    this.svgWidth = Math.round((obj.width * newScaleY) / this.canvasManager.pixelsPerMM);
                }
            } else {
                // Solo alto
                obj.set('scaleY', newScaleY);
            }

            obj.setCoords(); // Actualizar los controles visuales
            this.canvasManager.fabricCanvas.renderAll();
            this.updateTransformInfo({
                x: obj.left,
                y: obj.top,
                scale: (obj.scaleX + obj.scaleY) / 2,
                rotation: obj.angle
            });
        },

        updateSVGPosition() {
            const obj = this.canvasManager.fabricCanvas.getActiveObject();
            if (!obj) return;

            const origin = this.canvasManager.getOrigin();

            // Convert from machine coordinates (mm) to canvas pixels
            const canvasX = origin.x + (this.svgX * this.canvasManager.pixelsPerMM);
            const canvasY = origin.y - (this.svgY * this.canvasManager.pixelsPerMM);

            console.log('🔧 updateSVGPosition:');
            console.log('   Requested:', this.svgX, this.svgY, 'mm');
            console.log('   Origin:', origin.x, origin.y);
            console.log('   Setting object to:', canvasX, canvasY);

            obj.set({
                left: canvasX,
                top: canvasY
            });

            obj.setCoords(); // Actualizar los controles visuales
            this.canvasManager.fabricCanvas.renderAll();
            this.updateTransformInfo({
                x: obj.left,
                y: obj.top,
                scale: (obj.scaleX + obj.scaleY) / 2,
                rotation: obj.angle
            });
        },

        updateSVGDimensions() {
            // Actualizar dimensiones y posición del objeto activo
            const obj = this.canvasManager.fabricCanvas.getActiveObject();
            if (!obj) return;

            const origin = this.canvasManager.getOrigin();

            // Para círculos, usar el radio
            if (obj.type === 'circle') {
                this.svgWidth = Math.round((obj.radius * 2 * obj.scaleX) / this.canvasManager.pixelsPerMM);
                this.svgHeight = Math.round((obj.radius * 2 * obj.scaleY) / this.canvasManager.pixelsPerMM);
            }
            // Para líneas, calcular la longitud
            else if (obj.type === 'line') {
                const dx = (obj.x2 - obj.x1) * obj.scaleX;
                const dy = (obj.y2 - obj.y1) * obj.scaleY;
                const length = Math.sqrt(dx * dx + dy * dy);
                this.svgWidth = Math.round(length / this.canvasManager.pixelsPerMM);
                this.svgHeight = 0; // Las líneas no tienen altura
            }
            // Para el resto de objetos (rect, path, group, etc.)
            else {
                this.svgWidth = Math.round((obj.width * obj.scaleX) / this.canvasManager.pixelsPerMM);
                this.svgHeight = Math.round((obj.height * obj.scaleY) / this.canvasManager.pixelsPerMM);
            }

            // Update position (convert from canvas pixels to machine mm)
            this.svgX = Math.round((obj.left - origin.x) / this.canvasManager.pixelsPerMM);
            this.svgY = Math.round((origin.y - obj.top) / this.canvasManager.pixelsPerMM);
        },

        // G-code
        generateGCode() {
            if (this.elements.length === 0) {
                alert('No hay elementos para generar G-code');
                return;
            }

            // Agrupar elementos por herramienta
            const groups = this.groupElementsByTool();

            let allGcode = '';
            allGcode += '; Generated by GRBL Web Control Pro v3.0\n';
            allGcode += `; Date: ${new Date().toISOString()}\n`;
            allGcode += '; ====================================\n\n';
            allGcode += 'G21 ; mm\nG90 ; absolute\nG17 ; XY plane\n\n';

            groups.forEach((group, groupIndex) => {
                const config = group.config;
                const toolName = config.tool || 'Manual';

                // Pausa para cambio de herramienta
                if (groupIndex > 0) {
                    allGcode += '\n; ====================================\n';
                    allGcode += `; CAMBIO DE HERRAMIENTA\n`;
                    allGcode += '; ====================================\n';
                    allGcode += 'G0 Z10 ; Subir a altura segura\n';
                    allGcode += 'M5 ; Apagar spindle/laser\n';
                    allGcode += `(MSG, Cambiar a: ${toolName} - Presiona CYCLE START)\n`;
                    allGcode += 'M0 ; Pausa para cambio de herramienta\n\n';
                }

                allGcode += `; ====================================\n`;
                allGcode += `; GRUPO ${groupIndex + 1}: ${toolName}\n`;
                allGcode += `; Elementos: ${group.elements.length}\n`;
                allGcode += `; ====================================\n\n`;

                if (config.operationType === 'cnc') {
                    allGcode += `M3 S${config.spindleRPM}\n`;
                    allGcode += 'G4 P2\n\n';
                } else {
                    allGcode += 'M3 S0\n';
                    allGcode += 'G4 P0.5\n\n';
                }

                group.elements.forEach(element => {
                    const paths = this.canvasManager.getPathsFromElement(element);
                    const gcode = this.gcodeGenerator.generate(paths, config, config.operationType);
                    allGcode += `; Elemento: ${element.name}\n`;
                    allGcode += gcode + '\n';
                });
            });

            allGcode += '\n; ====================================\n';
            allGcode += '; FIN DEL PROGRAMA\n';
            allGcode += '; ====================================\n';
            allGcode += 'G0 Z10\nM5\nG0 X0 Y0\nM2\n';

            this.gcode = allGcode;
            this.gcodeLines = allGcode.split('\n').length;
            this.gcodeGenerated = true;
            this.addConsoleLine('✅ G-code generado: ' + this.gcodeLines + ' líneas');

            // Update 3D viewer if initialized
            if (globalGCodeViewer) {
                this.updateViewer3D();
            }

            this.currentTab = 'gcode';
        },

        groupElementsByTool() {
            const groups = [];
            const visibleElements = this.elements.filter(e => e.visible);

            visibleElements.forEach(element => {
                const config = this.getElementConfig(element);
                const toolKey = `${config.operationType}_${config.tool || 'none'}`;

                let group = groups.find(g => g.toolKey === toolKey);
                if (!group) {
                    group = {
                        toolKey: toolKey,
                        config: config,
                        elements: []
                    };
                    groups.push(group);
                }

                group.elements.push(element);
            });

            return groups;
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
                this.serialControl.reset();
            }
        },

        emergencyStop() {
            if (confirm('🛑 ¿STOP INMEDIATO?')) {
                this.serialControl.emergencyStop();
                this.addConsoleLine('🛑 EMERGENCY STOP');
            }
        },

        togglePosMode() {
            this.posMode = this.posMode === 'WPos' ? 'MPos' : 'WPos';
        },

        // Jog
        jog(axis, distance) {
            if (!this.connected) return;
            this.serialControl.jog(axis, distance, this.jogSpeed);
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
            const tool = this.libraryManager.getTool(this.selectedTool);
            if (tool) {
                this.config.toolDiameter = tool.diameter;
                this.config.feedRate = tool.feedRate;
                this.config.spindleRPM = tool.rpm;
                this.addConsoleLine('✅ Tool applied: ' + tool.name);
            }
        },

        applyMaterialSettings() {
            const mat = this.libraryManager.getMaterial(this.selectedMaterial);
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

        // Work Area Modal
        openWorkAreaModal() {
            this.tempWorkArea.width = this.canvasManager.workArea.width;
            this.tempWorkArea.height = this.canvasManager.workArea.height;
            this.showWorkAreaModal = true;
        },

        closeWorkAreaModal() {
            this.showWorkAreaModal = false;
        },

        applyWorkArea() {
            this.canvasManager.setWorkArea(this.tempWorkArea.width, this.tempWorkArea.height);
            this.closeWorkAreaModal();
            this.addConsoleLine(`✅ Work area set to ${this.tempWorkArea.width} x ${this.tempWorkArea.height} mm`);
        },

        setPresetWorkArea(width, height) {
            this.tempWorkArea.width = width;
            this.tempWorkArea.height = height;
        },

        // ============================================
        // GRBL SETTINGS MODAL
        // ============================================
        openGRBLModal() {
            this.showGRBLModal = true;
            this.grblSettingsStatus = null;
        },

        closeGRBLModal() {
            this.showGRBLModal = false;
            this.grblSearchQuery = '';
            this.grblSettingsStatus = null;
        },

        async loadGRBLSettings() {
            if (!this.connected) {
                this.grblSettingsStatus = { type: 'error', message: '❌ No hay conexión con GRBL' };
                return;
            }

            this.grblSettingsStatus = { type: 'info', message: '⏳ Leyendo configuración...' };
            this.addConsoleLine('📖 Reading GRBL settings...');

            try {
                const settings = await this.serialControl.readSettings();
                this.grblSettings = settings;
                this.grblSettingsStatus = {
                    type: 'success',
                    message: `✅ ${settings.length} configuraciones cargadas`
                };
                this.addConsoleLine(`✅ Loaded ${settings.length} GRBL settings`);
            } catch (error) {
                this.grblSettingsStatus = {
                    type: 'error',
                    message: '❌ Error al leer configuración: ' + error.message
                };
                this.addConsoleLine('❌ Error reading settings: ' + error.message);
            }
        },

        async saveGRBLSettings() {
            if (!this.connected) return;

            if (!confirm('¿Guardar cambios en la máquina GRBL?')) return;

            this.grblSettingsStatus = { type: 'info', message: '⏳ Guardando configuración...' };
            this.addConsoleLine('💾 Saving GRBL settings...');

            try {
                await this.serialControl.writeSettings(this.grblSettings);
                this.grblSettingsStatus = {
                    type: 'success',
                    message: '✅ Configuración guardada correctamente'
                };
                this.addConsoleLine('✅ Settings saved successfully');
            } catch (error) {
                this.grblSettingsStatus = {
                    type: 'error',
                    message: '❌ Error al guardar: ' + error.message
                };
                this.addConsoleLine('❌ Error saving settings: ' + error.message);
            }
        },

        async resetGRBLSettings() {
            if (!this.connected) return;

            if (!confirm('⚠️ ¿RESETEAR GRBL A CONFIGURACIÓN DE FÁBRICA?\n\nEsto borrará todas las configuraciones personalizadas.')) {
                return;
            }

            this.grblSettingsStatus = { type: 'info', message: '⏳ Reseteando a factory...' };
            this.addConsoleLine('⚠️ Resetting GRBL to factory defaults...');

            try {
                await this.serialControl.sendCommand('$RST=$');
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.loadGRBLSettings();
                this.grblSettingsStatus = {
                    type: 'success',
                    message: '✅ Reset completado. Recarga la configuración.'
                };
                this.addConsoleLine('✅ Factory reset completed');
            } catch (error) {
                this.grblSettingsStatus = {
                    type: 'error',
                    message: '❌ Error al resetear: ' + error.message
                };
                this.addConsoleLine('❌ Error resetting: ' + error.message);
            }
        },

        showGRBLHelp(setting) {
            this.currentGRBLHelp = setting;
            this.showGRBLHelpModal = true;
        },

        filteredGRBLSettings() {
            if (!this.grblSearchQuery) return this.grblSettings;
            const query = this.grblSearchQuery.toLowerCase();
            return this.grblSettings.filter(s =>
            s.code.toLowerCase().includes(query) ||
            s.description.toLowerCase().includes(query)
            );
        },

        openModal(modalId) {
            if (modalId === 'workArea') {
                this.openWorkAreaModal();
            } else if (modalId === 'grblSettings') {
                this.openGRBLModal();
            } else {
                console.log('Opening modal:', modalId);
                alert('Modal ' + modalId + ' - En desarrollo');
            }
        },
        // ============================================
        // ELEMENTS SYSTEM
        // ============================================

        addSVGAsElement(file, svgGroup) {
            const element = {
                id: 'el_' + Date.now(),
                type: 'svg',
                name: file.name,
                visible: true,
                locked: false,
                expanded: false,
                showConfig: false, // NUEVO
                fabricObject: svgGroup,
                config: null, // null = hereda global
                children: [] // paths internos si se desglosa
            };
            this.elements.push(element);
            this.updateConfigStatus();
        },

        toggleExpandElement(elementId) {
            const element = this.elements.find(e => e.id === elementId);
            if (!element || element.type !== 'svg') return;

            element.expanded = !element.expanded;

            if (element.expanded && element.children.length === 0) {
                // Desglosar SVG en paths
                this.decomposeElement(element);
            }
        },

        decomposeElement(element) {
            // Extraer paths del fabricObject
            const objects = element.fabricObject.type === 'group'
            ? element.fabricObject.getObjects()
            : [element.fabricObject];

            objects.forEach((obj, index) => {
                const child = {
                    id: element.id + '_path_' + index,
                    type: 'path',
                    name: `Path ${index + 1}`,
                    visible: true,
                    locked: false,
                    fabricObject: obj,
                    config: null, // hereda del padre o global
                    parent: element.id
                };
                element.children.push(child);
            });
        },

        setElementConfig(elementId, config) {
            const element = this.findElementById(elementId);
            if (!element) return;

            element.config = { ...config };
            this.updateConfigStatus();
            this.addConsoleLine(`✅ Config aplicada a: ${element.name}`);
        },

        resetElementConfig(elementId) {
            const element = this.findElementById(elementId);
            if (!element) return;

            element.config = null;
            this.updateConfigStatus();
            this.addConsoleLine(`⟲ Config reseteada: ${element.name}`);
        },

        applyGlobalConfigToAll() {
            this.elements.forEach(el => {
                el.config = null;
                if (el.children) {
                    el.children.forEach(child => child.config = null);
                }
            });
            this.configStatus = 'unified';
            this.addConsoleLine('✅ Config global aplicada a todos los elementos');
        },

        updateConfigStatus() {
            const hasCustomConfig = this.elements.some(el => {
                if (el.config) return true;
                if (el.children) {
                    return el.children.some(c => c.config);
                }
                return false;
            });

            this.configStatus = hasCustomConfig ? 'multiple' : 'unified';
        },

        toggleElementVisibility(elementId) {
            const element = this.findElementById(elementId);
            if (!element) return;

            element.visible = !element.visible;
            if (element.fabricObject) {
                element.fabricObject.set('visible', element.visible);
                this.canvasManager.fabricCanvas.renderAll();
            }
        },

        toggleElementLock(elementId) {
            const element = this.findElementById(elementId);
            if (!element) return;

            element.locked = !element.locked;
            if (element.fabricObject) {
                element.fabricObject.set('selectable', !element.locked);
                element.fabricObject.set('evented', !element.locked);
                this.canvasManager.fabricCanvas.renderAll();
            }
        },

        deleteElement(elementId) {
            const index = this.elements.findIndex(e => e.id === elementId);
            if (index === -1) return;

            const element = this.elements[index];
            if (element.fabricObject) {
                this.canvasManager.fabricCanvas.remove(element.fabricObject);
            }

            this.elements.splice(index, 1);
            this.updateConfigStatus();
            this.addConsoleLine(`🗑️ Eliminado: ${element.name}`);
        },

        findElementById(id) {
            for (let el of this.elements) {
                if (el.id === id) return el;
                if (el.children) {
                    const child = el.children.find(c => c.id === id);
                    if (child) return child;
                }
            }
            return null;
        },

        getElementConfig(element) {
            // Si tiene config propia, usarla
            if (element.config) return element.config;

            // Si tiene padre, heredar del padre
            if (element.parent) {
                const parent = this.elements.find(e => e.id === element.parent);
                if (parent && parent.config) return parent.config;
            }

            // Heredar global
            return this.globalConfig;
        },

        addDrawingElement(type) {
            let fabricObj = null;
            const workW = this.canvasManager.workArea.width * this.canvasManager.pixelsPerMM;
            const workH = this.canvasManager.workArea.height * this.canvasManager.pixelsPerMM;
            const centerX = this.canvasManager.fabricCanvas.width / 2;
            const centerY = this.canvasManager.fabricCanvas.height / 2;

            const commonProps = {
                fill: 'transparent',
                stroke: '#2D1B69',
                strokeWidth: 2,
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
                lockScalingFlip: false,
                lockUniScaling: false,
                cornerSize: 10,
                cornerStyle: 'circle',
                borderColor: '#5B4B9F',
                cornerColor: '#5B4B9F',
                cornerStrokeColor: '#2D1B69',
                transparentCorners: false
            };

            switch(type) {
                case 'rect':
                    fabricObj = new fabric.Rect({
                        left: centerX - 25,
                        top: centerY - 25,
                        width: 50,
                        height: 50,
                        ...commonProps
                    });
                    break;
                case 'circle':
                    fabricObj = new fabric.Circle({
                        left: centerX - 25,
                        top: centerY - 25,
                        radius: 25,
                        ...commonProps
                    });
                    break;
                case 'line':
                    fabricObj = new fabric.Line([centerX - 50, centerY, centerX + 50, centerY], {
                        ...commonProps
                    });
                    break;
            }

            if (fabricObj) {
                this.canvasManager.fabricCanvas.add(fabricObj);
                this.canvasManager.fabricCanvas.setActiveObject(fabricObj);
                this.canvasManager.fabricCanvas.renderAll();

                const element = {
                    id: 'el_' + Date.now(),
                    type: type,
                    name: this.getDrawingName(type),
                    visible: true,
                    locked: false,
                    showConfig: false,
                    fabricObject: fabricObj,
                    config: null
                };
                this.elements.push(element);
                this.addConsoleLine(`✅ Agregado: ${element.name}`);

                // Actualizar los inputs con los valores del nuevo elemento
                this.updateSVGDimensions();
            }
        },

        getDrawingName(type) {
            const counts = this.elements.filter(e => e.type === type).length;
            const names = { rect: 'Rectángulo', circle: 'Círculo', line: 'Línea', text: 'Texto' };
            return `${names[type] || type} ${counts + 1}`;
        },

        // ==============================================
        // MAKER.JS MODELS
        // ==============================================
        addMakerModel(modelType) {
            if (typeof makerjs === 'undefined') {
                alert('Maker.js no está cargado');
                return;
            }

            // Parámetros por defecto para cada modelo
            const defaultParams = this.getMakerModelDefaults(modelType);

            // Crear el modelo de maker.js
            let makerModel;
            try {
                makerModel = this.createMakerModel(modelType, defaultParams);
            } catch (error) {
                console.error('Error creating maker model:', error);
                alert('Error al crear el modelo: ' + error.message);
                return;
            }

            // Convertir a SVG
            const svg = makerjs.exporter.toSVG(makerModel);

            // Crear elemento temporal para cargar el SVG
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const file = new File([blob], `${modelType}.svg`, { type: 'image/svg+xml' });

            // Cargar SVG y agregar como elemento maker
            this.loadMakerModelToCanvas(file, modelType, defaultParams);
        },

        getMakerModelDefaults(modelType) {
            const defaults = {
                Rectangle: { width: 50, height: 30 },
                Square: { side: 40 },
                RoundRectangle: { width: 50, height: 30, radius: 5 },
                Oval: { width: 50, height: 30 },
                Ellipse: { radiusX: 25, radiusY: 15 },
                Ring: { outerRadius: 25, innerRadius: 15 },
                Polygon: { numberOfSides: 6, radius: 25 },
                Star: { numberOfPoints: 5, outerRadius: 25, innerRadius: 12 },
                Slot: { origin: [0, 0], endPoint: [50, 0], radius: 10 },
                Dome: { width: 50, height: 20 },
                BoltCircle: { boltRadius: 3, holeRadius: 20, boltCount: 6 },
                BoltRectangle: { width: 50, height: 30, holeRadius: 3 },
                Text: { text: 'Texto', fontSize: 20, font: 'Arial' }
            };

            return defaults[modelType] || {};
        },

        createMakerModel(modelType, params) {
            const models = makerjs.models;

            switch(modelType) {
                case 'Rectangle':
                    return new models.Rectangle(params.width, params.height);
                case 'Square':
                    return new models.Square(params.side);
                case 'RoundRectangle':
                    return new models.RoundRectangle(params.width, params.height, params.radius);
                case 'Oval':
                    return new models.Oval(params.width, params.height);
                case 'Ellipse':
                    return new models.Ellipse(params.radiusX, params.radiusY);
                case 'Ring':
                    return new models.Ring(params.outerRadius, params.innerRadius);
                case 'Polygon':
                    return new models.Polygon(params.numberOfSides, params.radius);
                case 'Star':
                    return new models.Star(params.numberOfPoints, params.outerRadius, params.innerRadius);
                case 'Slot':
                    return new models.Slot(params.origin, params.endPoint, params.radius);
                case 'Dome':
                    return new models.Dome(params.width, params.height);
                case 'BoltCircle':
                    return new models.BoltCircle(params.boltRadius, params.holeRadius, params.boltCount);
                case 'BoltRectangle':
                    return new models.BoltRectangle(params.width, params.height, params.holeRadius);
                case 'Text':
                    // Text model requires opentype.js, handle differently
                    console.warn('Text model requiere configuración adicional');
                    return new models.Rectangle(50, 20); // Fallback
                default:
                    throw new Error('Modelo desconocido: ' + modelType);
            }
        },

        async loadMakerModelToCanvas(file, modelType, params) {
            try {
                const svgGroup = await this.canvasManager.loadSVG(file);

                const element = {
                    id: 'el_' + Date.now(),
                    type: 'maker',
                    makerType: modelType,
                    name: modelType,
                    visible: true,
                    locked: false,
                    expanded: false,
                    showConfig: false,
                    fabricObject: svgGroup,
                    config: null,
                    makerParams: params, // Parámetros específicos del modelo maker
                    children: []
                };

                this.elements.push(element);
                this.updateConfigStatus();
                this.addConsoleLine(`✅ Modelo Maker.js agregado: ${modelType}`);

                // Actualizar inputs
                this.updateSVGDimensions();
            } catch (error) {
                console.error('Error loading maker model:', error);
                alert('Error al cargar el modelo: ' + error.message);
            }
        },

        async regenerateMakerModel(elementId) {
            const element = this.findElementById(elementId);
            if (!element || element.type !== 'maker') return;

            console.log('🔄 Regenerando modelo maker:', element.makerType);

            try {
                // Crear nuevo modelo con parámetros actualizados
                const makerModel = this.createMakerModel(element.makerType, element.makerParams);
                const svg = makerjs.exporter.toSVG(makerModel);

                // Crear blob y file
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const file = new File([blob], `${element.makerType}.svg`, { type: 'image/svg+xml' });

                // Guardar posición y escala actuales
                const oldFabricObj = element.fabricObject;
                const oldLeft = oldFabricObj.left;
                const oldTop = oldFabricObj.top;
                const oldScaleX = oldFabricObj.scaleX;
                const oldScaleY = oldFabricObj.scaleY;
                const oldAngle = oldFabricObj.angle;

                // Remover objeto viejo del canvas
                this.canvasManager.fabricCanvas.remove(oldFabricObj);

                // Cargar nuevo SVG
                const newSvgGroup = await this.canvasManager.loadSVG(file);

                // Aplicar transformación anterior
                newSvgGroup.set({
                    left: oldLeft,
                    top: oldTop,
                    scaleX: oldScaleX,
                    scaleY: oldScaleY,
                    angle: oldAngle
                });

                // Actualizar coordenadas del objeto
                newSvgGroup.setCoords();

                // Actualizar elemento
                element.fabricObject = newSvgGroup;

                this.canvasManager.fabricCanvas.setActiveObject(newSvgGroup);
                this.canvasManager.fabricCanvas.renderAll();

                this.addConsoleLine(`✅ Modelo regenerado: ${element.makerType}`);

                // Actualizar los inputs con los nuevos valores
                this.$nextTick(() => {
                    this.updateSVGDimensions();
                });

            } catch (error) {
                console.error('Error regenerando modelo:', error);
                alert('Error al regenerar el modelo: ' + error.message);
            }
        },
        selectElement(elementId) {
            const element = this.findElementById(elementId);
            if (!element || !element.fabricObject) return;

            this.canvasManager.fabricCanvas.setActiveObject(element.fabricObject);
            this.canvasManager.fabricCanvas.renderAll();
            this.selectedElement = element;

            // Actualizar los inputs con los valores del elemento seleccionado
            this.updateSVGDimensions();
        },
openToolsModal() {
    this.showToolsModal = true;
    this.toolsModalTab = 'cnc';
    this.toolsStatus = null;
},

closeToolsModal() {
    this.showToolsModal = false;
    this.editingTool = null;
    this.resetToolForm();
},

resetToolForm() {
    this.toolForm = {
        name: '',
        type: 'endmill',
        diameter: 3.175,
        angle: 0,
        feedRate: 800,
        plungeRate: 400,
        rpm: 12000,
        pressure: 15,
        speed: 100,
        thickness: 0.5,
        color: '#000000',
        notes: ''
    };
},

editTool(tool) {
    this.editingTool = tool;
    this.toolForm = { ...tool };
},

async saveTool() {
    if (!this.authPassword) {
        this.toolsStatus = { type: 'error', message: '❌ Se requiere contraseña' };
        return;
    }

    const toolData = {
        ...this.toolForm,
        id: this.editingTool?.id || undefined,
        category: this.toolsModalTab
    };

    try {
        const response = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'saveTool',
                password: this.authPassword,
                data: toolData
            })
        });

        const result = await response.json();
        
        if (result.success) {
            await this.libraryManager.loadTools();
            this.tools = this.libraryManager.tools;
            this.toolsStatus = { type: 'success', message: '✅ Herramienta guardada' };
            this.resetToolForm();
            this.editingTool = null;
        } else {
            this.toolsStatus = { type: 'error', message: '❌ ' + result.message };
        }
    } catch (error) {
        this.toolsStatus = { type: 'error', message: '❌ Error de conexión' };
    }
},

async deleteTool(toolId) {
    if (!this.authPassword) {
        this.toolsStatus = { type: 'error', message: '❌ Se requiere contraseña' };
        return;
    }

    if (!confirm('¿Eliminar esta herramienta?')) return;

    try {
        const response = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deleteTool',
                password: this.authPassword,
                id: toolId
            })
        });

        const result = await response.json();
        
        if (result.success) {
            await this.libraryManager.loadTools();
            this.tools = this.libraryManager.tools;
            this.toolsStatus = { type: 'success', message: '✅ Herramienta eliminada' };
        } else {
            this.toolsStatus = { type: 'error', message: '❌ ' + result.message };
        }
    } catch (error) {
        this.toolsStatus = { type: 'error', message: '❌ Error de conexión' };
    }
},

getToolsByCategory(category) {
    return this.tools.filter(t => t.category === category);
},

// ====================================
// 3D VIEWER METHODS
// ====================================

switchTo3DView() {
    if (!this.gcodeGenerated) {
        console.warn('⚠️ No G-code generated yet');
        return;
    }

    console.log('🎬 Switching to 3D view');
    this.viewMode = '3d';
    this.currentTab = 'viewer';

    // Update viewer with current G-code
    if (globalGCodeViewer) {
        // Small delay to ensure canvas is visible
        setTimeout(() => {
            // Force resize to ensure proper canvas dimensions
            globalGCodeViewer.handleResize();
            this.updateViewer3D();
        }, 100);
    }
},

updateViewer3D() {
    if (!globalGCodeViewer || !this.gcode) {
        console.warn('⚠️ Cannot update 3D viewer: not initialized or no G-code');
        return;
    }

    console.log('🎬 Updating 3D viewer...');

    // Parse and visualize G-code
    globalGCodeViewer.parseGCode(this.gcode);
    globalGCodeViewer.visualize(this.viewer3DCurrentPass);

    // Update statistics
    const stats = globalGCodeViewer.getStats();
    this.viewer3DStats = {
        distance: stats.distance,
        time: stats.time,
        passes: stats.passes
    };

    // Reset animation
    this.viewer3DAnimProgress = 0;
    this.viewer3DPlaying = false;

    console.log('✅ 3D viewer updated');
},

updateViewer3DPass() {
    if (!globalGCodeViewer) return;

    console.log('🔄 Updating pass view:', this.viewer3DCurrentPass);
    globalGCodeViewer.visualize(this.viewer3DCurrentPass);
    this.stopViewer3D();
},

resetViewer3D() {
    if (!globalGCodeViewer) return;

    console.log('🔄 Resetting 3D viewer');
    globalGCodeViewer.resetCamera();
    this.viewer3DCurrentPass = 0;
    this.stopViewer3D();
},

playViewer3D() {
    if (!globalGCodeViewer || !this.gcodeGenerated) return;

    console.log('▶ Playing 3D animation');
    this.viewer3DPlaying = true;
    globalGCodeViewer.setAnimationSpeed(this.viewer3DSpeed);
    globalGCodeViewer.startAnimation();

    // Update progress periodically
    this.updateAnimationProgress();
},

pauseViewer3D() {
    if (!globalGCodeViewer) return;

    console.log('⏸ Pausing 3D animation');
    this.viewer3DPlaying = false;
    globalGCodeViewer.pauseAnimation();
},

stopViewer3D() {
    if (!globalGCodeViewer) return;

    console.log('⏹ Stopping 3D animation');
    this.viewer3DPlaying = false;
    this.viewer3DAnimProgress = 0;
    globalGCodeViewer.stopAnimation();
},

updateAnimationProgress() {
    if (!this.viewer3DPlaying || !globalGCodeViewer) return;

    this.viewer3DAnimProgress = Math.round(globalGCodeViewer.getAnimationProgress());

    if (this.viewer3DPlaying) {
        requestAnimationFrame(() => this.updateAnimationProgress());
    }
},

// Called when speed slider changes
watchViewer3DSpeed() {
    if (globalGCodeViewer) {
        globalGCodeViewer.setAnimationSpeed(this.viewer3DSpeed);
    }
},

// ====================================
// TRANSFORMATION TOOLS
// ====================================

flipHorizontal() {
    const activeObject = this.canvasManager.fabricCanvas.getActiveObject();
    if (!activeObject) {
        alert('Selecciona un elemento primero');
        return;
    }

    // Reflejar horizontalmente
    activeObject.set('flipX', !activeObject.flipX);
    this.canvasManager.fabricCanvas.renderAll();
    this.addConsoleLine('↔️ Elemento reflejado horizontalmente');
},

flipVertical() {
    const activeObject = this.canvasManager.fabricCanvas.getActiveObject();
    if (!activeObject) {
        alert('Selecciona un elemento primero');
        return;
    }

    // Reflejar verticalmente
    activeObject.set('flipY', !activeObject.flipY);
    this.canvasManager.fabricCanvas.renderAll();
    this.addConsoleLine('↕️ Elemento reflejado verticalmente');
}

    };
};

console.log('✅ GRBL Web Control Pro v3.0 - Modular version loaded');
