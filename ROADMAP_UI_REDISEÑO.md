# Roadmap - Rediseño de Interfaz
**Fecha:** 2025-11-02
**Estado:** Planificación

---

## Visión General

Rediseño completo inspirado en Onshape y software CAD moderno, con 3 áreas de trabajo contextuales:
- **Diseño** (enfoque actual)
- **Preview 3D**
- **Control GRBL**

---

## Principios de Diseño

1. **Máximo espacio para workspace central** - eliminar panel derecho
2. **Panel izquierdo contextual** (320px, colapsable) - cambia según área activa
3. **Botones pequeños** tipo CAD moderno
4. **Una área a la vez** - no vistas divididas
5. **Flujo natural**: Diseñar → Previsualizar → Mecanizar

---

## Estructura del Header Superior

```
[Logo/Nombre] | [Diseño] [Preview] [Control] | [Config Global] [Herramientas] [Materiales] | [Conectado] [GitHub] [...]
```

**Elementos:**
- Logo + nombre aplicación
- Tabs de áreas de trabajo (Diseño, Preview, Control)
- Accesos rápidos: Config Global (modal), Herramientas (modal), Materiales (modal)
- Estado de conexión GRBL con dropdown
- Enlaces externos (GitHub, etc)

---

## ÁREA 1: DISEÑO (Prioridad Actual)

### Panel Izquierdo (320px, colapsable)

**Botón de Agregar:**
- Cargar SVG
- Formas Maker.js (dropdown organizado por categorías)

**Lista de Elementos:**
```
[ojo] [candado] [icono] Nombre elemento [indicador config] [menu ...]
```

**Funcionalidades por elemento:**
- Visibilidad (ojo abierto/cerrado)
- Bloqueo (candado abierto/cerrado)
- Icono según tipo (SVG, Maker.js shape)
- Nombre editable inline
- Indicador de configuración:
  - ⚙️ = usa config global
  - 🎯 = config personalizada
- Menú contextual (...):
  - Duplicar
  - Eliminar
  - Renombrar
  - Cambiar orden (afecta mecanizado)

**Extras:**
- Drag & drop para reordenar
- Orden numérico de mecanizado (1, 2, 3...)
- Búsqueda/filtro (si hay muchos elementos)

### Área Central (Canvas)

**Mejoras visuales:**
- Handles en elementos seleccionados (esquinas, rotación)
- Snap to grid / guías magnéticas
- Multi-selección (Shift+Click, drag área rectangular)
- Controles de transformación visual

**Toolbar Canvas (mantener pero refinado):**
- Controles de vista (zoom in/out, fit, centrar)
- Transformaciones (flip H/V)
- Posición/dimensiones inline
- Información de área de trabajo

### Panel Flotante de Propiedades (tipo Figma)

**Aparece al seleccionar elemento**, posicionable/arrastrable:

```
┌─────────────────────────────┐
│ [icono] Nombre Elemento [×] │
│ [Propiedades] [Mecanizado]  │ ← Tabs internos
├─────────────────────────────┤
│ TAB PROPIEDADES:            │
│                             │
│ Posición                    │
│   X: [100] mm               │
│   Y: [50] mm                │
│                             │
│ Dimensiones                 │
│   Ancho: [80] mm            │
│   Alto: [40] mm             │
│   [🔒] Proporcional         │
│                             │
│ Rotación                    │
│   Ángulo: [0°]              │
│                             │
│ [Parámetros específicos]    │ ← Solo si es Maker.js
│   Radio esquinas: [5] mm    │
│   ...                       │
│                             │
├─────────────────────────────┤
│ TAB MECANIZADO:             │
│                             │
│ [✓] Heredar config global   │
│                             │
│ --- Config Personalizada ---│
│                             │
│ Tipo de Operación           │
│   [CNC Fresado ▼]          │
│                             │
│ Herramienta                 │
│   [Fresa 3mm ▼]            │
│                             │
│ Tipo de Trabajo             │
│   [Contorno ▼]             │
│                             │
│ Compensación                │
│   [Centro ▼]               │
│                             │
│ Profundidad: [2] mm         │
│ Paso: [0.5] mm              │
│                             │
│ Feed: [800] mm/min          │
│ Plunge: [200] mm/min        │
│ Spindle: [10000] RPM        │
│                             │
│ [Aplicar] [Resetear]        │
└─────────────────────────────┘
```

**Comportamiento:**
- Se abre al hacer click en elemento
- Se cierra al deseleccionar o click en [×]
- Drag para mover el panel
- Tabs internos para Propiedades vs Mecanizado
- Toggle "Heredar config global" muestra/oculta controles

---

## Modal de Configuración Global

**Botón en header:** "Config Global" → abre modal flotante

**Contenido:**
- Tipo de Operación (CNC/Láser/Plotter/Lápiz)
- Herramienta (filtrada por tipo)
- Todos los parámetros según tipo de operación
- **Presets de materiales**:
  - "Madera MDF 3mm" → auto-configura feeds/RPM
  - "Acrílico 5mm"
  - "Aluminio 2mm"
  - Guardar presets personalizados
- Botón: "Aplicar a todos los elementos"
- Botón: "Aplicar solo a elementos sin config personalizada"

---

## Atajos de Teclado (Shortcuts)

- `Delete` - Eliminar elemento seleccionado
- `Ctrl+D` - Duplicar elemento
- `Ctrl+Z` - Deshacer
- `Ctrl+Y` - Rehacer
- `H` - Toggle visibilidad elemento
- `L` - Toggle bloqueo elemento
- `Esc` - Deseleccionar / cerrar panel flotante
- `+/-` - Zoom in/out
- `Space` - Pan (arrastrar canvas)

---

## Validaciones y Warnings

**Indicadores visuales en elementos:**
- ⚠️ Fuera del área de trabajo
- ⚠️ Sin herramienta asignada
- ⚠️ Profundidad > material thickness
- ⚠️ Solapamiento con otros elementos

**Antes de generar G-code:**
- Validar que todos los elementos tengan configuración válida
- Validar que elementos estén dentro del área de trabajo
- Mostrar resumen antes de generar

---

## ÁREA 2: PREVIEW 3D (Futuro)

### Panel Izquierdo Contextual

**Estadísticas:**
- ⏱️ Tiempo estimado: 15min 32seg
- 📏 Distancia total: 2.5m
- 🔪 Cambios de herramienta: 2
- 📊 Profundidad máxima: 3mm
- 📐 Área utilizada: 150x100mm

**Controles de Animación:**
- Play / Pause / Stop
- Velocidad: 0.5x, 1x, 2x, 5x
- Slider de progreso
- Frame actual / total

**Controles de Vista 3D:**
- Reset cámara
- Vista: Top / Front / Side / Isométrica
- Toggle grid
- Toggle ejes

**Filtros de Visualización:**
- Mostrar: Rapids, Cortes, Plunges
- Colorear por: Velocidad, Profundidad, Herramienta

---

## ÁREA 3: CONTROL GRBL (Futuro)

### Panel Izquierdo Contextual

**Conexión Serial:**
- Puerto: [/dev/ttyUSB0 ▼]
- Baudrate: [115200 ▼]
- [Conectar] / [Desconectar]
- Estado: Idle / Run / Hold / Alarm

**Controles JOG:**
- Grid de movimiento (XY)
- Controles Z
- Paso: 0.1 / 1 / 10 / 100 mm
- Velocidad feed rate
- Botón Home
- Botón Reset

**Controles de Trabajo:**
- Set Work Zero (X, Y, Z, All)
- Go to Work Zero
- Go to Machine Zero

**Envío de G-code:**
- [▶️ Enviar Trabajo]
- [⏸️ Pausar]
- [⏹️ Detener]
- [⏮️ Reset]
- Progreso: barra + porcentaje

**Console GRBL:**
- Historial de comandos
- Input para comandos manuales
- Respuestas de GRBL
- Filtros: Todos / Errores / Comandos

---

## Mejoras de Canvas (Todas las Áreas)

### Herramientas de Alineación
- Alinear izquierda / centro / derecha
- Alinear arriba / centro / abajo
- Distribuir horizontalmente
- Distribuir verticalmente

### Sistema de Grid/Snap
- Toggle grid visible
- Tamaño de grid ajustable (1mm, 5mm, 10mm)
- Snap to grid
- Snap to elementos (magnético)
- Guías inteligentes al arrastrar

### Multi-selección
- Shift+Click para selección múltiple
- Drag rectangular para área
- Ctrl+A seleccionar todo
- Operaciones en bloque:
  - Aplicar misma configuración
  - Alinear
  - Distribuir
  - Agrupar

### Historial (Undo/Redo)
- Stack de cambios
- Visualizar historial (opcional)
- Límite configurable

---

## Sistema de Presets y Templates

### Presets de Materiales
```json
{
  "name": "MDF 3mm",
  "thickness": 3,
  "feedRate": 800,
  "plungeRate": 200,
  "spindleRPM": 12000,
  "depthStep": 0.5
}
```

### Templates de Proyectos
- Guardar proyecto completo (elementos + config)
- Cargar templates predefinidos
- Exportar/importar configuraciones

---

## Integración con Librerías de Herramientas

**Modal de Herramientas (desde header):**
- Categorías: CNC / Plotter / Pencil
- Lista de herramientas con specs
- Agregar / Editar / Eliminar
- Importar/Exportar biblioteca

**Información por herramienta:**
- Nombre
- Tipo
- Diámetro
- Material (HSS, Carbide, etc)
- Flutes
- Feeds/speeds recomendados
- Notas

---

## Sistema de Alertas y Notificaciones

**Toast notifications:**
- Elemento agregado
- Configuración aplicada
- G-code generado exitosamente
- Errores de validación
- Conexión GRBL establecida/perdida

**Confirmaciones:**
- Eliminar elemento
- Aplicar config global a todos
- Sobrescribir archivo
- Operaciones destructivas

---

## Persistencia y Autosave

- LocalStorage para último proyecto
- Autosave cada 30 segundos
- Guardar/Cargar proyectos (.json)
- Exportar G-code (.nc / .gcode)
- Exportar SVG compuesto

---

## Responsive & Mobile (Futuro)

- Colapsar panel izquierdo por defecto en tablet
- Controles táctiles optimizados
- Gestos: pinch to zoom, two-finger pan
- Layout adaptativo

---

## Notas de Implementación

### Tecnologías Actuales
- Alpine.js (reactive state)
- Tailwind CSS (styling)
- Fabric.js (2D canvas)
- Three.js (3D viewer)
- Maker.js (parametric shapes)

### Consideraciones
- Mantener modularidad
- Separación de responsabilidades
- Performance con muchos elementos
- Accesibilidad (keyboard navigation)

---

## Prioridades de Desarrollo

### FASE 1: ÁREA DE DISEÑO (ACTUAL)
1. ✅ Nuevo header horizontal
2. ✅ Panel izquierdo refinado (solo lista)
3. ✅ Panel flotante de propiedades
4. ✅ Modal de configuración global
5. ✅ Indicadores de configuración en elementos
6. ✅ Mejoras visuales en canvas

### FASE 2: PREVIEW 3D
1. Tab Preview funcional
2. Panel izquierdo contextual con estadísticas
3. Controles de animación
4. Mejoras en visualización 3D

### FASE 3: CONTROL GRBL
1. Tab Control funcional
2. Panel izquierdo con conexión serial
3. Controles JOG
4. Console GRBL
5. Envío de G-code

### FASE 4: MEJORAS AVANZADAS
1. Shortcuts de teclado
2. Multi-selección
3. Alineación y distribución
4. Sistema de presets
5. Undo/Redo
6. Validaciones avanzadas

---

**Última actualización:** 2025-11-02
