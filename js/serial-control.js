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
    }

    async connect() {
        if (!('serial' in navigator)) {
            alert('Web Serial API no soportada. Usa Chrome/Edge/Opera');
            return false;
        }

        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });

            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            this.connected = true;

            this.startReading();

            return true;
        } catch (error) {
            console.error('Connection error:', error);
            return false;
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
                if (done) break;

                const text = new TextDecoder().decode(value);
                this.app.addConsoleLine(text);
            }
        } catch (error) {
            console.error('Read error:', error);
        }
    }

    async sendCommand(cmd) {
        if (!this.writer) return;

        const encoder = new TextEncoder();
        await this.writer.write(encoder.encode(cmd + '\n'));
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
}
