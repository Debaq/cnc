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
            { id: 'elements', name: 'Elementos', icon: '📋' },
            //{ id: 'config', name: 'Config', icon: '⚙️' },
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
            feedRate: 800,
            plungeRate: 400,
            spindleRPM: 10000,
            laserPower: 80,
            passes: 1,
            depth: -3,
            depthStep: 1,
            toolDiameter: 3.175,
            compensation: 'center'
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
                const svgGroup = await this.canvasManager.loadSVG(file);
                this.svgLoaded = true;
                this.addSVGAsElement(file, svgGroup);
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

            switch(type) {
                case 'rect':
                    fabricObj = new fabric.Rect({
                        left: centerX - 25,
                        top: centerY - 25,
                        width: 50,
                        height: 50,
                        fill: 'transparent',
                        stroke: '#2D1B69',
                        strokeWidth: 2
                    });
                    break;
                case 'circle':
                    fabricObj = new fabric.Circle({
                        left: centerX - 25,
                        top: centerY - 25,
                        radius: 25,
                        fill: 'transparent',
                        stroke: '#2D1B69',
                        strokeWidth: 2
                    });
                    break;
                case 'line':
                    fabricObj = new fabric.Line([centerX - 50, centerY, centerX + 50, centerY], {
                        stroke: '#2D1B69',
                        strokeWidth: 2
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
                    fabricObject: fabricObj,
                    config: null
                };
                this.elements.push(element);
                this.addConsoleLine(`✅ Agregado: ${element.name}`);
            }
        },

        getDrawingName(type) {
            const counts = this.elements.filter(e => e.type === type).length;
            const names = { rect: 'Rectángulo', circle: 'Círculo', line: 'Línea', text: 'Texto' };
            return `${names[type] || type} ${counts + 1}`;
        },

    };
};

console.log('✅ GRBL Web Control Pro v3.0 - Modular version loaded');
