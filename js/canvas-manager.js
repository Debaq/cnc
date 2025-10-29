// Canvas Manager - Usando Fabric.js
export class CanvasManager {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.fabricCanvas = null;
        this.svgGroup = null;
        
        // Work area config (mm)
        this.workArea = { width: 400, height: 400 };
        this.pixelsPerMM = 2; // Scale factor for display
        
        // Grid
        this.gridSize = 10; // mm
        this.showGrid = true;
        
        // Origin marker
        this.originMarker = null;
    }
    
    init(canvasElement) {
        this.canvas = canvasElement;
        
        // Initialize Fabric.js canvas
        this.fabricCanvas = new fabric.Canvas(canvasElement, {
            width: canvasElement.parentElement.clientWidth,
            height: canvasElement.parentElement.clientHeight,
            backgroundColor: '#1a1a2e',
            selection: true,
            preserveObjectStacking: true
        });
        
        // Setup grid and origin
        this.setupGrid();
        this.setupOrigin();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resize());
        
        // Tool handlers
        this.setupTools();
        
        console.log('✅ Canvas Manager initialized with Fabric.js');
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
        
        // Work area rectangle
        const workRect = new fabric.Rect({
            left: centerX - workW / 2,
            top: centerY - workH / 2,
            width: workW,
            height: workH,
            fill: 'transparent',
            stroke: '#7B6BB8',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            name: 'workArea'
        });
        
        this.fabricCanvas.add(workRect);
        
        // Grid lines
        if (this.showGrid) {
            const gridGroup = new fabric.Group([], {
                selectable: false,
                evented: false,
                name: 'grid'
            });
            
            const gridSpacing = this.gridSize * this.pixelsPerMM;
            
            // Vertical lines
            for (let x = 0; x <= workW; x += gridSpacing) {
                const line = new fabric.Line([
                    centerX - workW / 2 + x,
                    centerY - workH / 2,
                    centerX - workW / 2 + x,
                    centerY + workH / 2
                ], {
                    stroke: 'rgba(255, 255, 255, 0.1)',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                });
                gridGroup.addWithUpdate(line);
            }
            
            // Horizontal lines
            for (let y = 0; y <= workH; y += gridSpacing) {
                const line = new fabric.Line([
                    centerX - workW / 2,
                    centerY - workH / 2 + y,
                    centerX + workW / 2,
                    centerY - workH / 2 + y
                ], {
                    stroke: 'rgba(255, 255, 255, 0.1)',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                });
                gridGroup.addWithUpdate(line);
            }
            
            this.fabricCanvas.add(gridGroup);
            this.fabricCanvas.sendToBack(gridGroup);
        }
    }
    
    setupOrigin() {
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;
        
        // Origin is bottom-left corner of work area
        const originX = centerX - workW / 2;
        const originY = centerY + workH / 2;
        
        const axisLength = 30;
        
        // X axis (red)
        const xAxis = new fabric.Line([
            originX, originY,
            originX + axisLength, originY
        ], {
            stroke: '#FF0000',
            strokeWidth: 3,
            selectable: false,
            evented: false,
            name: 'xAxis'
        });
        
        // Y axis (green) - pointing UP in screen coordinates
        const yAxis = new fabric.Line([
            originX, originY,
            originX, originY - axisLength
        ], {
            stroke: '#00FF00',
            strokeWidth: 3,
            selectable: false,
            evented: false,
            name: 'yAxis'
        });
        
        // Origin dot
        const origin = new fabric.Circle({
            left: originX - 5,
            top: originY - 5,
            radius: 5,
            fill: '#FFFFFF',
            selectable: false,
            evented: false,
            name: 'origin'
        });
        
        this.fabricCanvas.add(xAxis, yAxis, origin);
        
        this.originMarker = { xAxis, yAxis, origin };
    }
    
    setupTools() {
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
        
        // Pan with middle mouse or space+drag
        let isPanning = false;
        let lastPosX = 0;
        let lastPosY = 0;
        
        this.fabricCanvas.on('mouse:down', (opt) => {
            const evt = opt.e;
            if (evt.button === 1 || (evt.button === 0 && evt.shiftKey)) { // Middle button or shift+left
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
        
        // Selection events
        this.fabricCanvas.on('selection:created', () => this.updateTransformInfo());
        this.fabricCanvas.on('selection:updated', () => this.updateTransformInfo());
        this.fabricCanvas.on('object:modified', () => this.updateTransformInfo());
        this.fabricCanvas.on('selection:cleared', () => this.clearTransformInfo());
    }
    
    async loadSVG(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const svgString = e.target.result;
                
                fabric.loadSVGFromString(svgString, (objects, options) => {
                    if (!objects || objects.length === 0) {
                        reject(new Error('No se encontraron objetos en el SVG'));
                        return;
                    }
                    
                    // Clear previous SVG
                    if (this.svgGroup) {
                        this.fabricCanvas.remove(this.svgGroup);
                    }
                    
                    // Create group from SVG objects
                    this.svgGroup = fabric.util.groupSVGElements(objects, options);
                    
                    // Position at origin (bottom-left of work area)
                    const workW = this.workArea.width * this.pixelsPerMM;
                    const workH = this.workArea.height * this.pixelsPerMM;
                    const centerX = this.fabricCanvas.width / 2;
                    const centerY = this.fabricCanvas.height / 2;
                    const originX = centerX - workW / 2;
                    const originY = centerY + workH / 2;
                    
                    this.svgGroup.set({
                        left: originX,
                        top: originY - this.svgGroup.height,
                        selectable: true,
                        hasControls: true
                    });
                    
                    // Change stroke color to cyan for visibility
                    this.svgGroup.getObjects().forEach(obj => {
                        if (obj.stroke) obj.set('stroke', '#00D9FF');
                        if (!obj.stroke && obj.fill) obj.set('fill', '#00D9FF');
                    });
                    
                    this.fabricCanvas.add(this.svgGroup);
                    this.fabricCanvas.setActiveObject(this.svgGroup);
                    this.fabricCanvas.renderAll();
                    
                    this.updateTransformInfo();
                    
                    resolve();
                });
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    }
    
    setTool(tool) {
        switch(tool) {
            case 'select':
                this.fabricCanvas.selection = true;
                this.fabricCanvas.defaultCursor = 'default';
                break;
            case 'pan':
                this.fabricCanvas.selection = false;
                this.fabricCanvas.defaultCursor = 'move';
                break;
            case 'move':
            case 'scale':
            case 'rotate':
                this.fabricCanvas.selection = true;
                this.fabricCanvas.defaultCursor = 'default';
                break;
        }
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
        if (!this.svgGroup) return;
        
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        
        const zoom = Math.min(
            (this.fabricCanvas.width * 0.8) / workW,
            (this.fabricCanvas.height * 0.8) / workH
        );
        
        this.fabricCanvas.setZoom(zoom);
        this.fabricCanvas.viewportTransform[4] = this.fabricCanvas.width / 2 - (workW * zoom) / 2;
        this.fabricCanvas.viewportTransform[5] = this.fabricCanvas.height / 2 - (workH * zoom) / 2;
        this.fabricCanvas.renderAll();
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
        this.updateTransformInfo();
    }
    
    updateTransformInfo() {
        const obj = this.fabricCanvas.getActiveObject();
        if (!obj) return;
        
        // Convert from pixels to mm (relative to origin)
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;
        const originX = centerX - workW / 2;
        const originY = centerY + workH / 2;
        
        const xMM = (obj.left - originX) / this.pixelsPerMM;
        const yMM = (originY - obj.top - obj.height * obj.scaleY) / this.pixelsPerMM;
        
        const transform = {
            x: xMM,
            y: yMM,
            scale: obj.scaleX,
            rotation: obj.angle
        };
        
        this.app.updateTransformInfo(transform);
    }
    
    clearTransformInfo() {
        this.app.updateTransformInfo({ x: 0, y: 0, scale: 1, rotation: 0 });
    }
    
    getPaths() {
        if (!this.svgGroup) return [];
        
        const paths = [];
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;
        const originX = centerX - workW / 2;
        const originY = centerY + workH / 2;
        
        // Get all path objects from the SVG group
        this.svgGroup.getObjects().forEach(obj => {
            if (obj.type === 'path') {
                const pathPoints = this.pathToPoints(obj, originX, originY);
                if (pathPoints.length > 0) {
                    paths.push({
                        points: pathPoints,
                        closed: this.isPathClosed(obj)
                    });
                }
            } else if (obj.type === 'line') {
                paths.push({
                    points: this.lineToPoints(obj, originX, originY),
                    closed: false
                });
            } else if (obj.type === 'rect') {
                paths.push({
                    points: this.rectToPoints(obj, originX, originY),
                    closed: true
                });
            } else if (obj.type === 'circle') {
                paths.push({
                    points: this.circleToPoints(obj, originX, originY),
                    closed: true
                });
            } else if (obj.type === 'polygon' || obj.type === 'polyline') {
                paths.push({
                    points: this.polyToPoints(obj, originX, originY),
                    closed: obj.type === 'polygon'
                });
            }
        });
        
        return paths;
    }
    
    pathToPoints(pathObj, originX, originY) {
        const points = [];
        const path = pathObj.path;
        
        if (!path) return points;
        
        let currentX = 0, currentY = 0;
        
        path.forEach(segment => {
            const cmd = segment[0];
            
            switch (cmd) {
                case 'M': // Move to
                    currentX = segment[1];
                    currentY = segment[2];
                    points.push(this.transformPoint(currentX, currentY, pathObj, originX, originY));
                    break;
                    
                case 'L': // Line to
                    currentX = segment[1];
                    currentY = segment[2];
                    points.push(this.transformPoint(currentX, currentY, pathObj, originX, originY));
                    break;
                    
                case 'H': // Horizontal line
                    currentX = segment[1];
                    points.push(this.transformPoint(currentX, currentY, pathObj, originX, originY));
                    break;
                    
                case 'V': // Vertical line
                    currentY = segment[1];
                    points.push(this.transformPoint(currentX, currentY, pathObj, originX, originY));
                    break;
                    
                case 'C': // Cubic bezier - approximate with line segments
                    const cp1x = segment[1], cp1y = segment[2];
                    const cp2x = segment[3], cp2y = segment[4];
                    const endX = segment[5], endY = segment[6];
                    
                    // Sample bezier curve
                    for (let t = 0.1; t <= 1; t += 0.1) {
                        const x = Math.pow(1-t, 3) * currentX +
                                3 * Math.pow(1-t, 2) * t * cp1x +
                                3 * (1-t) * Math.pow(t, 2) * cp2x +
                                Math.pow(t, 3) * endX;
                        const y = Math.pow(1-t, 3) * currentY +
                                3 * Math.pow(1-t, 2) * t * cp1y +
                                3 * (1-t) * Math.pow(t, 2) * cp2y +
                                Math.pow(t, 3) * endY;
                        points.push(this.transformPoint(x, y, pathObj, originX, originY));
                    }
                    
                    currentX = endX;
                    currentY = endY;
                    break;
                    
                case 'Z': // Close path
                    break;
            }
        });
        
        return points;
    }
    
    lineToPoints(lineObj, originX, originY) {
        return [
            this.transformPoint(lineObj.x1, lineObj.y1, lineObj, originX, originY),
            this.transformPoint(lineObj.x2, lineObj.y2, lineObj, originX, originY)
        ];
    }
    
    rectToPoints(rectObj, originX, originY) {
        const w = rectObj.width;
        const h = rectObj.height;
        return [
            this.transformPoint(0, 0, rectObj, originX, originY),
            this.transformPoint(w, 0, rectObj, originX, originY),
            this.transformPoint(w, h, rectObj, originX, originY),
            this.transformPoint(0, h, rectObj, originX, originY),
            this.transformPoint(0, 0, rectObj, originX, originY)
        ];
    }
    
    circleToPoints(circleObj, originX, originY, segments = 64) {
        const points = [];
        const r = circleObj.radius;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = r + Math.cos(angle) * r;
            const y = r + Math.sin(angle) * r;
            points.push(this.transformPoint(x, y, circleObj, originX, originY));
        }
        
        return points;
    }
    
    polyToPoints(polyObj, originX, originY) {
        const points = [];
        
        if (polyObj.points) {
            polyObj.points.forEach(pt => {
                points.push(this.transformPoint(pt.x, pt.y, polyObj, originX, originY));
            });
        }
        
        return points;
    }
    
    transformPoint(x, y, obj, originX, originY) {
        // Apply object transformation
        const point = new fabric.Point(x, y);
        const transformed = fabric.util.transformPoint(
            point,
            obj.calcTransformMatrix()
        );
        
        // Convert to mm coordinates (origin is bottom-left)
        const xMM = (transformed.x - originX) / this.pixelsPerMM;
        const yMM = (originY - transformed.y) / this.pixelsPerMM;
        
        return { x: xMM, y: yMM };
    }
    
    isPathClosed(pathObj) {
        const path = pathObj.path;
        if (!path || path.length === 0) return false;
        
        const lastSegment = path[path.length - 1];
        return lastSegment[0] === 'Z';
    }
}
