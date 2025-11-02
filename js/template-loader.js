// ============================================
// TEMPLATE LOADER - Sistema de carga de templates HTML
// ============================================

class TemplateLoader {
    constructor() {
        this.cache = {};
        this.loading = {};
    }

    /**
     * Carga un template HTML desde un archivo externo
     * @param {string} path - Ruta al archivo template
     * @returns {Promise<string>} - HTML del template
     */
    async load(path) {
        // Si ya está en caché, devolverlo
        if (this.cache[path]) {
            return this.cache[path];
        }

        // Si ya se está cargando, esperar a que termine
        if (this.loading[path]) {
            return this.loading[path];
        }

        // Cargar el template
        this.loading[path] = fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load template: ${path}`);
                }
                return response.text();
            })
            .then(html => {
                this.cache[path] = html;
                delete this.loading[path];
                return html;
            })
            .catch(error => {
                console.error('Error loading template:', path, error);
                delete this.loading[path];
                return `<div class="p-4 bg-red-100 text-red-600 rounded">Error cargando template: ${path}</div>`;
            });

        return this.loading[path];
    }

    /**
     * Limpia la caché de un template específico o de todos
     * @param {string} [path] - Ruta del template a limpiar (opcional)
     */
    clearCache(path) {
        if (path) {
            delete this.cache[path];
        } else {
            this.cache = {};
        }
    }
}

// Instancia global del template loader
window.templateLoader = new TemplateLoader();

// ============================================
// ALPINE.JS DIRECTIVE: x-template
// ============================================
// Uso: <div x-template="'templates/tabs/elements-tab.html'"></div>

document.addEventListener('alpine:init', () => {
    Alpine.directive('template', (el, { expression }, { evaluateLater, cleanup }) => {
        const getPath = evaluateLater(expression);

        let loaded = false;

        getPath((path) => {
            if (path && !loaded) {
                loaded = true;
                window.templateLoader.load(path).then(html => {
                    el.innerHTML = html;

                    // Si el elemento está dentro de un contexto Alpine (x-data),
                    // necesitamos inicializar manualmente los hijos
                    queueMicrotask(() => {
                        if (typeof Alpine !== 'undefined' && Alpine.initTree) {
                            // Inicializar cada hijo del elemento, no el elemento mismo
                            Array.from(el.children).forEach(child => {
                                try {
                                    // Solo inicializar si NO ha sido inicializado antes
                                    if (!child._x_dataStack) {
                                        Alpine.initTree(child);
                                    }
                                } catch (e) {
                                    console.warn('Alpine.initTree failed for child:', child, e);
                                }
                            });
                        }
                    });
                });
            }
        });
    });
});

console.log('✅ Template Loader initialized');
