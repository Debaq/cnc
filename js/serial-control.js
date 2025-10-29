export class SerialControl {
    constructor(app) {
        this.app = app;
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.connected = false;
        this.buffer = '';
        
        // GRBL state
        this.grblVersion = null;
        this.grblSettings = {};
        
        // Send queue
        this.sendQueue = [];
        this.sending = false;
        this.awaitingResponse = false;
        
        // Status polling
        this.statusInterval = null;
        this.statusIntervalTime = 250; // ms
    }
    
    // Connection
    async connect() {
        if (!('serial' in navigator)) {
            throw new Error('Web Serial API no soportada en este navegador');
        }
        
        try {
            // Request port
            this.port = await navigator.serial.requestPort();
            
            // Open port
            await this.port.open({
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            });
            
            this.connected = true;
            
            // Setup reader and writer
            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            
            // Start reading
            this.startReading();
            
            // Initialize GRBL
            await this.initialize();
            
            // Start status polling
            this.startStatusPolling();
            
            // Notify app
            this.app.onSerialConnect();
            
        } catch (error) {
            this.connected = false;
            throw error;
        }
    }
    
    async disconnect() {
        this.connected = false;
        
        // Stop status polling
        this.stopStatusPolling();
        
        // Close reader and writer
        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch (e) {}
            this.reader.releaseLock();
            this.reader = null;
        }
        
        if (this.writer) {
            try {
                await this.writer.close();
            } catch (e) {}
            this.writer.releaseLock();
            this.writer = null;
        }
        
        // Close port
        if (this.port) {
            try {
                await this.port.close();
            } catch (e) {}
            this.port = null;
        }
        
        // Notify app
        this.app.onSerialDisconnect();
    }
    
    // Reading
    async startReading() {
        try {
            while (this.connected && this.reader) {
                const { value, done } = await this.reader.read();
                
                if (done) break;
                
                // Decode incoming data
                const text = new TextDecoder().decode(value);
                this.buffer += text;
                
                // Process complete lines
                let newlineIndex;
                while ((newlineIndex = this.buffer.indexOf('\n')) >= 0) {
                    const line = this.buffer.substring(0, newlineIndex).trim();
                    this.buffer = this.buffer.substring(newlineIndex + 1);
                    
                    if (line) {
                        this.processLine(line);
                    }
                }
            }
        } catch (error) {
            if (this.connected) {
                console.error('Read error:', error);
                await this.disconnect();
            }
        }
    }
    
    processLine(line) {
        // Send to app console
        this.app.onSerialData(line);
        
        // Parse responses
        if (line === 'ok') {
            this.awaitingResponse = false;
            this.processQueue();
        } else if (line.startsWith('error:')) {
            this.awaitingResponse = false;
            this.app.addConsoleLog(`❌ GRBL Error: ${line}`, 'error');
            this.processQueue();
        } else if (line.startsWith('ALARM:')) {
            this.app.addConsoleLog(`⚠️ ALARM: ${line}`, 'error');
        } else if (line.startsWith('Grbl')) {
            // Version info
            this.grblVersion = line;
            this.app.addConsoleLog(`✓ ${line}`, 'success');
        } else if (line.startsWith('<')) {
            // Status report (handled in app)
        } else if (line.startsWith('$')) {
            // Settings
            this.parseSettings(line);
        }
    }
    
    parseSettings(line) {
        const match = line.match(/\$(\d+)=([\d.]+)/);
        if (match) {
            const setting = match[1];
            const value = parseFloat(match[2]);
            this.grblSettings[setting] = value;
        }
    }
    
    // Writing
    async write(data) {
        if (!this.writer || !this.connected) {
            throw new Error('No conectado');
        }
        
        const encoder = new TextEncoder();
        const encoded = encoder.encode(data);
        await this.writer.write(encoded);
    }
    
    async sendCommand(command) {
        if (!this.connected) return;
        
        // Add to queue
        this.sendQueue.push(command);
        
        // Process if not already processing
        if (!this.awaitingResponse) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        if (this.sendQueue.length === 0 || this.awaitingResponse) return;
        
        const command = this.sendQueue.shift();
        this.awaitingResponse = true;
        
        try {
            await this.write(command + '\n');
        } catch (error) {
            console.error('Send error:', error);
            this.awaitingResponse = false;
        }
    }
    
    // Initialization
    async initialize() {
        // Wait a bit for GRBL to be ready
        await this.sleep(1000);
        
        // Soft reset
        await this.write('\x18'); // Ctrl-X
        await this.sleep(2000);
        
        // Request status
        await this.write('?');
        
        // Get version
        await this.sleep(500);
        
        // Unlock if needed
        await this.sendCommand('$X');
    }
    
    // Status polling
    startStatusPolling() {
        this.statusInterval = setInterval(() => {
            if (this.connected && this.writer) {
                this.write('?').catch(e => console.error('Status poll error:', e));
            }
        }, this.statusIntervalTime);
    }
    
    stopStatusPolling() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }
    
    // G-code streaming
    async sendGCode(gcode, progressCallback) {
        const lines = gcode.split('\n')
            .map(line => line.split(';')[0].trim())
            .filter(line => line.length > 0);
        
        const total = lines.length;
        let sent = 0;
        
        for (const line of lines) {
            // Wait for queue to be empty and ready
            while (this.awaitingResponse || this.sendQueue.length > 0) {
                await this.sleep(10);
            }
            
            // Send line
            await this.sendCommand(line);
            
            // Wait for response
            while (this.awaitingResponse) {
                await this.sleep(10);
            }
            
            sent++;
            
            // Update progress
            if (progressCallback) {
                progressCallback(Math.round((sent / total) * 100));
            }
        }
    }
    
    // Jog controls
    jog(axis, distance, speed) {
        if (!this.connected) return;
        
        const cmd = `$J=G91 ${axis}${distance} F${speed}`;
        this.sendCommand(cmd);
    }
    
    // Real-time commands (no queue)
    async sendRealtime(byte) {
        if (!this.connected) return;
        await this.write(String.fromCharCode(byte));
    }
    
    async feedHold() {
        await this.sendRealtime(0x21); // !
        this.app.addConsoleLog('⏸️ Feed Hold', 'warning');
    }
    
    async resume() {
        await this.sendRealtime(0x7E); // ~
        this.app.addConsoleLog('▶️ Resume', 'info');
    }
    
    async reset() {
        await this.sendRealtime(0x18); // Ctrl-X
        this.sendQueue = [];
        this.awaitingResponse = false;
        this.app.addConsoleLog('🔄 Soft Reset', 'warning');
    }
    
    async emergencyStop() {
        await this.sendRealtime(0x18); // Ctrl-X
        await this.sendRealtime(0x21); // !
        this.sendQueue = [];
        this.awaitingResponse = false;
        this.app.addConsoleLog('🛑 EMERGENCY STOP', 'error');
    }
    
    // Overrides (real-time)
    async increaseFeedOverride() {
        await this.sendRealtime(0x91); // Increase 10%
    }
    
    async decreaseFeedOverride() {
        await this.sendRealtime(0x92); // Decrease 10%
    }
    
    async resetFeedOverride() {
        await this.sendRealtime(0x90); // Reset to 100%
    }
    
    async increaseSpindleOverride() {
        await this.sendRealtime(0x9A); // Increase 10%
    }
    
    async decreaseSpindleOverride() {
        await this.sendRealtime(0x9B); // Decrease 10%
    }
    
    async resetSpindleOverride() {
        await this.sendRealtime(0x99); // Reset to 100%
    }
    
    async toggleSpindle() {
        await this.sendRealtime(0x9E);
    }
    
    async toggleFloodCoolant() {
        await this.sendRealtime(0xA0);
    }
    
    async toggleMistCoolant() {
        await this.sendRealtime(0xA1);
    }
    
    // Settings
    async getSettings() {
        await this.sendCommand('$$');
    }
    
    async setSetting(number, value) {
        await this.sendCommand(`$${number}=${value}`);
    }
    
    async resetSettings() {
        if (confirm('¿Restaurar configuración de fábrica?')) {
            await this.sendCommand('$RST=$');
        }
    }
    
    // Homing
    async home() {
        await this.sendCommand('$H');
        this.app.addConsoleLog('🏠 Homing...', 'info');
    }
    
    async homeX() {
        await this.sendCommand('$HX');
    }
    
    async homeY() {
        await this.sendCommand('$HY');
    }
    
    async homeZ() {
        await this.sendCommand('$HZ');
    }
    
    // Work coordinates
    async setWorkZero(axes = 'XYZ') {
        const commands = [];
        if (axes.includes('X')) commands.push('G10 L20 P0 X0');
        if (axes.includes('Y')) commands.push('G10 L20 P0 Y0');
        if (axes.includes('Z')) commands.push('G10 L20 P0 Z0');
        
        for (const cmd of commands) {
            await this.sendCommand(cmd);
        }
        
        this.app.addConsoleLog(`✓ Origen establecido: ${axes}`, 'success');
    }
    
    async gotoWorkZero() {
        await this.sendCommand('G90 G0 X0 Y0');
        await this.sendCommand('G90 G0 Z0');
    }
    
    async gotoMachineZero() {
        await this.sendCommand('G53 G0 X0 Y0 Z0');
    }
    
    // Probing (basic)
    async probeZ(feedRate = 50, maxDistance = -50) {
        const cmd = `G38.2 Z${maxDistance} F${feedRate}`;
        await this.sendCommand(cmd);
        this.app.addConsoleLog('📏 Probing Z...', 'info');
    }
    
    async setProbeResult() {
        await this.sendCommand('G10 L20 P0 Z0');
        this.app.addConsoleLog('✓ Z Origin set from probe', 'success');
    }
    
    // Spindle/Laser control
    async spindleOn(speed) {
        await this.sendCommand(`M3 S${speed}`);
    }
    
    async spindleOff() {
        await this.sendCommand('M5');
    }
    
    async coolantOn() {
        await this.sendCommand('M8');
    }
    
    async coolantOff() {
        await this.sendCommand('M9');
    }
    
    // Check mode
    async enterCheckMode() {
        await this.sendCommand('$C');
        this.app.addConsoleLog('✓ Check Mode (simulación)', 'info');
    }
    
    async exitCheckMode() {
        await this.reset();
    }
    
    // Alarm management
    async unlock() {
        await this.sendCommand('$X');
        this.app.addConsoleLog('🔓 Unlock', 'info');
    }
    
    async clearAlarm() {
        await this.unlock();
    }
    
    // File operations (EEPROM)
    async parseAlarms() {
        // GRBL alarm codes
        const alarmCodes = {
            1: 'Hard limit triggered',
            2: 'Soft limit triggered',
            3: 'Abort during cycle',
            4: 'Probe fail',
            5: 'Probe fail (initial)',
            6: 'Homing fail (reset)',
            7: 'Homing fail (safety door)',
            8: 'Homing fail (pull off)',
            9: 'Homing fail (no cycles)'
        };
        
        return alarmCodes;
    }
    
    async parseErrors() {
        // GRBL error codes
        const errorCodes = {
            1: 'Expected command letter',
            2: 'Bad number format',
            3: 'Invalid statement',
            4: 'Negative value',
            5: 'Setting disabled',
            6: 'Step pulse minimum',
            7: 'EEPROM read fail',
            8: 'Not idle',
            9: 'G-code lock',
            10: 'Homing not enabled',
            11: 'Line overflow',
            12: 'Step rate exceeded',
            13: 'Check door',
            14: 'Line length exceeded',
            15: 'Travel exceeded',
            16: 'Invalid jog',
            17: 'Setting value error',
            18: 'Idle error',
            19: 'System GC lock',
            20: 'Soft limit error',
            21: 'Overflow',
            22: 'Max step rate exceeded',
            23: 'Check door',
            24: 'Require homing',
            25: 'ATC cannot change',
            26: 'Spindle control',
            27: 'Probe protection'
        };
        
        return errorCodes;
    }
    
    // Utilities
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Diagnostics
    async getParserState() {
        await this.sendCommand('$G');
    }
    
    async getBuildInfo() {
        await this.sendCommand('$I');
    }
    
    async getStartupBlocks() {
        await this.sendCommand('$N');
    }
    
    async viewSettings() {
        await this.sendCommand('$#');
    }
    
    // Advanced: Custom commands
    async sendCustomGCode(commands) {
        for (const cmd of commands) {
            await this.sendCommand(cmd);
            await this.sleep(100);
        }
    }
    
    // Tool change
    async toolChange(toolNumber) {
        await this.sendCommand(`M6 T${toolNumber}`);
        this.app.addConsoleLog(`🔧 Tool change: T${toolNumber}`, 'info');
    }
    
    // Safety
    isConnected() {
        return this.connected;
    }
    
    getQueueLength() {
        return this.sendQueue.length;
    }
    
    clearQueue() {
        this.sendQueue = [];
    }
}
