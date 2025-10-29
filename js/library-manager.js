export class LibraryManager {
    constructor(app) {
        this.app = app;
        this.tools = [];
        this.materials = [];
        this.apiUrl = 'backend/api.php';
        this.password = null;
    }
    
    // Authentication
    async authenticate(password) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'authenticate',
                    password: password
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.password = password;
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Auth error:', error);
            return false;
        }
    }
    
    // Load libraries from backend
    async loadTools() {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getTools'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.tools = result.data || [];
            } else {
                // Fallback to defaults
                this.tools = this.getDefaultTools();
            }
            
            return this.tools;
        } catch (error) {
            console.error('Error loading tools:', error);
            // Fallback to defaults
            this.tools = this.getDefaultTools();
            return this.tools;
        }
    }
    
    async loadMaterials() {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getMaterials'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.materials = result.data || [];
            } else {
                // Fallback to defaults
                this.materials = this.getDefaultMaterials();
            }
            
            return this.materials;
        } catch (error) {
            console.error('Error loading materials:', error);
            // Fallback to defaults
            this.materials = this.getDefaultMaterials();
            return this.materials;
        }
    }
    
    // Save to backend
    async saveTool(tool) {
        if (!this.password) {
            throw new Error('Authentication required');
        }
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveTool',
                    password: this.password,
                    data: tool
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadTools();
                return result.data;
            }
            
            throw new Error(result.message || 'Failed to save tool');
        } catch (error) {
            console.error('Error saving tool:', error);
            throw error;
        }
    }
    
    async saveMaterial(material) {
        if (!this.password) {
            throw new Error('Authentication required');
        }
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveMaterial',
                    password: this.password,
                    data: material
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadMaterials();
                return result.data;
            }
            
            throw new Error(result.message || 'Failed to save material');
        } catch (error) {
            console.error('Error saving material:', error);
            throw error;
        }
    }
    
    async deleteTool(id) {
        if (!this.password) {
            throw new Error('Authentication required');
        }
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteTool',
                    password: this.password,
                    id: id
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadTools();
                return true;
            }
            
            throw new Error(result.message || 'Failed to delete tool');
        } catch (error) {
            console.error('Error deleting tool:', error);
            throw error;
        }
    }
    
    async deleteMaterial(id) {
        if (!this.password) {
            throw new Error('Authentication required');
        }
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteMaterial',
                    password: this.password,
                    id: id
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadMaterials();
                return true;
            }
            
            throw new Error(result.message || 'Failed to delete material');
        } catch (error) {
            console.error('Error deleting material:', error);
            throw error;
        }
    }
    
    // Getters
    getTool(id) {
        return this.tools.find(t => t.id === id);
    }
    
    getMaterial(id) {
        return this.materials.find(m => m.id === id);
    }
    
    getToolsByType(type) {
        return this.tools.filter(t => t.type === type);
    }
    
    getMaterialsByCategory(category) {
        return this.materials.filter(m => m.category === category);
    }
    
    // Default libraries (fallback)
    getDefaultTools() {
        return [
            {
                id: 'endmill_1_8',
                name: 'End Mill 1/8" (3.175mm)',
                type: 'endmill',
                diameter: 3.175,
                flutes: 2,
                material: 'carbide',
                feedRate: 800,
                plungeRate: 400,
                rpm: 10000,
                maxDepth: 3.175,
                depthPerPass: 1.0,
                description: 'General purpose 2-flute carbide end mill'
            },
            {
                id: 'endmill_1_4',
                name: 'End Mill 1/4" (6.35mm)',
                type: 'endmill',
                diameter: 6.35,
                flutes: 2,
                material: 'carbide',
                feedRate: 1200,
                plungeRate: 600,
                rpm: 12000,
                maxDepth: 6.35,
                depthPerPass: 2.0,
                description: 'General purpose 2-flute carbide end mill'
            },
            {
                id: 'vbit_60',
                name: 'V-Bit 60°',
                type: 'vbit',
                diameter: 6.35,
                angle: 60,
                material: 'carbide',
                feedRate: 600,
                plungeRate: 300,
                rpm: 18000,
                maxDepth: 2.0,
                depthPerPass: 0.5,
                description: 'V-carving bit for detailed engraving'
            }
        ];
    }
    
    getDefaultMaterials() {
        return [
            {
                id: 'pine_soft',
                name: 'Pine (Soft Wood)',
                category: 'wood',
                feedRate: 1200,
                plungeRate: 600,
                rpm: 12000,
                depthPerPass: 2.0,
                laserPower: 60,
                laserSpeed: 800,
                description: 'Soft wood, easy to cut'
            },
            {
                id: 'mdf',
                name: 'MDF',
                category: 'wood',
                feedRate: 1000,
                plungeRate: 500,
                rpm: 16000,
                depthPerPass: 1.5,
                laserPower: 70,
                laserSpeed: 700,
                description: 'Medium density fiberboard'
            },
            {
                id: 'acrylic',
                name: 'Acrylic (PMMA)',
                category: 'plastic',
                feedRate: 1500,
                plungeRate: 750,
                rpm: 18000,
                depthPerPass: 2.0,
                laserPower: 40,
                laserSpeed: 300,
                description: 'Clear plastic, laser-friendly'
            }
        ];
    }
}
