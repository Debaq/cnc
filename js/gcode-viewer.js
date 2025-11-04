// ============================================
// G-CODE 3D VIEWER - THREE.JS IMPLEMENTATION
// ============================================
class GCodeViewer {
    constructor(canvas) {
        this.canvas = canvas;

        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // ViewCube components
        this.viewCubeScene = null;
        this.viewCubeCamera = null;
        this.viewCube = null;

        // Work area configuration (should match canvas-manager)
        this.workArea = { width: 400, height: 400, origin: 'bottom-left' };

        // G-code data
        this.gcode = '';
        this.commands = [];
        this.passes = [];
        this.currentPass = 0;

        // Visualization
        this.pathLines = [];
        this.toolMarker = null;

        // Animation
        this.animationFrame = 0;
        this.animationPlaying = false;
        this.animationSpeed = 1.0;
        this.animationRequestId = null;

        // Statistics
        this.stats = {
            distance: 0,
            time: 0,
            passes: 0,
            rapidMoves: 0,
            cutMoves: 0
        };

        console.log('🎬 GCodeViewer initialized');
    }

    // ====================================
    // INITIALIZATION
    // ====================================
    init() {
        if (!this.canvas) {
            console.error('❌ Canvas not found');
            return false;
        }

        console.log('🎬 Initializing Three.js scene...');
        this.initScene();
        return true;
    }

    initScene() {
        console.log('🎬 Creating Three.js scene...');

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0); // Light gray background for modern look

        // Camera
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
        // Position camera directly above (top view) for easier debugging
        // Looking at center of 400x400 work area (200, 0, 200)
        this.camera.position.set(200, 600, 200);
        this.camera.lookAt(200, 0, 200); // Look at center of work area

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 2000;
        console.log('✅ OrbitControls initialized');

        // Lights - adjusted for light background
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(200, 300, 200);
        this.scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-200, -100, -200);
        this.scene.add(directionalLight2);

        // Grid, axes and origin marker
        this.createGrid();
        this.createAxes();
        this.createOriginMarker();

        // ViewCube for navigation
        this.createViewCube();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // ResizeObserver para detectar cambios en el contenedor del canvas
        // Esto es crucial para detectar cuando se colapsa el panel lateral o cambia el workspace
        if (typeof ResizeObserver !== 'undefined') {
            const parent = this.canvas.parentElement;
            if (parent) {
                let resizeTimeout;
                this.resizeObserver = new ResizeObserver((entries) => {
                    for (let entry of entries) {
                        const newWidth = entry.contentRect.width;
                        const newHeight = entry.contentRect.height;

                        // Solo redimensionar si el contenedor tiene dimensiones válidas
                        if (newWidth > 0 && newHeight > 0) {
                            // Usar debounce para evitar múltiples resize
                            clearTimeout(resizeTimeout);
                            resizeTimeout = setTimeout(() => {
                                this.handleResize();
                            }, 100);
                        }
                    }
                });
                this.resizeObserver.observe(parent);
                console.log('✅ ResizeObserver attached to 3D viewer container');
            }
        }

        // Start render loop
        this.animate();

        console.log('✅ Three.js scene initialized');
    }

    // ====================================
    // GRID AND AXES
    // ====================================
    createGrid() {
        // Work area grid dimensions from configuration
        const sizeX = this.workArea.width;
        const sizeY = this.workArea.height;
        const maxSize = Math.max(sizeX, sizeY);
        const divisions = Math.floor(maxSize / 20); // 20mm grid spacing

        // For rectangular areas, use a plane with grid instead of GridHelper
        // Grid in XZ plane (CNC XY plane)
        const gridHelper = new THREE.GridHelper(maxSize, divisions, 0x999999, 0xcccccc);

        // Position grid based on origin configuration
        // For now, always position at center (we'll adjust the marker position instead)
        gridHelper.position.set(sizeX / 2, 0, sizeY / 2);
        this.scene.add(gridHelper);

        // Work area border at Y=0 (CNC Z=0)
        const borderGeometry = new THREE.EdgesGeometry(
            new THREE.PlaneGeometry(sizeX, sizeY)
        );
        const borderMaterial = new THREE.LineBasicMaterial({ color: 0x6666ff, linewidth: 2 });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        border.rotation.x = -Math.PI / 2; // Rotate to XZ plane
        border.position.set(sizeX / 2, 0, sizeY / 2); // Position at center of work area
        this.scene.add(border);

        console.log(`✅ Grid created: ${sizeX}x${sizeY}mm`);
    }

    createAxes() {
        // Axes removed - using only the origin marker instead
        // The origin marker shows the axis directions at the configured origin point
    }

    createOriginMarker() {
        // Remove existing origin marker if any
        if (this.originMarker) {
            this.scene.remove(this.originMarker);
            if (this.originMarker.geometry) this.originMarker.geometry.dispose();
            if (this.originMarker.material) this.originMarker.material.dispose();
        }

        // Calculate origin position based on workArea.origin
        const sizeX = this.workArea.width;
        const sizeY = this.workArea.height;
        let originX, originZ; // In Three.js coordinates (X, Z plane is CNC X, Y plane)

        const origin = this.workArea.origin || 'bottom-left';

        // Map origin position in Three.js coordinates
        // IMPORTANT: Z axis is inverted (workArea.height - Y) to match bottom-left origin
        // So "bottom" in CNC terms is at Z=sizeY in Three.js, "top" is at Z=0
        switch (origin) {
            case 'bottom-left':
                originX = 0;
                originZ = sizeY; // Bottom in CNC = high Z in Three.js
                break;
            case 'bottom-center':
                originX = sizeX / 2;
                originZ = sizeY;
                break;
            case 'bottom-right':
                originX = sizeX;
                originZ = sizeY;
                break;
            case 'center-left':
                originX = 0;
                originZ = sizeY / 2;
                break;
            case 'center':
                originX = sizeX / 2;
                originZ = sizeY / 2;
                break;
            case 'center-right':
                originX = sizeX;
                originZ = sizeY / 2;
                break;
            case 'top-left':
                originX = 0;
                originZ = 0; // Top in CNC = low Z in Three.js
                break;
            case 'top-center':
                originX = sizeX / 2;
                originZ = 0;
                break;
            case 'top-right':
                originX = sizeX;
                originZ = 0;
                break;
            default:
                originX = 0;
                originZ = sizeY; // Default to bottom-left
        }

        // Create origin marker group
        const markerGroup = new THREE.Group();

        // Create small axes at origin position (30mm length)
        const axisLength = 30;

        // X axis (red)
        const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        const xAxisMat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
        const xAxis = new THREE.Line(xAxisGeom, xAxisMat);
        markerGroup.add(xAxis);

        // Z axis (blue, up)
        const zAxisGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        const zAxisMat = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 });
        const zAxis = new THREE.Line(zAxisGeom, zAxisMat);
        markerGroup.add(zAxis);

        // Y axis (green) - inverted to match coordinate system
        // In CNC: Y+ goes from bottom to top
        // In Three.js with inverted Z: this means -Z direction
        const yAxisGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -axisLength) // Negative Z = positive Y in CNC
        ]);
        const yAxisMat = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
        const yAxis = new THREE.Line(yAxisGeom, yAxisMat);
        markerGroup.add(yAxis);

        // Add origin dot
        const dotGeom = new THREE.SphereGeometry(2, 16, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const dot = new THREE.Mesh(dotGeom, dotMat);
        markerGroup.add(dot);

        // Position the marker group at the calculated origin
        markerGroup.position.set(originX, 0, originZ);

        this.scene.add(markerGroup);
        this.originMarker = markerGroup;

        console.log(`✅ Origin marker created at (${originX}, 0, ${originZ}) for origin: ${origin}`);
    }

    // ====================================
    // VIEW CUBE
    // ====================================
    createViewCube() {
        console.log('🎲 Creating ViewCube...');

        // Create separate scene for ViewCube
        this.viewCubeScene = new THREE.Scene();

        // Create orthographic camera for ViewCube
        this.viewCubeCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
        this.viewCubeCamera.position.set(0, 0, 5);
        this.viewCubeCamera.lookAt(0, 0, 0);

        // Create cube geometry
        const geometry = new THREE.BoxGeometry(2, 2, 2);

        // Create materials for each face with labels
        const materials = [
            this.createCubeFaceMaterial('RIGHT', 0xff6b6b),  // +X (red)
            this.createCubeFaceMaterial('LEFT', 0xff9999),   // -X (light red)
            this.createCubeFaceMaterial('TOP', 0x6b8cff),    // +Y (blue)
            this.createCubeFaceMaterial('BOTTOM', 0x99b3ff), // -Y (light blue)
            this.createCubeFaceMaterial('FRONT', 0x6bff6b),  // +Z (green)
            this.createCubeFaceMaterial('BACK', 0x99ff99)    // -Z (light green)
        ];

        this.viewCube = new THREE.Mesh(geometry, materials);
        this.viewCubeScene.add(this.viewCube);

        // Add ambient light to ViewCube scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.viewCubeScene.add(ambientLight);

        // Add click interaction
        this.setupViewCubeInteraction();

        console.log('✅ ViewCube created');
    }

    createCubeFaceMaterial(label, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');

        // Background
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.fillRect(0, 0, 256, 256);

        // Border
        context.strokeStyle = '#ffffff';
        context.lineWidth = 8;
        context.strokeRect(4, 4, 248, 248);

        // Text
        context.fillStyle = '#ffffff';
        context.font = 'Bold 36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(label, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        return new THREE.MeshBasicMaterial({ map: texture });
    }

    setupViewCubeInteraction() {
        // Store face directions for camera positioning
        this.viewCubeFaces = {
            'RIGHT': { position: [600, 200, 200], name: 'Right' },
            'LEFT': { position: [-200, 200, 200], name: 'Left' },
            'TOP': { position: [200, 600, 200], name: 'Top' },
            'BOTTOM': { position: [200, -200, 200], name: 'Bottom' },
            'FRONT': { position: [200, 200, 600], name: 'Front' },
            'BACK': { position: [200, 200, -200], name: 'Back' }
        };

        // Add click event listener to canvas
        this.canvas.addEventListener('click', (event) => this.handleViewCubeClick(event));
    }

    handleViewCubeClick(event) {
        // Check if click is in ViewCube area (top-right corner, 100x100px)
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const cubeSize = 100;
        const cubeX = this.canvas.clientWidth - cubeSize - 10;
        const cubeY = 10;

        if (x >= cubeX && x <= cubeX + cubeSize && y >= cubeY && y <= cubeY + cubeSize) {
            // Convert click position to ViewCube viewport coordinates (-1 to +1)
            const localX = ((x - cubeX) / cubeSize) * 2 - 1;
            const localY = -((y - cubeY) / cubeSize) * 2 + 1; // Invert Y

            // Create raycaster for the ViewCube scene
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(localX, localY), this.viewCubeCamera);

            // Intersect with the ViewCube
            const intersects = raycaster.intersectObject(this.viewCube);

            if (intersects.length > 0) {
                // Get the face index that was clicked
                const faceIndex = intersects[0].faceIndex;

                // BoxGeometry has 12 triangular faces (2 per cube face)
                // Map triangle face indices to cube face names
                const cubeFaceIndex = Math.floor(faceIndex / 2);
                const faceNames = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];
                const faceName = faceNames[cubeFaceIndex];

                console.log(`🎲 ViewCube clicked: ${faceName}`);

                if (this.viewCubeFaces[faceName]) {
                    this.setView(faceName);
                }
            }
        }
    }

    setView(faceName) {
        const face = this.viewCubeFaces[faceName];
        if (!face) return;

        console.log(`📐 Setting view to: ${face.name}`);

        // Animate camera to new position
        const targetPos = new THREE.Vector3(...face.position);
        const targetLookAt = new THREE.Vector3(200, 0, 200); // Center of work area

        // Set camera position and look at
        this.camera.position.copy(targetPos);
        this.camera.lookAt(targetLookAt);

        if (this.controls) {
            this.controls.target.copy(targetLookAt);
            this.controls.update();
        }
    }

    updateViewCube() {
        if (!this.viewCube || !this.camera) return;

        // The ViewCube should rotate with the camera but inverted
        // so it shows which face we're looking at
        const quaternion = this.camera.quaternion.clone();
        quaternion.invert(); // Invert the rotation
        this.viewCube.quaternion.copy(quaternion);
    }

    renderViewCube() {
        if (!this.viewCubeScene || !this.viewCubeCamera) return;

        // Update ViewCube rotation
        this.updateViewCube();

        // Save current state
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        // Render main scene
        this.renderer.render(this.scene, this.camera);

        // Set viewport for ViewCube (top-right corner, 100x100px)
        const cubeSize = 100;
        this.renderer.setViewport(width - cubeSize - 10, 10, cubeSize, cubeSize);
        this.renderer.setScissor(width - cubeSize - 10, 10, cubeSize, cubeSize);
        this.renderer.setScissorTest(true);
        this.renderer.render(this.viewCubeScene, this.viewCubeCamera);

        // Reset viewport
        this.renderer.setViewport(0, 0, width, height);
        this.renderer.setScissorTest(false);
    }

    // ====================================
    // G-CODE PARSING
    // ====================================
    parseGCode(gcode) {
        console.log('🔍 Parsing G-code...');

        this.gcode = gcode;
        this.commands = [];
        this.passes = [];

        const lines = gcode.split('\n');
        // Initial position in Three.js coordinates (Y=up, Z=forward)
        // This corresponds to G-code position X=0, Y=0, Z=5 (safe height)
        // Note: Z is inverted, so G-code Y=0 → Three.js Z=workArea.height
        let currentPosition = { x: 0, y: 5, z: this.workArea.height };
        let currentPass = -1;
        let passCommands = [];

        lines.forEach((line, index) => {
            // Remove comments and trim
            const cleanLine = line.split(';')[0].trim();
            if (!cleanLine) return;

            // Detect pass markers
            if (line.includes('PASS')) {
                if (passCommands.length > 0) {
                    this.passes.push([...passCommands]);
                }
                currentPass++;
                passCommands = [];
            }

            // Parse command
            const command = this.parseCommand(cleanLine, currentPosition);
            if (command) {
                this.commands.push(command);
                passCommands.push(command);
                currentPosition = { ...command.end };
            }
        });

        // Add last pass
        if (passCommands.length > 0) {
            this.passes.push(passCommands);
        }

        // If no passes detected, treat all as one pass
        if (this.passes.length === 0) {
            this.passes.push([...this.commands]);
        }

        console.log(`✅ Parsed ${this.commands.length} commands in ${this.passes.length} passes`);

        // Calculate statistics
        this.calculateStats();
    }

    parseCommand(line, currentPos) {
        const command = {
            raw: line,
            type: null,
            start: { ...currentPos },
            end: { ...currentPos },
            feedRate: null
        };

        // Extract command type
        if (line.startsWith('G0') || line.startsWith('G00')) {
            command.type = 'G0'; // Rapid move
        } else if (line.startsWith('G1') || line.startsWith('G01')) {
            command.type = 'G1'; // Linear move (cutting)
        } else if (line.startsWith('M3')) {
            command.type = 'M3'; // Spindle/Laser on
        } else if (line.startsWith('M5')) {
            command.type = 'M5'; // Spindle/Laser off
        } else {
            command.type = 'OTHER';
        }

        // Extract coordinates from G-code
        const xMatch = line.match(/X(-?\d+\.?\d*)/);
        const yMatch = line.match(/Y(-?\d+\.?\d*)/);
        const zMatch = line.match(/Z(-?\d+\.?\d*)/);
        const fMatch = line.match(/F(\d+\.?\d*)/);

        // Convert CNC coordinates to Three.js coordinates
        // G-code: X=right, Y=depth (from bottom-left origin), Z=up
        // Three.js: X=right, Y=up, Z=forward
        //
        // IMPORTANT: Invert Z axis to match bottom-left origin orientation
        // When viewing from TOP in Three.js, we see the XZ plane
        // Z+ should go down in screen (toward bottom) to match Y+ in CNC coords
        if (xMatch) command.end.x = parseFloat(xMatch[1]);
        if (yMatch) command.end.z = this.workArea.height - parseFloat(yMatch[1]); // CNC Y becomes Three.js Z (inverted)
        if (zMatch) command.end.y = parseFloat(zMatch[1]); // CNC Z becomes Three.js Y
        if (fMatch) command.feedRate = parseFloat(fMatch[1]);

        return command;
    }

    // ====================================
    // VISUALIZATION
    // ====================================
    visualize(passIndex = null) {
        console.log('🎨 Visualizing G-code...', passIndex !== null ? `Pass ${passIndex}` : 'All passes');

        if (!this.scene) {
            console.error('❌ Cannot visualize: Scene not initialized');
            return;
        }

        // Clear existing paths
        this.clearPaths();

        // Determine which commands to visualize
        let commandsToShow = [];
        if (passIndex === null || passIndex === 0) {
            // Show all passes
            commandsToShow = this.commands;
            this.currentPass = 0;
        } else {
            // Show specific pass
            commandsToShow = this.passes[passIndex - 1] || [];
            this.currentPass = passIndex;
        }

        // Create visualization
        this.createPathLines(commandsToShow);
        this.createToolMarker(commandsToShow);

        // Center camera on work
        this.centerCamera();

        console.log('✅ Visualization complete');
    }

    createPathLines(commands) {
        const rapidMaterial = new THREE.LineBasicMaterial({
            color: 0x4488ff,
            linewidth: 1,
            opacity: 0.5,
            transparent: true
        });

        const cutMaterial = new THREE.LineBasicMaterial({
            color: 0xff4444,
            linewidth: 2
        });

        let rapidPoints = [];
        let cutPoints = [];

        commands.forEach(cmd => {
            if (cmd.type === 'G0') {
                // Rapid move
                if (cutPoints.length > 0) {
                    this.addLineToScene(cutPoints, cutMaterial);
                    cutPoints = [];
                }
                rapidPoints.push(new THREE.Vector3(cmd.start.x, cmd.start.y, cmd.start.z));
                rapidPoints.push(new THREE.Vector3(cmd.end.x, cmd.end.y, cmd.end.z));
            } else if (cmd.type === 'G1') {
                // Cut move
                if (rapidPoints.length > 0) {
                    this.addLineToScene(rapidPoints, rapidMaterial);
                    rapidPoints = [];
                }
                if (cutPoints.length === 0) {
                    cutPoints.push(new THREE.Vector3(cmd.start.x, cmd.start.y, cmd.start.z));
                }
                cutPoints.push(new THREE.Vector3(cmd.end.x, cmd.end.y, cmd.end.z));
            }
        });

        // Add remaining points
        if (rapidPoints.length > 0) {
            this.addLineToScene(rapidPoints, rapidMaterial);
        }
        if (cutPoints.length > 0) {
            this.addLineToScene(cutPoints, cutMaterial);
        }
    }

    addLineToScene(points, material) {
        if (!this.scene) {
            console.error('❌ Scene not initialized');
            return;
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.pathLines.push(line);
    }

    createToolMarker(commands) {
        // Remove existing marker
        if (this.toolMarker) {
            this.scene.remove(this.toolMarker);
        }

        // Create tool marker (thin cone pointing down)
        const geometry = new THREE.ConeGeometry(1.5, 8, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffdd44,
            emissive: 0xffaa00,
            emissiveIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.4
        });
        this.toolMarker = new THREE.Mesh(geometry, material);

        // Rotate cone to point down (negative Y in Three.js = down in CNC)
        this.toolMarker.rotation.x = Math.PI; // Flip 180 degrees

        // Position at start
        if (commands.length > 0) {
            const startPos = commands[0].start;
            this.toolMarker.position.set(startPos.x, startPos.y, startPos.z);
        }

        this.scene.add(this.toolMarker);
    }

    clearPaths() {
        this.pathLines.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
            this.scene.remove(line);
        });
        this.pathLines = [];
    }

    // ====================================
    // ANIMATION
    // ====================================
    startAnimation() {
        if (this.animationPlaying) return;

        console.log('▶ Starting animation');
        this.animationPlaying = true;
        this.animateToolPath();
    }

    pauseAnimation() {
        console.log('⏸ Pausing animation');
        this.animationPlaying = false;
        if (this.animationRequestId) {
            cancelAnimationFrame(this.animationRequestId);
            this.animationRequestId = null;
        }
    }

    stopAnimation() {
        console.log('⏹ Stopping animation');
        this.pauseAnimation();
        this.animationFrame = 0;

        // Reset tool to start position
        if (this.commands.length > 0 && this.toolMarker) {
            const startPos = this.commands[0].start;
            this.toolMarker.position.set(startPos.x, startPos.y, startPos.z);
        }
    }

    animateToolPath() {
        if (!this.animationPlaying) return;

        const commandsToAnimate = this.currentPass === 0
            ? this.commands
            : (this.passes[this.currentPass - 1] || []);

        if (this.animationFrame < commandsToAnimate.length) {
            const cmd = commandsToAnimate[this.animationFrame];

            if (this.toolMarker && (cmd.type === 'G0' || cmd.type === 'G1')) {
                this.toolMarker.position.set(cmd.end.x, cmd.end.y, cmd.end.z);
            }

            this.animationFrame += Math.max(1, Math.floor(this.animationSpeed * 2));

            // Schedule next frame
            const delay = Math.max(10, 50 / this.animationSpeed);
            setTimeout(() => {
                this.animationRequestId = requestAnimationFrame(() => this.animateToolPath());
            }, delay);
        } else {
            // Animation complete
            this.pauseAnimation();
            this.animationFrame = 0;
        }
    }

    getAnimationProgress() {
        const commandsToAnimate = this.currentPass === 0
            ? this.commands
            : (this.passes[this.currentPass - 1] || []);

        if (commandsToAnimate.length === 0) return 0;
        return Math.min(100, (this.animationFrame / commandsToAnimate.length) * 100);
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    // ====================================
    // CAMERA CONTROLS
    // ====================================
    centerCamera() {
        // Calculate bounding box of all commands (already in Three.js coordinates)
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        this.commands.forEach(cmd => {
            minX = Math.min(minX, cmd.start.x, cmd.end.x);
            maxX = Math.max(maxX, cmd.start.x, cmd.end.x);
            minY = Math.min(minY, cmd.start.y, cmd.end.y);
            maxY = Math.max(maxY, cmd.start.y, cmd.end.y);
            minZ = Math.min(minZ, cmd.start.z, cmd.end.z);
            maxZ = Math.max(maxZ, cmd.start.z, cmd.end.z);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);

        // Position camera directly above (top view) - Y is up in Three.js
        const distance = Math.max(maxSize * 1.5, 400); // Minimum distance for good view
        this.camera.position.set(
            centerX,              // X centered
            distance,             // Y offset (up) - directly above
            centerZ               // Z centered
        );
        this.camera.lookAt(centerX, centerY, centerZ);

        if (this.controls) {
            this.controls.target.set(centerX, centerY, centerZ);
            this.controls.update();
        }
    }

    resetCamera() {
        // Reset to default top view
        this.camera.position.set(200, 600, 200);
        this.camera.lookAt(200, 0, 200); // Look at center of 400x400 work area
        if (this.controls) {
            this.controls.target.set(200, 0, 200);
            this.controls.update();
        }
    }

    // ====================================
    // STATISTICS
    // ====================================
    calculateStats() {
        this.stats.distance = 0;
        this.stats.time = 0;
        this.stats.passes = this.passes.length;
        this.stats.rapidMoves = 0;
        this.stats.cutMoves = 0;

        this.commands.forEach(cmd => {
            if (cmd.type === 'G0' || cmd.type === 'G1') {
                const dx = cmd.end.x - cmd.start.x;
                const dy = cmd.end.y - cmd.start.y;
                const dz = cmd.end.z - cmd.start.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                this.stats.distance += distance;

                if (cmd.feedRate && cmd.feedRate > 0) {
                    this.stats.time += (distance / cmd.feedRate) * 60; // seconds
                }

                if (cmd.type === 'G0') {
                    this.stats.rapidMoves++;
                } else {
                    this.stats.cutMoves++;
                }
            }
        });
    }

    getStats() {
        return {
            distance: this.stats.distance.toFixed(2) + ' mm',
            time: this.formatTime(this.stats.time),
            passes: this.stats.passes,
            rapidMoves: this.stats.rapidMoves,
            cutMoves: this.stats.cutMoves
        };
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return seconds.toFixed(0) + 's';
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}m ${secs}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    // ====================================
    // RENDER LOOP
    // ====================================
    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        // Render main scene and ViewCube
        this.renderViewCube();
    }

    // Force a render (useful when canvas becomes visible)
    forceRender() {
        if (!this.renderer || !this.scene || !this.camera) {
            console.warn('⚠️ Cannot force render: renderer not initialized');
            return;
        }

        console.log('🎨 Forcing render...');
        this.renderViewCube();
    }

    handleResize() {
        if (!this.canvas || !this.camera || !this.renderer) {
            console.warn('⚠️ Cannot resize: viewer not fully initialized');
            return;
        }

        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        console.log(`📐 3D Viewer resize: ${width}x${height}`);

        // No redimensionar si el canvas no es visible o tiene dimensiones inválidas
        if (width <= 0 || height <= 0) {
            console.warn(`⚠️ Cannot resize 3D viewer: invalid dimensions ${width}x${height}`);
            return;
        }

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        // Force a render after resize
        this.forceRender();

        console.log('✅ 3D Viewer resized successfully');
    }

    // ====================================
    // WORK AREA CONFIGURATION
    // ====================================
    setWorkArea(width, height, origin = 'bottom-left') {
        console.log(`📐 Setting work area: ${width}x${height}mm, origin: ${origin}`);

        this.workArea.width = width;
        this.workArea.height = height;
        this.workArea.origin = origin;

        // If scene is already initialized, recreate grid and axes
        if (this.scene) {
            // Remove old grid, axes and origin marker
            const objectsToRemove = [];
            this.scene.traverse((object) => {
                if (object.type === 'GridHelper' ||
                    object.type === 'LineSegments' ||
                    object.type === 'AxesHelper' ||
                    object.type === 'Sprite' ||
                    object.type === 'Group' && object === this.originMarker) {
                    objectsToRemove.push(object);
                }
            });
            objectsToRemove.forEach(obj => this.scene.remove(obj));

            // Recreate grid, axes and origin marker with new dimensions
            this.createGrid();
            this.createAxes();
            this.createOriginMarker();

            console.log('✅ Work area updated in 3D viewer');
        }
    }

    // ====================================
    // CLEANUP
    // ====================================
    dispose() {
        console.log('🗑️ Disposing GCodeViewer');

        this.pauseAnimation();

        this.clearPaths();

        if (this.toolMarker) {
            if (this.toolMarker.geometry) this.toolMarker.geometry.dispose();
            if (this.toolMarker.material) this.toolMarker.material.dispose();
            this.scene.remove(this.toolMarker);
        }

        if (this.renderer) {
            this.renderer.dispose();
        }

        // Limpiar event listeners
        window.removeEventListener('resize', () => this.handleResize());

        // Limpiar ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}
