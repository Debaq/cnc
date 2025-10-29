# GRBL Web Control

Control web para máquinas CNC con GRBL y cortadoras láser.

## Características

### Módulo 1: Carga y visualización SVG
- Carga archivos SVG
- Preview del diseño en canvas
- Selección de paths individuales
- Soporte para: paths, líneas, rectángulos, círculos, polígonos

### Módulo 2: Configuración
- **Modos de operación:**
  - Corte CNC (fresado)
  - Láser
- **Parámetros CNC:**
  - Profundidad de corte
  - Profundidad por pasada (múltiples pasadas)
  - Velocidad de corte
- **Parámetros Láser:**
  - Potencia (0-100%)
  - Velocidad
- **Compensación de herramienta:**
  - Centro (por el borde)
  - Interior (dentro del borde)
  - Exterior (fuera del borde)

### Módulo 3: Generación G-code
- Conversión de SVG a G-code
- Preview del código generado
- Descarga de archivo .gcode
- Estadísticas (líneas, tiempo estimado)

### Módulo 4: Control GRBL
- **Comunicación serial Web Serial API**
- **Envío de G-code** línea por línea con control de flujo
- **Controles:**
  - Home ($H)
  - Unlock ($X)
  - Reset (Ctrl-X)
  - Stop
  - Pausa/Resume
- **Consola GRBL** con entrada de comandos manuales
- **Display de posición** en tiempo real (X, Y, Z)

## Requisitos

- Navegador compatible con Web Serial API (Chrome, Edge, Opera)
- Máquina CNC con firmware GRBL 1.1+
- Puerto serial USB

## Instalación

1. Descarga todos los archivos
2. Abre `index.html` en tu navegador
3. No requiere servidor web ni instalación adicional

## Uso

### 1. Cargar diseño
1. Haz clic en "Seleccionar archivo SVG"
2. Elige tu archivo .svg
3. Verás el preview y lista de paths
4. Selecciona los paths que quieres mecanizar

### 2. Configurar
1. Selecciona tipo de operación (CNC o Láser)
2. Ajusta parámetros según tu material:
   - **Madera blanda:** Feed 800-1200, Depth step 1-2mm
   - **Madera dura:** Feed 500-800, Depth step 0.5-1mm
   - **Acrílico:** Feed 300-600, Depth step 0.3-0.5mm
   - **Láser madera:** Power 60-80%, Feed 1000-1500
3. Configura compensación si necesitas corte interior/exterior

### 3. Generar G-code
1. Haz clic en "Generar G-code"
2. Revisa el código en el editor
3. Descarga el archivo si quieres guardarlo

### 4. Enviar a GRBL
1. Conecta tu CNC por USB
2. Haz clic en "Conectar puerto serial"
3. Selecciona tu dispositivo en el diálogo
4. Espera el mensaje de conexión
5. Opcional: ejecuta Home ($H)
6. Haz clic en "Enviar G-code"
7. Monitorea el progreso en la consola

## Controles de emergencia

- **Stop:** Detiene inmediatamente la ejecución
- **Reset:** Reinicia GRBL (detiene motores)
- **Pausa:** Pausa/reanuda el trabajo

## Comandos GRBL útiles

- `$H` - Home (busca origen)
- `$X` - Unlock (desbloquea alarmas)
- `?` - Consultar estado
- `$$` - Ver configuración
- `$G` - Ver modo parser

## Limitaciones actuales (MVP)

- Compensación de herramienta simplificada
- Arcos convertidos a segmentos lineales
- Sin operaciones de relleno/vaciado (próxima versión)
- Sin visualización 3D de trayectorias

## Próximas características

- [ ] Operaciones de relleno (hatch)
- [ ] Vaciado de áreas
- [ ] Visualización 3D de trayectorias
- [ ] Controles de jog manual
- [ ] Simulador de G-code
- [ ] Soporte para DXF
- [ ] Optimización de trayectorias
- [ ] Perfiles de herramientas

## Soporte de navegadores

| Navegador | Web Serial API | Soportado |
|-----------|----------------|-----------|
| Chrome    | ✅             | ✅        |
| Edge      | ✅             | ✅        |
| Opera     | ✅             | ✅        |
| Firefox   | ❌             | ❌        |
| Safari    | ❌             | ❌        |

## Estructura del proyecto

```
grbl-web-control/
├── index.html              # Interfaz principal
├── css/
│   └── style.css          # Estilos (diseño flat morado)
├── js/
│   ├── app.js             # Controlador principal
│   ├── svg-loader.js      # Carga y parseo de SVG
│   ├── gcode-generator.js # Generación de G-code
│   └── serial-control.js  # Comunicación con GRBL
└── README.md
```

## Solución de problemas

**No puedo conectar el puerto serial:**
- Verifica que estás usando Chrome/Edge
- Revisa que el cable USB esté conectado
- Cierra otros programas que usen el puerto (UGS, bCNC, etc.)

**El G-code no se envía:**
- Verifica que GRBL esté desbloqueado ($X)
- Revisa la consola por mensajes de error
- Ejecuta Home ($H) si es necesario

**La máquina no se mueve:**
- Verifica que los motores estén energizados
- Revisa la configuración de GRBL ($$)
- Comprueba las dimensiones del diseño

## Licencia

MIT License - Uso libre para proyectos personales y comerciales

## Créditos

Desarrollado para la comunidad maker y CNC DIY
