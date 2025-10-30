// ============================================
// GRBL Web Control Pro v3.0 - Main App
// ============================================


// ============================================
// ALPINE.JS APP
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
        svgWidth: 0,
        svgHeight: 0,
        proportionalScale: true,

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

        // Init
        async init() {
            console.log('🚀 Initializing GRBL Web Control Pro v3.5...');

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
            if (!this.svgLoaded || !this.canvasManager.svgGroup) return;

            const obj = this.canvasManager.svgGroup;
            const targetWidthPx = this.svgWidth * this.canvasManager.pixelsPerMM;
            const newScaleX = targetWidthPx / obj.width;

            if (this.proportionalScale) {
                // Escala proporcional
                obj.set({
                    scaleX: newScaleX,
                    scaleY: newScaleX
                });
                this.svgHeight = Math.round((obj.height * newScaleX) / this.canvasManager.pixelsPerMM);
            } else {
                // Solo ancho
                obj.set('scaleX', newScaleX);
            }

            this.canvasManager.fabricCanvas.renderAll();
            this.updateTransformInfo({
                x: obj.left,
                y: obj.top,
                scale: (obj.scaleX + obj.scaleY) / 2,
                                     rotation: obj.angle
            });
        },

        updateSVGHeight() {
            if (!this.svgLoaded || !this.canvasManager.svgGroup) return;

            const obj = this.canvasManager.svgGroup;
            const targetHeightPx = this.svgHeight * this.canvasManager.pixelsPerMM;
            const newScaleY = targetHeightPx / obj.height;

            if (this.proportionalScale) {
                // Escala proporcional
                obj.set({
                    scaleX: newScaleY,
                    scaleY: newScaleY
                });
                this.svgWidth = Math.round((obj.width * newScaleY) / this.canvasManager.pixelsPerMM);
            } else {
                // Solo alto
                obj.set('scaleY', newScaleY);
            }

            this.canvasManager.fabricCanvas.renderAll();
            this.updateTransformInfo({
                x: obj.left,
                y: obj.top,
                scale: (obj.scaleX + obj.scaleY) / 2,
                                     rotation: obj.angle
            });
        },

        updateSVGDimensions() {
            // Actualizar dimensiones cuando cambia el SVG
            if (!this.canvasManager.svgGroup) return;

            const obj = this.canvasManager.svgGroup;
            this.svgWidth = Math.round((obj.width * obj.scaleX) / this.canvasManager.pixelsPerMM);
            this.svgHeight = Math.round((obj.height * obj.scaleY) / this.canvasManager.pixelsPerMM);
        },

        // G-code
        generateGCode() {
            if (!this.svgLoaded) {
                alert('Carga un SVG primero');
                return;
            }

            const paths = this.canvasManager.getPaths();
            this.gcode = this.gcodeGenerator.generate(paths, this.config, this.operationType);
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
        }
    };
};

console.log('✅ GRBL Web Control Pro v3.0 - Modular version loaded');
