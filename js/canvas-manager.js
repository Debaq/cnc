// ============================================
// CANVAS MANAGER (Fabric.js) - SISTEMA DE COORDENADAS
// ============================================
/**
 * SISTEMA DE COORDENADAS CONFIGURABLES
 *
 * Este manager permite configurar el punto de origen (0,0) en diferentes posiciones
 * del área de trabajo. Los objetos se mantienen en su posición visual en el canvas,
 * pero las coordenadas G-code se calculan relativas al origen configurado.
 *
 * DIRECCIONES DE EJES SEGÚN EL ORIGEN:
 *
 * top-left:         X+ → derecha,   Y+ → abajo
 * top-right:        X+ → izquierda, Y+ → abajo
 * bottom-left:      X+ → derecha,   Y+ → arriba (DEFAULT CNC)
 * bottom-right:     X+ → izquierda, Y+ → arriba
 * center:           X+ → derecha,   Y+ → arriba (permite valores negativos)
 *
 * FLUJO DE TRABAJO:
 * 1. Usuario configura origen en modal de área de trabajo
 * 2. El marcador visual (punto amarillo + ejes XY) se mueve a la posición configurada
 * 3. Los objetos NO se mueven visualmente en el canvas
 * 4. Al generar G-code, transformPoint() calcula coordenadas relativas al origen
 * 5. La máquina interpreta las coordenadas correctamente según su configuración
 *
 * NOTA IMPORTANTE:
 * El G-code generado contiene coordenadas relativas al origen configurado.
 * La máquina debe estar configurada (G54, G55, etc.) para interpretar
 * el origen en la misma posición que se configuró aquí.
 */
class CanvasManager {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.fabricCanvas = null;
        this.svgGroup = null;
        this.layers = []; // Sistema de capas

        // Work area config (mm)
        this.workArea = { width: 400, height: 400, origin: 'bottom-left' };
        this.pixelsPerMM = 2;

        // Grid - MEJORADO: 20mm = 2cm
        this.gridSize = 20; // 2cm por cuadro
        this.showGrid = true;

        // Origin marker
        this.originMarker = null;

        // Object origin marker (shown when object is selected)
        this.objectOriginMarker = null;
    }

    /**
     * Mapea el origen del área de trabajo a originX/originY de Fabric.js
     * Esto asegura que los objetos usen el mismo punto de referencia que el área
     * @returns {Object} {originX: 'left'|'center'|'right', originY: 'top'|'center'|'bottom'}
     */
    getObjectOriginFromWorkArea() {
        const origin = this.workArea.origin || 'bottom-left';

        const mapping = {
            'bottom-left': { originX: 'left', originY: 'bottom' },
            'bottom-right': { originX: 'right', originY: 'bottom' },
            'top-left': { originX: 'left', originY: 'top' },
            'top-right': { originX: 'right', originY: 'top' },
            'center': { originX: 'center', originY: 'center' }
        };

        return mapping[origin] || { originX: 'left', originY: 'bottom' };
    }

    /**
     * Calcula las coordenadas de máquina (en mm) del punto de origen de un objeto
     * Estas son las coordenadas que se muestran al usuario y se usan en el G-code
     * @param {fabric.Object} obj - El objeto de Fabric.js
     * @returns {Object} {x, y} coordenadas en mm relativas al origen del área
     */
    getObjectMachineCoordinates(obj) {
        if (!obj) return { x: 0, y: 0 };

        // Obtener el punto de origen del objeto en coordenadas canvas
        const objOriginCanvas = this.getObjectOriginPoint(obj);
        if (!objOriginCanvas) return { x: 0, y: 0 };

        // Obtener la posición del origen del área en coordenadas canvas
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const origin = this.workArea.origin || 'bottom-left';
        const areaOriginCanvas = this.getOriginPosition(origin, workW, workH);

        // Calcular la distancia en píxeles desde el origen del área
        const deltaX = objOriginCanvas.x - areaOriginCanvas.x;
        const deltaY = objOriginCanvas.y - areaOriginCanvas.y;

        // Convertir a coordenadas de máquina según la dirección de los ejes
        let machineX, machineY;

        switch(origin) {
            case 'top-left':
                // X+ derecha, Y+ abajo
                machineX = deltaX / this.pixelsPerMM;
                machineY = deltaY / this.pixelsPerMM;
                break;
            case 'top-right':
                // X+ izquierda (invertir), Y+ abajo
                machineX = -deltaX / this.pixelsPerMM;
                machineY = deltaY / this.pixelsPerMM;
                break;
            case 'bottom-left':
                // X+ derecha, Y+ arriba (invertir Y) - DEFAULT CNC
                machineX = deltaX / this.pixelsPerMM;
                machineY = -deltaY / this.pixelsPerMM;
                break;
            case 'bottom-right':
                // X+ izquierda (invertir X), Y+ arriba (invertir Y)
                machineX = -deltaX / this.pixelsPerMM;
                machineY = -deltaY / this.pixelsPerMM;
                break;
            case 'center':
                // X+ derecha, Y+ arriba (invertir Y) - Permite negativos
                machineX = deltaX / this.pixelsPerMM;
                machineY = -deltaY / this.pixelsPerMM;
                break;
            default:
                // Fallback a bottom-left
                machineX = deltaX / this.pixelsPerMM;
                machineY = -deltaY / this.pixelsPerMM;
        }

        return {
            x: Math.round(machineX * 100) / 100, // 2 decimales
            y: Math.round(machineY * 100) / 100
        };
    }

    /**
     * Calcula la posición visual del punto de origen de un objeto en coordenadas canvas
     * @param {fabric.Object} obj - El objeto de Fabric.js
     * @returns {Object} {x, y} posición en canvas del punto de origen del objeto
     */
    getObjectOriginPoint(obj) {
        if (!obj) return null;

        // Obtener el bounding box del objeto
        const boundingRect = obj.getBoundingRect(true); // true = absolute coords
        const left = boundingRect.left;
        const top = boundingRect.top;
        const width = boundingRect.width;
        const height = boundingRect.height;

        let x, y;

        // Calcular la posición según originX
        switch(obj.originX) {
            case 'left':
                x = left;
                break;
            case 'center':
                x = left + width / 2;
                break;
            case 'right':
                x = left + width;
                break;
            default:
                x = left;
        }

        // Calcular la posición según originY
        switch(obj.originY) {
            case 'top':
                y = top;
                break;
            case 'center':
                y = top + height / 2;
                break;
            case 'bottom':
                y = top + height;
                break;
            default:
                y = top;
        }

        return { x, y };
    }

    /**
     * Muestra un marcador visual en el punto de origen del objeto seleccionado
     * @param {fabric.Object} obj - El objeto seleccionado
     */
    showObjectOriginMarker(obj) {
        // Eliminar marcador anterior si existe
        this.hideObjectOriginMarker();

        if (!obj) return;

        const originPoint = this.getObjectOriginPoint(obj);
        if (!originPoint) return;

        // Crear marcador: círculo cyan con borde oscuro
        const marker = new fabric.Circle({
            left: originPoint.x - 5,
            top: originPoint.y - 5,
            radius: 5,
            fill: '#00FFFF',
            stroke: '#0088AA',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            hoverCursor: 'default',
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            name: 'objectOriginMarker'
        });

        this.fabricCanvas.add(marker);
        this.objectOriginMarker = marker;

        // El marcador se agrega al final, estará encima de otros objetos
        this.fabricCanvas.renderAll();

        console.log('📍 Showing object origin marker at', originPoint.x.toFixed(1), originPoint.y.toFixed(1));
    }

    /**
     * Oculta el marcador de origen del objeto
     */
    hideObjectOriginMarker() {
        if (this.objectOriginMarker) {
            this.fabricCanvas.remove(this.objectOriginMarker);
            this.objectOriginMarker = null;
        }
    }

    /**
     * Actualiza la posición del marcador cuando el objeto se mueve/transforma
     * @param {boolean} skipRender - Si es true, no renderiza (para optimizar en loops)
     */
    updateObjectOriginMarker(skipRender = false) {
        const activeObj = this.fabricCanvas.getActiveObject();
        if (activeObj && this.objectOriginMarker) {
            const originPoint = this.getObjectOriginPoint(activeObj);
            if (originPoint) {
                this.objectOriginMarker.set({
                    left: originPoint.x - 5,
                    top: originPoint.y - 5
                });
                this.objectOriginMarker.setCoords();

                // El marcador se mantiene visible sin necesidad de reordenar
                if (!skipRender) {
                    this.fabricCanvas.requestRenderAll();
                }
            }
        }
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

        // Handle window resize con debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 100);
        });

        // ResizeObserver para detectar cambios en el contenedor (más confiable)
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => this.resize(), 100);
            });
            this.resizeObserver.observe(parent);
        }

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

        // No hacer nada si el tamaño no cambió significativamente
        if (Math.abs(this.fabricCanvas.width - newWidth) < 10 &&
            Math.abs(this.fabricCanvas.height - newHeight) < 10) {
            return;
        }

        console.log('📐 Resizing canvas from', this.fabricCanvas.width, 'x', this.fabricCanvas.height,
                    'to', newWidth, 'x', newHeight);

        // Guardar el estado actual del viewport
        const currentZoom = this.fabricCanvas.getZoom();
        const vpt = this.fabricCanvas.viewportTransform.slice(); // Copiar array

        // Calcular el centro actual del viewport en coordenadas del canvas
        const oldCenterX = (this.fabricCanvas.width / 2 - vpt[4]) / currentZoom;
        const oldCenterY = (this.fabricCanvas.height / 2 - vpt[5]) / currentZoom;

        // Cambiar tamaño del canvas
        this.fabricCanvas.setWidth(newWidth);
        this.fabricCanvas.setHeight(newHeight);

        // Recalcular la posición del viewport para mantener el centro
        const newVpt = this.fabricCanvas.viewportTransform;
        newVpt[4] = newWidth / 2 - oldCenterX * currentZoom;
        newVpt[5] = newHeight / 2 - oldCenterY * currentZoom;
        this.fabricCanvas.setViewportTransform(newVpt);

        // Redraw grid and origin
        this.clearGrid();
        this.setupGrid();
        this.setupOrigin();

        this.fabricCanvas.renderAll();

        console.log('✅ Canvas resized successfully');
    }

    clearGrid() {
        // Remove old grid and work area (but keep objectOriginMarker)
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
        // DEPRECATED: Use getOriginPosition() instead
        // This method is kept for compatibility only
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        return this.getOriginPosition(this.workArea.origin || 'bottom-left', workW, workH);
    }

    setupOrigin() {
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const origin = this.workArea.origin || 'bottom-left';

        // Obtener la posición del origen según la configuración
        const originPos = this.getOriginPosition(origin, workW, workH);
        const originX = originPos.x;
        const originY = originPos.y;

        console.log('📍 Setting up origin at:', originX.toFixed(1), originY.toFixed(1), '- Type:', origin);

        const axisLength = 40;

        // Determinar la dirección de los ejes según el origen
        let xAxisEndX = originX + axisLength; // Por defecto X+ hacia la derecha
        let yAxisEndY = originY - axisLength; // Por defecto Y+ hacia arriba

        switch(origin) {
            case 'top-left':
                // X+ hacia derecha, Y+ hacia abajo
                xAxisEndX = originX + axisLength;
                yAxisEndY = originY + axisLength;
                break;
            case 'top-right':
                // X+ hacia izquierda, Y+ hacia abajo
                xAxisEndX = originX - axisLength;
                yAxisEndY = originY + axisLength;
                break;
            case 'bottom-left':
                // X+ hacia derecha, Y+ hacia arriba (default CNC)
                xAxisEndX = originX + axisLength;
                yAxisEndY = originY - axisLength;
                break;
            case 'bottom-right':
                // X+ hacia izquierda, Y+ hacia arriba
                xAxisEndX = originX - axisLength;
                yAxisEndY = originY - axisLength;
                break;
            case 'center':
                // X+ hacia derecha, Y+ hacia arriba (permite negativos en ambos)
                xAxisEndX = originX + axisLength;
                yAxisEndY = originY - axisLength;
                break;
        }

        // X axis (red)
        const xAxis = new fabric.Line([originX, originY, xAxisEndX, originY], {
            stroke: '#FF0000',
            strokeWidth: 3,
            selectable: false,
            evented: false,
            name: 'xAxis'
        });

        // Y axis (green)
        const yAxis = new fabric.Line([originX, originY, originX, yAxisEndY], {
            stroke: '#00FF00',
            strokeWidth: 3,
            selectable: false,
            evented: false,
            name: 'yAxis'
        });

        // Origin dot
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

        // Arrow on X (triangle) - La dirección depende de si X es positivo o negativo
        const xArrowAngle = xAxisEndX > originX ? 90 : -90; // 90 = derecha, -90 = izquierda
        const arrowX = new fabric.Triangle({
            left: xAxisEndX - 4,
            top: originY - 4,
            width: 8,
            height: 8,
            fill: '#FF0000',
            angle: xArrowAngle,
            selectable: false,
            evented: false
        });

        // Arrow on Y (triangle) - La dirección depende de si Y es positivo hacia arriba o abajo
        const yArrowAngle = yAxisEndY < originY ? 0 : 180; // 0 = arriba, 180 = abajo
        const arrowY = new fabric.Triangle({
            left: originX - 4,
            top: yAxisEndY - 4,
            width: 8,
            height: 8,
            fill: '#00FF00',
            angle: yArrowAngle,
            selectable: false,
            evented: false
        });

        this.fabricCanvas.add(xAxis, yAxis, originDot, arrowX, arrowY);
        console.log(`   ✅ Origin markers added at ${origin} (X: ${xAxisEndX > originX ? 'right +' : 'left +'}, Y: ${yAxisEndY < originY ? 'up +' : 'down +'})`);

        this.originMarker = { xAxis, yAxis, originDot, arrowX, arrowY };
    }

    setupTools() {
        // Listeners para actualizar los inputs cuando se mueve/escala cualquier objeto
        this.fabricCanvas.on('object:modified', () => {
            if (this.app && this.app.updateSVGDimensions) {
                this.app.updateSVGDimensions();
            }
        });

        this.fabricCanvas.on('object:moving', () => {
            if (this.app && this.app.updateSVGDimensions) {
                this.app.updateSVGDimensions();
            }
        });

        this.fabricCanvas.on('object:scaling', () => {
            if (this.app && this.app.updateSVGDimensions) {
                this.app.updateSVGDimensions();
            }
        });

        this.fabricCanvas.on('object:rotating', () => {
            if (this.app && this.app.updateSVGDimensions) {
                this.app.updateSVGDimensions();
            }
        });

        // Listeners para actualizar inputs al seleccionar un objeto
        this.fabricCanvas.on('selection:created', (e) => {
            // Mostrar marcador de origen del objeto
            const selectedObj = this.fabricCanvas.getActiveObject();
            if (selectedObj) {
                this.showObjectOriginMarker(selectedObj);
            }

            if (this.app) {
                // Actualizar dimensiones
                if (this.app.updateSVGDimensions) {
                    this.app.updateSVGDimensions();
                }

                // Detectar si es selección múltiple
                const selectedObjects = e.selected || [e.target];

                if (selectedObjects.length > 1) {
                    // Crear grupo temporal
                    const groupElements = selectedObjects
                        .map(obj => this.app.elements.find(el => el.id === obj?.elementId))
                        .filter(el => el);

                    this.app.selectedElementId = 'temp-group';
                    this.app.selectedElements = groupElements;
                    this.app.showPropertiesPanel = true;
                    this.app.isGroupSelection = true;
                } else {
                    // Selección individual
                    const selectedObj = selectedObjects[0];
                    const element = this.app.elements.find(el => el.id === selectedObj?.elementId);

                    if (element) {
                        this.app.selectedElementId = element.id;
                        this.app.showPropertiesPanel = true;
                        this.app.selectedElement = element;
                        this.app.selectedElements = [element];
                        this.app.isGroupSelection = false;
                    }
                }
            }
        });

        this.fabricCanvas.on('selection:updated', (e) => {
            // Actualizar marcador de origen del objeto
            const selectedObj = this.fabricCanvas.getActiveObject();
            if (selectedObj) {
                this.showObjectOriginMarker(selectedObj);
            }

            if (this.app) {
                // Actualizar dimensiones
                if (this.app.updateSVGDimensions) {
                    this.app.updateSVGDimensions();
                }

                // Detectar si es selección múltiple
                const selectedObjects = e.selected || [e.target];

                if (selectedObjects.length > 1) {
                    // Crear grupo temporal
                    const groupElements = selectedObjects
                        .map(obj => this.app.elements.find(el => el.id === obj?.elementId))
                        .filter(el => el);

                    this.app.selectedElementId = 'temp-group';
                    this.app.selectedElements = groupElements;
                    this.app.showPropertiesPanel = true;
                    this.app.isGroupSelection = true;
                } else {
                    // Selección individual
                    const selectedObj = selectedObjects[0];
                    const element = this.app.elements.find(el => el.id === selectedObj?.elementId);

                    if (element) {
                        this.app.selectedElementId = element.id;
                        this.app.showPropertiesPanel = true;
                        this.app.selectedElement = element;
                        this.app.selectedElements = [element];
                        this.app.isGroupSelection = false;
                    }
                }
            }
        });

        // Ocultar panel y marcador cuando se deselecciona
        this.fabricCanvas.on('selection:cleared', (e) => {
            // Ocultar marcador de origen del objeto
            this.hideObjectOriginMarker();

            if (this.app) {
                this.app.selectedElementId = null;
                this.app.showPropertiesPanel = false;
                this.app.selectedElement = null;
                this.app.selectedElements = [];
                this.app.isGroupSelection = false;
            }
        });

        // Actualizar marcador en CADA frame antes de renderizar
        // Esto asegura que el marcador siempre esté sincronizado con el objeto
        this.fabricCanvas.on('before:render', () => {
            this.updateObjectOriginMarker(true); // skipRender = true para evitar loop
        });

        // Actualizar panel y marcador cuando el objeto se modifica
        this.fabricCanvas.on('object:modified', (e) => {
            this.updateObjectOriginMarker();
            if (this.app && this.app.updateSVGDimensions) {
                this.app.updateSVGDimensions();
            }
        });

        this.fabricCanvas.on('object:moving', (e) => {
            // No renderizar aquí porque before:render lo hará
            if (this.app && this.app.updateSVGDimensions) {
                this.app.updateSVGDimensions();
            }
        });

        this.fabricCanvas.on('object:scaling', (e) => {
            // No renderizar aquí porque before:render lo hará
            if (this.app && this.app.updateSVGDimensions) {
                this.app.updateSVGDimensions();
            }
        });

        this.fabricCanvas.on('object:rotating', (e) => {
            // No renderizar aquí porque before:render lo hará
            if (this.app && this.app.updateSVGDimensions) {
                this.app.updateSVGDimensions();
            }
        });

        // Mouse wheel zoom - centrado en el área de trabajo
        this.fabricCanvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.fabricCanvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 10) zoom = 10;
            if (zoom < 0.1) zoom = 0.1;

            // Hacer zoom hacia el centro del canvas en lugar del cursor
            // Esto mantiene el área de trabajo centrada
            const center = this.fabricCanvas.getCenter();
            this.fabricCanvas.zoomToPoint({ x: center.left, y: center.top }, zoom);

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
        const center = this.fabricCanvas.getCenter();
        let zoom = this.fabricCanvas.getZoom();
        zoom *= 1.2;
        if (zoom > 10) zoom = 10;
        this.fabricCanvas.zoomToPoint({ x: center.left, y: center.top }, zoom);
        this.fabricCanvas.renderAll();
    }

    zoomOut() {
        const center = this.fabricCanvas.getCenter();
        let zoom = this.fabricCanvas.getZoom();
        zoom *= 0.8;
        if (zoom < 0.1) zoom = 0.1;
        this.fabricCanvas.zoomToPoint({ x: center.left, y: center.top }, zoom);
        this.fabricCanvas.renderAll();
    }

    fitView() {
        // Siempre ajustar el área de trabajo completa (no solo el SVG)
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;

        // Calcular zoom para que el área de trabajo se vea completa
        const zoom = Math.min(
            (this.fabricCanvas.width * 0.9) / workW,
            (this.fabricCanvas.height * 0.9) / workH
        );

        // Aplicar zoom
        this.fabricCanvas.setZoom(zoom);

        // Centrar el área de trabajo en el canvas
        const originX = this.fabricCanvas.width / 2 - (workW * zoom) / 2;
        const originY = this.fabricCanvas.height / 2 - (workH * zoom) / 2;

        this.fabricCanvas.viewportTransform[4] = originX;
        this.fabricCanvas.viewportTransform[5] = originY;
        this.fabricCanvas.renderAll();

        console.log('✅ Fit View: área de trabajo centrada y ajustada');
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

    /**
     * Calcula la posición del origen en coordenadas canvas según el tipo de origen
     * @param {string} origin - El tipo de origen ('bottom-left', 'center', etc.)
     * @param {number} workW - Ancho del área de trabajo en píxeles
     * @param {number} workH - Alto del área de trabajo en píxeles
     * @returns {Object} {x, y} posición del origen en coordenadas canvas
     */
    getOriginPosition(origin, workW, workH) {
        const centerX = this.fabricCanvas.width / 2;
        const centerY = this.fabricCanvas.height / 2;

        switch (origin) {
            case 'bottom-left':
                return { x: centerX - workW / 2, y: centerY + workH / 2 };
            case 'bottom-center':
                return { x: centerX, y: centerY + workH / 2 };
            case 'bottom-right':
                return { x: centerX + workW / 2, y: centerY + workH / 2 };
            case 'center-left':
                return { x: centerX - workW / 2, y: centerY };
            case 'center':
                return { x: centerX, y: centerY };
            case 'center-right':
                return { x: centerX + workW / 2, y: centerY };
            case 'top-left':
                return { x: centerX - workW / 2, y: centerY - workH / 2 };
            case 'top-center':
                return { x: centerX, y: centerY - workH / 2 };
            case 'top-right':
                return { x: centerX + workW / 2, y: centerY - workH / 2 };
            default:
                return { x: centerX - workW / 2, y: centerY + workH / 2 };
        }
    }

    /**
     * Verifica si hay elementos en el canvas (aparte de los elementos del sistema)
     * @returns {boolean} true si hay elementos de usuario en el canvas
     */
    hasUserElements() {
        const objects = this.fabricCanvas.getObjects();
        return objects.some(obj => {
            return obj.name !== 'gridLine' &&
                   obj.name !== 'workArea' &&
                   obj.name !== 'xAxis' &&
                   obj.name !== 'yAxis' &&
                   obj.name !== 'origin' &&
                   obj.name !== 'objectOriginMarker';
        });
    }

    /**
     * Actualiza el punto de origen (originX/originY) de todos los objetos según el nuevo origen del área
     * Mantiene la posición visual de los objetos
     * @param {string} newOrigin - El nuevo origen del área (ej: 'center', 'top-left', etc.)
     */
    updateAllObjectOrigins(newOrigin) {
        console.log('🔄 Updating all object origins to match area origin:', newOrigin);

        const objects = this.fabricCanvas.getObjects();
        const newObjectOrigin = this.getObjectOriginFromWorkArea();
        let updatedCount = 0;

        objects.forEach(obj => {
            // Ignorar elementos del sistema
            if (obj.name === 'gridLine' || obj.name === 'workArea' ||
                obj.name === 'xAxis' || obj.name === 'yAxis' ||
                obj.name === 'origin' || obj.name === 'objectOriginMarker') {
                return;
            }

            // Guardar posición visual actual (usando getCenterPoint que es independiente del origen)
            const center = obj.getCenterPoint();

            // Cambiar el punto de origen del objeto
            obj.set({
                originX: newObjectOrigin.originX,
                originY: newObjectOrigin.originY
            });

            // Recalcular left/top para que el objeto permanezca en la misma posición visual
            // usando el centro como referencia
            obj.setPositionByOrigin(center, 'center', 'center');
            obj.setCoords();

            updatedCount++;
        });

        console.log(`   ✅ Updated origin for ${updatedCount} objects`);
        console.log(`   📍 New object origin: ${newObjectOrigin.originX}, ${newObjectOrigin.originY}`);

        // Renderizar primero para que los cambios se apliquen
        this.fabricCanvas.renderAll();

        // Si hay un objeto seleccionado, forzar actualización de su marcador
        const activeObj = this.fabricCanvas.getActiveObject();
        if (activeObj && this.objectOriginMarker) {
            // Ocultar y volver a mostrar para que se posicione correctamente
            this.hideObjectOriginMarker();
            // Usar setTimeout para asegurar que se renderiza después del cambio
            setTimeout(() => {
                this.showObjectOriginMarker(activeObj);
            }, 10);
        }
    }

    // NUEVA FUNCIÓN: Cambiar área de trabajo
    setWorkArea(width, height, origin = 'bottom-left') {
        const oldOrigin = this.workArea.origin;
        const oldWidth = this.workArea.width;
        const oldHeight = this.workArea.height;

        this.workArea.width = width;
        this.workArea.height = height;
        this.workArea.origin = origin;

        // Recalcular pixelsPerMM si es necesario
        const workAreaPx = Math.max(width, height) * this.pixelsPerMM;
        const minDimension = Math.min(this.fabricCanvas.width, this.fabricCanvas.height);

        if (workAreaPx > minDimension * 0.9) {
            this.pixelsPerMM = (minDimension * 0.8) / Math.max(width, height);
        }

        // Redibujar el grid y el marcador de origen del área
        this.clearGrid();
        this.setupGrid();
        this.setupOrigin();

        // Si cambió el origen, actualizar el punto de referencia de TODOS los objetos
        if (oldOrigin !== origin) {
            console.log('🔄 Origin changed:', oldOrigin, '→', origin);
            this.updateAllObjectOrigins(origin);
        } else {
            this.fabricCanvas.renderAll();
        }

        // Actualizar UI
        this.app.workAreaSize = `${width} x ${height}`;

        console.log('✅ Work area changed to:', width, 'x', height, 'mm, origin:', origin);

        // Retornar si cambió el origen para que app.js lo detecte
        return {
            originChanged: oldOrigin !== origin,
            sizeChanged: oldWidth !== width || oldHeight !== height
        };
    }

    async loadSVG(file, elementId = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                const svgString = e.target.result;

                try {
                    // Fabric.js 6.x usa Promise en lugar de callback
                    const result = await fabric.loadSVGFromString(svgString);

                    // En v6, result es un objeto con { objects, options }
                    const objects = result.objects || [];
                    const options = result.options || {};

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

                    // Calculate work area dimensions
                    const workW = this.workArea.width * this.pixelsPerMM;
                    const workH = this.workArea.height * this.pixelsPerMM;

                    // Obtener la posición del origen configurado
                    const origin = this.workArea.origin || 'bottom-left';
                    const originPos = this.getOriginPosition(origin, workW, workH);

                    // IMPORTANTE: Establecer el punto de origen del objeto igual al del área
                    const objectOrigin = this.getObjectOriginFromWorkArea();

                    // NO escalar automáticamente - mantener tamaño real
                    // El usuario puede escalar manualmente si lo necesita
                    const scale = 1;

                    // Posicionar el SVG cerca del origen configurado con un pequeño offset
                    // El objeto usa el mismo punto de referencia que el área de trabajo
                    const offsetMM = 10; // 10mm de offset
                    const offsetPx = offsetMM * this.pixelsPerMM;

                    this.svgGroup.set({
                        left: originPos.x + offsetPx,
                        top: originPos.y + offsetPx,
                        originX: objectOrigin.originX,
                        originY: objectOrigin.originY,
                        scaleX: scale,
                        scaleY: scale,
                        selectable: true,
                        hasControls: true,
                        hasBorders: true
                    });

                    console.log('   📍 Object origin set to:', objectOrigin.originX, objectOrigin.originY);

                    // No necesitamos bboxOffset con el nuevo sistema de coordenadas

                    // Si se proporcionó un elementId, asignarlo al objeto
                    if (elementId) {
                        this.svgGroup.set('elementId', elementId);
                    }

                    this.fabricCanvas.add(this.svgGroup);
                    this.fabricCanvas.setActiveObject(this.svgGroup);
                    this.fabricCanvas.renderAll();

                    console.log('✅ SVG positioned at origin');
                    console.log('   Size:', this.svgGroup.width.toFixed(1), 'x', this.svgGroup.height.toFixed(1), 'px');
                    console.log('   Scale:', scale.toFixed(2));
                    console.log('   ScaledWidth:', (this.svgGroup.width * this.svgGroup.scaleX).toFixed(1), 'px');
                    console.log('   ScaledHeight:', (this.svgGroup.height * this.svgGroup.scaleY).toFixed(1), 'px');
                    console.log('   BoundingRect:', this.svgGroup.getBoundingRect());

                    resolve(this.svgGroup); // Devolver el grupo para agregarlo a elementos

                } catch (error) {
                    console.error('❌ Error loading SVG:', error);
                    reject(error);
                }
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

        if (element.type === 'path' || element.type === 'svg' || element.type === 'maker') {
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
        // 1. Aplicar la matriz de transformación de Fabric para obtener coordenadas absolutas en canvas
        const transformed = fabric.util.transformPoint({ x: x, y: y }, matrix);
        const canvasX = transformed.x;
        const canvasY = transformed.y;

        // 2. Obtener la posición del origen configurado en el canvas
        const workW = this.workArea.width * this.pixelsPerMM;
        const workH = this.workArea.height * this.pixelsPerMM;
        const origin = this.workArea.origin || 'bottom-left';
        const originPos = this.getOriginPosition(origin, workW, workH);

        // 3. Calcular la distancia desde el origen configurado
        const deltaX = canvasX - originPos.x;
        const deltaY = canvasY - originPos.y;

        // 4. Convertir a coordenadas de máquina según la dirección de los ejes
        let machineX, machineY;

        switch(origin) {
            case 'top-left':
                // X+ derecha, Y+ abajo
                machineX = deltaX / this.pixelsPerMM;
                machineY = deltaY / this.pixelsPerMM;
                break;
            case 'top-right':
                // X+ izquierda (invertir), Y+ abajo
                machineX = -deltaX / this.pixelsPerMM;
                machineY = deltaY / this.pixelsPerMM;
                break;
            case 'bottom-left':
                // X+ derecha, Y+ arriba (invertir Y) - DEFAULT CNC
                machineX = deltaX / this.pixelsPerMM;
                machineY = -deltaY / this.pixelsPerMM;
                break;
            case 'bottom-right':
                // X+ izquierda (invertir X), Y+ arriba (invertir Y)
                machineX = -deltaX / this.pixelsPerMM;
                machineY = -deltaY / this.pixelsPerMM;
                break;
            case 'center':
                // X+ derecha, Y+ arriba (invertir Y) - Permite negativos
                machineX = deltaX / this.pixelsPerMM;
                machineY = -deltaY / this.pixelsPerMM;
                break;
            default:
                // Fallback a bottom-left
                machineX = deltaX / this.pixelsPerMM;
                machineY = -deltaY / this.pixelsPerMM;
        }

        // Debug: log first point transformation
        if (x === 0 && y === 0) {
            console.log('🔍 Point transformation debug:');
            console.log('   Origin mode:', origin);
            console.log('   Input (local):', x, y);
            console.log('   After matrix (canvas):', canvasX.toFixed(2), canvasY.toFixed(2));
            console.log('   Origin position (canvas):', originPos.x.toFixed(2), originPos.y.toFixed(2));
            console.log('   Delta from origin:', deltaX.toFixed(2), deltaY.toFixed(2));
            console.log('   Pixels per MM:', this.pixelsPerMM);
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
