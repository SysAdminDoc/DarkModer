// ==UserScript==
// @name         Dark Reader Userscript (Full)
// @namespace    https://github.com/darkreader
// @version      2.0.0
// @description  Complete Dark Reader recreation as userscript. Supports self-hosted config files.
// @author       Based on Dark Reader by Alexander Shutau
// @license      MIT
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      *
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const CONFIG = {
        version: '2.0.0',
        storageKey: 'darkReaderFull',
        // Set your self-hosted config URL here (or leave empty to use built-in)
        // Example: 'https://yourdomain.com/darkreader-configs/'
        configBaseURL: '',
        configFiles: {
            darkSites: 'dark-sites.json',
            dynamicFixes: 'dynamic-theme-fixes.json',
            inversionFixes: 'inversion-fixes.json',
            staticThemes: 'static-themes.json'
        }
    };

    const DEFAULT_THEME = {
        mode: 1, // 0: light, 1: dark
        brightness: 100,
        contrast: 100,
        grayscale: 0,
        sepia: 0,
        useFont: false,
        fontFamily: '',
        textStroke: 0,
        engine: 'dynamic', // 'filter', 'filterPlus', 'dynamic', 'static'
        stylesheet: '',
        darkSchemeBackgroundColor: '#181a1b',
        darkSchemeTextColor: '#e8e6e3',
        lightSchemeBackgroundColor: '#dcdad7',
        lightSchemeTextColor: '#181a1b',
        scrollbarColor: 'auto',
        selectionColor: 'auto',
        styleSystemControls: true,
        lightColorScheme: 'Default',
        darkColorScheme: 'Default',
        immediateModify: true
    };

    const DEFAULT_SETTINGS = {
        enabled: true,
        fetchNews: false,
        theme: { ...DEFAULT_THEME },
        presets: [],
        customThemes: [],
        enabledByDefault: true,
        enabledFor: [],
        disabledFor: [],
        changeBrowserTheme: false,
        syncSettings: false,
        syncSitesFixes: false,
        automation: {
            enabled: false,
            mode: '', // 'time', 'system', 'location'
            behavior: 'OnOff'
        },
        time: {
            activation: '18:00',
            deactivation: '9:00'
        },
        location: {
            latitude: null,
            longitude: null
        },
        previewNewDesign: true,
        enableForPDF: true,
        enableForProtectedPages: false,
        enableContextMenus: false,
        detectDarkTheme: true
    };

    // ============================================================================
    // BUILT-IN SITE FIXES (Subset - load full from self-hosted)
    // ============================================================================

    const BUILT_IN_DARK_SITES = [
        'darkreader.org',
        'discord.com',
        'github.com',
        'netflix.com',
        'twitch.tv',
        'youtube.com',
        'reddit.com',
        'twitter.com',
        'x.com',
        'spotify.com',
        'slack.com',
        'notion.so',
        'figma.com',
        'linear.app',
        'vercel.com',
        'vitejs.dev',
        'vuejs.org',
        'nuxt.com',
        'astro.build'
    ];

    const BUILT_IN_DYNAMIC_FIXES = {
        'google.com': {
            css: `
                .gb_Td { background-color: var(--darkreader-neutral-background) !important; }
            `
        },
        'stackoverflow.com': {
            css: `
                .s-prose code { background-color: #2d2d2d !important; }
            `
        },
        'amazon.com': {
            invert: ['.a-button-text img', '.nav-logo-link img'],
            css: `
                #nav-belt { background-color: #232f3e !important; }
            `
        }
    };

    const BUILT_IN_INVERSION_FIXES = {
        'default': {
            invert: ['img', 'video', 'picture', 'canvas', 'iframe', 'embed', 'object', 
                     '[style*="background-image"]', '.emoji', '[role="img"]', 'svg image'],
            noinvert: ['img img', 'picture img'],
            removebg: [],
            css: ''
        }
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    function throttle(fn, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return fn.apply(this, args);
            }
        };
    }

    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function getURLHostname(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return '';
        }
    }

    function isURLMatched(url, patterns) {
        const hostname = getURLHostname(url) || url;
        return patterns.some(pattern => {
            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                try {
                    return new RegExp(pattern.slice(1, -1)).test(url);
                } catch (e) {
                    return false;
                }
            }
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');
                return regex.test(hostname) || regex.test(url);
            }
            return hostname === pattern || hostname.endsWith('.' + pattern);
        });
    }

    // ============================================================================
    // COLOR MANIPULATION (Core Dark Reader Algorithm)
    // ============================================================================

    const Color = {
        parse(input) {
            if (!input || input === 'transparent' || input === 'inherit' || 
                input === 'initial' || input === 'currentColor' || input === 'none') {
                return null;
            }

            input = input.trim().toLowerCase();

            // Hex
            let match = input.match(/^#([0-9a-f]{3,8})$/i);
            if (match) {
                const hex = match[1];
                if (hex.length === 3 || hex.length === 4) {
                    const [r, g, b, a = 'f'] = hex;
                    return {
                        r: parseInt(r + r, 16),
                        g: parseInt(g + g, 16),
                        b: parseInt(b + b, 16),
                        a: parseInt(a + a, 16) / 255
                    };
                }
                if (hex.length === 6 || hex.length === 8) {
                    return {
                        r: parseInt(hex.slice(0, 2), 16),
                        g: parseInt(hex.slice(2, 4), 16),
                        b: parseInt(hex.slice(4, 6), 16),
                        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
                    };
                }
            }

            // RGB/RGBA
            match = input.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
            if (match) {
                return {
                    r: parseInt(match[1], 10),
                    g: parseInt(match[2], 10),
                    b: parseInt(match[3], 10),
                    a: match[4] !== undefined ? parseFloat(match[4]) : 1
                };
            }

            // HSL/HSLA
            match = input.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)$/);
            if (match) {
                return this.hslToRgb(
                    parseFloat(match[1]),
                    parseFloat(match[2]),
                    parseFloat(match[3]),
                    match[4] !== undefined ? parseFloat(match[4]) : 1
                );
            }

            // Named colors
            const named = this.getNamedColor(input);
            if (named) return named;

            return null;
        },

        getNamedColor(name) {
            const colors = {
                white: [255, 255, 255], black: [0, 0, 0], red: [255, 0, 0],
                green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0],
                cyan: [0, 255, 255], magenta: [255, 0, 255], silver: [192, 192, 192],
                gray: [128, 128, 128], grey: [128, 128, 128], maroon: [128, 0, 0],
                olive: [128, 128, 0], lime: [0, 255, 0], aqua: [0, 255, 255],
                teal: [0, 128, 128], navy: [0, 0, 128], fuchsia: [255, 0, 255],
                purple: [128, 0, 128], orange: [255, 165, 0], pink: [255, 192, 203],
                brown: [165, 42, 42], coral: [255, 127, 80], crimson: [220, 20, 60],
                darkblue: [0, 0, 139], darkgray: [169, 169, 169], darkgreen: [0, 100, 0],
                darkred: [139, 0, 0], gold: [255, 215, 0], indigo: [75, 0, 130],
                ivory: [255, 255, 240], khaki: [240, 230, 140], lavender: [230, 230, 250],
                lightblue: [173, 216, 230], lightgray: [211, 211, 211], lightgreen: [144, 238, 144],
                linen: [250, 240, 230], mintcream: [245, 255, 250], mistyrose: [255, 228, 225],
                moccasin: [255, 228, 181], oldlace: [253, 245, 230], orchid: [218, 112, 214],
                papayawhip: [255, 239, 213], peachpuff: [255, 218, 185], peru: [205, 133, 63],
                plum: [221, 160, 221], powderblue: [176, 224, 230], rosybrown: [188, 143, 143],
                salmon: [250, 128, 114], sandybrown: [244, 164, 96], seagreen: [46, 139, 87],
                sienna: [160, 82, 45], skyblue: [135, 206, 235], slategray: [112, 128, 144],
                snow: [255, 250, 250], tan: [210, 180, 140], thistle: [216, 191, 216],
                tomato: [255, 99, 71], turquoise: [64, 224, 208], violet: [238, 130, 238],
                wheat: [245, 222, 179], whitesmoke: [245, 245, 245], yellowgreen: [154, 205, 50],
                rebeccapurple: [102, 51, 153], aliceblue: [240, 248, 255], antiquewhite: [250, 235, 215],
                aquamarine: [127, 255, 212], azure: [240, 255, 255], beige: [245, 245, 220],
                bisque: [255, 228, 196], blanchedalmond: [255, 235, 205], blueviolet: [138, 43, 226],
                burlywood: [222, 184, 135], cadetblue: [95, 158, 160], chartreuse: [127, 255, 0],
                chocolate: [210, 105, 30], cornflowerblue: [100, 149, 237], cornsilk: [255, 248, 220],
                darkcyan: [0, 139, 139], darkgoldenrod: [184, 134, 11], darkkhaki: [189, 183, 107],
                darkmagenta: [139, 0, 139], darkolivegreen: [85, 107, 47], darkorange: [255, 140, 0],
                darkorchid: [153, 50, 204], darksalmon: [233, 150, 122], darkseagreen: [143, 188, 143],
                darkslateblue: [72, 61, 139], darkslategray: [47, 79, 79], darkturquoise: [0, 206, 209],
                darkviolet: [148, 0, 211], deeppink: [255, 20, 147], deepskyblue: [0, 191, 255],
                dimgray: [105, 105, 105], dodgerblue: [30, 144, 255], firebrick: [178, 34, 34],
                floralwhite: [255, 250, 240], forestgreen: [34, 139, 34], gainsboro: [220, 220, 220],
                ghostwhite: [248, 248, 255], goldenrod: [218, 165, 32], greenyellow: [173, 255, 47],
                honeydew: [240, 255, 240], hotpink: [255, 105, 180], indianred: [205, 92, 92],
                lawngreen: [124, 252, 0], lemonchiffon: [255, 250, 205], lightcoral: [240, 128, 128],
                lightcyan: [224, 255, 255], lightgoldenrodyellow: [250, 250, 210], lightpink: [255, 182, 193],
                lightsalmon: [255, 160, 122], lightseagreen: [32, 178, 170], lightskyblue: [135, 206, 250],
                lightslategray: [119, 136, 153], lightsteelblue: [176, 196, 222], lightyellow: [255, 255, 224],
                limegreen: [50, 205, 50], mediumaquamarine: [102, 205, 170], mediumblue: [0, 0, 205],
                mediumorchid: [186, 85, 211], mediumpurple: [147, 112, 219], mediumseagreen: [60, 179, 113],
                mediumslateblue: [123, 104, 238], mediumspringgreen: [0, 250, 154], mediumturquoise: [72, 209, 204],
                mediumvioletred: [199, 21, 133], midnightblue: [25, 25, 112], navajowhite: [255, 222, 173],
                olivedrab: [107, 142, 35], orangered: [255, 69, 0], palegoldenrod: [238, 232, 170],
                palegreen: [152, 251, 152], paleturquoise: [175, 238, 238], palevioletred: [219, 112, 147],
                royalblue: [65, 105, 225], saddlebrown: [139, 69, 19], seashell: [255, 245, 238],
                slateblue: [106, 90, 205], springgreen: [0, 255, 127], steelblue: [70, 130, 180]
            };
            const c = colors[name];
            return c ? { r: c[0], g: c[1], b: c[2], a: 1 } : null;
        },

        rgbToHsl(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = 0, s = 0;
            const l = (max + min) / 2;

            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }
            return { h: h * 360, s: s * 100, l: l * 100 };
        },

        hslToRgb(h, s, l, a = 1) {
            h = ((h % 360) + 360) % 360;
            s = clamp(s, 0, 100) / 100;
            l = clamp(l, 0, 100) / 100;

            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;

            let r, g, b;
            if (h < 60) { r = c; g = x; b = 0; }
            else if (h < 120) { r = x; g = c; b = 0; }
            else if (h < 180) { r = 0; g = c; b = x; }
            else if (h < 240) { r = 0; g = x; b = c; }
            else if (h < 300) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }

            return {
                r: Math.round((r + m) * 255),
                g: Math.round((g + m) * 255),
                b: Math.round((b + m) * 255),
                a
            };
        },

        toHex({ r, g, b, a }) {
            const toHex = x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a * 255) : ''}`;
        },

        toRgba({ r, g, b, a }) {
            return `rgba(${clamp(Math.round(r), 0, 255)}, ${clamp(Math.round(g), 0, 255)}, ${clamp(Math.round(b), 0, 255)}, ${a})`;
        },

        getLuminance({ r, g, b }) {
            const rsrgb = r / 255;
            const gsrgb = g / 255;
            const bsrgb = b / 255;
            const rlin = rsrgb <= 0.03928 ? rsrgb / 12.92 : Math.pow((rsrgb + 0.055) / 1.055, 2.4);
            const glin = gsrgb <= 0.03928 ? gsrgb / 12.92 : Math.pow((gsrgb + 0.055) / 1.055, 2.4);
            const blin = bsrgb <= 0.03928 ? bsrgb / 12.92 : Math.pow((bsrgb + 0.055) / 1.055, 2.4);
            return 0.2126 * rlin + 0.7152 * glin + 0.0722 * blin;
        },

        isLight(color) {
            return this.getLuminance(color) > 0.179;
        },

        isDark(color) {
            return !this.isLight(color);
        },

        mix(c1, c2, ratio) {
            return {
                r: c1.r * (1 - ratio) + c2.r * ratio,
                g: c1.g * (1 - ratio) + c2.g * ratio,
                b: c1.b * (1 - ratio) + c2.b * ratio,
                a: c1.a * (1 - ratio) + c2.a * ratio
            };
        },

        // Core Dark Reader color modification
        modifyBackgroundColor(color, theme) {
            if (!color || color.a < 0.1) return null;

            const hsl = this.rgbToHsl(color.r, color.g, color.b);
            const luminance = this.getLuminance(color);

            // Determine if we should darken (for light colors) or lighten (for dark)
            if (theme.mode === 1) { // Dark mode
                if (luminance > 0.5) {
                    // Light background - make it dark
                    hsl.l = Math.max(5, Math.min(15, 100 - hsl.l));
                } else if (luminance > 0.2) {
                    // Medium background - make it darker
                    hsl.l = Math.max(5, hsl.l * 0.3);
                }
                // Already dark - adjust slightly
                hsl.l = clamp(hsl.l, 0, 20);
            }

            // Apply theme adjustments
            hsl.l = hsl.l * (theme.brightness / 100);
            hsl.l = ((hsl.l - 50) * (theme.contrast / 100)) + 50;
            hsl.l = clamp(hsl.l, 0, 100);

            // Sepia shift
            if (theme.sepia > 0) {
                hsl.h = hsl.h * (1 - theme.sepia / 100) + 40 * (theme.sepia / 100);
                hsl.s = Math.max(hsl.s, theme.sepia * 0.1);
            }

            // Grayscale
            hsl.s = hsl.s * (1 - theme.grayscale / 100);

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        },

        modifyTextColor(color, theme) {
            if (!color) return null;

            const hsl = this.rgbToHsl(color.r, color.g, color.b);
            const luminance = this.getLuminance(color);

            if (theme.mode === 1) { // Dark mode
                if (luminance < 0.5) {
                    // Dark text - make it light
                    hsl.l = Math.min(95, Math.max(80, 100 - hsl.l));
                } else if (luminance < 0.8) {
                    // Medium text - make it lighter
                    hsl.l = Math.min(95, hsl.l + 30);
                }
                hsl.l = clamp(hsl.l, 70, 100);
            }

            // Apply theme adjustments
            hsl.l = hsl.l * (theme.brightness / 100);
            hsl.l = ((hsl.l - 50) * (theme.contrast / 100)) + 50;
            hsl.l = clamp(hsl.l, 0, 100);

            // Sepia
            if (theme.sepia > 0) {
                hsl.h = hsl.h * (1 - theme.sepia / 100) + 40 * (theme.sepia / 100);
            }

            // Grayscale
            hsl.s = hsl.s * (1 - theme.grayscale / 100);

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        },

        modifyBorderColor(color, theme) {
            if (!color || color.a < 0.1) return null;

            const hsl = this.rgbToHsl(color.r, color.g, color.b);

            if (theme.mode === 1) {
                hsl.l = clamp(30 + (hsl.l * 0.2), 20, 50);
            }

            hsl.s = hsl.s * (1 - theme.grayscale / 100);

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        },

        modifyLinkColor(color, theme) {
            if (!color) return '#6eb4ff';

            const hsl = this.rgbToHsl(color.r, color.g, color.b);

            if (theme.mode === 1) {
                // Keep hue but adjust lightness for visibility
                hsl.l = clamp(65, 50, 80);
                hsl.s = Math.max(hsl.s, 50);
            }

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        }
    };

    // ============================================================================
    // CSS PARSING & MODIFICATION
    // ============================================================================

    const CSSModifier = {
        modifiedSheets: new WeakMap(),
        styleSheetRules: new Map(),

        // Properties that affect colors
        colorProperties: [
            'background-color', 'background', 'color', 'border-color',
            'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
            'outline-color', 'fill', 'stroke', 'box-shadow', 'text-shadow',
            'caret-color', 'column-rule-color', 'text-decoration-color'
        ],

        processDeclaration(property, value, theme) {
            const prop = property.toLowerCase();

            if (prop === 'background-color' || (prop === 'background' && !value.includes('url') && !value.includes('gradient'))) {
                const color = Color.parse(value);
                if (color && color.a > 0.1) {
                    const modified = Color.modifyBackgroundColor(color, theme);
                    return modified;
                }
            }

            if (prop === 'color') {
                const color = Color.parse(value);
                if (color) {
                    return Color.modifyTextColor(color, theme);
                }
            }

            if (prop.includes('border') && prop.includes('color')) {
                const color = Color.parse(value);
                if (color && color.a > 0.1) {
                    return Color.modifyBorderColor(color, theme);
                }
            }

            if (prop === 'box-shadow' && value !== 'none') {
                // Simplify - just reduce or remove box shadows in dark mode
                return 'none';
            }

            return null;
        },

        processRule(rule, theme, selectorPrefix = '') {
            if (!rule.style) return null;

            const modifications = [];
            const selector = selectorPrefix ? `${selectorPrefix} ${rule.selectorText}` : rule.selectorText;

            for (let i = 0; i < rule.style.length; i++) {
                const property = rule.style[i];
                const value = rule.style.getPropertyValue(property);
                const priority = rule.style.getPropertyPriority(property);

                const modified = this.processDeclaration(property, value, theme);
                if (modified) {
                    modifications.push(`${property}: ${modified}${priority ? ' !important' : ''}`);
                }
            }

            if (modifications.length > 0) {
                return `${selector} { ${modifications.join('; ')}; }`;
            }
            return null;
        },

        processStyleSheet(sheet, theme) {
            const rules = [];

            try {
                const cssRules = sheet.cssRules || sheet.rules;
                if (!cssRules) return '';

                for (const rule of cssRules) {
                    if (rule.type === CSSRule.STYLE_RULE) {
                        const modified = this.processRule(rule, theme);
                        if (modified) rules.push(modified);
                    } else if (rule.type === CSSRule.MEDIA_RULE) {
                        const mediaRules = [];
                        for (const innerRule of rule.cssRules) {
                            if (innerRule.type === CSSRule.STYLE_RULE) {
                                const modified = this.processRule(innerRule, theme);
                                if (modified) mediaRules.push(modified);
                            }
                        }
                        if (mediaRules.length > 0) {
                            rules.push(`@media ${rule.conditionText} { ${mediaRules.join(' ')} }`);
                        }
                    }
                }
            } catch (e) {
                // CORS - can't access cross-origin stylesheets
            }

            return rules.join('\n');
        }
    };

    // ============================================================================
    // THEME ENGINES
    // ============================================================================

    const FilterEngine = {
        style: null,

        create(theme) {
            const brightness = theme.brightness / 100;
            const contrast = theme.contrast / 100;
            const sepia = theme.sepia / 100;
            const grayscale = theme.grayscale / 100;

            return `
                html {
                    filter: invert(1) hue-rotate(180deg) 
                            brightness(${brightness}) 
                            contrast(${contrast}) 
                            sepia(${sepia}) 
                            grayscale(${grayscale}) !important;
                    background-color: white !important;
                }
                html img, html video, html picture, html canvas,
                html [style*="background-image"]:not([style*="gradient"]),
                html iframe, html embed, html object, html svg image {
                    filter: invert(1) hue-rotate(180deg) !important;
                }
                html img img, html picture img { filter: none !important; }
                html video:fullscreen { filter: none !important; }
            `;
        },

        apply(theme) {
            this.remove();
            this.style = document.createElement('style');
            this.style.id = 'darkreader-filter';
            this.style.textContent = this.create(theme);
            document.documentElement.appendChild(this.style);
        },

        remove() {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }
        }
    };

    const FilterPlusEngine = {
        style: null,
        svg: null,

        create(theme) {
            const b = theme.brightness / 100;
            const svgFilter = `
                <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
                    <defs>
                        <filter id="drFilter" color-interpolation-filters="linearRGB">
                            <feColorMatrix type="matrix" values="
                                0.33 0.33 0.33 0 0
                                0.33 0.33 0.33 0 0
                                0.33 0.33 0.33 0 0
                                0    0    0    1 0" />
                            <feComponentTransfer>
                                <feFuncR type="table" tableValues="1 0"/>
                                <feFuncG type="table" tableValues="1 0"/>
                                <feFuncB type="table" tableValues="1 0"/>
                            </feComponentTransfer>
                            <feColorMatrix type="hueRotate" values="180"/>
                            <feColorMatrix type="matrix" values="
                                ${b} 0 0 0 0
                                0 ${b} 0 0 0
                                0 0 ${b} 0 0
                                0 0 0 1 0"/>
                        </filter>
                        <filter id="drFilterInvert">
                            <feComponentTransfer>
                                <feFuncR type="table" tableValues="1 0"/>
                                <feFuncG type="table" tableValues="1 0"/>
                                <feFuncB type="table" tableValues="1 0"/>
                            </feComponentTransfer>
                            <feColorMatrix type="hueRotate" values="180"/>
                        </filter>
                    </defs>
                </svg>
            `;

            const css = `
                html { 
                    filter: url(#drFilter) contrast(${theme.contrast}%) sepia(${theme.sepia}%) grayscale(${theme.grayscale}%) !important;
                    background-color: white !important;
                }
                html img, html video, html picture, html canvas, html iframe {
                    filter: url(#drFilterInvert) !important;
                }
            `;

            return { svg: svgFilter, css };
        },

        apply(theme) {
            this.remove();
            const { svg, css } = this.create(theme);

            this.svg = document.createElement('div');
            this.svg.id = 'darkreader-svg';
            this.svg.innerHTML = svg;
            document.body.insertBefore(this.svg, document.body.firstChild);

            this.style = document.createElement('style');
            this.style.id = 'darkreader-filterplus';
            this.style.textContent = css;
            document.documentElement.appendChild(this.style);
        },

        remove() {
            if (this.style) { this.style.remove(); this.style = null; }
            if (this.svg) { this.svg.remove(); this.svg = null; }
        }
    };

    const DynamicEngine = {
        styles: [],
        observer: null,
        processedSheets: new WeakSet(),
        inlineProcessor: null,

        createRootCSS(theme) {
            const bg = theme.darkSchemeBackgroundColor;
            const text = theme.darkSchemeTextColor;
            const border = '#3e4446';
            const link = '#6eb4ff';
            const linkVisited = '#b994ff';
            const selection = '#3b5998';

            return `
                :root {
                    --darkreader-neutral-background: ${bg};
                    --darkreader-neutral-text: ${text};
                    --darkreader-selection-background: ${selection};
                    --darkreader-selection-text: #fff;
                    color-scheme: dark;
                }
                html, body {
                    background-color: ${bg} !important;
                    color: ${text} !important;
                }
                html { background-image: none !important; }
                
                a { color: ${link} !important; }
                a:visited { color: ${linkVisited} !important; }
                a:active { color: #ff6e6e !important; }
                
                ::selection { background-color: ${selection} !important; color: #fff !important; }
                ::-moz-selection { background-color: ${selection} !important; color: #fff !important; }
                
                input, textarea, select, button {
                    background-color: #1c1e1f !important;
                    border-color: ${border} !important;
                    color: ${text} !important;
                }
                input::placeholder, textarea::placeholder { color: #7a7a7a !important; }
                
                input[type="checkbox"], input[type="radio"] {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border: 1px solid ${border} !important;
                    background-color: #1c1e1f !important;
                }
                input[type="checkbox"]:checked, input[type="radio"]:checked {
                    background-color: ${link} !important;
                }
                
                table, td, th { border-color: ${border} !important; }
                th { background-color: #1f2123 !important; }
                
                hr { border-color: ${border} !important; background-color: ${border} !important; }
                
                pre, code {
                    background-color: #1a1c1e !important;
                    border-color: ${border} !important;
                }
                
                blockquote {
                    border-color: ${border} !important;
                    background-color: rgba(0,0,0,0.2) !important;
                }
                
                img, video, picture, canvas, iframe, embed, object { filter: none !important; }
                
                * { 
                    scrollbar-color: #454a4d ${bg};
                    scrollbar-width: thin;
                }
                ::-webkit-scrollbar { width: 12px; height: 12px; background-color: ${bg}; }
                ::-webkit-scrollbar-thumb { background-color: #454a4d; border-radius: 6px; }
                ::-webkit-scrollbar-thumb:hover { background-color: #5a5f62; }
                ::-webkit-scrollbar-corner { background-color: ${bg}; }
            `;
        },

        apply(theme, fixes = null) {
            this.remove();
            this.theme = theme;

            // Root styles
            const rootStyle = document.createElement('style');
            rootStyle.id = 'darkreader-dynamic-root';
            rootStyle.textContent = this.createRootCSS(theme);
            document.documentElement.appendChild(rootStyle);
            this.styles.push(rootStyle);

            // Apply site-specific fixes
            if (fixes && fixes.css) {
                const fixStyle = document.createElement('style');
                fixStyle.id = 'darkreader-dynamic-fixes';
                fixStyle.textContent = fixes.css;
                document.documentElement.appendChild(fixStyle);
                this.styles.push(fixStyle);
            }

            // Process existing stylesheets after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.processPage(theme));
            } else {
                setTimeout(() => this.processPage(theme), 0);
            }
        },

        processPage(theme) {
            // Process existing stylesheets
            for (const sheet of document.styleSheets) {
                this.processStyleSheet(sheet, theme);
            }

            // Process inline styles
            this.processInlineStyles(theme);

            // Watch for changes
            this.observe(theme);
        },

        processStyleSheet(sheet, theme) {
            if (this.processedSheets.has(sheet)) return;
            this.processedSheets.add(sheet);

            try {
                const modified = CSSModifier.processStyleSheet(sheet, theme);
                if (modified) {
                    const style = document.createElement('style');
                    style.className = 'darkreader-dynamic-sheet';
                    style.textContent = modified;
                    document.documentElement.appendChild(style);
                    this.styles.push(style);
                }
            } catch (e) {
                // CORS or other errors
            }
        },

        processInlineStyles: throttle(function(theme) {
            const elements = document.querySelectorAll('[style]');
            for (const el of elements) {
                if (el.closest('#darkreader-ui')) continue;
                this.processElementStyle(el, theme);
            }
        }, 100),

        processElementStyle(el, theme) {
            try {
                const style = el.style;
                const computed = getComputedStyle(el);

                // Background
                const bg = computed.backgroundColor;
                if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
                    const color = Color.parse(bg);
                    if (color && Color.isLight(color) && color.a > 0.1) {
                        const modified = Color.modifyBackgroundColor(color, theme);
                        if (modified) el.style.setProperty('background-color', modified, 'important');
                    }
                }

                // Text color
                const textColor = computed.color;
                if (textColor) {
                    const color = Color.parse(textColor);
                    if (color && Color.isDark(color)) {
                        const modified = Color.modifyTextColor(color, theme);
                        if (modified) el.style.setProperty('color', modified, 'important');
                    }
                }
            } catch (e) {}
        },

        observe(theme) {
            if (this.observer) return;

            const processNew = debounce(() => {
                for (const sheet of document.styleSheets) {
                    if (!this.processedSheets.has(sheet)) {
                        this.processStyleSheet(sheet, theme);
                    }
                }
                this.processInlineStyles(theme);
            }, 50);

            this.observer = new MutationObserver((mutations) => {
                let needsProcess = false;
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
                                    needsProcess = true;
                                }
                                if (node.hasAttribute && node.hasAttribute('style')) {
                                    this.processElementStyle(node, theme);
                                }
                            }
                        }
                    } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        this.processElementStyle(mutation.target, theme);
                    }
                }
                if (needsProcess) processNew();
            });

            this.observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });
        },

        remove() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            for (const style of this.styles) {
                style.remove();
            }
            this.styles = [];
            this.processedSheets = new WeakSet();
            document.querySelectorAll('[class^="darkreader-dynamic"]').forEach(el => el.remove());
        }
    };

    const StaticEngine = {
        style: null,

        create(theme) {
            const bg = theme.darkSchemeBackgroundColor;
            const text = theme.darkSchemeTextColor;
            const border = '#3c4043';

            return `
                * {
                    background-color: ${bg} !important;
                    color: ${text} !important;
                    border-color: ${border} !important;
                }
                a { color: #8ab4f8 !important; }
                a:visited { color: #c58af9 !important; }
                img, video, canvas, iframe, embed, object { filter: none !important; background: none !important; }
            `;
        },

        apply(theme) {
            this.remove();
            this.style = document.createElement('style');
            this.style.id = 'darkreader-static';
            this.style.textContent = this.create(theme);
            document.documentElement.appendChild(this.style);
        },

        remove() {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }
        }
    };

    // ============================================================================
    // CONFIG LOADER (For Self-Hosted Configs)
    // ============================================================================

    const ConfigLoader = {
        cache: {},

        async loadConfig(name) {
            if (this.cache[name]) return this.cache[name];

            if (!CONFIG.configBaseURL) {
                // Use built-in configs
                return this.getBuiltIn(name);
            }

            try {
                const url = CONFIG.configBaseURL + CONFIG.configFiles[name];
                const response = await this.fetch(url);
                if (response) {
                    this.cache[name] = JSON.parse(response);
                    return this.cache[name];
                }
            } catch (e) {
                console.warn(`DarkReader: Failed to load ${name}, using built-in`);
            }

            return this.getBuiltIn(name);
        },

        fetch(url) {
            return new Promise((resolve, reject) => {
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        onload: (response) => resolve(response.responseText),
                        onerror: () => reject(new Error('Failed to fetch'))
                    });
                } else {
                    fetch(url)
                        .then(r => r.text())
                        .then(resolve)
                        .catch(reject);
                }
            });
        },

        getBuiltIn(name) {
            switch (name) {
                case 'darkSites':
                    return BUILT_IN_DARK_SITES;
                case 'dynamicFixes':
                    return BUILT_IN_DYNAMIC_FIXES;
                case 'inversionFixes':
                    return BUILT_IN_INVERSION_FIXES;
                default:
                    return null;
            }
        },

        getSiteFix(hostname, fixes) {
            if (!fixes) return null;
            for (const [pattern, fix] of Object.entries(fixes)) {
                if (hostname === pattern || hostname.endsWith('.' + pattern)) {
                    return fix;
                }
                if (pattern.includes('*')) {
                    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                    if (regex.test(hostname)) {
                        return fix;
                    }
                }
            }
            return null;
        }
    };

    // ============================================================================
    // STORAGE
    // ============================================================================

    const Storage = {
        get(key, defaultValue) {
            try {
                if (typeof GM_getValue === 'function') {
                    const val = GM_getValue(key, undefined);
                    if (val === undefined) return defaultValue;
                    return typeof val === 'string' ? JSON.parse(val) : val;
                }
                const stored = localStorage.getItem(key);
                return stored ? JSON.parse(stored) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                const json = JSON.stringify(value);
                if (typeof GM_setValue === 'function') {
                    GM_setValue(key, json);
                } else {
                    localStorage.setItem(key, json);
                }
            } catch (e) {}
        }
    };

    // ============================================================================
    // SETTINGS UI (Faithful Recreation)
    // ============================================================================

    const UI = {
        container: null,
        isOpen: false,

        styles: `
            #darkreader-ui {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 11px;
                line-height: 1.4;
                color: #e8e6e3;
            }
            #darkreader-ui * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            #darkreader-ui .dr-popup {
                width: 280px;
                background: #1e2021;
                border-radius: 10px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
                overflow: hidden;
            }
            #darkreader-ui .dr-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: linear-gradient(to bottom, #2a2c2d, #1e2021);
                border-bottom: 1px solid #3a3d3e;
            }
            #darkreader-ui .dr-header-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 600;
            }
            #darkreader-ui .dr-logo {
                width: 24px;
                height: 24px;
            }
            #darkreader-ui .dr-close {
                background: none;
                border: none;
                color: #7a7a7a;
                font-size: 20px;
                cursor: pointer;
                padding: 4px;
                line-height: 1;
            }
            #darkreader-ui .dr-close:hover {
                color: #e8e6e3;
            }
            #darkreader-ui .dr-body {
                padding: 12px;
            }
            #darkreader-ui .dr-main-toggle {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                margin: -12px -12px 12px -12px;
                background: #181a1b;
                border-bottom: 1px solid #3a3d3e;
            }
            #darkreader-ui .dr-site-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #darkreader-ui .dr-toggle {
                position: relative;
                width: 36px;
                height: 20px;
                cursor: pointer;
            }
            #darkreader-ui .dr-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            #darkreader-ui .dr-toggle-slider {
                position: absolute;
                inset: 0;
                background: #3a3d3e;
                border-radius: 20px;
                transition: 0.2s;
            }
            #darkreader-ui .dr-toggle-slider::before {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                left: 2px;
                bottom: 2px;
                background: #7a7a7a;
                border-radius: 50%;
                transition: 0.2s;
            }
            #darkreader-ui .dr-toggle input:checked + .dr-toggle-slider {
                background: #3d8cff;
            }
            #darkreader-ui .dr-toggle input:checked + .dr-toggle-slider::before {
                transform: translateX(16px);
                background: white;
            }
            #darkreader-ui .dr-tabs {
                display: flex;
                margin-bottom: 12px;
                border-radius: 6px;
                background: #2a2c2d;
                padding: 2px;
            }
            #darkreader-ui .dr-tab {
                flex: 1;
                padding: 6px 8px;
                background: transparent;
                border: none;
                color: #7a7a7a;
                font-size: 11px;
                cursor: pointer;
                border-radius: 4px;
                transition: 0.2s;
            }
            #darkreader-ui .dr-tab:hover {
                color: #e8e6e3;
            }
            #darkreader-ui .dr-tab.active {
                background: #3d8cff;
                color: white;
            }
            #darkreader-ui .dr-panel {
                display: none;
            }
            #darkreader-ui .dr-panel.active {
                display: block;
            }
            #darkreader-ui .dr-section {
                margin-bottom: 12px;
            }
            #darkreader-ui .dr-section:last-child {
                margin-bottom: 0;
            }
            #darkreader-ui .dr-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
                color: #a9a49d;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            #darkreader-ui .dr-value {
                color: #e8e6e3;
            }
            #darkreader-ui .dr-slider {
                width: 100%;
                height: 4px;
                -webkit-appearance: none;
                background: #3a3d3e;
                border-radius: 2px;
                outline: none;
            }
            #darkreader-ui .dr-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: #e8e6e3;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            #darkreader-ui .dr-slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #e8e6e3;
                border-radius: 50%;
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            #darkreader-ui .dr-mode-group {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
            }
            #darkreader-ui .dr-mode-btn {
                padding: 8px 4px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                color: #a9a49d;
                font-size: 10px;
                cursor: pointer;
                transition: 0.2s;
            }
            #darkreader-ui .dr-mode-btn:hover {
                border-color: #5a5d5e;
                color: #e8e6e3;
            }
            #darkreader-ui .dr-mode-btn.active {
                background: #3d8cff;
                border-color: #3d8cff;
                color: white;
            }
            #darkreader-ui .dr-color-row {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            #darkreader-ui .dr-color-input {
                width: 32px;
                height: 24px;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                padding: 0;
                cursor: pointer;
                background: #2a2c2d;
            }
            #darkreader-ui .dr-color-text {
                flex: 1;
                padding: 4px 8px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                color: #e8e6e3;
                font-family: monospace;
                font-size: 11px;
            }
            #darkreader-ui .dr-site-list {
                width: 100%;
                min-height: 100px;
                padding: 8px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                color: #e8e6e3;
                font-family: monospace;
                font-size: 11px;
                resize: vertical;
            }
            #darkreader-ui .dr-btn-row {
                display: flex;
                gap: 8px;
            }
            #darkreader-ui .dr-btn {
                flex: 1;
                padding: 8px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                color: #e8e6e3;
                font-size: 11px;
                cursor: pointer;
                transition: 0.2s;
            }
            #darkreader-ui .dr-btn:hover {
                background: #3a3d3e;
            }
            #darkreader-ui .dr-btn-primary {
                background: #3d8cff;
                border-color: #3d8cff;
            }
            #darkreader-ui .dr-btn-primary:hover {
                background: #2d7cf0;
            }
            #darkreader-ui .dr-footer {
                padding: 8px 12px;
                background: #181a1b;
                border-top: 1px solid #3a3d3e;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: #7a7a7a;
            }
            #darkreader-ui .dr-footer a {
                color: #6eb4ff;
                text-decoration: none;
            }
            #darkreader-ui .dr-footer a:hover {
                text-decoration: underline;
            }
            #darkreader-ui select {
                padding: 6px 8px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                color: #e8e6e3;
                font-size: 11px;
                cursor: pointer;
                width: 100%;
            }
        `,

        createHTML(settings) {
            const t = settings.theme;
            const hostname = window.location.hostname;
            const isSiteEnabled = !isURLMatched(window.location.href, settings.disabledFor);

            return `
                <div class="dr-popup">
                    <div class="dr-header">
                        <div class="dr-header-title">
                            <svg class="dr-logo" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 11.807C10.7418 10.5483 9.88488 8.94484 9.53762 7.19776C9.19037 5.45068 9.36832 3.64072 10.049 2C7.4618 2.9426 5.27881 4.72746 3.83986 7.07381C2.40091 9.42016 1.78932 12.1895 2.09862 14.929C2.40792 17.6685 3.62052 20.2186 5.55337 22.1659C7.48622 24.1132 10.0292 25.3462 12.7661 25.6809C14.124 25.8558 15.5008 25.7726 16.8311 25.435C18.1614 25.0975 19.4206 24.5121 20.5429 23.7085C21.6652 22.9049 22.6303 21.898 23.3898 20.7413C24.1494 19.5847 24.6891 18.2998 24.9809 16.9546C25.2727 15.6094 25.3112 14.2286 25.0946 12.869C24.8779 11.5094 24.4101 10.1964 23.7158 9.00014C23.0215 7.80386 22.1132 6.74728 21.039 5.88014C19.9648 5.013 18.7454 4.35222 17.439 3.93014C17.1252 5.31647 17.1441 6.75877 17.4939 8.13662C17.8437 9.51448 18.5139 10.7893 19.449 11.857L12 11.807Z"/>
                            </svg>
                            Dark Reader
                        </div>
                        <button class="dr-close" id="dr-close">&times;</button>
                    </div>
                    <div class="dr-body">
                        <div class="dr-main-toggle">
                            <div class="dr-site-toggle">
                                <label class="dr-toggle">
                                    <input type="checkbox" id="dr-enabled" ${settings.enabled ? 'checked' : ''}>
                                    <span class="dr-toggle-slider"></span>
                                </label>
                                <span>${settings.enabled ? 'On' : 'Off'}</span>
                            </div>
                            <div class="dr-site-toggle">
                                <span style="font-size: 10px; color: #7a7a7a;">${hostname.slice(0, 20)}${hostname.length > 20 ? '...' : ''}</span>
                                <label class="dr-toggle">
                                    <input type="checkbox" id="dr-site-enabled" ${isSiteEnabled ? 'checked' : ''}>
                                    <span class="dr-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="dr-tabs">
                            <button class="dr-tab active" data-tab="filter">Filter</button>
                            <button class="dr-tab" data-tab="sitelist">Site list</button>
                            <button class="dr-tab" data-tab="more">More</button>
                        </div>

                        <div class="dr-panel active" id="dr-panel-filter">
                            <div class="dr-section">
                                <div class="dr-label">Mode</div>
                                <div class="dr-mode-group">
                                    <button class="dr-mode-btn ${t.engine === 'filter' ? 'active' : ''}" data-engine="filter">Filter</button>
                                    <button class="dr-mode-btn ${t.engine === 'filterPlus' ? 'active' : ''}" data-engine="filterPlus">Filter+</button>
                                    <button class="dr-mode-btn ${t.engine === 'dynamic' ? 'active' : ''}" data-engine="dynamic">Dynamic</button>
                                    <button class="dr-mode-btn ${t.engine === 'static' ? 'active' : ''}" data-engine="static">Static</button>
                                </div>
                            </div>

                            <div class="dr-section">
                                <div class="dr-label">Brightness <span class="dr-value" id="dr-brightness-val">${t.brightness}</span></div>
                                <input type="range" class="dr-slider" id="dr-brightness" min="50" max="150" value="${t.brightness}">
                            </div>

                            <div class="dr-section">
                                <div class="dr-label">Contrast <span class="dr-value" id="dr-contrast-val">${t.contrast}</span></div>
                                <input type="range" class="dr-slider" id="dr-contrast" min="50" max="150" value="${t.contrast}">
                            </div>

                            <div class="dr-section">
                                <div class="dr-label">Sepia <span class="dr-value" id="dr-sepia-val">${t.sepia}</span></div>
                                <input type="range" class="dr-slider" id="dr-sepia" min="0" max="100" value="${t.sepia}">
                            </div>

                            <div class="dr-section">
                                <div class="dr-label">Grayscale <span class="dr-value" id="dr-grayscale-val">${t.grayscale}</span></div>
                                <input type="range" class="dr-slider" id="dr-grayscale" min="0" max="100" value="${t.grayscale}">
                            </div>

                            <div class="dr-section">
                                <div class="dr-label">Background</div>
                                <div class="dr-color-row">
                                    <input type="color" class="dr-color-input" id="dr-bg-color" value="${t.darkSchemeBackgroundColor}">
                                    <input type="text" class="dr-color-text" id="dr-bg-color-text" value="${t.darkSchemeBackgroundColor}">
                                </div>
                            </div>

                            <div class="dr-section">
                                <div class="dr-label">Text</div>
                                <div class="dr-color-row">
                                    <input type="color" class="dr-color-input" id="dr-text-color" value="${t.darkSchemeTextColor}">
                                    <input type="text" class="dr-color-text" id="dr-text-color-text" value="${t.darkSchemeTextColor}">
                                </div>
                            </div>
                        </div>

                        <div class="dr-panel" id="dr-panel-sitelist">
                            <div class="dr-section">
                                <div class="dr-label">Disabled Sites (one per line)</div>
                                <textarea class="dr-site-list" id="dr-disabled-sites" placeholder="example.com&#10;*.example.org">${settings.disabledFor.join('\n')}</textarea>
                            </div>
                            <div class="dr-btn-row">
                                <button class="dr-btn" id="dr-toggle-current">Toggle ${hostname}</button>
                            </div>
                        </div>

                        <div class="dr-panel" id="dr-panel-more">
                            <div class="dr-section">
                                <div class="dr-label">Automation</div>
                                <select id="dr-automation">
                                    <option value="" ${!settings.automation.enabled ? 'selected' : ''}>None</option>
                                    <option value="system" ${settings.automation.mode === 'system' ? 'selected' : ''}>System preference</option>
                                    <option value="time" ${settings.automation.mode === 'time' ? 'selected' : ''}>Time-based</option>
                                </select>
                            </div>

                            <div class="dr-section">
                                <div class="dr-label">Config URL (self-hosted)</div>
                                <input type="text" class="dr-color-text" id="dr-config-url" 
                                       value="${CONFIG.configBaseURL}" 
                                       placeholder="https://yourdomain.com/configs/">
                            </div>

                            <div class="dr-btn-row">
                                <button class="dr-btn" id="dr-export">Export</button>
                                <button class="dr-btn" id="dr-import">Import</button>
                                <button class="dr-btn" id="dr-reset">Reset</button>
                            </div>
                        </div>
                    </div>
                    <div class="dr-footer">
                        <span>v${CONFIG.version} | Alt+Shift+D</span>
                        <a href="https://darkreader.org" target="_blank">darkreader.org</a>
                    </div>
                </div>
            `;
        },

        open() {
            if (this.container) {
                this.container.style.display = 'block';
                this.isOpen = true;
                return;
            }

            const settings = DarkReader.getSettings();

            this.container = document.createElement('div');
            this.container.id = 'darkreader-ui';
            this.container.innerHTML = this.createHTML(settings);

            const style = document.createElement('style');
            style.id = 'darkreader-ui-styles';
            style.textContent = this.styles;

            document.head.appendChild(style);
            document.body.appendChild(this.container);

            this.attachEvents();
            this.isOpen = true;
        },

        close() {
            if (this.container) {
                this.container.style.display = 'none';
                this.isOpen = false;
            }
        },

        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        attachEvents() {
            const $ = sel => this.container.querySelector(sel);
            const $$ = sel => this.container.querySelectorAll(sel);

            // Close
            $('#dr-close').addEventListener('click', () => this.close());

            // Main toggle
            $('#dr-enabled').addEventListener('change', (e) => {
                DarkReader.setEnabled(e.target.checked);
                e.target.nextElementSibling.nextElementSibling.textContent = e.target.checked ? 'On' : 'Off';
            });

            // Site toggle
            $('#dr-site-enabled').addEventListener('change', (e) => {
                DarkReader.toggleSite(window.location.hostname, !e.target.checked);
            });

            // Tabs
            $$('.dr-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    $$('.dr-tab').forEach(t => t.classList.remove('active'));
                    $$('.dr-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    $(`#dr-panel-${tab.dataset.tab}`).classList.add('active');
                });
            });

            // Mode buttons
            $$('.dr-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    $$('.dr-mode-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    DarkReader.setEngine(btn.dataset.engine);
                });
            });

            // Sliders
            ['brightness', 'contrast', 'sepia', 'grayscale'].forEach(name => {
                const slider = $(`#dr-${name}`);
                slider.addEventListener('input', () => {
                    const val = parseInt(slider.value, 10);
                    $(`#dr-${name}-val`).textContent = val;
                    DarkReader.setThemeOption(name, val);
                });
            });

            // Colors
            const colors = [
                { picker: '#dr-bg-color', text: '#dr-bg-color-text', key: 'darkSchemeBackgroundColor' },
                { picker: '#dr-text-color', text: '#dr-text-color-text', key: 'darkSchemeTextColor' }
            ];

            colors.forEach(({ picker, text, key }) => {
                $(picker).addEventListener('input', (e) => {
                    $(text).value = e.target.value;
                    DarkReader.setThemeOption(key, e.target.value);
                });
                $(text).addEventListener('change', (e) => {
                    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
                        $(picker).value = e.target.value;
                        DarkReader.setThemeOption(key, e.target.value);
                    }
                });
            });

            // Site list
            $('#dr-disabled-sites').addEventListener('change', (e) => {
                const sites = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                DarkReader.setDisabledSites(sites);
            });

            $('#dr-toggle-current').addEventListener('click', () => {
                const hostname = window.location.hostname;
                const settings = DarkReader.getSettings();
                const isDisabled = settings.disabledFor.includes(hostname);
                DarkReader.toggleSite(hostname, !isDisabled);
                $('#dr-site-enabled').checked = isDisabled;
                const textarea = $('#dr-disabled-sites');
                textarea.value = DarkReader.getSettings().disabledFor.join('\n');
            });

            // Automation
            $('#dr-automation').addEventListener('change', (e) => {
                DarkReader.setAutomation(e.target.value);
            });

            // Config URL
            $('#dr-config-url').addEventListener('change', (e) => {
                CONFIG.configBaseURL = e.target.value;
                Storage.set(CONFIG.storageKey + '_configURL', e.target.value);
            });

            // Export/Import/Reset
            $('#dr-export').addEventListener('click', () => {
                const data = JSON.stringify(DarkReader.getSettings(), null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'darkreader-settings.json';
                a.click();
                URL.revokeObjectURL(url);
            });

            $('#dr-import').addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const settings = JSON.parse(e.target.result);
                                DarkReader.importSettings(settings);
                                this.close();
                                this.open();
                            } catch (err) {
                                alert('Invalid settings file');
                            }
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            });

            $('#dr-reset').addEventListener('click', () => {
                if (confirm('Reset all settings to defaults?')) {
                    DarkReader.resetSettings();
                    this.close();
                    this.open();
                }
            });

            // Escape to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }
    };

    // ============================================================================
    // MAIN CONTROLLER
    // ============================================================================

    const DarkReader = {
        settings: null,
        darkSites: null,
        dynamicFixes: null,
        inversionFixes: null,

        async init() {
            // Load settings
            this.settings = Storage.get(CONFIG.storageKey, { ...DEFAULT_SETTINGS });
            this.settings = { ...DEFAULT_SETTINGS, ...this.settings };
            this.settings.theme = { ...DEFAULT_THEME, ...this.settings.theme };

            // Load config URL if saved
            const savedConfigURL = Storage.get(CONFIG.storageKey + '_configURL', '');
            if (savedConfigURL) {
                CONFIG.configBaseURL = savedConfigURL;
            }

            // Load configs
            this.darkSites = await ConfigLoader.loadConfig('darkSites');
            this.dynamicFixes = await ConfigLoader.loadConfig('dynamicFixes');
            this.inversionFixes = await ConfigLoader.loadConfig('inversionFixes');

            // Apply if enabled
            if (this.shouldApply()) {
                this.apply();
            }

            // Register menu command
            if (typeof GM_registerMenuCommand === 'function') {
                GM_registerMenuCommand('Dark Reader Settings', () => UI.toggle());
            }

            // Keyboard shortcut
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    UI.toggle();
                }
            });

            console.log(`Dark Reader Userscript v${CONFIG.version} initialized`);
        },

        shouldApply() {
            if (!this.settings.enabled) return false;

            const url = window.location.href;
            const hostname = window.location.hostname;

            // Check if site is disabled
            if (isURLMatched(url, this.settings.disabledFor)) {
                return false;
            }

            // Check if it's an already dark site (optional)
            if (this.settings.detectDarkTheme && this.darkSites) {
                if (isURLMatched(hostname, this.darkSites)) {
                    return false;
                }
            }

            return true;
        },

        apply() {
            this.remove();

            if (!this.shouldApply()) return;

            const theme = this.settings.theme;
            const hostname = window.location.hostname;
            const fixes = this.dynamicFixes ? ConfigLoader.getSiteFix(hostname, this.dynamicFixes) : null;

            switch (theme.engine) {
                case 'filter':
                    FilterEngine.apply(theme);
                    break;
                case 'filterPlus':
                    FilterPlusEngine.apply(theme);
                    break;
                case 'dynamic':
                    DynamicEngine.apply(theme, fixes);
                    break;
                case 'static':
                    StaticEngine.apply(theme);
                    break;
                default:
                    DynamicEngine.apply(theme, fixes);
            }

            document.documentElement.setAttribute('data-darkreader-scheme', 'dark');
            document.documentElement.setAttribute('data-darkreader-mode', theme.engine);
        },

        remove() {
            FilterEngine.remove();
            FilterPlusEngine.remove();
            DynamicEngine.remove();
            StaticEngine.remove();
            document.documentElement.removeAttribute('data-darkreader-scheme');
            document.documentElement.removeAttribute('data-darkreader-mode');
        },

        getSettings() {
            return { ...this.settings, theme: { ...this.settings.theme } };
        },

        saveSettings() {
            Storage.set(CONFIG.storageKey, this.settings);
        },

        setEnabled(enabled) {
            this.settings.enabled = enabled;
            this.saveSettings();
            if (enabled) {
                this.apply();
            } else {
                this.remove();
            }
        },

        setEngine(engine) {
            this.settings.theme.engine = engine;
            this.saveSettings();
            this.apply();
        },

        setThemeOption(key, value) {
            this.settings.theme[key] = value;
            this.saveSettings();
            this.apply();
        },

        toggleSite(hostname, disable) {
            const list = this.settings.disabledFor;
            const index = list.indexOf(hostname);

            if (disable && index === -1) {
                list.push(hostname);
            } else if (!disable && index !== -1) {
                list.splice(index, 1);
            }

            this.saveSettings();

            if (this.shouldApply()) {
                this.apply();
            } else {
                this.remove();
            }
        },

        setDisabledSites(sites) {
            this.settings.disabledFor = sites;
            this.saveSettings();
            if (this.shouldApply()) {
                this.apply();
            } else {
                this.remove();
            }
        },

        setAutomation(mode) {
            this.settings.automation.enabled = !!mode;
            this.settings.automation.mode = mode;
            this.saveSettings();
        },

        resetSettings() {
            this.settings = { ...DEFAULT_SETTINGS, theme: { ...DEFAULT_THEME } };
            this.saveSettings();
            this.apply();
        },

        importSettings(settings) {
            this.settings = { ...DEFAULT_SETTINGS, ...settings };
            this.settings.theme = { ...DEFAULT_THEME, ...settings.theme };
            this.saveSettings();
            this.apply();
        }
    };

    // ============================================================================
    // INITIALIZE
    // ============================================================================

    DarkReader.init();

    // Expose for debugging and API access
    window.DarkReaderUserscript = DarkReader;

})();
