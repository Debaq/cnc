// ============================================
// CANVAS MANAGER (Fabric.js) - MEJORADO CON PATH EXTRACTION
// ============================================
class CanvasManager {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.fabricCanvas = null;
        this.svgGroup = null;
        this.layers = []; // Sistema de capas

        // Work area config (mm)
        this.workArea = { width: 400, height: 400 };
        this.pixelsPerMM = 2;

        // Grid - MEJORADO: 20mm = 2cm
        this.gridSize = 20; // 2cm por cuadro
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

        // Initialize Fabric.js canvas - FONDO MÁS CLARO
        this.fabricCanvas = new fabric.Canvas(canvasElement, {
            width: width,
            height: height,
            backgroundColor: '#F0F0F0',
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
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;

        this.fabricCanvas.setWidth(newWidth);
        this.fabricCanvas.setHeight(newHeight);

        // Redraw grid and origin
        this.clearGrid();
        this.setupGrid();
        this.setupOrigin();

        this.fabricCanvas.renderAll();
    }

    clearGrid() {
        // Remove old grid and work area
        const objects = this.fabricCanvas.getObjects();
        objects.forEach(obj => {
            if (obj.name === 'gridLine' || obj.name === 'workArea' ||
                obj.name === 'xAxis' || obj.name === 'yAxis' ||
                obj.name === 'origin') {
                this.fabricCanvas.remove(obj);
                }
        });
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
        console.log('   Grid spacing:', this.gridSize, 'mm (cada 2cm)');

        // Grid lines PRIMERO - MÁS VISIBLES
        if (this.showGrid) {
            const gridSpacing = this.gridSize * this.pixelsPerMM;
            let lineCount = 0;

            // Vertical lines - CADA 20MM (2CM)
            for (let x = 0; x <= workW; x += gridSpacing) {
                const isMainLine = (x % (100 * this.pixelsPerMM)) === 0; // Cada 10cm más grueso
                const line = new fabric.Line([
                    centerX - workW / 2 + x, centerY - workH / 2,
                    centerX - workW / 2 + x, centerY + workH / 2
                ], {
                    stroke: isMainLine ? '#7B6BB8' : '#B5A8D6',
                    strokeWidth: isMainLine ? 2 : 1,
                    selectable: false,
                    evented: false,
                    name: 'gridLine'
                });
                this.fabricCanvas.add(line);
                lineCount++;
            }

            // Horizontal lines - CADA 20MM (2CM)
            for (let y = 0; y <= workH; y += gridSpacing) {
                const isMainLine = (y % (100 * this.pixelsPerMM)) === 0; // Cada 10cm más grueso
                const line = new fabric.Line([
                    centerX - workW / 2, centerY - workH / 2 + y,
                    centerX + workW / 2, centerY - workH / 2 + y
                ], {
                    stroke: isMainLine ? '#7B6BB8' : '#B5A8D6',
                    strokeWidth: isMainLine ? 2 : 1,
                    selectable: false,
                    evented: false,
                    name: 'gridLine'
                });
                this.fabricCanvas.add(line);
                lineCount++;
            }

            console.log('   ✅ Grid lines added:', lineCount, '(spacing: 20mm = 2cm)');
        }

        // Work area rectangle DESPUÉS - BORDE MÁS FINO Y ELEGANTE
        const workRect = new fabric.Rect({
            left: centerX - workW / 2,
            top: centerY - workH / 2,
            width: workW,
            height: workH,
            fill: 'rgba(255, 255, 255, 0.7)', // Semi transparente para ver el grid
                                         stroke: '#5B4B9F',
                                         strokeWidth: 3,
                                         selectable: false,
                                         evented: false,
                                         name: 'workArea'
        });

        this.fabricCanvas.add(workRect);
        console.log('   ✅ Work area rect added');
    }

    getOrigin() {
        // Calculate origin position (bottom-left corner of work area)
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;

        const originX = centerX - workW / 2;
        const originY = centerY + workH / 2;

        return { x: originX, y: originY };
    }

    setupOrigin() {
        const originPos = this.getOrigin();
        const originX = originPos.x;
        const originY = originPos.y;

        console.log('📍 Setting up origin at:', originX.toFixed(1), originY.toFixed(1));

        const axisLength = 40;

        // X axis (red) - MÁS FINO
        const xAxis = new fabric.Line([originX, originY, originX + axisLength, originY], {
            stroke: '#FF0000',
            strokeWidth: 3,
            selectable: false,
            evented: false,
            name: 'xAxis'
        });

        // Y axis (green) - MÁS FINO
        const yAxis = new fabric.Line([originX, originY, originX, originY - axisLength], {
            stroke: '#00FF00',
            strokeWidth: 3,
            selectable: false,
            evented: false,
            name: 'yAxis'
        });

        // Origin dot - MÁS PEQUEÑO
        const originDot = new fabric.Circle({
            left: originX - 6,
            top: originY - 6,
            radius: 6,
            fill: '#FFD700',
            stroke: '#2D1B69',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            name: 'origin'
        });

        // Arrow on X (triangle) - MÁS PEQUEÑO
        const arrowX = new fabric.Triangle({
            left: originX + axisLength - 4,
            top: originY - 4,
            width: 8,
            height: 8,
            fill: '#FF0000',
            angle: 90,
            selectable: false,
            evented: false
        });

        // Arrow on Y (triangle) - MÁS PEQUEÑO
        const arrowY = new fabric.Triangle({
            left: originX - 4,
            top: originY - axisLength - 4,
            width: 8,
            height: 8,
            fill: '#00FF00',
            angle: 0,
            selectable: false,
            evented: false
        });

        this.fabricCanvas.add(xAxis, yAxis, originDot, arrowX, arrowY);
        console.log('   ✅ Origin markers added (X axis RED →, Y axis GREEN ↑)');

        this.originMarker = { xAxis, yAxis, originDot, arrowX, arrowY };
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
            angle: 0,
            originX: 'left',
            originY: 'bottom'
        });

        this.fabricCanvas.renderAll();
    }

    // NUEVA FUNCIÓN: Cambiar área de trabajo
    setWorkArea(width, height) {
        this.workArea.width = width;
        this.workArea.height = height;

        // Recalcular pixelsPerMM si es necesario
        const workAreaPx = Math.max(width, height) * this.pixelsPerMM;
        const minDimension = Math.min(this.fabricCanvas.width, this.fabricCanvas.height);

        if (workAreaPx > minDimension * 0.9) {
            this.pixelsPerMM = (minDimension * 0.8) / Math.max(width, height);
        }

        // Redibujar todo
        this.clearGrid();
        this.setupGrid();
        this.setupOrigin();
        this.fabricCanvas.renderAll();

        // Actualizar UI
        this.app.workAreaSize = `${width} x ${height}`;

        console.log('✅ Work area changed to:', width, 'x', height, 'mm');
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
                    //if (this.svgGroup) {
                    //    this.fabricCanvas.remove(this.svgGroup);
                    //}

                    // Change color of all objects BEFORE grouping - MÁS FINO
                    objects.forEach(obj => {
                        if (obj.stroke) {
                            obj.set('stroke', '#2D1B69');
                            obj.set('strokeWidth', 1.5); // MÁS FINO
                        }
                        if (!obj.stroke && obj.fill) {
                            obj.set('fill', '#5B4B9F');
                        }
                        if (!obj.stroke && !obj.fill) {
                            obj.set('stroke', '#2D1B69');
                            obj.set('strokeWidth', 1.5); // MÁS FINO
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

                    // Calculate bounding box to find actual content bounds
                    const bbox = this.svgGroup.getBoundingRect(true, true);

                    this.svgGroup.set({
                        left: originX + 20,
                        top: originY - (this.svgGroup.height * scale) - 20,
                        scaleX: scale,
                        scaleY: scale,
                        selectable: true,
                        hasControls: true,
                        // Set origin to bottom-left for CNC compatibility
                        originX: 'left',
                        originY: 'bottom'
                    });

                    // Store the bounding box offset for later use in G-code generation
                    this.svgGroup.bboxOffset = {
                        x: bbox.left,
                        y: bbox.top
                    };

                    this.fabricCanvas.add(this.svgGroup);
                    this.fabricCanvas.setActiveObject(this.svgGroup);
                    this.fabricCanvas.renderAll();

                    console.log('✅ SVG positioned at origin');
                    console.log('   Size:', this.svgGroup.width.toFixed(1), 'x', this.svgGroup.height.toFixed(1), 'px');
                    console.log('   Scale:', scale.toFixed(2));

                    resolve(this.svgGroup); // Devolver el grupo para agregarlo a elementos

                });
            };

            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    // ============================================
    // PATH EXTRACTION FOR G-CODE
    // ============================================
    getPaths() {
        if (!this.svgGroup) {
            console.warn('No SVG loaded');
            return [];
        }

        const paths = [];
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;
        const originX = centerX - workW / 2;
        const originY = centerY + workH / 2;

        console.log('🔍 Extracting paths from SVG group');

        // Get all objects from group
        const objects = this.svgGroup.type === 'group' ? this.svgGroup.getObjects() : [this.svgGroup];

        objects.forEach((obj, index) => {
            try {
                const pathData = this.extractPathFromObject(obj, originX, originY);
                if (pathData && pathData.points.length > 0) {
                    paths.push(pathData);
                    console.log(`  Path ${index + 1}:`, pathData.points.length, 'points');
                }
            } catch (error) {
                console.error(`Error extracting path ${index}:`, error);
            }
        });

        console.log(`✅ Extracted ${paths.length} paths`);
        return paths;
    }

    getPathsFromElement(element) {
        if (!element.fabricObject) return [];

        const paths = [];
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;
        const originX = centerX - workW / 2;
        const originY = centerY + workH / 2;

        if (element.type === 'path' || element.type === 'svg') {
            const pathData = this.extractPathFromObject(element.fabricObject, originX, originY);
            if (pathData && pathData.points.length > 0) {
                paths.push(pathData);
            }
        } else if (element.children && element.children.length > 0) {
            element.children.forEach(child => {
                if (child.visible) {
                    const pathData = this.extractPathFromObject(child.fabricObject, originX, originY);
                    if (pathData && pathData.points.length > 0) {
                        paths.push(pathData);
                    }
                }
            });
        }

        return paths;
    }

    extractPathFromObject(obj, originX, originY) {
        const points = [];
        const type = obj.type;

        // For objects in a group, we need to apply both object and group transformations
        // First calculate the object's local transform, then multiply by group's transform
        let matrix;
        let groupLeft = 0, groupTop = 0;

        if (obj.group) {
            // Get object's transform relative to group
            const objMatrix = obj.calcOwnMatrix();
            // Get group's absolute transform
            const groupMatrix = obj.group.calcTransformMatrix();
            // Multiply them
            matrix = fabric.util.multiplyTransformMatrices(groupMatrix, objMatrix);
            // Use the group's actual left/top position (not from matrix)
            groupLeft = obj.group.left;
            groupTop = obj.group.top;
        } else {
            matrix = obj.calcTransformMatrix();
            groupLeft = obj.left;
            groupTop = obj.top;
        }

        switch (type) {
            case 'path':
                // Extract points from path
                const pathData = obj.path;
                let currentX = 0, currentY = 0;

                pathData.forEach(cmd => {
                    const command = cmd[0];
                    switch (command) {
                        case 'M': // Move to
                            currentX = cmd[1];
                            currentY = cmd[2];
                            points.push(this.transformPoint(currentX, currentY, matrix, originX, originY, groupLeft, groupTop));
                            break;
                        case 'L': // Line to
                            currentX = cmd[1];
                            currentY = cmd[2];
                            points.push(this.transformPoint(currentX, currentY, matrix, originX, originY, groupLeft, groupTop));
                            break;
                        case 'H': // Horizontal line
                            currentX = cmd[1];
                            points.push(this.transformPoint(currentX, currentY, matrix, originX, originY, groupLeft, groupTop));
                            break;
                        case 'V': // Vertical line
                            currentY = cmd[1];
                            points.push(this.transformPoint(currentX, currentY, matrix, originX, originY, groupLeft, groupTop));
                            break;
                        case 'C': // Cubic bezier
                            // Approximate bezier with line segments
                            const bezierPoints = this.approximateBezier(
                                currentX, currentY,
                                cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6],
                                10 // segments
                            );
                            bezierPoints.forEach(p => {
                                points.push(this.transformPoint(p.x, p.y, matrix, originX, originY, groupLeft, groupTop));
                            });
                            currentX = cmd[5];
                            currentY = cmd[6];
                            break;
                        case 'Q': // Quadratic bezier
                            const quadPoints = this.approximateQuadBezier(
                                currentX, currentY,
                                cmd[1], cmd[2], cmd[3], cmd[4],
                                10
                            );
                            quadPoints.forEach(p => {
                                points.push(this.transformPoint(p.x, p.y, matrix, originX, originY, groupLeft, groupTop));
                            });
                            currentX = cmd[3];
                            currentY = cmd[4];
                            break;
                        case 'Z': // Close path
                            if (points.length > 0) {
                                points.push({ ...points[0] }); // Close to first point
                            }
                            break;
                    }
                });
                break;

                        case 'line':
                            points.push(this.transformPoint(obj.x1, obj.y1, matrix, originX, originY, groupLeft, groupTop));
                            points.push(this.transformPoint(obj.x2, obj.y2, matrix, originX, originY, groupLeft, groupTop));
                            break;

                        case 'rect':
                            const w = obj.width;
                            const h = obj.height;
                            points.push(this.transformPoint(0, 0, matrix, originX, originY, groupLeft, groupTop));
                            points.push(this.transformPoint(w, 0, matrix, originX, originY, groupLeft, groupTop));
                            points.push(this.transformPoint(w, h, matrix, originX, originY, groupLeft, groupTop));
                            points.push(this.transformPoint(0, h, matrix, originX, originY, groupLeft, groupTop));
                            points.push(this.transformPoint(0, 0, matrix, originX, originY, groupLeft, groupTop)); // Close
                            break;

                        case 'circle':
                        case 'ellipse':
                            const rx = obj.rx || obj.radius;
                            const ry = obj.ry || obj.radius;
                            const segments = 32;
                            for (let i = 0; i <= segments; i++) {
                                const angle = (i / segments) * Math.PI * 2;
                                const x = Math.cos(angle) * rx;
                                const y = Math.sin(angle) * ry;
                                points.push(this.transformPoint(x, y, matrix, originX, originY, groupLeft, groupTop));
                            }
                            break;

                        case 'polygon':
                        case 'polyline':
                            if (obj.points) {
                                obj.points.forEach(p => {
                                    points.push(this.transformPoint(p.x, p.y, matrix, originX, originY, groupLeft, groupTop));
                                });
                                if (type === 'polygon' && points.length > 0) {
                                    points.push({ ...points[0] }); // Close polygon
                                }
                            }
                            break;
        }

        return {
            type: type,
            closed: type === 'rect' || type === 'circle' || type === 'ellipse' || type === 'polygon',
            points: points
        };
    }

    transformPoint(x, y, matrix, originX, originY, groupLeft = null, groupTop = null) {
        // Apply Fabric transform matrix to get absolute canvas coordinates
        const transformed = fabric.util.transformPoint(
            { x: x, y: y },
            matrix
        );

        // Use provided group position or extract from matrix
        // When originY: 'bottom' is set, the matrix doesn't reflect the actual left/top
        const groupX = groupLeft !== null ? groupLeft : matrix[4];
        const groupY = groupTop !== null ? groupTop : matrix[5];

        // Convert transformed point from absolute canvas to relative to group
        const relativeX = transformed.x - groupX;
        const relativeY = transformed.y - groupY;

        // Now convert group position + relative offset to machine coordinates
        const machineX = (groupX - originX) / this.pixelsPerMM + relativeX / this.pixelsPerMM;
        const machineY = (originY - groupY) / this.pixelsPerMM - relativeY / this.pixelsPerMM;

        // Debug: log first point transformation
        if (x === 0 && y === 0) {
            console.log('🔍 Point transformation debug:');
            console.log('   Input (local):', x, y);
            console.log('   After matrix (canvas):', transformed.x.toFixed(2), transformed.y.toFixed(2));
            console.log('   Group position (provided):', groupLeft, groupTop);
            console.log('   Group position (used):', groupX.toFixed(2), groupY.toFixed(2));
            console.log('   Matrix position:', matrix[4].toFixed(2), matrix[5].toFixed(2));
            console.log('   Relative to group:', relativeX.toFixed(2), relativeY.toFixed(2));
            console.log('   Origin (canvas):', originX.toFixed(2), originY.toFixed(2));
            console.log('   Final (machine mm):', machineX.toFixed(3), machineY.toFixed(3));
        }

        return {
            x: parseFloat(machineX.toFixed(3)),
            y: parseFloat(machineY.toFixed(3))
        };
    }

    approximateBezier(x0, y0, x1, y1, x2, y2, x3, y3, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const t2 = t * t;
            const t3 = t2 * t;
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;

            const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3;
            const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3;
            points.push({ x, y });
        }
        return points;
    }

    approximateQuadBezier(x0, y0, x1, y1, x2, y2, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const t2 = t * t;
            const mt = 1 - t;
            const mt2 = mt * mt;

            const x = mt2 * x0 + 2 * mt * t * x1 + t2 * x2;
            const y = mt2 * y0 + 2 * mt * t * y1 + t2 * y2;
            points.push({ x, y });
        }
        return points;
    }
}
