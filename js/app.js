// ============================================
// GRBL Web Control Pro v4.0 - Main App
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
        gcodeNeedsRegeneration: false, // True cuando se cambia el origen y hay que regenerar
        sending: false,

        // Machine
        machineState: 'Idle',
        feedOverride: 100,
        spindleOverride: 100,

        // Position
        position: { x: '0.000', y: '0.000', z: '0.000' },
        posMode: 'WPos',

        // UI - Nuevo sistema de workspaces
        currentWorkspace: 'design', // 'design', 'preview', 'control'
        leftPanelCollapsed: false,
        selectedElementId: null,
        selectedElements: [], // Array de elementos seleccionados (soporta grupo)
        isGroupSelection: false, // true si hay múltiples elementos seleccionados
        showPropertiesPanel: false,

        // UI - Legacy (mantener por compatibilidad temporal)
        currentTab: 'elements',
        currentTool: 'select',
        viewMode: 'svg', // mantener para compatibilidad con código existente
        tabs: [
            { id: 'elements', name: 'Elementos', icon: '📋' },
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

        // Preview workspace variables (nuevas)
        estimatedTime: null,
        totalDistance: null,
        maxDepth: null,
        animationSpeed: 1,
        animationProgress: 0,
        show3DGrid: true,
        show3DAxes: true,

        // Serial connection
        baudRate: 115200,

        // Project Management
        projectName: 'Untitled Project',
        projectModified: false,
        lastSavedTime: null,
        autoSaveInterval: null,

        // Modal Work Area
        showWorkAreaModal: false,
        tempWorkArea: { width: 400, height: 400, origin: 'bottom-left' },

        // Modal Recovery
        showRecoveryModal: false,
        recoveryData: null,

        // Modal GRBL Settings
        showGRBLModal: false,
        grblSettings: [],
        grblSearchQuery: '',
        grblSettingsStatus: null,
        showGRBLHelpModal: false,
        currentGRBLHelp: {},

        // Modal Tools
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

        // Modal Materials
        showMaterialsModal: false,
        materialsModalTab: 'wood', // 'wood', 'plastic', 'metal'
        editingMaterial: null,
        materialForm: {
            name: '',
            thickness: 3,
            description: '',
            color: '#D2B48C',
            cncFeedRate: 1200,
            cncPlungeRate: 600,
            cncRpm: 12000,
            cncDepthPerPass: 2,
            laserCutPower: 80,
            laserCutSpeed: 300,
            laserEngravePower: 40,
            laserEngraveSpeed: 1500
        },
        materialsStatus: null,

        // Modal system
        activeModal: null,

        // Init
        async init() {
            console.log('🚀 Initializing GRBL Web Control Pro v4.0...');

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

                // Sync work area from canvas manager
                const wa = this.canvasManager.workArea;
                globalGCodeViewer.setWorkArea(wa.width, wa.height, wa.origin);

                console.log('✅ 3D Viewer inicializado');
            } else {
                console.warn('⚠️ 3D Viewer canvas not found');
            }

            // Load libraries
            this.tools = await this.libraryManager.loadTools();
            this.materials = await this.libraryManager.loadMaterials();
            console.log('✅ Libraries loaded:', this.tools.length, 'tools,', this.materials.length, 'materials');

            // Project Management: Auto-save and recovery
            this.startAutoSave();
            this.checkRecovery();
            console.log('✅ Project management initialized');

            // Watch for workspace changes to trigger resize
            this.$watch('currentWorkspace', (newWorkspace, oldWorkspace) => {
                console.log(`📐 Workspace changed: ${oldWorkspace} → ${newWorkspace}`);

                // Delay más largo para asegurar que la transición x-show termine
                setTimeout(() => {
                    if (newWorkspace === 'design' && this.canvasManager) {
                        console.log('🔄 Resizing design canvas...');
                        this.canvasManager.resize();
                    } else if (newWorkspace === 'preview' && globalGCodeViewer) {
                        console.log('🔄 Resizing 3D viewer on workspace change...');
                        globalGCodeViewer.handleResize();
                        globalGCodeViewer.forceRender();

                        // Segundo intento después de un poco más de tiempo
                        // para asegurar que el canvas esté completamente visible
                        setTimeout(() => {
                            console.log('🔄 Second resize attempt for 3D viewer...');
                            globalGCodeViewer.handleResize();
                            globalGCodeViewer.forceRender();

                            // Si hay G-code generado, actualizar el visor
                            if (this.gcodeGenerated && this.gcode) {
                                this.updateViewer3D();
                            }
                        }, 200);
                    }
                }, 100);
            });

            // Watch for sidebar collapse/expand to trigger resize
            this.$watch('leftPanelCollapsed', (collapsed) => {
                console.log(`📐 Sidebar ${collapsed ? 'collapsed' : 'expanded'}`);

                // Delay para que la animación CSS termine
                setTimeout(() => {
                    if (this.currentWorkspace === 'design' && this.canvasManager) {
                        console.log('🔄 Resizing design canvas after sidebar toggle...');
                        this.canvasManager.resize();
                    } else if (this.currentWorkspace === 'preview' && globalGCodeViewer) {
                        console.log('🔄 Resizing 3D viewer after sidebar toggle...');
                        globalGCodeViewer.handleResize();
                    }
                }, 250); // 250ms para dar tiempo a la animación de 200ms
            });

            console.log('✅ App initialized successfully!');
        },

        // Connection
        async toggleConnection() {
            if (this.connected) {
                await this.serialControl.disconnect();
                this.connected = false;
                this.addConsoleLine('🔌 Desconectado de GRBL');
            } else {
                // Pasar el baudRate seleccionado
                const result = await this.serialControl.connect(this.baudRate);
                this.connected = result;
                if (result) {
                    this.addConsoleLine(`✅ Conectado a GRBL (${this.baudRate} baud)`);
                } else {
                    this.addConsoleLine('❌ Error al conectar');
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
                // Crear el elemento ANTES de cargar el SVG
                const elementId = 'el_' + Date.now();

                const element = {
                    id: elementId,
                    type: 'svg',
                    name: file.name,
                    visible: true,
                    locked: false,
                    expanded: false,
                    showConfig: false,
                    fabricObject: null, // Se asignará después
                    config: null,
                    children: []
                };
                this.elements.push(element);

                // Cargar SVG y pasar el elementId
                const svgGroup = await this.canvasManager.loadSVG(file, elementId);

                // Actualizar el fabricObject del elemento
                element.fabricObject = svgGroup;

                this.svgLoaded = true;
                this.updateConfigStatus();
                this.markModified();
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

            // Obtener origen del área y dimensiones
            const workW = this.canvasManager.workArea.width * this.canvasManager.pixelsPerMM;
            const workH = this.canvasManager.workArea.height * this.canvasManager.pixelsPerMM;
            const originType = this.canvasManager.workArea.origin || 'bottom-left';
            const areaOriginCanvas = this.canvasManager.getOriginPosition(originType, workW, workH);

            // Convertir de coordenadas de máquina (mm) a píxeles desde el origen
            let deltaXPx, deltaYPx;

            switch(originType) {
                case 'top-left':
                    // X+ derecha, Y+ abajo
                    deltaXPx = this.svgX * this.canvasManager.pixelsPerMM;
                    deltaYPx = this.svgY * this.canvasManager.pixelsPerMM;
                    break;
                case 'top-right':
                    // X+ izquierda (invertir), Y+ abajo
                    deltaXPx = -this.svgX * this.canvasManager.pixelsPerMM;
                    deltaYPx = this.svgY * this.canvasManager.pixelsPerMM;
                    break;
                case 'bottom-left':
                    // X+ derecha, Y+ arriba (invertir Y)
                    deltaXPx = this.svgX * this.canvasManager.pixelsPerMM;
                    deltaYPx = -this.svgY * this.canvasManager.pixelsPerMM;
                    break;
                case 'bottom-right':
                    // X+ izquierda (invertir X), Y+ arriba (invertir Y)
                    deltaXPx = -this.svgX * this.canvasManager.pixelsPerMM;
                    deltaYPx = -this.svgY * this.canvasManager.pixelsPerMM;
                    break;
                case 'center':
                    // X+ derecha, Y+ arriba (invertir Y)
                    deltaXPx = this.svgX * this.canvasManager.pixelsPerMM;
                    deltaYPx = -this.svgY * this.canvasManager.pixelsPerMM;
                    break;
                default:
                    deltaXPx = this.svgX * this.canvasManager.pixelsPerMM;
                    deltaYPx = -this.svgY * this.canvasManager.pixelsPerMM;
            }

            // Calcular posición en canvas del punto de origen del objeto
            const targetCanvasX = areaOriginCanvas.x + deltaXPx;
            const targetCanvasY = areaOriginCanvas.y + deltaYPx;

            console.log('🔧 updateSVGPosition:');
            console.log('   Requested:', this.svgX, this.svgY, 'mm');
            console.log('   Origin type:', originType);
            console.log('   Area origin (canvas):', areaOriginCanvas.x, areaOriginCanvas.y);
            console.log('   Target origin point (canvas):', targetCanvasX, targetCanvasY);

            // Usar setPositionByOrigin para posicionar el objeto correctamente
            // según su punto de referencia (originX/originY)
            obj.setPositionByOrigin(
                { x: targetCanvasX, y: targetCanvasY },
                obj.originX,
                obj.originY
            );

            obj.setCoords();
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

            // Obtener coordenadas de máquina correctas según el origen configurado
            const machineCoords = this.canvasManager.getObjectMachineCoordinates(obj);
            this.svgX = machineCoords.x;
            this.svgY = machineCoords.y;
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
            allGcode += '; Generated by GRBL Web Control Pro v4.0\n';
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
            this.gcodeNeedsRegeneration = false; // Quitar el flag cuando se regenera
            this.markModified();
            this.addConsoleLine('✅ G-code generado: ' + this.gcodeLines + ' líneas');

            // Cambiar automáticamente a Preview
            setTimeout(() => {
                this.currentWorkspace = 'preview';
                this.addConsoleLine('👁️ Cambiando a vista previa...');

                // Update 3D viewer DESPUÉS de que el canvas sea visible
                // El watcher de currentWorkspace ya se encargará de resize y update
                // Pero agregamos un delay adicional para asegurar
                setTimeout(() => {
                    if (globalGCodeViewer) {
                        console.log('🎬 Final update of 3D viewer after G-code generation');
                        globalGCodeViewer.handleResize();
                        this.updateViewer3D();
                    }
                }, 400); // Delay más largo para asegurar que el canvas esté visible
            }, 100);
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
            this.tempWorkArea.origin = this.canvasManager.workArea.origin || 'bottom-left';
            this.showWorkAreaModal = true;
        },

        closeWorkAreaModal() {
            this.showWorkAreaModal = false;
        },

        applyWorkArea() {
            // Aplicar cambios en el canvas manager y obtener información sobre los cambios
            const changes = this.canvasManager.setWorkArea(
                this.tempWorkArea.width,
                this.tempWorkArea.height,
                this.tempWorkArea.origin
            );

            // Also update 3D viewer work area
            if (globalGCodeViewer) {
                globalGCodeViewer.setWorkArea(
                    this.tempWorkArea.width,
                    this.tempWorkArea.height,
                    this.tempWorkArea.origin
                );
            }

            // Si cambió el origen Y hay elementos en el canvas
            if (changes.originChanged && this.elements.length > 0) {
                console.log('🔄 Origin changed - coordenadas actualizadas');

                // Si había G-code generado, descartarlo
                if (this.gcodeGenerated) {
                    this.gcode = '';
                    this.gcodeGenerated = false;
                    this.gcodeNeedsRegeneration = true;

                    // Volver al workspace de diseño
                    if (this.currentWorkspace !== 'design') {
                        this.currentWorkspace = 'design';
                    }

                    this.addConsoleLine('⚠️ Origen cambiado - G-code descartado. Por favor regenera el G-code.');
                } else {
                    // No había G-code, pero marcar que necesita generación
                    this.gcodeNeedsRegeneration = true;
                }
            }

            this.closeWorkAreaModal();
            this.addConsoleLine(`✅ Work area set to ${this.tempWorkArea.width} x ${this.tempWorkArea.height} mm, origin: ${this.tempWorkArea.origin}`);
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
            } else if (modalId === 'tools') {
                this.openToolsModal();
            } else if (modalId === 'materials') {
                this.openMaterialsModal();
            } else if (modalId === 'globalConfig') {
                this.activeModal = 'globalConfig';
            } else {
                console.log('Opening modal:', modalId);
                alert('Modal ' + modalId + ' - En desarrollo');
            }
        },

        closeModal() {
            this.activeModal = null;
        },
        // ============================================
        // ELEMENTS SYSTEM
        // ============================================

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
            this.markModified();
            this.addConsoleLine(`🗑️ Eliminado: ${element.name}`);
        },

        duplicateElement(elementId) {
            const element = this.elements.find(e => e.id === elementId);
            if (!element) return;

            // Crear copia profunda del elemento
            const duplicate = JSON.parse(JSON.stringify(element));
            duplicate.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            duplicate.name = element.name + ' (copia)';

            // Desplazar la posición ligeramente
            if (element.fabricObject) {
                const left = element.fabricObject.left + 20;
                const top = element.fabricObject.top + 20;

                // Recrear el objeto en Fabric.js
                if (element.type === 'svg') {
                    // Para SVG, necesitamos clonar el objeto de Fabric
                    element.fabricObject.clone((cloned) => {
                        cloned.set({
                            left: left,
                            top: top
                        });
                        this.canvasManager.fabricCanvas.add(cloned);
                        duplicate.fabricObject = cloned;
                        this.elements.push(duplicate);
                        this.canvasManager.fabricCanvas.renderAll();
                        this.addConsoleLine(`📋 Duplicado: ${duplicate.name}`);
                    });
                    return;
                } else if (element.type === 'maker') {
                    // Para Maker.js, regenerar el modelo
                    this.addMakerModelToDuplicate(duplicate, left, top);
                    return;
                }
            }

            // Para otros tipos o si no hay fabricObject
            this.elements.push(duplicate);
            this.addConsoleLine(`📋 Duplicado: ${duplicate.name}`);
        },

        addMakerModelToDuplicate(duplicate, left, top) {
            // Regenerar el modelo Maker.js con los parámetros del duplicado
            const model = makerjs.model.clone(makerjs.models[duplicate.makerType], duplicate.makerParams);
            const svg = makerjs.exporter.toSVG(model);

            fabric.loadSVGFromString(svg, (objects, options) => {
                const obj = fabric.util.groupSVGElements(objects, options);
                obj.set({
                    left: left,
                    top: top,
                    stroke: '#7B6BB8',
                    strokeWidth: 2,
                    fill: 'transparent',
                    selectable: true
                });
                this.canvasManager.fabricCanvas.add(obj);
                duplicate.fabricObject = obj;
                this.elements.push(duplicate);
                this.canvasManager.fabricCanvas.renderAll();
                this.addConsoleLine(`📋 Duplicado: ${duplicate.name}`);
            });
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
                const elementId = 'el_' + Date.now();

                // Agregar ID al objeto de Fabric para poder identificarlo después
                fabricObj.set('elementId', elementId);

                // Crear el elemento ANTES de agregarlo al canvas
                const element = {
                    id: elementId,
                    type: type,
                    name: this.getDrawingName(type),
                    visible: true,
                    locked: false,
                    showConfig: false,
                    fabricObject: fabricObj,
                    config: null
                };
                this.elements.push(element);

                // Ahora agregar al canvas y seleccionar
                this.canvasManager.fabricCanvas.add(fabricObj);
                this.canvasManager.fabricCanvas.setActiveObject(fabricObj);
                this.canvasManager.fabricCanvas.renderAll();

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
                // Crear el elemento ANTES de cargar el SVG
                const elementId = 'el_' + Date.now();

                const element = {
                    id: elementId,
                    type: 'maker',
                    makerType: modelType,
                    name: modelType,
                    visible: true,
                    locked: false,
                    expanded: false,
                    showConfig: false,
                    fabricObject: null, // Se asignará después
                    config: null,
                    makerParams: params, // Parámetros específicos del modelo maker
                    children: []
                };

                this.elements.push(element);

                // Cargar SVG y pasar el elementId
                const svgGroup = await this.canvasManager.loadSVG(file, elementId);

                // IMPORTANTE: Maker.js genera SVG en "user units" (píxeles)
                // Escalar según pixelsPerMM para que coincida con milímetros reales
                const mmScale = this.canvasManager.pixelsPerMM;
                svgGroup.set({
                    scaleX: mmScale,
                    scaleY: mmScale
                });

                // Recalcular coordenadas de los controles después de escalar
                svgGroup.setCoords();
                this.canvasManager.fabricCanvas.renderAll();

                // Actualizar el fabricObject del elemento
                element.fabricObject = svgGroup;

                this.updateConfigStatus();
                this.markModified();
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

                // Aplicar transformación anterior y mantener el ID
                newSvgGroup.set({
                    elementId: element.id,
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
            if (!element) {
                console.warn('❌ Element not found:', elementId);
                return;
            }

            // Seleccionar en canvas si tiene fabricObject
            if (element.fabricObject) {
                this.canvasManager.fabricCanvas.setActiveObject(element.fabricObject);
                this.canvasManager.fabricCanvas.renderAll();
            }

            this.selectedElement = element;

            // Nuevo sistema: actualizar ID seleccionado y mostrar panel flotante
            this.selectedElementId = elementId;
            this.showPropertiesPanel = true;

            console.log('✅ Element selected:', elementId, 'Panel visible:', this.showPropertiesPanel);

            // Actualizar los inputs con los valores del elemento seleccionado
            if (element.fabricObject) {
                this.updateSVGDimensions();
            }
        },

        // ============================================
        // FUNCIONES DEL PANEL FLOTANTE DE PROPIEDADES
        // ============================================

        getSelectedElement() {
            if (this.isGroupSelection) {
                // Retornar un objeto que representa el grupo
                return {
                    id: 'temp-group',
                    name: `Grupo (${this.selectedElements.length} elementos)`,
                    type: 'group',
                    isGroup: true
                };
            }
            return this.findElementById(this.selectedElementId);
        },

        updateElementProperty(property, value) {
            const element = this.getSelectedElement();
            if (!element) return;

            element[property] = value;

            // Actualizar fabric object si existe
            if (element.fabricObject) {
                switch(property) {
                    case 'x':
                        element.fabricObject.set('left', value * this.canvasManager.pixelsPerMM);
                        break;
                    case 'y':
                        element.fabricObject.set('top', value * this.canvasManager.pixelsPerMM);
                        break;
                    case 'width':
                        const scaleX = (value * this.canvasManager.pixelsPerMM) / element.fabricObject.getScaledWidth();
                        element.fabricObject.set('scaleX', element.fabricObject.scaleX * scaleX);
                        break;
                    case 'height':
                        const scaleY = (value * this.canvasManager.pixelsPerMM) / element.fabricObject.getScaledHeight();
                        element.fabricObject.set('scaleY', element.fabricObject.scaleY * scaleY);
                        break;
                    case 'rotation':
                        element.fabricObject.set('angle', value);
                        break;
                }
                this.canvasManager.fabricCanvas.renderAll();
            }
        },

        updateElementConfig(configKey, value) {
            if (this.isGroupSelection) {
                // Actualizar todos los elementos del grupo
                this.selectedElements.forEach(element => {
                    if (element && element.config) {
                        element.config[configKey] = value;
                    }
                });
            } else {
                const element = this.getSelectedElement();
                if (!element || !element.config) return;
                element.config[configKey] = value;
            }
        },

        toggleElementConfigMode(useGlobal) {
            if (this.isGroupSelection) {
                // Aplicar a todos los elementos del grupo
                this.selectedElements.forEach(element => {
                    if (!element) return;
                    if (useGlobal) {
                        element.config = null;
                    } else {
                        element.config = { ...this.globalConfig };
                    }
                });
            } else {
                const element = this.getSelectedElement();
                if (!element) return;

                if (useGlobal) {
                    element.config = null;
                } else {
                    element.config = { ...this.globalConfig };
                }
            }
        },

        resetElementConfig() {
            if (this.isGroupSelection) {
                // Resetear config de todos los elementos del grupo
                this.selectedElements.forEach(element => {
                    if (element) {
                        element.config = null;
                    }
                });
            } else {
                const element = this.getSelectedElement();
                if (!element) return;
                element.config = null;
            }
        },

        getFilteredTools(operationType) {
            if (!operationType) return [];
            const categoryMap = {
                'cnc': 'cnc',
                'plotter': 'plotter',
                'pencil': 'pencil'
            };
            const category = categoryMap[operationType];
            return this.tools.filter(t => t.category === category);
        },

        duplicateElement(elementId) {
            const element = this.findElementById(elementId);
            if (!element) return;

            const duplicate = {
                ...element,
                id: Date.now(),
                name: element.name + ' (copia)',
                x: element.x + 10,
                y: element.y + 10,
                config: element.config ? { ...element.config } : null,
                makerParams: element.makerParams ? { ...element.makerParams } : null
            };

            // Clonar fabric object si existe
            if (element.fabricObject) {
                element.fabricObject.clone((cloned) => {
                    cloned.set({
                        left: duplicate.x * this.canvasManager.pixelsPerMM,
                        top: duplicate.y * this.canvasManager.pixelsPerMM
                    });
                    duplicate.fabricObject = cloned;
                    this.canvasManager.fabricCanvas.add(cloned);
                    this.canvasManager.fabricCanvas.renderAll();
                });
            }

            this.elements.push(duplicate);
        },

        renameElement(elementId) {
            const element = this.findElementById(elementId);
            if (!element) return;

            const newName = prompt('Nuevo nombre:', element.name);
            if (newName && newName.trim()) {
                element.name = newName.trim();
            }
        },

        toggleProportionalScale() {
            this.proportionalScale = !this.proportionalScale;
        },

        makerParamsComponent() {
            return {
                params: this.getSelectedElement()?.makerParams || {},
                updateMakerParams() {
                    const element = this.getSelectedElement();
                    if (element) {
                        element.makerParams = this.params;
                    }
                }
            };
        },

        // ============================================
        // FUNCIONES PARA PREVIEW 3D WORKSPACE
        // ============================================

        play3DAnimation() {
            if (!this.gcodeGenerated) return;
            this.viewer3DPlaying = true;
            // TODO: implementar animación
            console.log('▶️ Playing 3D animation');
        },

        pause3DAnimation() {
            this.viewer3DPlaying = false;
            console.log('⏸️ Pausing 3D animation');
        },

        stop3DAnimation() {
            this.viewer3DPlaying = false;
            this.animationProgress = 0;
            console.log('⏹️ Stopping 3D animation');
        },

        reset3DCamera() {
            if (globalGCodeViewer) {
                globalGCodeViewer.resetCamera();
            }
        },

        set3DView(viewType) {
            if (globalGCodeViewer) {
                globalGCodeViewer.setView(viewType);
            }
        },

        // ============================================
        // CONNECTION - Usar toggleConnection() en su lugar
        // ============================================

        // ============================================
        // TOOLS MODAL METHODS
        // ============================================

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
        // MATERIALS MODAL METHODS
        // ====================================

        openMaterialsModal() {
            this.showMaterialsModal = true;
            this.materialsModalTab = 'wood';
            this.materialsStatus = null;
        },

        closeMaterialsModal() {
            this.showMaterialsModal = false;
            this.editingMaterial = null;
            this.resetMaterialForm();
        },

        resetMaterialForm() {
            this.materialForm = {
                name: '',
                thickness: 3,
                description: '',
                color: '#D2B48C',
                cncFeedRate: 1200,
                cncPlungeRate: 600,
                cncRpm: 12000,
                cncDepthPerPass: 2,
                laserCutPower: 80,
                laserCutSpeed: 300,
                laserEngravePower: 40,
                laserEngraveSpeed: 1500
            };
        },

        editMaterial(material) {
            this.editingMaterial = material;
            this.materialForm = {
                name: material.name,
                thickness: material.thickness,
                description: material.description || '',
                color: material.color,
                cncFeedRate: material.cnc?.feedRate || 1200,
                cncPlungeRate: material.cnc?.plungeRate || 600,
                cncRpm: material.cnc?.rpm || 12000,
                cncDepthPerPass: material.cnc?.depthPerPass || 2,
                laserCutPower: material.laser?.cutPower || 80,
                laserCutSpeed: material.laser?.cutSpeed || 300,
                laserEngravePower: material.laser?.engravePower || 40,
                laserEngraveSpeed: material.laser?.engraveSpeed || 1500
            };
        },

        async saveMaterial() {
            if (!this.authPassword) {
                this.materialsStatus = { type: 'error', message: '❌ Se requiere contraseña' };
                return;
            }

            const materialData = {
                id: this.editingMaterial?.id || undefined,
                name: this.materialForm.name,
                category: this.materialsModalTab,
                thickness: this.materialForm.thickness,
                description: this.materialForm.description,
                color: this.materialForm.color,
                cnc: {
                    feedRate: this.materialForm.cncFeedRate,
                    plungeRate: this.materialForm.cncPlungeRate,
                    rpm: this.materialForm.cncRpm,
                    depthPerPass: this.materialForm.cncDepthPerPass
                },
                laser: {
                    cutPower: this.materialForm.laserCutPower,
                    cutSpeed: this.materialForm.laserCutSpeed,
                    engravePower: this.materialForm.laserEngravePower,
                    engraveSpeed: this.materialForm.laserEngraveSpeed
                }
            };

            try {
                const response = await fetch('backend/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'saveMaterial',
                        password: this.authPassword,
                        data: materialData
                    })
                });

                const result = await response.json();

                if (result.success) {
                    await this.libraryManager.loadMaterials();
                    this.materials = this.libraryManager.materials;
                    this.materialsStatus = { type: 'success', message: '✅ Material guardado' };
                    this.resetMaterialForm();
                    this.editingMaterial = null;
                } else {
                    this.materialsStatus = { type: 'error', message: '❌ ' + result.message };
                }
            } catch (error) {
                this.materialsStatus = { type: 'error', message: '❌ Error de conexión' };
            }
        },

        async deleteMaterial(materialId) {
            if (!this.authPassword) {
                this.materialsStatus = { type: 'error', message: '❌ Se requiere contraseña' };
                return;
            }

            if (!confirm('¿Eliminar este material?')) return;

            try {
                const response = await fetch('backend/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'deleteMaterial',
                        password: this.authPassword,
                        id: materialId
                    })
                });

                const result = await response.json();

                if (result.success) {
                    await this.libraryManager.loadMaterials();
                    this.materials = this.libraryManager.materials;
                    this.materialsStatus = { type: 'success', message: '✅ Material eliminado' };
                } else {
                    this.materialsStatus = { type: 'error', message: '❌ ' + result.message };
                }
            } catch (error) {
                this.materialsStatus = { type: 'error', message: '❌ Error de conexión' };
            }
        },

        getMaterialsByCategory(category) {
            return this.materials.filter(m => m.category === category);
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

            // Asegurar que el canvas tenga dimensiones válidas antes de actualizar
            globalGCodeViewer.handleResize();

            // Parse and visualize G-code
            globalGCodeViewer.parseGCode(this.gcode);
            globalGCodeViewer.visualize(this.viewer3DCurrentPass);

            // Force a render to ensure visibility
            globalGCodeViewer.forceRender();

            // Update statistics
            const stats = globalGCodeViewer.getStats();
            this.viewer3DStats = {
                distance: stats.distance,
                time: stats.time,
                passes: stats.passes
            };

            // Actualizar variables del preview workspace
            this.estimatedTime = stats.time;
            this.totalDistance = stats.distance;
            this.maxDepth = '3 mm'; // TODO: calcular del G-code real

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
        },

        // ====================================
        // PROJECT MANAGEMENT
        // ====================================

        /**
         * Serializa el proyecto completo a un objeto JSON
         * Estructura ampliable y versionada
         */
        serializeProject() {
            const projectData = {
                // Metadata
                version: '1.0',
                metadata: {
                    created: this.lastSavedTime || new Date().toISOString(),
                    modified: new Date().toISOString(),
                    appVersion: '4.0',
                    projectName: this.projectName
                },

                // Work Area Configuration
                workArea: {
                    width: this.canvasManager.workArea.width,
                    height: this.canvasManager.workArea.height,
                    origin: this.canvasManager.workArea.origin
                },

                // Elements - Guardar solo datos serializables
                elements: this.elements.map(el => ({
                    id: el.id,
                    type: el.type,
                    name: el.name,
                    visible: el.visible,
                    locked: el.locked,
                    config: el.config,

                    // Maker.js specific
                    makerType: el.makerType,
                    makerParams: el.makerParams,

                    // Fabric.js transform data
                    transform: el.fabricObject ? {
                        left: el.fabricObject.left,
                        top: el.fabricObject.top,
                        scaleX: el.fabricObject.scaleX,
                        scaleY: el.fabricObject.scaleY,
                        angle: el.fabricObject.angle,
                        flipX: el.fabricObject.flipX,
                        flipY: el.fabricObject.flipY,
                        width: el.fabricObject.width,
                        height: el.fabricObject.height
                    } : null,

                    // SVG data (si es SVG necesitamos guardar el contenido)
                    svgData: el.svgData || null,

                    // Children (para grupos)
                    children: el.children || []
                })),

                // Global Configuration
                globalConfig: this.globalConfig,

                // G-code
                gcode: {
                    generated: this.gcodeGenerated,
                    code: this.gcode,
                    lines: this.gcodeLines
                },

                // Tools & Materials (solo IDs y referencias)
                selectedTool: this.globalConfig.tool,
                selectedMaterial: this.globalConfig.material,

                // Extensible: Permite agregar más campos en el futuro sin romper compatibilidad
                extensions: {}
            };

            return projectData;
        },

        /**
         * Deserializa y carga un proyecto desde un objeto JSON
         */
        async deserializeProject(projectData) {
            try {
                console.log('📂 Loading project:', projectData.metadata.projectName);

                // Validar versión
                if (!projectData.version) {
                    throw new Error('Invalid project file: missing version');
                }

                // Limpiar proyecto actual
                this.elements = [];
                this.canvasManager.fabricCanvas.clear();
                this.canvasManager.setupGrid();
                this.canvasManager.setupOrigin();

                // Cargar metadata
                this.projectName = projectData.metadata.projectName || 'Untitled Project';
                this.lastSavedTime = projectData.metadata.modified;

                // Cargar Work Area
                if (projectData.workArea) {
                    this.canvasManager.setWorkArea(
                        projectData.workArea.width,
                        projectData.workArea.height,
                        projectData.workArea.origin
                    );

                    // Also sync with 3D viewer
                    if (globalGCodeViewer) {
                        globalGCodeViewer.setWorkArea(
                            projectData.workArea.width,
                            projectData.workArea.height,
                            projectData.workArea.origin
                        );
                    }
                }

                // Cargar Global Config
                if (projectData.globalConfig) {
                    this.globalConfig = { ...this.globalConfig, ...projectData.globalConfig };
                }

                // Cargar elementos
                if (projectData.elements && projectData.elements.length > 0) {
                    for (const elementData of projectData.elements) {
                        await this.recreateElement(elementData);
                    }
                }

                // Cargar G-code si existe
                if (projectData.gcode && projectData.gcode.generated) {
                    this.gcode = projectData.gcode.code;
                    this.gcodeLines = projectData.gcode.lines;
                    this.gcodeGenerated = true;
                }

                this.projectModified = false;
                this.addConsoleLine(`✅ Proyecto cargado: ${this.projectName}`);

                return true;
            } catch (error) {
                console.error('❌ Error loading project:', error);
                this.addConsoleLine(`❌ Error: ${error.message}`);
                return false;
            }
        },

        /**
         * Recrea un elemento desde datos serializados
         */
        async recreateElement(elementData) {
            // Para elementos Maker.js
            if (elementData.type === 'maker' && elementData.makerType) {
                // Recrear modelo Maker.js
                const model = this.createMakerModel(elementData.makerType, elementData.makerParams);
                const svg = makerjs.exporter.toSVG(model);
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const file = new File([blob], `${elementData.makerType}.svg`, { type: 'image/svg+xml' });

                // Cargar como SVG
                const svgGroup = await this.canvasManager.loadSVG(file, elementData.id);

                // IMPORTANTE: Maker.js genera SVG en "user units" (píxeles)
                // Escalar según pixelsPerMM para que coincida con milímetros reales
                const mmScale = this.canvasManager.pixelsPerMM;
                svgGroup.set({
                    scaleX: mmScale,
                    scaleY: mmScale
                });

                // Aplicar transform guardado (si existe)
                if (elementData.transform) {
                    // Preservar la escala de mm, pero aplicar otras transformaciones
                    svgGroup.set({
                        ...elementData.transform,
                        scaleX: (elementData.transform.scaleX || 1) * mmScale,
                        scaleY: (elementData.transform.scaleY || 1) * mmScale
                    });
                }

                // Recalcular coordenadas de los controles después de escalar
                svgGroup.setCoords();

                // Crear elemento
                const element = {
                    id: elementData.id,
                    type: 'maker',
                    makerType: elementData.makerType,
                    makerParams: elementData.makerParams,
                    name: elementData.name,
                    visible: elementData.visible,
                    locked: elementData.locked,
                    config: elementData.config,
                    fabricObject: svgGroup,
                    children: []
                };

                this.elements.push(element);
                this.canvasManager.fabricCanvas.renderAll();
            }
            // Para elementos SVG regulares
            else if (elementData.type === 'svg' && elementData.svgData) {
                // TODO: Implementar carga de SVG desde datos guardados
                console.warn('SVG loading from saved data not yet implemented');
            }
            // Otros tipos se pueden agregar aquí
        },

        /**
         * Guarda el proyecto como archivo .gmaker
         */
        saveProject() {
            const projectData = this.serializeProject();
            const jsonString = JSON.stringify(projectData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            // Crear nombre de archivo
            const fileName = `${this.projectName.replace(/[^a-z0-9]/gi, '_')}.gmaker`;

            // Descargar archivo
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            this.projectModified = false;
            this.lastSavedTime = new Date().toISOString();
            this.addConsoleLine(`💾 Proyecto guardado: ${fileName}`);

            // También guardar en localStorage como último guardado
            localStorage.setItem('grbl_last_saved_project', jsonString);
        },

        /**
         * Abre un archivo .gmaker
         */
        openProject() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.gmaker';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    const text = await file.text();
                    const projectData = JSON.parse(text);

                    const success = await this.deserializeProject(projectData);
                    if (success) {
                        // Limpiar auto-guardado
                        localStorage.removeItem('grbl_autosave');
                    }
                } catch (error) {
                    alert('Error al abrir el archivo: ' + error.message);
                }
            };

            input.click();
        },

        /**
         * Nuevo proyecto
         */
        newProject() {
            if (this.projectModified) {
                if (!confirm('¿Descartar cambios no guardados?')) {
                    return;
                }
            }

            // Limpiar todo
            this.elements = [];
            this.canvasManager.fabricCanvas.clear();
            this.canvasManager.setupGrid();
            this.canvasManager.setupOrigin();
            this.gcode = '';
            this.gcodeGenerated = false;
            this.projectName = 'Untitled Project';
            this.projectModified = false;
            this.lastSavedTime = null;

            this.addConsoleLine('📄 Nuevo proyecto creado');
        },

        /**
         * Auto-guardado en localStorage
         */
        autoSave() {
            if (!this.projectModified) return;

            try {
                const projectData = this.serializeProject();
                const jsonString = JSON.stringify(projectData);
                localStorage.setItem('grbl_autosave', jsonString);
                localStorage.setItem('grbl_autosave_timestamp', new Date().toISOString());
                console.log('💾 Auto-guardado realizado');
            } catch (error) {
                console.error('❌ Error en auto-guardado:', error);
            }
        },

        /**
         * Inicia el auto-guardado periódico
         */
        startAutoSave() {
            // Auto-guardar cada 2 minutos
            this.autoSaveInterval = setInterval(() => {
                this.autoSave();
            }, 120000); // 2 minutos
        },

        /**
         * Verifica si hay datos de recuperación al iniciar
         */
        checkRecovery() {
            const autosaveData = localStorage.getItem('grbl_autosave');
            const lastSaved = localStorage.getItem('grbl_last_saved_project');
            const timestamp = localStorage.getItem('grbl_autosave_timestamp');

            if (autosaveData && timestamp) {
                // Verificar si el auto-guardado es diferente al último guardado manualmente
                if (autosaveData !== lastSaved) {
                    try {
                        this.recoveryData = JSON.parse(autosaveData);
                        this.showRecoveryModal = true;

                        const date = new Date(timestamp);
                        console.log('🔄 Datos de recuperación encontrados desde:', date.toLocaleString());
                    } catch (error) {
                        console.error('❌ Error al parsear datos de recuperación:', error);
                        localStorage.removeItem('grbl_autosave');
                    }
                }
            }
        },

        /**
         * Recupera el proyecto desde auto-guardado
         */
        async recoverProject() {
            if (!this.recoveryData) return;

            const success = await this.deserializeProject(this.recoveryData);
            if (success) {
                this.projectModified = true;
                this.showRecoveryModal = false;
                this.addConsoleLine('🔄 Proyecto recuperado desde auto-guardado');

                // Preguntar si quiere guardar
                setTimeout(() => {
                    if (confirm('¿Deseas guardar el proyecto recuperado?')) {
                        this.saveProject();
                    }
                }, 500);
            }
        },

        /**
         * Descarta la recuperación
         */
        discardRecovery() {
            localStorage.removeItem('grbl_autosave');
            localStorage.removeItem('grbl_autosave_timestamp');
            this.recoveryData = null;
            this.showRecoveryModal = false;
            this.addConsoleLine('❌ Recuperación descartada');
        },

        /**
         * Marca el proyecto como modificado
         */
        markModified() {
            this.projectModified = true;
        },

        // ====================================
        // TESTING & DEBUGGING
        // ====================================

        /**
         * Añade un cuadrado de prueba en posición conocida
         * Para verificar que las coordenadas del G-code coincidan con el diseño
         *
         * IMPORTANTE: El objeto usa el mismo origen configurado en el área de trabajo.
         * - Si origen = 'bottom-left' → objeto con originX:'left', originY:'bottom'
         * - Si origen = 'center' → objeto con originX:'center', originY:'center'
         * - etc.
         *
         * Esto hace que (10,10) en G-code sea exactamente (10,10) desde el origen,
         * sin importar qué origen esté configurado.
         */
        async addTestSquare() {
            console.log('🧪 Añadiendo cuadrado de prueba...');

            // Crear cuadrado 50x50mm usando Maker.js
            const params = {
                width: 50,  // 50mm de ancho
                height: 50  // 50mm de alto
            };

            try {
                // Crear modelo Maker.js
                const model = new makerjs.models.Rectangle(params.width, params.height);
                const svg = makerjs.exporter.toSVG(model);

                // DEBUG: Ver el SVG generado
                console.log('🔍 SVG generado por Maker.js:');
                console.log(svg);

                // Crear blob y file
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const file = new File([blob], 'test_square_50x50.svg', { type: 'image/svg+xml' });

                // Generar ID único
                const elementId = 'test_square_' + Date.now();

                // Crear elemento
                const element = {
                    id: elementId,
                    type: 'maker',
                    makerType: 'Rectangle',
                    name: 'TEST: Cuadrado 50x50mm @ (10, 10)',
                    visible: true,
                    locked: false,
                    expanded: false,
                    showConfig: false,
                    fabricObject: null,
                    config: null,
                    makerParams: params,
                    children: []
                };

                this.elements.push(element);

                // Cargar SVG en el canvas (ya tiene el origen configurado)
                const svgGroup = await this.canvasManager.loadSVG(file, elementId);

                // IMPORTANTE: Maker.js genera SVG en "user units" (píxeles por defecto)
                // Necesitamos escalar según pixelsPerMM para que coincida con milímetros
                const mmScale = this.canvasManager.pixelsPerMM;
                console.log('🔧 Escalando objeto de Maker.js: pixelsPerMM =', mmScale.toFixed(2));
                svgGroup.set({
                    scaleX: mmScale,
                    scaleY: mmScale
                });

                // IMPORTANTE: Recalcular coordenadas de los controles después de escalar
                svgGroup.setCoords();

                // Calcular dimensiones del área de trabajo
                const workW = this.canvasManager.workArea.width * this.canvasManager.pixelsPerMM;
                const workH = this.canvasManager.workArea.height * this.canvasManager.pixelsPerMM;
                const centerX = this.canvasManager.fabricCanvas.width / 2;
                const centerY = this.canvasManager.fabricCanvas.height / 2;

                // Calcular origen del G-code en canvas según configuración
                const origin = this.canvasManager.workArea.origin || 'bottom-left';
                let gcodeOriginX, gcodeOriginY;

                switch (origin) {
                    case 'bottom-left':
                        gcodeOriginX = centerX - workW / 2;
                        gcodeOriginY = centerY + workH / 2;
                        break;
                    case 'bottom-center':
                        gcodeOriginX = centerX;
                        gcodeOriginY = centerY + workH / 2;
                        break;
                    case 'bottom-right':
                        gcodeOriginX = centerX + workW / 2;
                        gcodeOriginY = centerY + workH / 2;
                        break;
                    case 'center-left':
                        gcodeOriginX = centerX - workW / 2;
                        gcodeOriginY = centerY;
                        break;
                    case 'center':
                        gcodeOriginX = centerX;
                        gcodeOriginY = centerY;
                        break;
                    case 'center-right':
                        gcodeOriginX = centerX + workW / 2;
                        gcodeOriginY = centerY;
                        break;
                    case 'top-left':
                        gcodeOriginX = centerX - workW / 2;
                        gcodeOriginY = centerY - workH / 2;
                        break;
                    case 'top-center':
                        gcodeOriginX = centerX;
                        gcodeOriginY = centerY - workH / 2;
                        break;
                    case 'top-right':
                        gcodeOriginX = centerX + workW / 2;
                        gcodeOriginY = centerY - workH / 2;
                        break;
                    default:
                        gcodeOriginX = centerX - workW / 2;
                        gcodeOriginY = centerY + workH / 2;
                }

                // Posición deseada en G-code: (10, 10) mm desde el origen
                const targetGcodeX = 10;
                const targetGcodeY = 10;

                // Convertir de coordenadas G-code a coordenadas canvas
                // G-code: X aumenta derecha, Y aumenta arriba
                // Canvas: X aumenta derecha, Y aumenta abajo
                //
                // Para bottom-left (origen más común en CNC):
                // - gcodeOriginX es el borde izquierdo
                // - gcodeOriginY es el borde inferior (Y máxima en canvas)
                // - Un punto en (10, 10) G-code está:
                //   - 10mm a la derecha del origen: gcodeOriginX + 10*pxPerMM
                //   - 10mm arriba del origen: gcodeOriginY - 10*pxPerMM (porque Y canvas va abajo)

                // Calcular la posición objetivo en canvas
                const targetCanvasX = gcodeOriginX + (targetGcodeX * this.canvasManager.pixelsPerMM);
                const targetCanvasY = gcodeOriginY - (targetGcodeY * this.canvasManager.pixelsPerMM);

                // IMPORTANTE: Obtener el origen del objeto (debe coincidir con el del área)
                const objectOrigin = this.canvasManager.getObjectOriginFromWorkArea();

                console.log('📍 Posicionando objeto:');
                console.log('   Area origin:', origin);
                console.log('   Object origin:', objectOrigin.originX, objectOrigin.originY);
                console.log('   Target G-code coords:', targetGcodeX, targetGcodeY, 'mm');
                console.log('   Target canvas coords:', targetCanvasX.toFixed(1), targetCanvasY.toFixed(1), 'px');

                // Usar setPositionByOrigin para posicionar correctamente según el origen del objeto
                // Esto maneja correctamente las transformaciones y el escalado
                svgGroup.setPositionByOrigin(
                    new fabric.Point(targetCanvasX, targetCanvasY),
                    objectOrigin.originX,
                    objectOrigin.originY
                );

                // Recalcular coordenadas de los controles después de posicionar
                svgGroup.setCoords();

                // Log del tamaño real del objeto para debug
                const realWidthPx = svgGroup.width * svgGroup.scaleX;
                const realHeightPx = svgGroup.height * svgGroup.scaleY;
                const realWidthMm = realWidthPx / this.canvasManager.pixelsPerMM;
                const realHeightMm = realHeightPx / this.canvasManager.pixelsPerMM;
                console.log('📏 Objeto creado:');
                console.log('   Dimensiones SVG (user units):', svgGroup.width, 'x', svgGroup.height);
                console.log('   Escala aplicada:', svgGroup.scaleX.toFixed(2));
                console.log('   Dimensiones escaladas (px):', realWidthPx.toFixed(1), 'x', realHeightPx.toFixed(1));
                console.log('   Dimensiones en mm:', realWidthMm.toFixed(1), 'x', realHeightMm.toFixed(1));

                element.fabricObject = svgGroup;

                this.updateConfigStatus();
                this.markModified();
                this.canvasManager.fabricCanvas.renderAll();

                this.addConsoleLine('🧪 TEST: Cuadrado 50x50mm añadido');
                this.addConsoleLine('   Origen configurado: ' + origin);
                this.addConsoleLine('   Posición objetivo (G-code): X' + targetGcodeX + '-' + (targetGcodeX + params.width) + ', Y' + targetGcodeY + '-' + (targetGcodeY + params.height));
                this.addConsoleLine('   Canvas pos: left=' + canvasLeft.toFixed(1) + ', top=' + canvasTop.toFixed(1));
                this.addConsoleLine('   Origen canvas: (' + gcodeOriginX.toFixed(1) + ', ' + gcodeOriginY.toFixed(1) + ')');
                this.addConsoleLine('💡 El objeto tiene origen "' + svgGroup.originX + '-' + svgGroup.originY + '" (igual que el área)');
                this.addConsoleLine('💡 Genera G-code y verifica que las coordenadas coincidan');

                // Actualizar dimensiones
                this.updateSVGDimensions();

            } catch (error) {
                console.error('❌ Error añadiendo cuadrado de prueba:', error);
                this.addConsoleLine('❌ Error: ' + error.message);
            }
        }

    };
};

console.log('✅ GRBL Web Control Pro v4.0 - Modular version loaded');
