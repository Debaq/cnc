# 📄 Resumen de `index.html_back` (GRBL Web Control Pro v3.0)

---

## 🧩 Módulos / Dependencias externas
| Tipo | URL | Propósito |
|---|---|---|
| **Tailwind CSS** | `https://cdn.tailwindcss.com` | Estilos utilitarios + tema personalizado (púrpura) |
| **Fabric.js** | `https://cdn.jsdelivr.net/npm/fabric@6.7.1` | Manipulación de canvas 2D (SVG, formas, selección, drag, zoom…) |
| **Maker.js** | `https://maker.js.org/target/js/browser.maker.js` | Generación de geometría paramétrica (rectángulos, estrellas, engranes, etc.) y exportar a G-code |
| **Three.js** | `https://unpkg.com/three@0.147.0` | Visualización 3D de trayectorias G-code |
| **OrbitControls** | mismo CDN | Control de cámara (rotar, zoom, pan) en el visor 3D |
| **Alpine.js** | `https://cdn.jsdelivr.net/npm/alpinejs@3.13.3` | Reactividad en el DOM (x-data, x-show, x-model, etc.) |

---

## 🧠 Funcionalidades principales
1. **Conexión GRBL**  
   - Puerto serie (WebSerial API)  
   - Toggle conectar/desconectar  
   - Estado en tiempo real (posición, feed, spindle, overrides)

2. **Gestión de archivos / diseño**  
   - Carga SVG oculto (`<input type="file accept=".svg">`)  
   - Biblioteca Maker.js: agregar figuras paramétricas (rectángulos, polígonos, estrellas, círculos de tornillos, texto…)  
   - Canvas interactivo: mover, escalar, bloquear proporciones, voltear horizontal/vertical, zoom, centrado

3. **Configuración por elemento vs. global**  
   - Panel “Configuración Global”: operación (CNC, láser, plotter, lápiz), herramienta, profundidad, pasos, feed, RPM, potencia láser, presión plotter, etc.  
   - Cada elemento puede heredar la config global o tener su propia config (toggle “Heredar”).  
   - Se actualiza al vuelo y se refleja en el badge resumen.

4. **Generación de G-code**  
   - Botón sticky “Generar G-code” → invoca `generateGCode()` (en `gcode-generator.js`)  
   - Preview de líneas generadas y estadísticas (distancia, tiempo estimado, pasadas).

5. **Visor 3D**  
   - Cambio de vista: “Diseño” (SVG) ↔ “Vista 3D” (Three.js)  
   - Controles de animación (play/pause/stop), velocidad, slider de pasadas, leyenda colores (G0 rápido azul, G1 corte rojo, herramienta amarilla).  
   - Estadísticas en tiempo real.

6. **Jog / Manual**  
   - Teclado numérico XY + Z con distancias predefinidas (0.1 – 100 mm) y velocidad ajustable.  
   - Botones rápidos: Home (`$H`), Unlock (`$X`), Reset, Emergencia.  
   - Enviar comando manual o ir a origen.

7. **Consola GRBL**  
   - Histórico de comandos y respuestas.  
   - Entrada de comando manual con enter.

8. **Biblioteca de herramientas**  
   - 3 categorías: CNC, Plotter, Lápiz.  
   - CRUD protegido con contraseña (formulario lateral).  
   - Campos específicos por categoría (diámetro, ángulo, feed, RPM, presión, color, etc.).

9. **Ajustes GRBL**  
   - Lectura/escritura completa de parámetros (`$$`).  
   - Búsqueda filtrada, descripciones inline, ayuda emergente, reset fábrica.

10. **Área de trabajo**  
    - Presets rápidos (300×300 … 1200×800 mm).  
    - Custom width/height → se aplica al canvas y límites de G-code.

---

## 🧱 Estructura de paneles (layout)
```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (logo + versión + GitHub)                         │
├──────────────┬────────────────────────────────────────────┤
│ Lateral      │  Main                                      │
│ 72 px ancho  │  flex-1                                    │
│              │                                            │
│ 1. Estado    │  Canvas Toolbar (vista, posición, zoom)  │
│ 2. Posición  │                                            │
│ 3. Quick     │  Canvas Area (SVG / 3D viewer)           │
│ 4. Offset    │                                            │
│ 5. Settings  │  Canvas Footer (posición, escala, rot)   │
│              │                                            │
│              │  Right Panel (96 px)                     │
│              │  ─ Tabs: Elements | Jog | G-code | 3D |  │
│              │    Console                                 │
└──────────────┴────────────────────────────────────────────┘
```

---

## 🗂️ Orden de scripts propios (sin type="module")
1. `canvas-manager.js` – gestión de Fabric, carga SVG, manipulación de elementos.  
2. `gcode-generator.js` – lógica para traducir geometría → G-code según configuración.  
3. `gcode-viewer.js` – construye líneas Three.js a partir del G-code y maneja animaciones.  
4. `serial-control.js` – envío/recepción por WebSerial, parser de estado GRBL.  
5. `library-manager.js` – CRUD de herramientas en LocalStorage.  
6. `app.js` – inicialización Alpine (`grblApp()`) y ensamblado de todos los módulos.

---

## 🎨 Estilos
- Tailwind con tema extendido “purple” (`dark`, `medium`, `light`, `pale`, `ultra-pale`, `bg`).  
- Fondo general: `bg-purple-bg` (lavanda muy claro).  
- Modales con backdrop semi-transparente y centrado flex.

---

En resumen:  
Es un **CAM web completo** (carga SVG / creación paramétrica → config por elemento → generación de G-code → visualización 3D → envío en tiempo real a GRBL) con gestión de herramientas y ajustes de máquina, todo en una sola página reactiva sin frameworks pesados (solo Alpine + librerías especializadas).