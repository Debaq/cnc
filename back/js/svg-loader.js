export class SVGLoader {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.svgPaths = [];
        this.workAreaWidth = 400;
        this.workAreaHeight = 400;
        
        // Transform state
        this.transform = {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0
        };
        
        // Origin position (bottom-left)
        this.originX = 50;
        this.originY = 50;
        
        // Viewport
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Current tool
        this.currentTool = 'select';
        
        // Mouse state
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
    }

    init(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.workAreaWidth = config.workAreaWidth;
        this.workAreaHeight = config.workAreaHeight;
        
        this.setupCanvas();
        this.setupMouseEvents();
        this.render();
    }

    setupCanvas() {
        // Set canvas size
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.render();
        });
    }

    setupMouseEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        
        if (this.currentTool === 'move') {
            this.dragStartTransform = { ...this.transform };
        } else if (this.currentTool === 'scale') {
            this.dragStartScale = this.transform.scale;
        } else if (this.currentTool === 'rotate') {
            this.dragStartRotation = this.transform.rotation;
        }
    }

    onMouseMove(e) {
        if (!this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        
        if (this.currentTool === 'move') {
            this.transform.x = this.dragStartTransform.x + dx;
            this.transform.y = this.dragStartTransform.y + dy;
            this.updateTransformInfo();
            this.render();
        } else if (this.currentTool === 'scale') {
            const scaleFactor = 1 + (dy / 100);
            this.transform.scale = Math.max(0.1, this.dragStartScale * scaleFactor);
            this.updateTransformInfo();
            this.render();
        } else if (this.currentTool === 'rotate') {
            const angle = dx * 0.5;
            this.transform.rotation = this.dragStartRotation + angle;
            this.updateTransformInfo();
            this.render();
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
    }

    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom * delta));
        this.render();
    }

    async loadSVG(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(e.target.result, 'image/svg+xml');
                    const svgElement = svgDoc.querySelector('svg');
                    
                    if (!svgElement) {
                        throw new Error('No se encontró elemento SVG válido');
                    }

                    this.parseSVG(svgElement);
                    this.fitView();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    }

    parseSVG(svgElement) {
        this.svgPaths = [];
        
        // Get SVG dimensions
        const viewBox = svgElement.getAttribute('viewBox');
        let width, height, minX = 0, minY = 0;
        
        if (viewBox) {
            [minX, minY, width, height] = viewBox.split(' ').map(Number);
        } else {
            width = parseFloat(svgElement.getAttribute('width')) || 100;
            height = parseFloat(svgElement.getAttribute('height')) || 100;
        }

        this.svgWidth = width;
        this.svgHeight = height;
        this.svgMinX = minX;
        this.svgMinY = minY;

        // Extract all drawable elements
        const elements = svgElement.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse');
        
        elements.forEach((element, index) => {
            const pathData = this.elementToPath(element);
            if (pathData) {
                this.svgPaths.push({
                    id: index,
                    type: element.tagName,
                    data: pathData,
                    segments: this.parsePathData(pathData)
                });
            }
        });
        
        this.render();
    }

    elementToPath(element) {
        const tagName = element.tagName.toLowerCase();
        
        switch(tagName) {
            case 'path':
                return element.getAttribute('d');
                
            case 'line':
                const x1 = element.getAttribute('x1');
                const y1 = element.getAttribute('y1');
                const x2 = element.getAttribute('x2');
                const y2 = element.getAttribute('y2');
                return `M ${x1} ${y1} L ${x2} ${y2}`;
                
            case 'rect':
                const x = parseFloat(element.getAttribute('x')) || 0;
                const y = parseFloat(element.getAttribute('y')) || 0;
                const w = parseFloat(element.getAttribute('width'));
                const h = parseFloat(element.getAttribute('height'));
                return `M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`;
                
            case 'circle':
                const cx = parseFloat(element.getAttribute('cx'));
                const cy = parseFloat(element.getAttribute('cy'));
                const r = parseFloat(element.getAttribute('r'));
                const k = 0.5522848;
                const kr = k * r;
                return `M ${cx-r} ${cy} 
                        C ${cx-r} ${cy-kr} ${cx-kr} ${cy-r} ${cx} ${cy-r}
                        C ${cx+kr} ${cy-r} ${cx+r} ${cy-kr} ${cx+r} ${cy}
                        C ${cx+r} ${cy+kr} ${cx+kr} ${cy+r} ${cx} ${cy+r}
                        C ${cx-kr} ${cy+r} ${cx-r} ${cy+kr} ${cx-r} ${cy} Z`;
                
            case 'ellipse':
                const ecx = parseFloat(element.getAttribute('cx'));
                const ecy = parseFloat(element.getAttribute('cy'));
                const rx = parseFloat(element.getAttribute('rx'));
                const ry = parseFloat(element.getAttribute('ry'));
                const kx = 0.5522848 * rx;
                const ky = 0.5522848 * ry;
                return `M ${ecx-rx} ${ecy}
                        C ${ecx-rx} ${ecy-ky} ${ecx-kx} ${ecy-ry} ${ecx} ${ecy-ry}
                        C ${ecx+kx} ${ecy-ry} ${ecx+rx} ${ecy-ky} ${ecx+rx} ${ecy}
                        C ${ecx+rx} ${ecy+ky} ${ecx+kx} ${ecy+ry} ${ecx} ${ecy+ry}
                        C ${ecx-kx} ${ecy+ry} ${ecx-rx} ${ecy+ky} ${ecx-rx} ${ecy} Z`;
                
            case 'polyline':
            case 'polygon':
                const points = element.getAttribute('points').trim().split(/\s+|,/);
                let pathStr = '';
                for (let i = 0; i < points.length; i += 2) {
                    const cmd = i === 0 ? 'M' : 'L';
                    pathStr += `${cmd} ${points[i]} ${points[i+1]} `;
                }
                if (tagName === 'polygon') pathStr += 'Z';
                return pathStr;
                
            default:
                return null;
        }
    }

    parsePathData(pathData) {
        const segments = [];
        const commands = pathData.match(/[a-zA-Z][^a-zA-Z]*/g);
        
        if (!commands) return segments;
        
        let currentX = 0, currentY = 0;
        let startX = 0, startY = 0;
        
        commands.forEach(cmd => {
            const type = cmd[0];
            const values = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            const isRelative = type === type.toLowerCase();
            
            switch(type.toUpperCase()) {
                case 'M':
                    currentX = isRelative ? currentX + values[0] : values[0];
                    currentY = isRelative ? currentY + values[1] : values[1];
                    startX = currentX;
                    startY = currentY;
                    segments.push({ type: 'move', x: currentX, y: currentY });
                    break;
                    
                case 'L':
                    currentX = isRelative ? currentX + values[0] : values[0];
                    currentY = isRelative ? currentY + values[1] : values[1];
                    segments.push({ type: 'line', x: currentX, y: currentY });
                    break;
                    
                case 'H':
                    currentX = isRelative ? currentX + values[0] : values[0];
                    segments.push({ type: 'line', x: currentX, y: currentY });
                    break;
                    
                case 'V':
                    currentY = isRelative ? currentY + values[0] : values[0];
                    segments.push({ type: 'line', x: currentX, y: currentY });
                    break;
                    
                case 'Z':
                    segments.push({ type: 'line', x: startX, y: startY });
                    currentX = startX;
                    currentY = startY;
                    break;
                    
                case 'C':
                    const steps = 10;
                    const x0 = currentX, y0 = currentY;
                    const x1 = isRelative ? currentX + values[0] : values[0];
                    const y1 = isRelative ? currentY + values[1] : values[1];
                    const x2 = isRelative ? currentX + values[2] : values[2];
                    const y2 = isRelative ? currentY + values[3] : values[3];
                    const x3 = isRelative ? currentX + values[4] : values[4];
                    const y3 = isRelative ? currentY + values[5] : values[5];
                    
                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        const t1 = 1 - t;
                        const x = t1*t1*t1*x0 + 3*t1*t1*t*x1 + 3*t1*t*t*x2 + t*t*t*x3;
                        const y = t1*t1*t1*y0 + 3*t1*t1*t*y1 + 3*t1*t*t*y2 + t*t*t*y3;
                        segments.push({ type: 'line', x, y });
                    }
                    currentX = x3;
                    currentY = y3;
                    break;
            }
        });
        
        return segments;
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context
        this.ctx.save();
        
        // Apply viewport transform
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw work area
        this.drawWorkArea();
        
        // Draw grid
        this.drawGrid();
        
        // Draw SVG with transforms
        if (this.svgPaths.length > 0) {
            this.drawSVG();
        }
        
        // Restore context
        this.ctx.restore();
    }

    drawWorkArea() {
        const scale = Math.min(
            (this.canvas.width - 100) / this.workAreaWidth,
            (this.canvas.height - 100) / this.workAreaHeight
        );
        
        this.workAreaScale = scale;
        this.workAreaOffsetX = this.originX;
        this.workAreaOffsetY = this.canvas.height / this.zoom - this.originY - (this.workAreaHeight * scale);
        
        this.ctx.strokeStyle = '#5B4B9F';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.workAreaOffsetX,
            this.workAreaOffsetY,
            this.workAreaWidth * scale,
            this.workAreaHeight * scale
        );
        
        // Label
        this.ctx.fillStyle = '#5B4B9F';
        this.ctx.font = '14px sans-serif';
        this.ctx.fillText(
            `${this.workAreaWidth} x ${this.workAreaHeight} mm`,
            this.workAreaOffsetX + 10,
            this.workAreaOffsetY - 10
        );
    }

    drawGrid() {
        const scale = this.workAreaScale;
        const gridSize = 10; // 10mm grid
        
        this.ctx.strokeStyle = '#E8E6F0';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.workAreaWidth; x += gridSize) {
            const canvasX = this.workAreaOffsetX + (x * scale);
            this.ctx.beginPath();
            this.ctx.moveTo(canvasX, this.workAreaOffsetY);
            this.ctx.lineTo(canvasX, this.workAreaOffsetY + (this.workAreaHeight * scale));
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.workAreaHeight; y += gridSize) {
            const canvasY = this.workAreaOffsetY + (y * scale);
            this.ctx.beginPath();
            this.ctx.moveTo(this.workAreaOffsetX, canvasY);
            this.ctx.lineTo(this.workAreaOffsetX + (this.workAreaWidth * scale), canvasY);
            this.ctx.stroke();
        }
    }

    drawSVG() {
        const scale = this.workAreaScale;
        
        this.ctx.save();
        
        // Translate to work area origin
        this.ctx.translate(this.workAreaOffsetX, this.workAreaOffsetY);
        
        // Apply SVG transforms
        this.ctx.translate(this.transform.x, this.transform.y);
        this.ctx.rotate(this.transform.rotation * Math.PI / 180);
        this.ctx.scale(this.transform.scale, this.transform.scale);
        
        // Scale SVG to fit
        const svgScale = scale * 0.5; // Start at 50% of work area
        this.ctx.scale(svgScale, svgScale);
        
        // Draw each path
        this.ctx.strokeStyle = '#2D1B69';
        this.ctx.lineWidth = 2 / (svgScale * this.transform.scale);
        
        this.svgPaths.forEach(path => {
            this.ctx.beginPath();
            
            path.segments.forEach((seg, i) => {
                if (i === 0 || seg.type === 'move') {
                    this.ctx.moveTo(seg.x, seg.y);
                } else {
                    this.ctx.lineTo(seg.x, seg.y);
                }
            });
            
            this.ctx.stroke();
        });
        
        this.ctx.restore();
    }

    getTransformedPaths() {
        if (this.svgPaths.length === 0) return [];
        
        const scale = this.workAreaScale * 0.5 * this.transform.scale;
        const rotation = this.transform.rotation * Math.PI / 180;
        
        return this.svgPaths.map(path => {
            const transformedSegments = path.segments.map(seg => {
                // Scale
                let x = seg.x * scale;
                let y = seg.y * scale;
                
                // Rotate
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rx = x * cos - y * sin;
                const ry = x * sin + y * cos;
                
                // Translate
                x = rx + this.transform.x / this.workAreaScale;
                y = ry + this.transform.y / this.workAreaScale;
                
                return { ...seg, x, y };
            });
            
            return {
                ...path,
                segments: transformedSegments
            };
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        this.canvas.style.cursor = tool === 'move' ? 'move' : tool === 'scale' ? 'nwse-resize' : 'crosshair';
    }

    updateWorkArea(width, height) {
        this.workAreaWidth = width;
        this.workAreaHeight = height;
        this.render();
    }

    zoomIn() {
        this.zoom = Math.min(5, this.zoom * 1.2);
        this.render();
    }

    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom / 1.2);
        this.render();
    }

    fitView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    }

    resetOrigin() {
        this.transform = {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0
        };
        this.updateTransformInfo();
        this.render();
    }

    updateTransformInfo() {
        document.getElementById('svgPosInfo').textContent = 
            `X: ${this.transform.x.toFixed(1)}, Y: ${this.transform.y.toFixed(1)}`;
        document.getElementById('svgScaleInfo').textContent = 
            `${(this.transform.scale * 100).toFixed(0)}%`;
        document.getElementById('svgRotationInfo').textContent = 
            `${this.transform.rotation.toFixed(1)}°`;
    }
}
