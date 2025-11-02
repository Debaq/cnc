// ============================================
// i18n - Sistema de Internacionalización
// ============================================

class I18n {
    constructor() {
        this.translations = {};
        this.currentLang = this.getDefaultLanguage();
        this.fallbackLang = 'es';
    }

    /**
     * Detecta el idioma por defecto del navegador
     */
    getDefaultLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const lang = browserLang.split('-')[0]; // 'es-ES' -> 'es'

        // Por defecto español, o inglés si el navegador está en inglés
        return ['es', 'en'].includes(lang) ? lang : 'es';
    }

    /**
     * Carga un archivo de idioma
     * @param {string} lang - Código del idioma (es, en, etc.)
     */
    async loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Language file not found: ${lang}`);
            }
            const translations = await response.json();
            this.translations[lang] = translations;
            console.log(`✅ Language loaded: ${lang}`);
        } catch (error) {
            console.error(`❌ Error loading language ${lang}:`, error);
            // Si falla, cargar el fallback
            if (lang !== this.fallbackLang) {
                console.log(`⚠️ Falling back to ${this.fallbackLang}`);
                await this.loadLanguage(this.fallbackLang);
            }
        }
    }

    /**
     * Cambia el idioma actual
     * @param {string} lang - Código del idioma
     */
    async setLanguage(lang) {
        if (!this.translations[lang]) {
            await this.loadLanguage(lang);
        }
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        console.log(`🌍 Language changed to: ${lang}`);

        // Disparar evento para que Alpine reaccione
        window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
    }

    /**
     * Obtiene una traducción
     * @param {string} key - Clave de la traducción (puede usar notación punto: 'menu.file.open')
     * @param {object} params - Parámetros para reemplazar {variable}
     * @returns {string} - Texto traducido
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLang];

        // Navegar por el objeto anidado
        for (const k of keys) {
            if (translation && translation[k]) {
                translation = translation[k];
            } else {
                // Si no existe, intentar con el fallback
                translation = this.translations[this.fallbackLang];
                for (const k2 of keys) {
                    if (translation && translation[k2]) {
                        translation = translation[k2];
                    } else {
                        console.warn(`⚠️ Translation not found: ${key}`);
                        return key; // Retornar la clave si no existe
                    }
                }
                break;
            }
        }

        // Si es un string, reemplazar parámetros
        if (typeof translation === 'string') {
            return this.replaceParams(translation, params);
        }

        return translation || key;
    }

    /**
     * Reemplaza parámetros en una cadena
     * Ejemplo: "Hello {name}" con {name: "John"} -> "Hello John"
     */
    replaceParams(text, params) {
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Obtiene todos los idiomas disponibles
     */
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }

    /**
     * Inicializa el sistema de idiomas
     */
    async init() {
        // Intentar cargar idioma guardado
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            this.currentLang = savedLang;
        }

        // Cargar idioma actual
        await this.loadLanguage(this.currentLang);

        // Pre-cargar idioma fallback si es diferente
        if (this.currentLang !== this.fallbackLang) {
            await this.loadLanguage(this.fallbackLang);
        }

        console.log('✅ i18n initialized');
    }
}

// Instancia global
window.i18n = new I18n();

// ============================================
// ALPINE.JS MAGIC: $t()
// ============================================
// Uso: <span x-text="$t('menu.file')"></span>

document.addEventListener('alpine:init', () => {
    Alpine.magic('t', () => {
        return (key, params) => window.i18n.t(key, params);
    });

    // Store reactivo para el idioma
    Alpine.store('lang', {
        current: window.i18n.currentLang,
        available: ['es', 'en'],

        async change(lang) {
            await window.i18n.setLanguage(lang);
            this.current = lang;
        }
    });
});

// Escuchar cambios de idioma para actualizar el store
window.addEventListener('language-changed', (e) => {
    if (Alpine.store('lang')) {
        Alpine.store('lang').current = e.detail.lang;
    }
});

console.log('✅ i18n system loaded');
