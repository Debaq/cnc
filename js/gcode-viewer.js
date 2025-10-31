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
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
        // Position camera above and to the side (isometric view)
        // Looking at center of 400x400 work area (200, 0, 200)
        this.camera.position.set(500, 400, 500);
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

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(200, 300, 200);
        this.scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-200, -100, -200);
        this.scene.add(directionalLight2);

        // Grid and axes
        this.createGrid();
        this.createAxes();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Start render loop
        this.animate();

        console.log('✅ Three.js scene initialized');
    }

    // ====================================
    // GRID AND AXES
    // ====================================
    createGrid() {
        // Work area grid with origin at corner (0,0,0)
        const size = 400; // 400mm work area
        const divisions = 20; // 20mm grid spacing

        // Grid in XZ plane (CNC XY plane) - centered at size/2, size/2
        const gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x333333);
        // Move grid so origin (0,0) is at corner, not center
        gridHelper.position.set(size / 2, 0, size / 2);
        this.scene.add(gridHelper);

        // Work area border at Y=0 (CNC Z=0)
        const borderGeometry = new THREE.EdgesGeometry(
            new THREE.PlaneGeometry(size, size)
        );
        const borderMaterial = new THREE.LineBasicMaterial({ color: 0x6666ff, linewidth: 2 });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        border.rotation.x = -Math.PI / 2; // Rotate to XZ plane
        border.position.set(size / 2, 0, size / 2); // Position at center of work area
        this.scene.add(border);
    }

    createAxes() {
        // Axes helper (Three.js: X=red, Y=green, Z=blue)
        const axesHelper = new THREE.AxesHelper(100);
        this.scene.add(axesHelper);

        // Axis labels - mapped to CNC coordinates
        // Three.js X → CNC X (right)
        // Three.js Y → CNC Z (up)
        // Three.js Z → CNC Y (depth/back)
        const createLabel = (text, position, color) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;
            context.font = 'Bold 48px Arial';
            context.fillStyle = color;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 32, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(material);
            sprite.position.copy(position);
            sprite.scale.set(20, 20, 1);
            return sprite;
        };

        // Label positions in Three.js space, but showing CNC axis names
        this.scene.add(createLabel('X', new THREE.Vector3(110, 0, 0), '#ff0000')); // X axis (red)
        this.scene.add(createLabel('Z', new THREE.Vector3(0, 110, 0), '#00ff00')); // Z axis (green, up)
        this.scene.add(createLabel('Y', new THREE.Vector3(0, 0, 110), '#0000ff')); // Y axis (blue, depth)
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
        let currentPosition = { x: 0, y: 5, z: 0 };
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

        // Convert CNC coordinates (X right, Y back, Z up) to Three.js coordinates (X right, Y up, Z forward)
        // G-code: X=right, Y=depth, Z=up
        // Three.js: X=right, Y=up, Z=forward
        // Conversion: ThreeX = GcodeX, ThreeY = GcodeZ, ThreeZ = GcodeY
        if (xMatch) command.end.x = parseFloat(xMatch[1]);
        if (yMatch) command.end.z = parseFloat(yMatch[1]); // CNC Y becomes Three.js Z
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

        // Create tool marker (sphere)
        const geometry = new THREE.SphereGeometry(3, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffdd44,
            emissive: 0xffaa00,
            emissiveIntensity: 0.5
        });
        this.toolMarker = new THREE.Mesh(geometry, material);

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

        // Position camera (Y is up in Three.js coordinates)
        const distance = maxSize * 1.5;
        this.camera.position.set(
            centerX + distance * 0.7,  // X offset (right)
            centerY + distance * 0.8,  // Y offset (up)
            centerZ + distance * 0.7   // Z offset (forward)
        );
        this.camera.lookAt(centerX, centerY, centerZ);

        if (this.controls) {
            this.controls.target.set(centerX, centerY, centerZ);
            this.controls.update();
        }
    }

    resetCamera() {
        // Reset to default isometric view
        this.camera.position.set(500, 400, 500);
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

        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        if (!this.canvas || !this.camera || !this.renderer) return;

        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
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

        window.removeEventListener('resize', () => this.handleResize());
    }
}
