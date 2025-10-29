import { CanvasManager } from './canvas-manager.js';
import { GCodeGenerator } from './gcode-generator.js';
import { SerialControl } from './serial-control.js';
import { LibraryManager } from './library-manager.js';

// Alpine.js App
window.grblApp = function() {
    return {
        // State
        connected: false,
        svgLoaded: false,
        gcodeGenerated: false,
        sending: false,
        
        // Machine state
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
        
        // SVG Transform info
        svgPosition: 'X: 0, Y: 0',
        svgScale: '100%',
        svgRotation: '0°',
        
        // Work area
        workAreaSize: '400 x 400',
        
        // Operation config
        operationType: 'cnc',
        config: {
            depth: -3,
            depthStep: 1,
            toolDiameter: 3.175,
            compensation: 'center',
            feedRate: 800,
            plungeRate: 400,
            spindleRPM: 10000,
            laserPower: 80
        },
        
        // Libraries
        tools: [],
        materials: [],
        selectedTool: '',
        selectedMaterial: '',
        
        // Jog
        jogDistance: 1,
        jogSpeed: 1000,
        
        // G-code
        gcode: '',
        gcodeLines: 0,
        sendProgress: 0,
        
        // Console
        consoleLines: [],
        consoleInput: '',
        
        // Estimates
        estimates: {
            time: '--',
            distance: '--'
        },
        
        // Managers
        canvasManager: null,
        gcodeGenerator: null,
        serialControl: null,
        libraryManager: null,
        
        // Features (para futuro)
        features: {
            preview3D: null,
            arPreview: null,
            webcam: null,
            simulator: null,
            nesting: null,
            textToPath: null,
            voiceControl: null,
            heatMap: null
        },
        
        // Initialization
        init() {
            console.log('🚀 GRBL Web Control Pro v3.0');
            console.log('📦 Inicializando módulos...');
            
            // Initialize managers
            this.canvasManager = new CanvasManager(this);
            this.gcodeGenerator = new GCodeGenerator(this);
            this.serialControl = new SerialControl(this);
            this.libraryManager = new LibraryManager(this);
            
            // Setup canvas
            this.$nextTick(() => {
                this.canvasManager.init(this.$refs.canvas);
                console.log('✅ Canvas inicializado');
            });
            
            // Load libraries
            this.loadLibraries();
            
            console.log('✅ Aplicación lista!');
        },
        
        // Libraries
        async loadLibraries() {
            try {
                await this.libraryManager.loadTools();
                await this.libraryManager.loadMaterials();
                this.tools = this.libraryManager.tools;
                this.materials = this.libraryManager.materials;
                console.log('✅ Bibliotecas cargadas');
            } catch (error) {
                console.error('Error loading libraries:', error);
            }
        },
        
        applyToolSettings() {
            const tool = this.tools.find(t => t.name === this.selectedTool);
            if (tool) {
                this.config.toolDiameter = tool.diameter;
                this.config.feedRate = tool.feedRate;
                this.config.spindleRPM = tool.rpm;
                this.addConsoleLog(`✓ Herramienta aplicada: ${tool.name}`, 'success');
            }
        },
        
        applyMaterialSettings() {
            const material = this.materials.find(m => m.name === this.selectedMaterial);
            if (material) {
                this.config.depthStep = material.depthPerPass;
                this.config.feedRate = material.feedRate;
                this.config.spindleRPM = material.rpm;
                this.config.laserPower = material.laserPower;
                this.addConsoleLog(`✓ Material aplicado: ${material.name}`, 'success');
            }
        },
        
        // SVG Operations
        loadSVG() {
            this.$refs.svgInput.click();
        },
        
        async handleSVGUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                await this.canvasManager.loadSVG(file);
                this.svgLoaded = true;
                this.addConsoleLog('✓ SVG cargado correctamente', 'success');
            } catch (error) {
                this.addConsoleLog('✗ Error al cargar SVG: ' + error.message, 'error');
            }
        },
        
        // Canvas Tools
        selectTool(tool) {
            this.currentTool = tool;
            this.canvasManager.setTool(tool);
        },
        
        zoomIn() {
            this.canvasManager.zoomIn();
        },
        
        zoomOut() {
            this.canvasManager.zoomOut();
        },
        
        fitView() {
            this.canvasManager.fitView();
        },
        
        resetOrigin() {
            this.canvasManager.resetOrigin();
            this.svgPosition = 'X: 0, Y: 0';
            this.svgScale = '100%';
            this.svgRotation = '0°';
        },
        
        updateTransformInfo(transform) {
            this.svgPosition = `X: ${transform.x.toFixed(1)}, Y: ${transform.y.toFixed(1)}`;
            this.svgScale = `${(transform.scale * 100).toFixed(0)}%`;
            this.svgRotation = `${transform.rotation.toFixed(1)}°`;
        },
        
        // G-code Operations
        async generateGCode() {
            if (!this.svgLoaded) {
                this.addConsoleLog('✗ No hay SVG cargado', 'error');
                return;
            }
            
            try {
                const paths = this.canvasManager.getPaths();
                this.gcode = this.gcodeGenerator.generate(paths, this.config, this.operationType);
                this.gcodeLines = this.gcode.split('\n').filter(l => l.trim()).length;
                this.gcodeGenerated = true;
                
                // Calculate estimates
                const est = this.gcodeGenerator.calculateEstimates(this.gcode, this.config);
                this.estimates.time = this.formatTime(est.time);
                this.estimates.distance = est.distance.toFixed(2) + ' mm';
                
                this.currentTab = 'gcode';
                this.addConsoleLog(`✓ G-code generado: ${this.gcodeLines} líneas`, 'success');
            } catch (error) {
                this.addConsoleLog('✗ Error al generar G-code: ' + error.message, 'error');
            }
        },
        
        downloadGCode() {
            if (!this.gcodeGenerated) return;
            
            const blob = new Blob([this.gcode], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gcode_${Date.now()}.gcode`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.addConsoleLog('✓ G-code descargado', 'success');
        },
        
        // Serial Operations
        async toggleConnection() {
            if (this.connected) {
                await this.serialControl.disconnect();
            } else {
                try {
                    await this.serialControl.connect();
                } catch (error) {
                    this.addConsoleLog('✗ Error de conexión: ' + error.message, 'error');
                }
            }
        },
        
        onSerialConnect() {
            this.connected = true;
            this.addConsoleLog('✓ Conectado a GRBL', 'success');
        },
        
        onSerialDisconnect() {
            this.connected = false;
            this.addConsoleLog('✓ Desconectado', 'info');
        },
        
        onSerialData(data) {
            this.addConsoleLog(data, 'info');
            
            // Parse status
            const statusMatch = data.match(/<([^|]+)\|/);
            if (statusMatch) {
                this.machineState = statusMatch[1];
            }
            
            // Parse position
            const posMatch = data.match(/WPos:([-\d.]+),([-\d.]+),([-\d.]+)|MPos:([-\d.]+),([-\d.]+),([-\d.]+)/);
            if (posMatch) {
                const x = posMatch[1] || posMatch[4];
                const y = posMatch[2] || posMatch[5];
                const z = posMatch[3] || posMatch[6];
                this.position.x = parseFloat(x).toFixed(3);
                this.position.y = parseFloat(y).toFixed(3);
                this.position.z = parseFloat(z).toFixed(3);
            }
            
            // Parse overrides
            const ovMatch = data.match(/Ov:(\d+),(\d+),(\d+)/);
            if (ovMatch) {
                this.feedOverride = parseInt(ovMatch[1]);
                this.spindleOverride = parseInt(ovMatch[3]);
            }
        },
        
        sendCommand(command) {
            if (!this.connected) return;
            this.serialControl.sendCommand(command);
            this.addConsoleLog('> ' + command, 'info');
        },
        
        reset() {
            if (confirm('¿Ejecutar soft reset?')) {
                this.serialControl.reset();
            }
        },
        
        emergencyStop() {
            if (confirm('¿DETENER EMERGENCIA?')) {
                this.serialControl.emergencyStop();
                this.addConsoleLog('⚠️ EMERGENCIA - Detenido', 'error');
            }
        },
        
        async sendToGRBL() {
            if (!this.connected || !this.gcodeGenerated) return;
            
            try {
                this.sending = true;
                this.sendProgress = 0;
                this.currentTab = 'gcode';
                
                await this.serialControl.sendGCode(
                    this.gcode,
                    (progress) => {
                        this.sendProgress = progress;
                    }
                );
                
                this.addConsoleLog('✓ G-code enviado completamente', 'success');
            } catch (error) {
                this.addConsoleLog('✗ Error al enviar: ' + error.message, 'error');
            } finally {
                this.sending = false;
            }
        },
        
        // Jog
        jog(axis, distance) {
            if (!this.connected) return;
            this.serialControl.jog(axis, distance, this.jogSpeed);
        },
        
        togglePosMode() {
            this.posMode = this.posMode === 'WPos' ? 'MPos' : 'WPos';
        },
        
        // Console
        sendConsoleCommand() {
            if (!this.consoleInput.trim() || !this.connected) return;
            this.sendCommand(this.consoleInput);
            this.consoleInput = '';
        },
        
        addConsoleLog(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const line = `[${timestamp}] ${message}`;
            this.consoleLines.push(line);
            
            // Limit console lines
            if (this.consoleLines.length > 500) {
                this.consoleLines.shift();
            }
            
            // Auto scroll
            this.$nextTick(() => {
                if (this.$refs.consoleOutput) {
                    this.$refs.consoleOutput.scrollTop = this.$refs.consoleOutput.scrollHeight;
                }
            });
        },
        
        clearConsole() {
            this.consoleLines = [];
        },
        
        // Config visibility
        updateConfigVisibility() {
            // Alpine reactivity handles this automatically
        },
        
        // Modals (simple implementation)
        openModal(modalId) {
            console.log('Opening modal:', modalId);
            // TODO: Implement modals
        },
        
        // Helpers
        formatTime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${secs}s`;
            } else {
                return `${secs}s`;
            }
        },
        
        // Feature loading (para futuro)
        async loadFeature(featureName) {
            try {
                const module = await import(`./features/${featureName}.js`);
                this.features[featureName] = new module.default(this);
                await this.features[featureName].init();
                console.log(`✅ Feature loaded: ${featureName}`);
            } catch (error) {
                console.error(`Error loading feature ${featureName}:`, error);
            }
        }
    }
}
