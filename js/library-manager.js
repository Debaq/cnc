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
        // Fallback to default tools
        this.tools = [
            {
                id: '1',
                name: 'End Mill 3.175mm',
                diameter: 3.175,
                feedRate: 800,
                rpm: 10000,
                type: 'endmill'
            },
            {
                id: '2',
                name: 'End Mill 6mm',
                diameter: 6,
                feedRate: 1200,
                rpm: 12000,
                type: 'endmill'
            },
            {
                id: '3',
                name: 'V-Bit 60°',
                diameter: 6.35,
                feedRate: 600,
                rpm: 18000,
                type: 'vbit'
            }
        ];
        return this.tools;
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
