// ============================================
// LIBRARY MANAGER
// ============================================
class LibraryManager {
    constructor(app) {
        this.app = app;
        this.tools = [];
        this.materials = [];
    }

async loadTools() {
    try {
        const response = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getTools' })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            this.tools = result.data;
        } else {
            // Fallback a herramientas por defecto
            this.tools = this.getDefaultTools();
        }
    } catch (error) {
        console.warn('Error loading tools, using defaults:', error);
        this.tools = this.getDefaultTools();
    }
    
    return this.tools;
}


getDefaultTools() {
    return [
        {
            id: 'default_1',
            category: 'cnc',
            name: 'End Mill 3.175mm',
            type: 'endmill',
            diameter: 3.175,
            feedRate: 800,
            plungeRate: 400,
            rpm: 10000,
            notes: 'Herramienta por defecto'
        },
        {
            id: 'default_2',
            category: 'cnc',
            name: 'V-Bit 60°',
            type: 'vbit',
            diameter: 6.35,
            angle: 60,
            feedRate: 600,
            plungeRate: 300,
            rpm: 18000,
            notes: 'Para grabado'
        },
        {
            id: 'default_3',
            category: 'plotter',
            name: 'Cuchilla 45°',
            angle: 45,
            pressure: 15,
            speed: 100,
            notes: 'Vinilo estándar'
        },
        {
            id: 'default_4',
            category: 'pencil',
            name: 'Marcador 0.8mm',
            thickness: 0.8,
            speed: 1000,
            color: '#000000',
            notes: 'Dibujo general'
        }
    ];
}

    async loadMaterials() {
        // Fallback to default materials
        this.materials = [
            {
                id: '1',
                name: 'Madera Pine',
                thickness: 6,
                feedRate: 1200,
                rpm: 12000,
                depthPerPass: 2,
                category: 'wood'
            },
            {
                id: '2',
                name: 'MDF',
                thickness: 6,
                feedRate: 1000,
                rpm: 16000,
                depthPerPass: 1.5,
                category: 'wood'
            },
            {
                id: '3',
                name: 'Acrilico',
                thickness: 3,
                feedRate: 1500,
                rpm: 18000,
                depthPerPass: 1,
                category: 'plastic'
            }
        ];
        return this.materials;
    }

    getTool(name) {
        return this.tools.find(t => t.name === name);
    }

    getMaterial(name) {
        return this.materials.find(m => m.name === name);
    }
}
