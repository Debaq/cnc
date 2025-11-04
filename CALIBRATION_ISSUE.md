# Problema de Calibración de Coordenadas G-code

**Fecha:** 2025-11-04
**Estado:** ❌ NO RESUELTO

---

## 🔴 Problema

El G-code generado para objetos posicionados manualmente NO coincide con las coordenadas esperadas.

### Ejemplo de Prueba
- **Objeto:** Cuadrado de 50x50mm
- **Posición deseada:** (10, 10) mm desde el origen (esquina inferior izquierda)
- **Origen configurado:** `bottom-left` (X+ derecha, Y+ arriba)

### Coordenadas Esperadas (sin compensación de herramienta)
```gcode
; Cuadrado 50x50mm con esquina inferior izquierda en (10, 10)
X10.000 Y10.000  ; Esquina inferior izquierda
X60.000 Y10.000  ; Esquina inferior derecha
X60.000 Y60.000  ; Esquina superior derecha
X10.000 Y60.000  ; Esquina superior izquierda
```

### Coordenadas Reales Generadas
```gcode
; Con compensación center y herramienta 3.175mm (radio 1.5875mm)
X35.448 Y-14.552  ; ~(35, -14)
X85.448 Y-14.552  ; ~(85, -14)
X85.448 Y35.448   ; ~(85, 35)
X35.448 Y35.448   ; ~(35, 35)
```

### Análisis del Error

**Eje X:**
- Esperado: 10 a 60 mm
- Real: 35.448 a 85.448 mm
- **Error: +25.448 mm** (centro desplazado de 35 a 60.448)

**Eje Y:**
- Esperado: 10 a 60 mm
- Real: -14.552 a 35.448 mm
- **Error: -24.552 mm** (centro desplazado de 35 a 10.448)

**Patrón del error:**
- El cuadrado tiene un desplazamiento constante
- El tamaño del cuadrado (50mm) es CORRECTO
- Ambos ejes tienen aproximadamente 25mm de error (¡la mitad del tamaño del cuadrado!)
- Esto sugiere un problema con el punto de origen del objeto vs punto de referencia

---

## 🔍 Investigación Realizada

### 1. Análisis del Flujo de Generación de G-code

```
addTestSquare() [app.js:2559]
    ↓
loadSVG() [canvas-manager.js:1050]
    ↓ (establece originX/originY del objeto)
getPathsFromElement() [canvas-manager.js:1157]
    ↓
extractPathFromObject() [canvas-manager.js:1184]
    ↓
transformPoint() [canvas-manager.js:1318]
    ↓
generateCNCToolpath() [gcode-generator.js:50]
```

### 2. Componentes Clave

#### A. Sistema de Orígenes (`canvas-manager.js`)

El sistema usa dos sistemas de coordenadas:

1. **Canvas (Fabric.js):**
   - Origen: esquina superior izquierda
   - X+ → derecha
   - Y+ → abajo

2. **Máquina CNC (G-code):**
   - Origen configurable (ej: `bottom-left`)
   - X+ → derecha
   - Y+ → arriba

**Mapeo de orígenes:**
```javascript
getObjectOriginFromWorkArea() {
    'bottom-left':  { originX: 'left',   originY: 'bottom' }
    'bottom-right': { originX: 'right',  originY: 'bottom' }
    'top-left':     { originX: 'left',   originY: 'top' }
    'top-right':    { originX: 'right',  originY: 'top' }
    'center':       { originX: 'center', originY: 'center' }
}
```

#### B. Función de Transformación (`transformPoint`)

**Ubicación:** `canvas-manager.js:1318-1385`

```javascript
transformPoint(x, y, matrix, originX, originY, groupLeft, groupTop) {
    // 1. Aplicar transformación de Fabric → coordenadas absolutas canvas
    const transformed = fabric.util.transformPoint({ x, y }, matrix);
    const canvasX = transformed.x;
    const canvasY = transformed.y;

    // 2. Obtener posición del origen configurado
    const originPos = this.getOriginPosition(origin, workW, workH);

    // 3. Calcular delta desde el origen
    const deltaX = canvasX - originPos.x;
    const deltaY = canvasY - originPos.y;

    // 4. Convertir a coordenadas de máquina según orientación
    switch(origin) {
        case 'bottom-left':
            machineX = deltaX / this.pixelsPerMM;
            machineY = -deltaY / this.pixelsPerMM;  // Invertir Y
            break;
        // ... otros casos
    }

    return { x: machineX, y: machineY };
}
```

**PROBLEMA SOSPECHOSO:** Los parámetros `originX` y `originY` se pasan pero NO se usan en la función. Esto podría ser la causa raíz.

#### C. Extracción de Puntos del Rectángulo

**Ubicación:** `canvas-manager.js:1275-1283`

```javascript
case 'rect':
    const w = obj.width;
    const h = obj.height;
    points.push(this.transformPoint(0, 0, matrix, originX, originY, groupLeft, groupTop));
    points.push(this.transformPoint(w, 0, matrix, originX, originY, groupLeft, groupTop));
    points.push(this.transformPoint(w, h, matrix, originX, originY, groupLeft, groupTop));
    points.push(this.transformPoint(0, h, matrix, originX, originY, groupLeft, groupTop));
    points.push(this.transformPoint(0, 0, matrix, originX, originY, groupLeft, groupTop)); // Close
    break;
```

**Observación:** Los puntos se extraen en coordenadas locales del objeto (0,0), (w,0), (w,h), (0,h).

### 3. Compensación de Herramienta

El G-code incluye compensación por radio de herramienta:
- Herramienta: 3.175mm de diámetro (radio 1.5875mm)
- Modo: `center` (sin offset)

**NOTA:** Aunque el modo es "center", veo offsets en el código. Verificar `applyToolCompensation()`.

---

## 🔧 Soluciones Intentadas

### Intento #1: Corrección en `addTestSquare()`

**Archivo:** `js/app.js:2673-2706`

**Problema identificado:** El código usaba `svgGroup.set({ left, top })` directamente, lo cual no maneja correctamente el escalado y los puntos de origen personalizados.

**Solución aplicada:**
```javascript
// ANTES (incorrecto):
svgGroup.set({
    left: canvasLeft,
    top: canvasTop
});

// DESPUÉS (correcto):
const objectOrigin = this.canvasManager.getObjectOriginFromWorkArea();
svgGroup.setPositionByOrigin(
    new fabric.Point(targetCanvasX, targetCanvasY),
    objectOrigin.originX,
    objectOrigin.originY
);
```

**Resultado:** ❌ NO FUNCIONÓ - Las coordenadas generadas son idénticas

---

## 🎯 Hipótesis a Verificar

### Hipótesis #1: `calcTransformMatrix()` no incluye `originX/originY`

**SIN VERIFICAR - NECESITA PRUEBA**

Si `obj.calcTransformMatrix()` NO incluye el offset por `originX` y `originY`, entonces:
- Las coordenadas locales (0,0) se transformarían a la esquina superior izquierda del objeto
- Pero el objeto podría estar posicionado usando un origen diferente
- Esto causaría un desplazamiento

**CÓMO VERIFICAR:**
Ver Paso 1 de debugging más abajo.

### Hipótesis #2: Problema en la compensación de herramienta

**EVIDENCIA PARCIAL:**
- Modo configurado: `center` (sin compensación)
- G-code generado: muestra offsets (`.448` en lugar de `.000`)
- Y tiene valores negativos inesperados

**CÓMO VERIFICAR:**
1. Deshabilitar temporalmente `applyToolCompensation()`
2. Generar G-code
3. Comparar coordenadas

### Hipótesis #3: El cálculo del origen del área está mal

**SIN VERIFICAR**

Si `getOriginPosition()` calcula mal la posición del origen configurado en el canvas, todos los objetos estarían desplazados.

**CÓMO VERIFICAR:**
Comparar la posición visual del marcador de origen (punto amarillo) con las coordenadas esperadas.

---

## 📋 Próximos Pasos Sugeridos

### Paso 1: VERIFICAR qué incluye `calcTransformMatrix()`

**PREGUNTAS A RESPONDER:**
- ¿`obj.calcTransformMatrix()` incluye el offset de `originX/originY`?
- ¿Qué coordenadas reales produce cuando se aplica a (0,0)?

**Debug a agregar en `extractPathFromObject()`:**
```javascript
console.log('🔍 DEBUG extractPathFromObject:');
console.log('Objeto:', obj.type);
console.log('  left:', obj.left, 'top:', obj.top);
console.log('  originX:', obj.originX, 'originY:', obj.originY);
console.log('  width:', obj.width, 'height:', obj.height);
console.log('  scaleX:', obj.scaleX, 'scaleY:', obj.scaleY);

// Verificar qué hace la matriz con (0,0)
const matrix = obj.calcTransformMatrix();
const p00_raw = fabric.util.transformPoint({ x: 0, y: 0 }, matrix);
console.log('  Punto (0,0) local → canvas:', p00_raw);

// Comparar con getBoundingRect
const bbox = obj.getBoundingRect();
console.log('  BoundingRect:', bbox);
console.log('  Esquina superior izquierda bbox:', bbox.left, bbox.top);

// Verificar si coinciden
console.log('  ¿Coincide (0,0) con bbox.left,top?',
    Math.abs(p00_raw.x - bbox.left) < 1,
    Math.abs(p00_raw.y - bbox.top) < 1);
```

### Paso 2: Verificar cálculo de origen del objeto

En `getObjectOriginPosition()` (`canvas-manager.js:143-183`), verificar si está usando correctamente `obj.originX` y `obj.originY`.

### Paso 3: Revisar la matriz de transformación

Comparar:
```javascript
// Método actual
const matrix = obj.calcTransformMatrix();

// vs método alternativo que fuerza origen
const matrixWithOrigin = obj.calcTransformMatrix(true);
```

### Paso 4: Probar sin compensación de herramienta

Temporalmente deshabilitar la compensación:
```javascript
// En gcode-generator.js:84-91
if (compensation !== 'center' && toolRadius > 0) {
    // COMENTAR ESTA SECCIÓN
}
```

### Paso 5: Crear test unitario

Crear una función de test que:
1. Coloca un rectángulo en posición conocida
2. Extrae sus puntos
3. Compara con valores esperados
4. Reporta diferencias

```javascript
testCoordinateAccuracy() {
    const testRect = new fabric.Rect({
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        originX: 'left',
        originY: 'bottom'
    });

    const paths = this.canvasManager.extractPathFromObject(testRect, 0, 0);
    console.log('Expected:', [[10,10], [60,10], [60,60], [10,60]]);
    console.log('Actual:', paths.points);
}
```

---

## 📊 Datos de Referencia

### Configuración de Prueba
- **pixelsPerMM:** ~4.6296 (DPI: 96)
- **Área de trabajo:** 400x400 mm
- **Origen:** bottom-left
- **Herramienta:** 3.175mm diámetro
- **Compensación:** center

### Valores Calculados
```javascript
// Para cuadrado 50x50mm en (10,10):
targetGcodeX = 10
targetGcodeY = 10
targetCanvasX = gcodeOriginX + (10 * pixelsPerMM)
targetCanvasY = gcodeOriginY - (10 * pixelsPerMM)

// Con pixelsPerMM ≈ 4.6296:
offsetX = 10 * 4.6296 = 46.296 px
offsetY = 10 * 4.6296 = 46.296 px
```

---

## 🔗 Referencias de Código

| Función | Archivo | Línea | Descripción |
|---------|---------|-------|-------------|
| `addTestSquare()` | `js/app.js` | 2559 | Crea cuadrado de prueba |
| `loadSVG()` | `js/canvas-manager.js` | 1050 | Carga SVG y establece origen |
| `getObjectOriginFromWorkArea()` | `js/canvas-manager.js` | 59 | Mapea origen área → objeto |
| `getObjectOriginPosition()` | `js/canvas-manager.js` | 143 | Calcula posición del origen del objeto |
| `getPathsFromElement()` | `js/canvas-manager.js` | 1157 | Extrae paths de elemento |
| `extractPathFromObject()` | `js/canvas-manager.js` | 1184 | Extrae puntos de objeto Fabric |
| `transformPoint()` | `js/canvas-manager.js` | 1318 | Convierte canvas → máquina |
| `generateCNCToolpath()` | `js/gcode-generator.js` | 50 | Genera G-code CNC |
| `applyToolCompensation()` | `js/gcode-generator.js` | 177 | Aplica offset de herramienta |

---

## 💡 Notas Adicionales

1. **El error es consistente:** Siempre aproximadamente 25mm (mitad del tamaño del objeto)
2. **El tamaño es correcto:** El rango de 50mm se mantiene
3. **Solo afecta la posición:** No la escala ni la rotación
4. **Fabric.js complica esto:** Múltiples sistemas de coordenadas y transformaciones

### Observaciones Clave Sin Explicación Clara

1. **Los parámetros `originX` y `originY` NO se usan:**
   - Se pasan a `transformPoint()` pero nunca se utilizan en la función
   - ¿Para qué se agregaron si no se usan?

2. **La extracción de puntos usa coordenadas locales:**
   ```javascript
   // Para rectángulos: (0,0), (w,0), (w,h), (0,h)
   points.push(this.transformPoint(0, 0, matrix, ...));
   ```
   - Estas son coordenadas en el sistema local del objeto
   - Se transforman con `fabric.util.transformPoint(point, matrix)`
   - **NO SE SABE** si `calcTransformMatrix()` incluye el offset de `originX/originY`

3. **El error es consistente (≈25mm = mitad del objeto):**
   - Esto sugiere que hay un desplazamiento sistemático
   - Podría ser un problema de punto de referencia
   - **PERO** no hay evidencia directa en el código de dónde viene

4. **La compensación "center" genera offsets:**
   - Modo: `center` (sin compensación)
   - Resultado: valores como `.448` en lugar de `.000`
   - Y valores negativos inesperados
   - **NECESITA INVESTIGACIÓN** en `applyToolCompensation()`

---

## ⚠️ Advertencia sobre Hipótesis

**IMPORTANTE:** Algunas secciones de este documento contienen hipótesis que NO han sido verificadas en el código. Siempre verificar con debugging antes de asumir cualquier comportamiento del código.

Las hipótesis marcadas como "SIN VERIFICAR" requieren agregar logs de debug y pruebas antes de confirmar o descartar.

---

**Documento creado:** 2025-11-04
**Última actualización:** 2025-11-04
**Estado:** Pendiente de resolución - Requiere debugging sistemático
