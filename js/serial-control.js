// ============================================
// SERIAL CONTROL (Web Serial API)
// ============================================
class SerialControl {
    constructor(app) {
        this.app = app;
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.connected = false;
        this.responseBuffer = '';
        this.waitingForResponse = false;
        this.responsePromise = null;
    }

    async connect(baudRate = 115200) {
        if (!('serial' in navigator)) {
            alert('Web Serial API no soportada. Usa Chrome/Edge/Opera o un navegador compatible.');
            return false;
        }

        try {
            // Solicitar puerto al usuario (abre diálogo del navegador)
            this.port = await navigator.serial.requestPort();

            // Abrir puerto con el baudRate especificado
            await this.port.open({ baudRate: baudRate });

            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            this.connected = true;

            // Listener para detectar desconexión física del puerto
            navigator.serial.addEventListener('disconnect', (e) => {
                if (e.target === this.port) {
                    console.warn('⚠️ Puerto desconectado físicamente');
                    this.handleDisconnect();
                }
            });

            // Iniciar lectura en background
            this.startReading();

            console.log(`✅ Connected at ${baudRate} baud`);
            return true;
        } catch (error) {
            console.error('❌ Connection error:', error);

            // Mensajes de error más específicos
            if (error.name === 'NotFoundError') {
                alert('No se seleccionó ningún puerto');
            } else if (error.name === 'InvalidStateError') {
                alert('El puerto ya está en uso por otra aplicación');
            } else {
                alert('Error al conectar: ' + error.message);
            }

            return false;
        }
    }

    handleDisconnect() {
        this.connected = false;
        this.reader = null;
        this.writer = null;
        this.port = null;

        // Actualizar estado en la app
        if (this.app) {
            this.app.connected = false;
            this.app.addConsoleLine('⚠️ Puerto serial desconectado');
        }
    }

    async disconnect() {
        if (this.reader) {
            await this.reader.cancel();
            this.reader = null;
        }

        if (this.writer) {
            await this.writer.close();
            this.writer = null;
        }

        if (this.port) {
            await this.port.close();
            this.port = null;
        }

        this.connected = false;
    }

    async startReading() {
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) {
                    console.log('📖 Reader stream closed');
                    break;
                }

                const text = new TextDecoder().decode(value);
                this.handleResponse(text);
            }
        } catch (error) {
            // Si el error es porque se canceló el reader, es normal (disconnect)
            if (error.name === 'NetworkError' || error.name === 'NotFoundError') {
                console.warn('⚠️ Connection lost during read');
                this.handleDisconnect();
            } else {
                console.error('❌ Read error:', error);
            }
        }
    }

    handleResponse(text) {
        this.app.addConsoleLine(text);

        // If waiting for response, accumulate buffer
        if (this.waitingForResponse) {
            this.responseBuffer += text;
        }
    }

    async sendCommand(cmd) {
        if (!this.writer) return;

        const encoder = new TextEncoder();
        await this.writer.write(encoder.encode(cmd + '\n'));
    }

    async sendCommandAndWait(cmd, timeout = 5000) {
        if (!this.writer) {
            throw new Error('Not connected');
        }

        this.responseBuffer = '';
        this.waitingForResponse = true;

        await this.sendCommand(cmd);

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.waitingForResponse = false;
                reject(new Error('Timeout waiting for response'));
            }, timeout);

            const checkInterval = setInterval(() => {
                if (this.responseBuffer.includes('ok') || this.responseBuffer.includes('error')) {
                    clearTimeout(timeoutId);
                    clearInterval(checkInterval);
                    this.waitingForResponse = false;
                    resolve(this.responseBuffer);
                }
            }, 100);
        });
    }

    async reset() {
        // Ctrl-X soft reset
        if (this.writer) {
            const encoder = new TextEncoder();
            await this.writer.write(encoder.encode('\x18'));
        }
    }

    async emergencyStop() {
        // Feed hold (!)
        if (this.writer) {
            const encoder = new TextEncoder();
            await this.writer.write(encoder.encode('!'));
        }
    }

    async jog(axis, distance, speed) {
        const cmd = `$J=G91 ${axis}${distance} F${speed}`;
        await this.sendCommand(cmd);
    }

    // ============================================
    // GRBL SETTINGS READ/WRITE
    // ============================================

    async readSettings() {
        if (!this.connected) {
            throw new Error('Not connected to GRBL');
        }

        console.log('📖 Reading GRBL settings...');

        // Clear buffer
        this.responseBuffer = '';
        this.waitingForResponse = true;

        // Send $$ command to get all settings
        await this.sendCommand('$$');

        // Wait for complete response
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.waitingForResponse = false;
                reject(new Error('Timeout reading settings'));
            }, 10000);

            const checkInterval = setInterval(() => {
                // Check if we received "ok" which means settings list is complete
                if (this.responseBuffer.includes('ok')) {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    this.waitingForResponse = false;

                    // Parse settings from buffer
                    const settings = this.parseSettings(this.responseBuffer);
                    console.log('✅ Parsed', settings.length, 'settings');
                    resolve(settings);
                }
            }, 100);
        });
    }

    parseSettings(buffer) {
        const settings = [];
        const lines = buffer.split('\n');

        // GRBL settings help database
        const settingsDB = this.getSettingsDatabase();

        for (let line of lines) {
            line = line.trim();

            // Match pattern like: $0=10
            const match = line.match(/^\$(\d+)=([0-9.]+)/);
            if (match) {
                const code = '$' + match[1];
                const value = parseFloat(match[2]);

                // Get description from database
                const info = settingsDB[code] || {
                    description: 'Unknown setting',
                    help: 'No information available',
                    unit: ''
                };

                settings.push({
                    code: code,
                    value: value,
                    description: info.description,
                    help: info.help,
                    unit: info.unit
                });
            }
        }

        return settings;
    }

    async writeSettings(settings) {
        if (!this.connected) {
            throw new Error('Not connected to GRBL');
        }

        console.log('💾 Writing', settings.length, 'settings to GRBL...');

        for (const setting of settings) {
            const cmd = `${setting.code}=${setting.value}`;
            console.log('  Writing:', cmd);

            try {
                await this.sendCommandAndWait(cmd, 2000);
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between commands
            } catch (error) {
                console.error('Error writing', setting.code, ':', error);
                throw error;
            }
        }

        console.log('✅ All settings written successfully');
    }

    // ============================================
    // GRBL SETTINGS DATABASE (v1.1)
    // ============================================
    getSettingsDatabase() {
        return {
            '$0': {
                description: 'Step pulse time (microseconds)',
                help: 'Duración del pulso de paso enviado a los drivers. Mínimo 10µs. Valores muy bajos pueden causar problemas.',
                unit: 'microsegundos'
            },
            '$1': {
                description: 'Step idle delay (milliseconds)',
                help: 'Tiempo de espera antes de deshabilitar los motores en reposo. 255 = nunca deshabilitar.',
                unit: 'milisegundos'
            },
            '$2': {
                description: 'Step pulse invert (mask)',
                help: 'Invierte la señal de pulso para drivers que lo requieran. Usar máscara binaria: X=1, Y=2, Z=4.',
                unit: 'máscara'
            },
            '$3': {
                description: 'Step direction invert (mask)',
                help: 'Invierte la dirección de los motores. Usar máscara binaria: X=1, Y=2, Z=4.',
                unit: 'máscara'
            },
            '$4': {
                description: 'Invert step enable pin',
                help: 'Invierte la señal de enable. 0=Normal (enable bajo), 1=Invertido (enable alto).',
                unit: 'booleano'
            },
            '$5': {
                description: 'Invert limit pins',
                help: 'Invierte las señales de los límites. 0=Normal (NC), 1=Invertido (NO).',
                unit: 'booleano'
            },
            '$6': {
                description: 'Invert probe pin',
                help: 'Invierte la señal del probe. 0=Normal (NC), 1=Invertido (NO).',
                unit: 'booleano'
            },
            '$10': {
                description: 'Status report options (mask)',
                help: 'Opciones del reporte de estado. 0=WPos, 1=MPos, 2=Buffer.',
                unit: 'máscara'
            },
            '$11': {
                description: 'Junction deviation (mm)',
                help: 'Tolerancia para suavizar esquinas. Valores menores = esquinas más precisas pero más lentas.',
                unit: 'mm'
            },
            '$12': {
                description: 'Arc tolerance (mm)',
                help: 'Precisión de los arcos. Valores menores = arcos más suaves pero más segmentos.',
                unit: 'mm'
            },
            '$13': {
                description: 'Report in inches',
                help: 'Reportar posición en pulgadas en lugar de mm. 0=mm, 1=pulgadas.',
                unit: 'booleano'
            },
            '$20': {
                description: 'Soft limits enable',
                help: 'Habilita límites por software. Requiere homing ($22). 0=Deshabilitado, 1=Habilitado.',
                unit: 'booleano'
            },
            '$21': {
                description: 'Hard limits enable',
                help: 'Habilita límites físicos (switches). 0=Deshabilitado, 1=Habilitado.',
                unit: 'booleano'
            },
            '$22': {
                description: 'Homing cycle enable',
                help: 'Habilita el ciclo de homing. 0=Deshabilitado, 1=Habilitado.',
                unit: 'booleano'
            },
            '$23': {
                description: 'Homing direction invert (mask)',
                help: 'Invierte la dirección del homing. Usar máscara: X=1, Y=2, Z=4.',
                unit: 'máscara'
            },
            '$24': {
                description: 'Homing locate feed rate (mm/min)',
                help: 'Velocidad de búsqueda del homing (fase rápida).',
                unit: 'mm/min'
            },
            '$25': {
                description: 'Homing search seek rate (mm/min)',
                help: 'Velocidad de búsqueda inicial del homing.',
                unit: 'mm/min'
            },
            '$26': {
                description: 'Homing switch debounce delay (ms)',
                help: 'Retardo anti-rebote de los switches de homing.',
                unit: 'milisegundos'
            },
            '$27': {
                description: 'Homing switch pull-off distance (mm)',
                help: 'Distancia de retroceso después de tocar el switch.',
                unit: 'mm'
            },
            '$30': {
                description: 'Maximum spindle speed (RPM)',
                help: 'Velocidad máxima del spindle (RPM). Corresponde a S1000 en G-code.',
                unit: 'RPM'
            },
            '$31': {
                description: 'Minimum spindle speed (RPM)',
                help: 'Velocidad mínima del spindle (RPM). Corresponde a S0 en G-code.',
                unit: 'RPM'
            },
            '$32': {
                description: 'Laser mode enable',
                help: 'Habilita modo láser. 0=Spindle mode, 1=Laser mode (M3 dinámico).',
                unit: 'booleano'
            },
            '$100': {
                description: 'X axis steps per mm',
                help: 'Pasos del motor por milímetro en eje X. Depende de: pasos/rev del motor, micropasos, paso de la correa/tornillo.',
                unit: 'pasos/mm'
            },
            '$101': {
                description: 'Y axis steps per mm',
                help: 'Pasos del motor por milímetro en eje Y.',
                unit: 'pasos/mm'
            },
            '$102': {
                description: 'Z axis steps per mm',
                help: 'Pasos del motor por milímetro en eje Z.',
                unit: 'pasos/mm'
            },
            '$110': {
                description: 'X axis max rate (mm/min)',
                help: 'Velocidad máxima permitida en eje X.',
                unit: 'mm/min'
            },
            '$111': {
                description: 'Y axis max rate (mm/min)',
                help: 'Velocidad máxima permitida en eje Y.',
                unit: 'mm/min'
            },
            '$112': {
                description: 'Z axis max rate (mm/min)',
                help: 'Velocidad máxima permitida en eje Z.',
                unit: 'mm/min'
            },
            '$120': {
                description: 'X axis acceleration (mm/sec²)',
                help: 'Aceleración máxima en eje X. Valores altos = movimientos más rápidos pero más inercia.',
                unit: 'mm/sec²'
            },
            '$121': {
                description: 'Y axis acceleration (mm/sec²)',
                help: 'Aceleración máxima en eje Y.',
                unit: 'mm/sec²'
            },
            '$122': {
                description: 'Z axis acceleration (mm/sec²)',
                help: 'Aceleración máxima en eje Z.',
                unit: 'mm/sec²'
            },
            '$130': {
                description: 'X axis max travel (mm)',
                help: 'Recorrido máximo en eje X. Usado por soft limits.',
                unit: 'mm'
            },
            '$131': {
                description: 'Y axis max travel (mm)',
                help: 'Recorrido máximo en eje Y. Usado por soft limits.',
                unit: 'mm'
            },
            '$132': {
                description: 'Z axis max travel (mm)',
                help: 'Recorrido máximo en eje Z. Usado por soft limits.',
                unit: 'mm'
            }
        };
    }
}
