# 🚀 GRBL Web Control Pro v3.0 - Instalación

## 📦 Estructura del Proyecto

```
grbl-web-control-pro/
├── index.html              # Página principal
├── css/
│   └── style.css          # Estilos personalizados
├── js/
│   ├── app.js             # Aplicación principal (Alpine.js)
│   ├── canvas-manager.js  # Gestión de canvas con Fabric.js
│   ├── gcode-generator.js # Generador de G-code
│   ├── serial-control.js  # Control serial Web Serial API
│   └── library-manager.js # Gestión de bibliotecas
└── backend/
    ├── api.php            # API REST PHP
    └── data/
        ├── password.json  # Hash de contraseña
        ├── tools.json     # Biblioteca de herramientas
        └── materials.json # Biblioteca de materiales
```

## 🔧 Instalación

### Opción 1: Servidor Web (Producción)

1. **Subir archivos al servidor**
   ```bash
   # Copiar todos los archivos a tu servidor web
   /var/www/html/grbl/
   ```

2. **Configurar permisos**
   ```bash
   chmod 755 backend/
   chmod 755 backend/data/
   chmod 666 backend/data/*.json
   ```

3. **Cambiar contraseña por defecto**
   
   La contraseña por defecto es: `admin`
   
   Para cambiarla, genera un nuevo hash:
   ```php
   <?php
   echo password_hash('tu_nueva_contraseña', PASSWORD_DEFAULT);
   ?>
   ```
   
   Y actualiza `backend/data/password.json`:
   ```json
   {
       "hash": "$2y$10$tu_nuevo_hash_aqui"
   }
   ```

4. **Acceder desde navegador**
   ```
   https://tu-dominio.com/grbl/
   ```

### Opción 2: Servidor Local PHP (Desarrollo)

```bash
cd grbl-web-control-pro
php -S localhost:8000

# Acceder en: http://localhost:8000
```

### Opción 3: Usando XAMPP/WAMP

1. Copiar la carpeta a `htdocs/` o `www/`
2. Acceder a `http://localhost/grbl-web-control-pro/`

## ✅ Verificación

1. Abre el navegador (Chrome/Edge recomendado)
2. Deberías ver la interfaz GRBL Web Control Pro
3. Conecta tu máquina CNC por USB
4. Click en "Conectar" - aparecerá el selector de puerto serial

## 🔑 Contraseña por Defecto

**Usuario:** No requiere usuario  
**Contraseña:** `admin`

**⚠️ IMPORTANTE:** Cambia la contraseña después de la instalación

## 📋 Requisitos

### Navegador
- Chrome 89+
- Edge 89+
- Opera 76+
- (Firefox y Safari NO soportan Web Serial API)

### Servidor
- PHP 7.4+
- Extensiones PHP: `json`, `hash`
- Permisos de escritura en `backend/data/`

### Hardware
- Máquina CNC con GRBL 1.1+
- Cable USB

## 🛠 Tecnologías Utilizadas

- **Fabric.js 5.3.0** - Canvas interactivo y manipulación SVG
- **Alpine.js 3.x** - Framework reactivo ligero
- **Tailwind CSS 3.x** - Estilos utility-first
- **Web Serial API** - Comunicación serial nativa
- **PHP 7.4+** - Backend para bibliotecas

## 🐛 Troubleshooting

### No puedo conectar con la máquina
- Verifica que uses Chrome/Edge/Opera
- Asegúrate de que la máquina esté conectada por USB
- Prueba con otro cable USB
- Reinicia el navegador

### No carga el SVG
- Verifica que sea un archivo SVG válido
- Abre el SVG en un editor de texto para verificar
- Intenta simplificar el SVG en Inkscape

### Backend no funciona
- Verifica que PHP esté instalado: `php -v`
- Verifica permisos en carpeta `backend/data/`
- Revisa logs del servidor web

## 📞 Soporte

- GitHub: https://github.com/tuusuario/grbl-web-control-pro
- Issues: https://github.com/tuusuario/grbl-web-control-pro/issues

## 📄 Licencia

MIT License - Uso libre con o sin fines comerciales
