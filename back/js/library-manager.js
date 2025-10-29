export class LibraryManager {
    constructor() {
        this.tools = [];
        this.materials = [];
        this.apiUrl = 'backend/api.php'; // Adjust based on your server setup
    }

    async loadAll() {
        await this.loadTools();
        await this.loadMaterials();
    }

    async loadTools() {
        try {
            const response = await fetch(`${this.apiUrl}?action=get_tools`);
            const data = await response.json();
            
            if (data.success) {
                this.tools = data.tools || [];
            }
        } catch (error) {
            console.error('Error loading tools:', error);
            // Load defaults if backend fails
            this.loadDefaultTools();
        }
    }

    async loadMaterials() {
        try {
            const response = await fetch(`${this.apiUrl}?action=get_materials`);
            const data = await response.json();
            
            if (data.success) {
                this.materials = data.materials || [];
            }
        } catch (error) {
            console.error('Error loading materials:', error);
            // Load defaults if backend fails
            this.loadDefaultMaterials();
        }
    }

    loadDefaultTools() {
        this.tools = [
            {
                name: 'Fresa 3mm',
                type: 'endmill',
                diameter: 3.175,
                flutes: 2,
                material: 'carbide',
                feedRate: 800,
                rpm: 10000
            },
            {
                name: 'Fresa 6mm',
                type: 'endmill',
                diameter: 6,
                flutes: 2,
                material: 'carbide',
                feedRate: 1200,
                rpm: 12000
            },
            {
                name: 'V-Bit 90°',
                type: 'vbit',
                diameter: 6,
                flutes: 2,
                material: 'carbide',
                feedRate: 600,
                rpm: 18000
            }
        ];
    }

    loadDefaultMaterials() {
        this.materials = [
            {
                name: 'MDF 9mm',
                type: 'mdf',
                thickness: 9,
                depthPerPass: 1.5,
                feedRate: 1000,
                rpm: 12000,
                laserPower: 60,
                laserSpeed: 800
            },
            {
                name: 'Madera blanda 6mm',
                type: 'wood',
                thickness: 6,
                depthPerPass: 2,
                feedRate: 1200,
                rpm: 10000,
                laserPower: 50,
                laserSpeed: 1000
            },
            {
                name: 'Acrílico 3mm',
                type: 'acrylic',
                thickness: 3,
                depthPerPass: 0.5,
                feedRate: 500,
                rpm: 18000,
                laserPower: 70,
                laserSpeed: 600
            }
        ];
    }

    async saveTool(tool, password) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save_tool',
                    password: password,
                    tool: tool
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al guardar herramienta');
            }
            
            await this.loadTools();
        } catch (error) {
            throw error;
        }
    }

    async saveMaterial(material, password) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save_material',
                    password: password,
                    material: material
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al guardar material');
            }
            
            await this.loadMaterials();
        } catch (error) {
            throw error;
        }
    }

    async deleteTool(index, password) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'delete_tool',
                    password: password,
                    index: index
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al eliminar herramienta');
            }
            
            await this.loadTools();
        } catch (error) {
            throw error;
        }
    }

    async deleteMaterial(index, password) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'delete_material',
                    password: password,
                    index: index
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al eliminar material');
            }
            
            await this.loadMaterials();
        } catch (error) {
            throw error;
        }
    }

    async checkPassword(password) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'check_password',
                    password: password
                })
            });
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            return false;
        }
    }
}
