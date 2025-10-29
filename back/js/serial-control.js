export class SerialControl {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.isPaused = false;
        this.gcodeQueue = [];
        this.currentLine = 0;
        this.settings = {};
        
        // Status query interval
        this.statusInterval = null;
        
        // Callbacks
        this.onConnect = null;
        this.onDisconnect = null;
        this.onData = null;
        this.onError = null;
        this.onProgress = null;
    }

    async connect(baudRate = 115200) {
        if (!('serial' in navigator)) {
            throw new Error('Web Serial API no soportada. Usa Chrome, Edge u Opera.');
        }

        try {
            // Request port
            this.port = await navigator.serial.requestPort();
            
            // Open port
            await this.port.open({ baudRate });
            
            // Setup reader and writer
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
            this.reader = textDecoder.readable.getReader();
            
            const textEncoder = new TextEncoderStream();
            const writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
            this.writer = textEncoder.writable.getWriter();
            
            this.isConnected = true;
            
            // Start reading
            this.readLoop();
            
            // Wake up GRBL
            await this.sendCommand('\n\n');
            
            // Start status polling
            this.startStatusPolling();
            
            if (this.onConnect) this.onConnect();
            
        } catch (error) {
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (!this.isConnected) return;
        
        try {
            // Stop status polling
            this.stopStatusPolling();
            
            // Cancel reader
            if (this.reader) {
                await this.reader.cancel();
                this.reader = null;
            }
            
            // Close writer
            if (this.writer) {
                await this.writer.close();
                this.writer = null;
            }
            
            // Close port
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
            
            this.isConnected = false;
            this.gcodeQueue = [];
            this.currentLine = 0;
            
            if (this.onDisconnect) this.onDisconnect();
            
        } catch (error) {
            console.error('Error al desconectar:', error);
        }
    }

    async readLoop() {
        let buffer = '';
        
        try {
            while (this.isConnected) {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    break;
                }
                
                buffer += value;
                
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed) {
                        this.processResponse(trimmed);
                    }
                }
            }
        } catch (error) {
            console.error('Error en lectura serial:', error);
            if (this.onError) this.onError(error);
        }
    }

    processResponse(response) {
        if (this.onData) {
            this.onData(response);
        }
        
        // Handle ok/error for gcode queue
        if (response.toLowerCase().includes('ok') || response.toLowerCase().includes('error')) {
            this.sendNextLine();
        }
        
        // Handle alarms
        if (response.toLowerCase().includes('alarm')) {
            this.gcodeQueue = [];
            this.currentLine = 0;
            if (this.onData) {
                this.onData('⚠️ ALARM: Ejecuta $X para desbloquear');
            }
        }
        
        // Parse settings
        if (response.startsWith('$')) {
            const match = response.match(/\$(\d+)=([\d.]+)/);
            if (match) {
                this.settings['$' + match[1]] = parseFloat(match[2]);
            }
        }
    }

    async sendCommand(command) {
        if (!this.isConnected || !this.writer) {
            throw new Error('No conectado');
        }
        
        try {
            await this.writer.write(command + '\n');
        } catch (error) {
            console.error('Error al enviar comando:', error);
            throw error;
        }
    }

    async sendGCode(gcode) {
        if (!this.isConnected) {
            throw new Error('No conectado');
        }
        
        // Split into lines and filter
        this.gcodeQueue = gcode
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith(';'));
        
        this.currentLine = 0;
        this.isPaused = false;
        
        // Start sending
        this.sendNextLine();
    }

    async sendNextLine() {
        if (this.isPaused || this.currentLine >= this.gcodeQueue.length) {
            if (this.currentLine >= this.gcodeQueue.length && this.gcodeQueue.length > 0) {
                if (this.onData) {
                    this.onData('✓ G-code completado');
                }
                this.gcodeQueue = [];
                this.currentLine = 0;
                
                if (this.onProgress) {
                    this.onProgress(100, this.gcodeQueue.length, this.gcodeQueue.length);
                }
            }
            return;
        }
        
        const line = this.gcodeQueue[this.currentLine];
        this.currentLine++;
        
        try {
            await this.sendCommand(line);
            
            // Update progress
            if (this.onProgress) {
                const progress = (this.currentLine / this.gcodeQueue.length) * 100;
                this.onProgress(progress, this.currentLine, this.gcodeQueue.length);
            }
        } catch (error) {
            if (this.onData) {
                this.onData(`Error línea ${this.currentLine}: ${error.message}`);
            }
        }
    }

    pause() {
        if (!this.isConnected) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.sendCommand('!'); // Feed hold
            if (this.onData) this.onData('⏸️ Pausado');
        } else {
            this.sendCommand('~'); // Resume
            if (this.onData) this.onData('▶️ Reanudado');
            this.sendNextLine();
        }
    }

    async stop() {
        if (!this.isConnected) return;
        
        // Soft reset
        await this.sendCommand('\x18'); // Ctrl-X
        
        this.gcodeQueue = [];
        this.currentLine = 0;
        this.isPaused = false;
        
        if (this.onData) {
            this.onData('⏹️ Detenido');
        }
    }

    async reset() {
        if (!this.isConnected) return;
        
        await this.sendCommand('\x18'); // Ctrl-X (soft reset)
        
        this.gcodeQueue = [];
        this.currentLine = 0;
        this.isPaused = false;
        
        if (this.onData) {
            this.onData('🔄 Reset ejecutado');
        }
    }

    async jog(axis, distance, feedRate = 1000) {
        if (!this.isConnected) return;
        
        const command = `$J=G91 ${axis}${distance} F${feedRate}`;
        await this.sendCommand(command);
    }

    async getStatus() {
        if (!this.isConnected) return;
        await this.sendCommand('?');
    }

    async getSettings() {
        if (!this.isConnected) return;
        await this.sendCommand('$$');
    }

    async getParserState() {
        if (!this.isConnected) return;
        await this.sendCommand('$G');
    }

    async setBuildInfo() {
        if (!this.isConnected) return;
        await this.sendCommand('$I');
    }

    startStatusPolling() {
        this.statusInterval = setInterval(() => {
            if (this.isConnected) {
                this.getStatus();
            }
        }, 250); // Query every 250ms
    }

    stopStatusPolling() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }
}
