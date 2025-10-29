import { SVGLoader } from './svg-loader.js';
import { GCodeGenerator } from './gcode-generator.js';
import { SerialControl } from './serial-control.js';
import { UIManager } from './ui-manager.js';
import { LibraryManager } from './library-manager.js';

class GRBLWebControlApp {
    constructor() {
        this.svgLoader = new SVGLoader();
        this.gcodeGenerator = new GCodeGenerator();
        this.serialControl = new SerialControl();
        this.uiManager = new UIManager();
        this.libraryManager = new LibraryManager();
        
        this.currentGCode = '';
        this.config = {
            operationType: 'cut',
            depth: -3,
            depthStep: 1,
            feedRate: 800,
            plungeRate: 400,
            spindleRPM: 10000,
            laserPower: 80,
            toolCompensation: 'center',
            toolDiameter: 3.175,
            workAreaWidth: 400,
            workAreaHeight: 400
        };

        this.init();
    }

    async init() {
        // Load libraries
        await this.libraryManager.loadAll();
        
        // Setup UI
        this.setupEventListeners();
        this.updateConfigVisibility();
        
        // Initialize SVG loader with canvas
        this.svgLoader.init(document.getElementById('workspaceCanvas'), this.config);
        
        // Load tool and material options
        this.populateToolOptions();
        this.populateMaterialOptions();
        
        // Setup serial callbacks
        this.setupSerialCallbacks();
        
        console.log('GRBL Web Control Pro initialized');
    }

    setupEventListeners() {
        // File operations
        document.getElementById('loadSvgBtn').addEventListener('click', () => {
            document.getElementById('svgInput').click();
        });
        document.getElementById('svgInput').addEventListener('change', (e) => this.handleSVGUpload(e));
        document.getElementById('generateGcodeBtn').addEventListener('click', () => this.generateGCode());
        document.getElementById('downloadGcodeBtn').addEventListener('click', () => this.downloadGCode());

        // Serial connection
        document.getElementById('connectBtn').addEventListener('click', () => this.connectSerial());
        
        // Quick controls
        document.getElementById('homeBtn')?.addEventListener('click', () => this.serialControl.sendCommand('$H'));
        document.getElementById('unlockBtn')?.addEventListener('click', () => this.serialControl.sendCommand('$X'));
        document.getElementById('resetBtn')?.addEventListener('click', () => this.serialControl.reset());
        document.getElementById('stopBtn')?.addEventListener('click', () => this.serialControl.stop());

        // G-code sending
        document.getElementById('sendGcodeBtn').addEventListener('click', () => this.sendGCodeToGRBL());

        // Configuration changes
        document.getElementById('operationType').addEventListener('change', (e) => {
            this.config.operationType = e.target.value;
            this.updateConfigVisibility();
        });

        // Configuration inputs
        ['depth', 'depthStep', 'feedRate', 'plungeRate', 'spindleRPM', 'laserPower', 
         'toolCompensation', 'toolDiameter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.config[id] = parseFloat(e.target.value) || e.target.value;
                });
            }
        });

        // Tool and material selection
        document.getElementById('toolSelect').addEventListener('change', (e) => this.onToolSelected(e.target.value));
        document.getElementById('materialSelect').addEventListener('change', (e) => this.onMaterialSelected(e.target.value));

        // Canvas tools
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.onCanvasToolSelected(e.target));
        });

        // Canvas controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.svgLoader.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.svgLoader.zoomOut());
        document.getElementById('fitViewBtn').addEventListener('click', () => this.svgLoader.fitView());
        document.getElementById('resetOriginBtn').addEventListener('click', () => this.svgLoader.resetOrigin());
        document.getElementById('editWorkAreaBtn').addEventListener('click', () => this.uiManager.openModal('workAreaModal'));

        // Work area modal
        document.getElementById('saveWorkAreaBtn').addEventListener('click', () => this.saveWorkArea());
        document.getElementById('cancelWorkAreaBtn').addEventListener('click', () => this.uiManager.closeModal('workAreaModal'));

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Jog controls
        this.setupJogControls();

        // Console
        document.getElementById('sendCommandBtn').addEventListener('click', () => this.sendManualCommand());
        document.getElementById('consoleInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendManualCommand();
        });
        document.getElementById('clearConsoleBtn').addEventListener('click', () => {
            document.getElementById('consoleOutput').innerHTML = '';
        });

        // Workspace controls
        document.getElementById('workspaceSelect')?.addEventListener('change', (e) => {
            this.serialControl.sendCommand(e.target.value);
        });
        document.getElementById('setWorkZeroBtn')?.addEventListener('click', () => {
            this.serialControl.sendCommand('G92 X0 Y0 Z0');
        });
        document.getElementById('clearWorkZeroBtn')?.addEventListener('click', () => {
            this.serialControl.sendCommand('G92.1');
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => this.openGRBLSettings());
        document.getElementById('refreshSettingsBtn').addEventListener('click', () => this.refreshGRBLSettings());
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.uiManager.closeModal('grblSettingsModal');
        });

        // Library modals
        document.getElementById('toolsLibraryBtn').addEventListener('click', () => this.openToolsLibrary());
        document.getElementById('materialsLibraryBtn').addEventListener('click', () => this.openMaterialsLibrary());
        document.getElementById('newToolBtn').addEventListener('click', () => this.uiManager.openModal('toolEditorModal'));
        document.getElementById('newMaterialBtn').addEventListener('click', () => this.uiManager.openModal('materialEditorModal'));
        document.getElementById('addToolBtn').addEventListener('click', () => this.openToolEditor());
        document.getElementById('addMaterialBtn').addEventListener('click', () => this.openMaterialEditor());
        document.getElementById('saveToolBtn').addEventListener('click', () => this.saveTool());
        document.getElementById('saveMaterialBtn').addEventListener('click', () => this.saveMaterial());
        document.getElementById('cancelToolBtn').addEventListener('click', () => {
            this.uiManager.closeModal('toolEditorModal');
        });
        document.getElementById('cancelMaterialBtn').addEventListener('click', () => {
            this.uiManager.closeModal('materialEditorModal');
        });
        document.getElementById('closeToolsLibraryBtn').addEventListener('click', () => {
            this.uiManager.closeModal('toolLibraryModal');
        });
        document.getElementById('closeMaterialsLibraryBtn').addEventListener('click', () => {
            this.uiManager.closeModal('materialLibraryModal');
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.uiManager.closeModal(modal.id);
            });
        });

        // Password modal
        document.getElementById('submitPasswordBtn').addEventListener('click', () => this.submitPassword());
        document.getElementById('cancelPasswordBtn').addEventListener('click', () => {
            this.uiManager.closeModal('passwordModal');
            this.pendingPasswordAction = null;
        });

        // Position mode toggle
        document.getElementById('togglePosMode')?.addEventListener('click', (e) => {
            this.positionMode = this.positionMode === 'WPos' ? 'MPos' : 'WPos';
            e.target.textContent = this.positionMode;
        });
    }

    setupJogControls() {
        // Distance buttons
        document.querySelectorAll('.btn-distance').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-distance').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.jogDistance = parseFloat(e.target.dataset.distance);
            });
        });
        this.jogDistance = 1;

        // Speed slider
        const speedSlider = document.getElementById('jogSpeed');
        const speedValue = document.getElementById('jogSpeedValue');
        speedSlider.addEventListener('input', (e) => {
            speedValue.textContent = e.target.value;
            this.jogSpeed = parseInt(e.target.value);
        });
        this.jogSpeed = 1000;

        // Jog buttons
        document.querySelectorAll('.jog-btn[data-axis]').forEach(btn => {
            btn.addEventListener('click', () => {
                const axis = btn.dataset.axis;
                const dir = parseInt(btn.dataset.dir);
                const distance = this.jogDistance * dir;
                this.serialControl.jog(axis, distance, this.jogSpeed);
            });
        });

        document.querySelectorAll('.jog-btn-z[data-axis]').forEach(btn => {
            btn.addEventListener('click', () => {
                const axis = btn.dataset.axis;
                const dir = parseInt(btn.dataset.dir);
                const distance = this.jogDistance * dir;
                this.serialControl.jog(axis, distance, this.jogSpeed);
            });
        });

        // Other jog actions
        document.getElementById('jogHomeBtn')?.addEventListener('click', () => {
            this.serialControl.sendCommand('$H');
        });
        document.getElementById('goToOriginBtn')?.addEventListener('click', () => {
            this.serialControl.sendCommand('G0 X0 Y0 Z0');
        });
        document.getElementById('probeZBtn')?.addEventListener('click', () => {
            this.serialControl.sendCommand('G38.2 Z-20 F100');
        });
    }

    setupSerialCallbacks() {
        this.serialControl.onConnect = () => this.handleSerialConnect();
        this.serialControl.onDisconnect = () => this.handleSerialDisconnect();
        this.serialControl.onData = (data) => this.handleSerialData(data);
        this.serialControl.onProgress = (progress, current, total) => {
            this.updateProgress(progress, current, total);
        };
    }

    updateConfigVisibility() {
        const cncElements = document.querySelectorAll('.cnc-only');
        const laserElements = document.querySelectorAll('.laser-only');
        
        if (this.config.operationType === 'laser') {
            cncElements.forEach(el => el.style.display = 'none');
            laserElements.forEach(el => el.style.display = 'block');
        } else {
            cncElements.forEach(el => el.style.display = 'block');
            laserElements.forEach(el => el.style.display = 'none');
        }
    }

    async handleSVGUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            await this.svgLoader.loadSVG(file);
            document.getElementById('generateGcodeBtn').disabled = false;
            this.addToConsole('✓ SVG cargado correctamente', 'success');
        } catch (error) {
            this.addToConsole('✗ Error al cargar SVG: ' + error.message, 'error');
        }
    }

    generateGCode() {
        const paths = this.svgLoader.getTransformedPaths();
        
        if (paths.length === 0) {
            this.addToConsole('✗ No hay paths en el SVG', 'error');
            return;
        }

        try {
            this.currentGCode = this.gcodeGenerator.generate(paths, this.config);
            document.getElementById('gcodeOutput').value = this.currentGCode;
            document.getElementById('downloadGcodeBtn').disabled = false;
            document.getElementById('sendGcodeBtn').disabled = this.serialControl.isConnected ? false : true;
            
            // Update stats
            const lines = this.currentGCode.split('\n').filter(l => l.trim()).length;
            document.getElementById('gcodeLines').textContent = `${lines} líneas`;
            
            // Calculate estimates
            const estimates = this.gcodeGenerator.calculateEstimates(this.currentGCode, this.config);
            document.getElementById('estimatedTime').textContent = this.formatTime(estimates.time);
            document.getElementById('totalDistance').textContent = `${estimates.distance.toFixed(2)} mm`;
            
            this.addToConsole(`✓ G-code generado: ${lines} líneas`, 'success');
            
            // Switch to gcode tab
            this.switchTab('gcode');
        } catch (error) {
            this.addToConsole('✗ Error al generar G-code: ' + error.message, 'error');
            console.error(error);
        }
    }

    downloadGCode() {
        if (!this.currentGCode) return;

        const blob = new Blob([this.currentGCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gcode_${Date.now()}.gcode`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addToConsole('✓ G-code descargado', 'success');
    }

    async connectSerial() {
        const baudRate = parseInt(document.getElementById('baudRate').value);
        try {
            await this.serialControl.connect(baudRate);
        } catch (error) {
            this.addToConsole('✗ Error de conexión: ' + error.message, 'error');
        }
    }

    handleSerialConnect() {
        document.getElementById('connectBtn').textContent = 'Desconectar';
        document.getElementById('connectBtn').classList.remove('btn-primary');
        document.getElementById('connectBtn').classList.add('btn-danger');
        document.getElementById('connectBtn').onclick = () => this.serialControl.disconnect();
        
        document.getElementById('statusDot').classList.add('connected');
        document.getElementById('statusText').textContent = 'Conectado';
        
        // Enable controls
        document.querySelectorAll('#machineStatePanel, #positionPanel, #quickControlsPanel, #workspacePanel').forEach(el => {
            el.style.display = 'block';
        });
        
        document.getElementById('consoleInput').disabled = false;
        document.getElementById('sendCommandBtn').disabled = false;
        
        if (this.currentGCode) {
            document.getElementById('sendGcodeBtn').disabled = false;
        }
        
        this.addToConsole('✓ Conectado a GRBL', 'success');
        
        // Request initial status
        setTimeout(() => {
            this.serialControl.getStatus();
            this.serialControl.getSettings();
        }, 1000);
    }

    handleSerialDisconnect() {
        document.getElementById('connectBtn').textContent = 'Conectar';
        document.getElementById('connectBtn').classList.remove('btn-danger');
        document.getElementById('connectBtn').classList.add('btn-primary');
        document.getElementById('connectBtn').onclick = () => this.connectSerial();
        
        document.getElementById('statusDot').classList.remove('connected');
        document.getElementById('statusText').textContent = 'Desconectado';
        
        // Disable controls
        document.querySelectorAll('#machineStatePanel, #positionPanel, #quickControlsPanel, #workspacePanel').forEach(el => {
            el.style.display = 'none';
        });
        
        document.getElementById('consoleInput').disabled = true;
        document.getElementById('sendCommandBtn').disabled = true;
        document.getElementById('sendGcodeBtn').disabled = true;
        
        this.addToConsole('✓ Desconectado', 'info');
    }

    handleSerialData(data) {
        this.addToConsole(data, 'info');
        
        // Parse status report
        const statusMatch = data.match(/<([^|]+)\|/);
        if (statusMatch) {
            document.getElementById('machineState').textContent = statusMatch[1];
        }
        
        // Parse position (WPos or MPos)
        const posMatch = data.match(/WPos:([-\d.]+),([-\d.]+),([-\d.]+)|MPos:([-\d.]+),([-\d.]+),([-\d.]+)/);
        if (posMatch) {
            const x = posMatch[1] || posMatch[4];
            const y = posMatch[2] || posMatch[5];
            const z = posMatch[3] || posMatch[6];
            document.getElementById('posX').textContent = parseFloat(x).toFixed(3);
            document.getElementById('posY').textContent = parseFloat(y).toFixed(3);
            document.getElementById('posZ').textContent = parseFloat(z).toFixed(3);
        }
        
        // Parse overrides
        const ovMatch = data.match(/Ov:(\d+),(\d+),(\d+)/);
        if (ovMatch) {
            document.getElementById('feedOverride').textContent = ovMatch[1] + '%';
            document.getElementById('spindleOverride').textContent = ovMatch[3] + '%';
        }
    }

    async sendGCodeToGRBL() {
        if (!this.currentGCode) {
            this.addToConsole('✗ No hay G-code para enviar', 'error');
            return;
        }

        try {
            await this.serialControl.sendGCode(this.currentGCode);
            this.addToConsole('✓ Enviando G-code...', 'success');
            document.getElementById('gcodeProgress').style.display = 'block';
            this.switchTab('gcode');
        } catch (error) {
            this.addToConsole('✗ Error al enviar: ' + error.message, 'error');
        }
    }

    updateProgress(progress, current, total) {
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressText').textContent = `${progress.toFixed(1)}% (${current}/${total})`;
        
        if (progress >= 100) {
            setTimeout(() => {
                document.getElementById('gcodeProgress').style.display = 'none';
            }, 3000);
        }
    }

    sendManualCommand() {
        const input = document.getElementById('consoleInput');
        const command = input.value.trim();
        
        if (command) {
            this.serialControl.sendCommand(command);
            this.addToConsole('> ' + command, 'command');
            input.value = '';
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });
    }

    onCanvasToolSelected(btn) {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tool = btn.id.replace('Tool', '');
        this.svgLoader.setTool(tool);
    }

    saveWorkArea() {
        this.config.workAreaWidth = parseFloat(document.getElementById('workAreaWidth').value);
        this.config.workAreaHeight = parseFloat(document.getElementById('workAreaHeight').value);
        
        document.getElementById('workAreaSize').textContent = 
            `${this.config.workAreaWidth} x ${this.config.workAreaHeight} mm`;
        
        this.svgLoader.updateWorkArea(this.config.workAreaWidth, this.config.workAreaHeight);
        this.uiManager.closeModal('workAreaModal');
    }

    populateToolOptions() {
        const select = document.getElementById('toolSelect');
        select.innerHTML = '<option value="">Seleccionar herramienta...</option>';
        
        this.libraryManager.tools.forEach((tool, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${tool.name} (${tool.diameter}mm)`;
            select.appendChild(option);
        });
    }

    populateMaterialOptions() {
        const select = document.getElementById('materialSelect');
        select.innerHTML = '<option value="">Seleccionar material...</option>';
        
        this.libraryManager.materials.forEach((material, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${material.name} (${material.thickness}mm)`;
            select.appendChild(option);
        });
    }

    onToolSelected(index) {
        if (!index) return;
        
        const tool = this.libraryManager.tools[index];
        document.getElementById('toolDiameter').value = tool.diameter;
        document.getElementById('feedRate').value = tool.feedRate;
        document.getElementById('spindleRPM').value = tool.rpm;
        
        this.config.toolDiameter = tool.diameter;
        this.config.feedRate = tool.feedRate;
        this.config.spindleRPM = tool.rpm;
    }

    onMaterialSelected(index) {
        if (!index) return;
        
        const material = this.libraryManager.materials[index];
        document.getElementById('depthStep').value = material.depthPerPass;
        document.getElementById('feedRate').value = material.feedRate;
        document.getElementById('spindleRPM').value = material.rpm;
        document.getElementById('laserPower').value = material.laserPower;
        
        this.config.depthStep = material.depthPerPass;
        this.config.feedRate = material.feedRate;
        this.config.spindleRPM = material.rpm;
        this.config.laserPower = material.laserPower;
    }

    async openGRBLSettings() {
        this.uiManager.openModal('grblSettingsModal');
        if (this.serialControl.isConnected) {
            await this.refreshGRBLSettings();
        }
    }

    async refreshGRBLSettings() {
        if (!this.serialControl.isConnected) return;
        
        this.serialControl.getSettings();
        // Settings will be displayed via handleSerialData
    }

    openToolsLibrary() {
        this.uiManager.openModal('toolLibraryModal');
        this.renderToolsList();
    }

    openMaterialsLibrary() {
        this.uiManager.openModal('materialLibraryModal');
        this.renderMaterialsList();
    }

    renderToolsList() {
        const list = document.getElementById('toolsList');
        list.innerHTML = '';
        
        this.libraryManager.tools.forEach((tool, index) => {
            const item = document.createElement('div');
            item.className = 'library-item';
            item.innerHTML = `
                <div class="library-item-info">
                    <h4>${tool.name}</h4>
                    <p>${tool.type} - Ø${tool.diameter}mm - ${tool.flutes} flautas - ${tool.material}</p>
                    <p>Feed: ${tool.feedRate} mm/min - RPM: ${tool.rpm}</p>
                </div>
                <div class="library-item-actions">
                    <button class="btn-small btn-danger" onclick="app.deleteTool(${index})">Eliminar</button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    renderMaterialsList() {
        const list = document.getElementById('materialsList');
        list.innerHTML = '';
        
        this.libraryManager.materials.forEach((material, index) => {
            const item = document.createElement('div');
            item.className = 'library-item';
            item.innerHTML = `
                <div class="library-item-info">
                    <h4>${material.name}</h4>
                    <p>${material.type} - ${material.thickness}mm espesor</p>
                    <p>Profundidad/pasada: ${material.depthPerPass}mm - Feed: ${material.feedRate} mm/min</p>
                    <p>Láser: ${material.laserPower}% @ ${material.laserSpeed} mm/min</p>
                </div>
                <div class="library-item-actions">
                    <button class="btn-small btn-danger" onclick="app.deleteMaterial(${index})">Eliminar</button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    openToolEditor(tool = null) {
        this.currentEditingTool = tool;
        
        if (tool) {
            document.getElementById('toolEditorTitle').textContent = 'Editar Herramienta';
            document.getElementById('toolName').value = tool.name;
            document.getElementById('toolType').value = tool.type;
            document.getElementById('toolDiameterEdit').value = tool.diameter;
            document.getElementById('toolFlutes').value = tool.flutes;
            document.getElementById('toolMaterial').value = tool.material;
            document.getElementById('toolFeedRate').value = tool.feedRate;
            document.getElementById('toolRPM').value = tool.rpm;
        } else {
            document.getElementById('toolEditorTitle').textContent = 'Nueva Herramienta';
            document.getElementById('toolName').value = '';
            document.getElementById('toolDiameterEdit').value = 3.175;
            document.getElementById('toolFlutes').value = 2;
            document.getElementById('toolFeedRate').value = 800;
            document.getElementById('toolRPM').value = 10000;
        }
        
        this.uiManager.openModal('toolEditorModal');
    }

    openMaterialEditor(material = null) {
        this.currentEditingMaterial = material;
        
        if (material) {
            document.getElementById('materialEditorTitle').textContent = 'Editar Material';
            document.getElementById('materialName').value = material.name;
            document.getElementById('materialType').value = material.type;
            document.getElementById('materialThickness').value = material.thickness;
            document.getElementById('materialDepthPerPass').value = material.depthPerPass;
            document.getElementById('materialFeedRate').value = material.feedRate;
            document.getElementById('materialRPM').value = material.rpm;
            document.getElementById('materialLaserPower').value = material.laserPower;
            document.getElementById('materialLaserSpeed').value = material.laserSpeed;
        } else {
            document.getElementById('materialEditorTitle').textContent = 'Nuevo Material';
            document.getElementById('materialName').value = '';
            document.getElementById('materialThickness').value = 3;
            document.getElementById('materialDepthPerPass').value = 1;
            document.getElementById('materialFeedRate').value = 800;
            document.getElementById('materialRPM').value = 10000;
            document.getElementById('materialLaserPower').value = 60;
            document.getElementById('materialLaserSpeed').value = 1000;
        }
        
        this.uiManager.openModal('materialEditorModal');
    }

    async saveTool() {
        const tool = {
            name: document.getElementById('toolName').value,
            type: document.getElementById('toolType').value,
            diameter: parseFloat(document.getElementById('toolDiameterEdit').value),
            flutes: parseInt(document.getElementById('toolFlutes').value),
            material: document.getElementById('toolMaterial').value,
            feedRate: parseFloat(document.getElementById('toolFeedRate').value),
            rpm: parseInt(document.getElementById('toolRPM').value)
        };
        
        this.pendingPasswordAction = async (password) => {
            try {
                await this.libraryManager.saveTool(tool, password);
                this.populateToolOptions();
                this.uiManager.closeModal('toolEditorModal');
                this.addToConsole('✓ Herramienta guardada', 'success');
            } catch (error) {
                this.addToConsole('✗ Error: ' + error.message, 'error');
            }
        };
        
        this.uiManager.openModal('passwordModal');
    }

    async saveMaterial() {
        const material = {
            name: document.getElementById('materialName').value,
            type: document.getElementById('materialType').value,
            thickness: parseFloat(document.getElementById('materialThickness').value),
            depthPerPass: parseFloat(document.getElementById('materialDepthPerPass').value),
            feedRate: parseFloat(document.getElementById('materialFeedRate').value),
            rpm: parseInt(document.getElementById('materialRPM').value),
            laserPower: parseInt(document.getElementById('materialLaserPower').value),
            laserSpeed: parseFloat(document.getElementById('materialLaserSpeed').value)
        };
        
        this.pendingPasswordAction = async (password) => {
            try {
                await this.libraryManager.saveMaterial(material, password);
                this.populateMaterialOptions();
                this.uiManager.closeModal('materialEditorModal');
                this.addToConsole('✓ Material guardado', 'success');
            } catch (error) {
                this.addToConsole('✗ Error: ' + error.message, 'error');
            }
        };
        
        this.uiManager.openModal('passwordModal');
    }

    async submitPassword() {
        const password = document.getElementById('passwordInput').value;
        
        if (this.pendingPasswordAction) {
            await this.pendingPasswordAction(password);
            this.pendingPasswordAction = null;
        }
        
        document.getElementById('passwordInput').value = '';
        this.uiManager.closeModal('passwordModal');
    }

    async deleteTool(index) {
        if (!confirm('¿Eliminar esta herramienta?')) return;
        
        this.pendingPasswordAction = async (password) => {
            try {
                await this.libraryManager.deleteTool(index, password);
                this.populateToolOptions();
                this.renderToolsList();
                this.addToConsole('✓ Herramienta eliminada', 'success');
            } catch (error) {
                this.addToConsole('✗ Error: ' + error.message, 'error');
            }
        };
        
        this.uiManager.openModal('passwordModal');
    }

    async deleteMaterial(index) {
        if (!confirm('¿Eliminar este material?')) return;
        
        this.pendingPasswordAction = async (password) => {
            try {
                await this.libraryManager.deleteMaterial(index, password);
                this.populateMaterialOptions();
                this.renderMaterialsList();
                this.addToConsole('✓ Material eliminado', 'success');
            } catch (error) {
                this.addToConsole('✗ Error: ' + error.message, 'error');
            }
        };
        
        this.uiManager.openModal('passwordModal');
    }

    addToConsole(message, type = 'info') {
        const consoleOutput = document.getElementById('consoleOutput');
        const timestamp = new Date().toLocaleTimeString();
        const colorMap = {
            success: '#00FF00',
            error: '#FF5555',
            info: '#FFFFFF',
            command: '#FFFF00'
        };
        
        const line = document.createElement('div');
        line.style.color = colorMap[type] || colorMap.info;
        line.textContent = `[${timestamp}] ${message}`;
        
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GRBLWebControlApp();
});
