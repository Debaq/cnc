// ============================================
// CANVAS MANAGER (Fabric.js)
// ============================================
export class CanvasManager {
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

        // Adjust work area if too big for canvas
        const workAreaPx = this.workArea.width * this.pixelsPerMM;
        const minDimension = Math.min(width, height);

        if (workAreaPx > minDimension * 0.9) {
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

        // X axis (red)
        const xAxis = new fabric.Line([originX, originY, originX + axisLength, originY], {
            stroke: '#FF0000',
            strokeWidth: 5,
            selectable: false,
            evented: false,
            name: 'xAxis'
        });

        // Y axis (green)
        const yAxis = new fabric.Line([originX, originY, originX, originY - axisLength], {
            stroke: '#00FF00',
            strokeWidth: 5,
            selectable: false,
            evented: false,
            name: 'yAxis'
        });

        // Origin dot
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

        // Arrow on X (triangle)
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

        // Arrow on Y (triangle)
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
                        left: originX + 20,
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
