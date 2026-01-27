// ==UserScript==
// @name         DarkModer
// @namespace    https://github.com/SysAdminDoc/DarkModer
// @version      2.0.4
// @description  Dark mode for every website. Complete Dark Reader recreation as userscript.
// @author       SysAdminDoc (Based on Dark Reader by Alexander Shutau)
// @license      MIT
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      raw.githubusercontent.com
// @connect      *
// @run-at       document-start
// @noframes
// @updateURL    https://github.com/SysAdminDoc/DarkModer/raw/refs/heads/main/DarkModer.user.js
// @downloadURL  https://github.com/SysAdminDoc/DarkModer/raw/refs/heads/main/DarkModer.user.js
// @homepageURL  https://github.com/SysAdminDoc/DarkModer
// @supportURL   https://github.com/SysAdminDoc/DarkModer/issues
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const CONFIG = {
        version: '2.0.4',
        storageKey: 'darkModer',
        // GitHub-hosted config files - can be overridden in settings
        configBaseURL: 'https://raw.githubusercontent.com/SysAdminDoc/DarkModer/refs/heads/main/',
        configFiles: {
            darkSites: 'dark-sites.json',
            dynamicFixes: 'dynamic-theme-fixes.json',
            inversionFixes: 'inversion-fixes.json',
            staticThemes: 'static-themes.json'
        },
        // Cache duration for config files (1 hour)
        cacheDuration: 60 * 60 * 1000
    };

    // ============================================================================
    // DEFAULT SETTINGS
    // ============================================================================

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
    // BUILT-IN SITE DATA (Fallback if config files fail to load)
    // ============================================================================

    const BUILT_IN_DARK_SITES = [
        'darkreader.org',
        'discord.com',
        'github.com',
        'netflix.com',
        'twitch.tv',
        'youtube.com',
        'music.youtube.com',
        'reddit.com',
        'old.reddit.com',
        'twitter.com',
        'x.com',
        'spotify.com',
        'open.spotify.com',
        'slack.com',
        'notion.so',
        'figma.com',
        'linear.app',
        'vercel.com',
        'vitejs.dev',
        'vuejs.org',
        'nuxt.com',
        'astro.build',
        'vscode.dev',
        'codepen.io',
        'codesandbox.io',
        'replit.com',
        'stackblitz.com',
        'gitlab.com',
        'bitbucket.org',
        'hulu.com',
        'disneyplus.com',
        'max.com',
        'primevideo.com',
        'crunchyroll.com',
        'soundcloud.com',
        'proton.me',
        'protonmail.com',
        'bitwarden.com',
        'duckduckgo.com',
        'brave.com',
        'monkeytype.com',
        'chess.com',
        'lichess.org'
    ];

    const BUILT_IN_DYNAMIC_FIXES = {
        'google.com': {
            invert: [],
            css: `
                .gb_Td { background-color: var(--darkreader-neutral-background) !important; }
                .RNNXgb { background-color: #303134 !important; }
                .aajZCb { background-color: #303134 !important; }
                .sfbg { background-color: #202124 !important; }
                .minidiv .sfbg { background-color: #303134 !important; }
            `,
            ignoreInlineStyle: ['.ytp-gradient-bottom'],
            ignoreImageAnalysis: []
        },
        'youtube.com': {
            invert: [],
            css: `
                html[dark] { --yt-spec-base-background: #0f0f0f !important; }
                ytd-masthead { background-color: #0f0f0f !important; }
            `,
            ignoreInlineStyle: ['.ytp-gradient-bottom', '.ytp-gradient-top'],
            ignoreImageAnalysis: []
        },
        'stackoverflow.com': {
            invert: [],
            css: `
                .s-prose code { background-color: #2d2d2d !important; border-color: #3e4446 !important; }
                .s-prose pre { background-color: #1e1e1e !important; }
            `,
            ignoreInlineStyle: [],
            ignoreImageAnalysis: []
        },
        'amazon.com': {
            invert: ['.a-button-text img', '.nav-logo-link img', '.s-image', '#landingImage'],
            css: `
                #nav-belt { background-color: #131921 !important; }
                #nav-main { background-color: #232f3e !important; }
                .nav-sprite { filter: none !important; }
            `,
            ignoreInlineStyle: [],
            ignoreImageAnalysis: ['.s-image', '#landingImage']
        },
        'facebook.com': {
            invert: [],
            css: `
                .__fb-light-mode {
                    --primary-background: #18191a !important;
                    --secondary-background: #242526 !important;
                }
            `,
            ignoreInlineStyle: [],
            ignoreImageAnalysis: []
        },
        'wikipedia.org': {
            invert: [],
            css: `
                .mw-body { background-color: var(--darkreader-neutral-background) !important; }
                .vector-menu-portal .vector-menu-content { background-color: var(--darkreader-neutral-background) !important; }
            `,
            ignoreInlineStyle: [],
            ignoreImageAnalysis: ['.mw-file-element', '.thumbimage']
        },
        'linkedin.com': {
            invert: [],
            css: '',
            ignoreInlineStyle: [],
            ignoreImageAnalysis: ['.presence-entity__image', '.feed-shared-actor__avatar-image']
        },
        'medium.com': {
            invert: [],
            css: '',
            ignoreInlineStyle: [],
            ignoreImageAnalysis: ['figure img', '.progressiveMedia-image']
        },
        'nytimes.com': {
            invert: [],
            css: '',
            ignoreInlineStyle: [],
            ignoreImageAnalysis: ['.css-rq4mmj', 'figure img']
        }
    };

    const BUILT_IN_INVERSION_FIXES = {
        'default': {
            invert: [
                'img',
                'video',
                'picture',
                'canvas',
                'iframe',
                'embed',
                'object',
                'svg image',
                '[style*="background-image"]:not([style*="gradient"])',
                '.emoji',
                '[class*="emoji"]',
                '[role="img"]'
            ],
            noinvert: [
                'img img',
                'picture img',
                'video video'
            ],
            removebg: [],
            css: ''
        }
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Throttle function execution
     * @param {Function} fn - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
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

    /**
     * Debounce function execution
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    /**
     * Get hostname from URL
     * @param {string} url - URL to parse
     * @returns {string} Hostname or empty string
     */
    function getURLHostname(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return '';
        }
    }

    /**
     * Check if URL matches any pattern in the list
     * @param {string} url - URL to check
     * @param {Array} patterns - Array of patterns to match against
     * @returns {boolean} True if URL matches any pattern
     */
    function isURLMatched(url, patterns) {
        // Safety check - patterns must be an array
        if (!patterns || !Array.isArray(patterns)) {
            return false;
        }

        const hostname = getURLHostname(url) || url;

        return patterns.some(pattern => {
            // Skip invalid patterns
            if (!pattern || typeof pattern !== 'string') {
                return false;
            }

            // Regex pattern (wrapped in slashes)
            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                try {
                    return new RegExp(pattern.slice(1, -1)).test(url);
                } catch (e) {
                    return false;
                }
            }

            // Wildcard pattern
            if (pattern.includes('*')) {
                const regex = new RegExp(
                    '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
                    'i'
                );
                return regex.test(hostname) || regex.test(url);
            }

            // Exact match or subdomain match
            return hostname === pattern || hostname.endsWith('.' + pattern);
        });
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    function generateUID() {
        return Math.random().toString(36).substring(2, 11);
    }

    /**
     * Check if we're in an iframe
     * @returns {boolean} True if in iframe
     */
    function isInIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    // ============================================================================
    // COLOR MANIPULATION (Core DarkModer Algorithm)
    // ============================================================================

    const Color = {
        /**
         * Parse a color string into RGBA components
         * @param {string} input - Color string (hex, rgb, rgba, hsl, hsla, or named)
         * @returns {Object|null} Color object {r, g, b, a} or null
         */
        parse(input) {
            if (!input ||
                input === 'transparent' ||
                input === 'inherit' ||
                input === 'initial' ||
                input === 'currentColor' ||
                input === 'none' ||
                input === 'unset') {
                return null;
            }

            input = input.trim().toLowerCase();

            // Hex color (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
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

            // RGB/RGBA color
            match = input.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
            if (match) {
                return {
                    r: parseInt(match[1], 10),
                    g: parseInt(match[2], 10),
                    b: parseInt(match[3], 10),
                    a: match[4] !== undefined ? parseFloat(match[4]) : 1
                };
            }

            // RGB/RGBA with spaces (modern syntax)
            match = input.match(/^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/);
            if (match) {
                let alpha = 1;
                if (match[4]) {
                    alpha = match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
                }
                return {
                    r: parseInt(match[1], 10),
                    g: parseInt(match[2], 10),
                    b: parseInt(match[3], 10),
                    a: alpha
                };
            }

            // HSL/HSLA color
            match = input.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)$/);
            if (match) {
                return this.hslToRgb(
                    parseFloat(match[1]),
                    parseFloat(match[2]),
                    parseFloat(match[3]),
                    match[4] !== undefined ? parseFloat(match[4]) : 1
                );
            }

            // Named color
            const named = this.getNamedColor(input);
            if (named) return named;

            return null;
        },

        /**
         * Get RGB values for named CSS colors
         * @param {string} name - Color name
         * @returns {Object|null} Color object {r, g, b, a} or null
         */
        getNamedColor(name) {
            const colors = {
                // Basic colors
                white: [255, 255, 255],
                black: [0, 0, 0],
                red: [255, 0, 0],
                green: [0, 128, 0],
                blue: [0, 0, 255],
                yellow: [255, 255, 0],
                cyan: [0, 255, 255],
                magenta: [255, 0, 255],

                // Grays
                silver: [192, 192, 192],
                gray: [128, 128, 128],
                grey: [128, 128, 128],
                darkgray: [169, 169, 169],
                darkgrey: [169, 169, 169],
                dimgray: [105, 105, 105],
                dimgrey: [105, 105, 105],
                lightgray: [211, 211, 211],
                lightgrey: [211, 211, 211],
                gainsboro: [220, 220, 220],
                whitesmoke: [245, 245, 245],

                // Reds/Pinks
                maroon: [128, 0, 0],
                darkred: [139, 0, 0],
                crimson: [220, 20, 60],
                firebrick: [178, 34, 34],
                indianred: [205, 92, 92],
                lightcoral: [240, 128, 128],
                salmon: [250, 128, 114],
                darksalmon: [233, 150, 122],
                lightsalmon: [255, 160, 122],
                coral: [255, 127, 80],
                tomato: [255, 99, 71],
                orangered: [255, 69, 0],
                pink: [255, 192, 203],
                lightpink: [255, 182, 193],
                hotpink: [255, 105, 180],
                deeppink: [255, 20, 147],
                mediumvioletred: [199, 21, 133],
                palevioletred: [219, 112, 147],

                // Oranges
                orange: [255, 165, 0],
                darkorange: [255, 140, 0],

                // Yellows
                gold: [255, 215, 0],
                lightyellow: [255, 255, 224],
                lemonchiffon: [255, 250, 205],
                lightgoldenrodyellow: [250, 250, 210],
                papayawhip: [255, 239, 213],
                moccasin: [255, 228, 181],
                peachpuff: [255, 218, 185],
                palegoldenrod: [238, 232, 170],
                khaki: [240, 230, 140],
                darkkhaki: [189, 183, 107],

                // Greens
                lime: [0, 255, 0],
                limegreen: [50, 205, 50],
                forestgreen: [34, 139, 34],
                darkgreen: [0, 100, 0],
                seagreen: [46, 139, 87],
                mediumseagreen: [60, 179, 113],
                springgreen: [0, 255, 127],
                mediumspringgreen: [0, 250, 154],
                lightgreen: [144, 238, 144],
                palegreen: [152, 251, 152],
                darkseagreen: [143, 188, 143],
                mediumaquamarine: [102, 205, 170],
                yellowgreen: [154, 205, 50],
                olivedrab: [107, 142, 35],
                olive: [128, 128, 0],
                darkolivegreen: [85, 107, 47],
                greenyellow: [173, 255, 47],
                chartreuse: [127, 255, 0],
                lawngreen: [124, 252, 0],

                // Cyans/Teals
                aqua: [0, 255, 255],
                teal: [0, 128, 128],
                darkcyan: [0, 139, 139],
                lightcyan: [224, 255, 255],
                paleturquoise: [175, 238, 238],
                aquamarine: [127, 255, 212],
                turquoise: [64, 224, 208],
                mediumturquoise: [72, 209, 204],
                darkturquoise: [0, 206, 209],
                cadetblue: [95, 158, 160],
                steelblue: [70, 130, 180],
                lightsteelblue: [176, 196, 222],

                // Blues
                navy: [0, 0, 128],
                darkblue: [0, 0, 139],
                mediumblue: [0, 0, 205],
                royalblue: [65, 105, 225],
                cornflowerblue: [100, 149, 237],
                dodgerblue: [30, 144, 255],
                deepskyblue: [0, 191, 255],
                lightskyblue: [135, 206, 250],
                skyblue: [135, 206, 235],
                lightblue: [173, 216, 230],
                powderblue: [176, 224, 230],
                aliceblue: [240, 248, 255],
                midnightblue: [25, 25, 112],

                // Purples/Violets
                fuchsia: [255, 0, 255],
                purple: [128, 0, 128],
                indigo: [75, 0, 130],
                darkmagenta: [139, 0, 139],
                darkviolet: [148, 0, 211],
                darkorchid: [153, 50, 204],
                mediumorchid: [186, 85, 211],
                orchid: [218, 112, 214],
                violet: [238, 130, 238],
                plum: [221, 160, 221],
                thistle: [216, 191, 216],
                lavender: [230, 230, 250],
                rebeccapurple: [102, 51, 153],
                blueviolet: [138, 43, 226],
                mediumpurple: [147, 112, 219],
                slateblue: [106, 90, 205],
                darkslateblue: [72, 61, 139],
                mediumslateblue: [123, 104, 238],

                // Browns
                brown: [165, 42, 42],
                saddlebrown: [139, 69, 19],
                sienna: [160, 82, 45],
                chocolate: [210, 105, 30],
                peru: [205, 133, 63],
                sandybrown: [244, 164, 96],
                burlywood: [222, 184, 135],
                tan: [210, 180, 140],
                rosybrown: [188, 143, 143],
                goldenrod: [218, 165, 32],
                darkgoldenrod: [184, 134, 11],

                // Whites/Creams
                snow: [255, 250, 250],
                honeydew: [240, 255, 240],
                mintcream: [245, 255, 250],
                azure: [240, 255, 255],
                ghostwhite: [248, 248, 255],
                floralwhite: [255, 250, 240],
                ivory: [255, 255, 240],
                beige: [245, 245, 220],
                linen: [250, 240, 230],
                oldlace: [253, 245, 230],
                antiquewhite: [250, 235, 215],
                bisque: [255, 228, 196],
                blanchedalmond: [255, 235, 205],
                wheat: [245, 222, 179],
                cornsilk: [255, 248, 220],
                navajowhite: [255, 222, 173],
                seashell: [255, 245, 238],
                mistyrose: [255, 228, 225],
                lavenderblush: [255, 240, 245],

                // Slates
                slategray: [112, 128, 144],
                slategrey: [112, 128, 144],
                lightslategray: [119, 136, 153],
                lightslategrey: [119, 136, 153],
                darkslategray: [47, 79, 79],
                darkslategrey: [47, 79, 79]
            };

            const c = colors[name];
            return c ? { r: c[0], g: c[1], b: c[2], a: 1 } : null;
        },

        /**
         * Convert RGB to HSL
         * @param {number} r - Red (0-255)
         * @param {number} g - Green (0-255)
         * @param {number} b - Blue (0-255)
         * @returns {Object} HSL object {h, s, l}
         */
        rgbToHsl(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = 0;
            let s = 0;
            const l = (max + min) / 2;

            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                switch (max) {
                    case r:
                        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                        break;
                    case g:
                        h = ((b - r) / d + 2) / 6;
                        break;
                    case b:
                        h = ((r - g) / d + 4) / 6;
                        break;
                }
            }

            return {
                h: h * 360,
                s: s * 100,
                l: l * 100
            };
        },

        /**
         * Convert HSL to RGB
         * @param {number} h - Hue (0-360)
         * @param {number} s - Saturation (0-100)
         * @param {number} l - Lightness (0-100)
         * @param {number} a - Alpha (0-1)
         * @returns {Object} RGB object {r, g, b, a}
         */
        hslToRgb(h, s, l, a = 1) {
            h = ((h % 360) + 360) % 360;
            s = clamp(s, 0, 100) / 100;
            l = clamp(l, 0, 100) / 100;

            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;

            let r, g, b;

            if (h < 60) {
                r = c; g = x; b = 0;
            } else if (h < 120) {
                r = x; g = c; b = 0;
            } else if (h < 180) {
                r = 0; g = c; b = x;
            } else if (h < 240) {
                r = 0; g = x; b = c;
            } else if (h < 300) {
                r = x; g = 0; b = c;
            } else {
                r = c; g = 0; b = x;
            }

            return {
                r: Math.round((r + m) * 255),
                g: Math.round((g + m) * 255),
                b: Math.round((b + m) * 255),
                a
            };
        },

        /**
         * Convert color object to hex string
         * @param {Object} color - Color object {r, g, b, a}
         * @returns {string} Hex color string
         */
        toHex({ r, g, b, a }) {
            const toHex = x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a * 255) : ''}`;
        },

        /**
         * Convert color object to RGBA string
         * @param {Object} color - Color object {r, g, b, a}
         * @returns {string} RGBA color string
         */
        toRgba({ r, g, b, a }) {
            return `rgba(${clamp(Math.round(r), 0, 255)}, ${clamp(Math.round(g), 0, 255)}, ${clamp(Math.round(b), 0, 255)}, ${a})`;
        },

        /**
         * Calculate relative luminance (WCAG formula)
         * @param {Object} color - Color object {r, g, b}
         * @returns {number} Luminance value (0-1)
         */
        getLuminance({ r, g, b }) {
            const rsrgb = r / 255;
            const gsrgb = g / 255;
            const bsrgb = b / 255;

            const rlin = rsrgb <= 0.03928 ? rsrgb / 12.92 : Math.pow((rsrgb + 0.055) / 1.055, 2.4);
            const glin = gsrgb <= 0.03928 ? gsrgb / 12.92 : Math.pow((gsrgb + 0.055) / 1.055, 2.4);
            const blin = bsrgb <= 0.03928 ? bsrgb / 12.92 : Math.pow((bsrgb + 0.055) / 1.055, 2.4);

            return 0.2126 * rlin + 0.7152 * glin + 0.0722 * blin;
        },

        /**
         * Check if color is light (luminance > 0.179)
         * @param {Object} color - Color object
         * @returns {boolean} True if light
         */
        isLight(color) {
            return this.getLuminance(color) > 0.179;
        },

        /**
         * Check if color is dark
         * @param {Object} color - Color object
         * @returns {boolean} True if dark
         */
        isDark(color) {
            return !this.isLight(color);
        },

        /**
         * Mix two colors
         * @param {Object} c1 - First color
         * @param {Object} c2 - Second color
         * @param {number} ratio - Mix ratio (0-1)
         * @returns {Object} Mixed color
         */
        mix(c1, c2, ratio) {
            return {
                r: c1.r * (1 - ratio) + c2.r * ratio,
                g: c1.g * (1 - ratio) + c2.g * ratio,
                b: c1.b * (1 - ratio) + c2.b * ratio,
                a: c1.a * (1 - ratio) + c2.a * ratio
            };
        },

        /**
         * Modify background color for dark mode
         * @param {Object} color - Original color
         * @param {Object} theme - Theme settings
         * @returns {string|null} Modified color as RGBA string
         */
        modifyBackgroundColor(color, theme) {
            if (!color || color.a < 0.1) return null;

            const hsl = this.rgbToHsl(color.r, color.g, color.b);
            const luminance = this.getLuminance(color);

            // Dark mode transformation
            if (theme.mode === 1) {
                if (luminance > 0.5) {
                    // Light background - make it dark
                    hsl.l = Math.max(5, Math.min(15, 100 - hsl.l));
                } else if (luminance > 0.2) {
                    // Medium background - make it darker
                    hsl.l = Math.max(5, hsl.l * 0.3);
                }
                // Already dark backgrounds get clamped
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

        /**
         * Modify text color for dark mode
         * @param {Object} color - Original color
         * @param {Object} theme - Theme settings
         * @returns {string|null} Modified color as RGBA string
         */
        modifyTextColor(color, theme) {
            if (!color) return null;

            const hsl = this.rgbToHsl(color.r, color.g, color.b);
            const luminance = this.getLuminance(color);

            // Dark mode transformation
            if (theme.mode === 1) {
                if (luminance < 0.5) {
                    // Dark text - make it light
                    hsl.l = Math.min(95, Math.max(80, 100 - hsl.l));
                } else if (luminance < 0.8) {
                    // Medium text - make it lighter
                    hsl.l = Math.min(95, hsl.l + 30);
                }
                // Ensure text is always readable
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

        /**
         * Modify border color for dark mode
         * @param {Object} color - Original color
         * @param {Object} theme - Theme settings
         * @returns {string|null} Modified color as RGBA string
         */
        modifyBorderColor(color, theme) {
            if (!color || color.a < 0.1) return null;

            const hsl = this.rgbToHsl(color.r, color.g, color.b);

            if (theme.mode === 1) {
                // Make borders visible but not too prominent
                hsl.l = clamp(30 + (hsl.l * 0.2), 20, 50);
            }

            // Grayscale
            hsl.s = hsl.s * (1 - theme.grayscale / 100);

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        },

        /**
         * Modify link color for dark mode
         * @param {Object} color - Original color
         * @param {Object} theme - Theme settings
         * @returns {string} Modified color as RGBA string
         */
        modifyLinkColor(color, theme) {
            if (!color) return '#6eb4ff';

            const hsl = this.rgbToHsl(color.r, color.g, color.b);

            if (theme.mode === 1) {
                // Keep hue but ensure visibility
                hsl.l = clamp(65, 50, 80);
                hsl.s = Math.max(hsl.s, 50);
            }

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        }
    };

    // ============================================================================
    // CSS PARSING AND MODIFICATION
    // ============================================================================

    const CSSModifier = {
        // Cache for processed stylesheets
        modifiedSheets: new WeakMap(),
        styleSheetRules: new Map(),

        // CSS properties that affect colors
        colorProperties: [
            'background-color',
            'background',
            'color',
            'border-color',
            'border-top-color',
            'border-bottom-color',
            'border-left-color',
            'border-right-color',
            'outline-color',
            'fill',
            'stroke',
            'box-shadow',
            'text-shadow',
            'caret-color',
            'column-rule-color',
            'text-decoration-color'
        ],

        /**
         * Process a CSS declaration and return modified value if applicable
         * @param {string} property - CSS property name
         * @param {string} value - CSS property value
         * @param {Object} theme - Theme settings
         * @returns {string|null} Modified value or null
         */
        processDeclaration(property, value, theme) {
            const prop = property.toLowerCase();

            // Background color
            if (prop === 'background-color' ||
                (prop === 'background' && !value.includes('url') && !value.includes('gradient'))) {
                const color = Color.parse(value);
                if (color && color.a > 0.1) {
                    return Color.modifyBackgroundColor(color, theme);
                }
            }

            // Text color
            if (prop === 'color') {
                const color = Color.parse(value);
                if (color) {
                    return Color.modifyTextColor(color, theme);
                }
            }

            // Border colors
            if (prop.includes('border') && prop.includes('color')) {
                const color = Color.parse(value);
                if (color && color.a > 0.1) {
                    return Color.modifyBorderColor(color, theme);
                }
            }

            // Box shadow - simplify or remove in dark mode
            if (prop === 'box-shadow' && value !== 'none') {
                return 'none';
            }

            return null;
        },

        /**
         * Process a CSS rule and return modified CSS string
         * @param {CSSStyleRule} rule - CSS rule to process
         * @param {Object} theme - Theme settings
         * @param {string} selectorPrefix - Optional selector prefix
         * @returns {string|null} Modified CSS string or null
         */
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

        /**
         * Process an entire stylesheet
         * @param {CSSStyleSheet} sheet - Stylesheet to process
         * @param {Object} theme - Theme settings
         * @returns {string} Modified CSS string
         */
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
                        // Process rules inside media queries
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
                // This is expected for external stylesheets
            }

            return rules.join('\n');
        }
    };

    // ============================================================================
    // THEME ENGINES
    // ============================================================================

    /**
     * Filter Engine - Uses CSS filter: invert() hue-rotate()
     * Fast and simple, but inverts everything including images
     */
    const FilterEngine = {
        style: null,

        /**
         * Generate CSS for filter mode
         * @param {Object} theme - Theme settings
         * @returns {string} CSS string
         */
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

                /* Re-invert media elements */
                html img,
                html video,
                html picture,
                html canvas,
                html [style*="background-image"]:not([style*="gradient"]),
                html iframe,
                html embed,
                html object,
                html svg image,
                html [data-darkmoder-inline-bgcolor] {
                    filter: invert(1) hue-rotate(180deg) !important;
                }

                /* Don't double-invert nested images */
                html img img,
                html picture img {
                    filter: none !important;
                }

                /* Fullscreen video shouldn't be inverted */
                html video:fullscreen,
                html video:-webkit-full-screen,
                html video:-moz-full-screen {
                    filter: none !important;
                }
            `;
        },

        /**
         * Apply filter mode
         * @param {Object} theme - Theme settings
         */
        apply(theme) {
            this.remove();

            this.style = document.createElement('style');
            this.style.id = 'darkmoder-filter';
            this.style.textContent = this.create(theme);

            document.documentElement.appendChild(this.style);
        },

        /**
         * Remove filter mode styles
         */
        remove() {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }
        }
    };

    /**
     * Filter+ Engine - Uses SVG filters for better color handling
     * More vivid colors than simple invert
     */
    const FilterPlusEngine = {
        style: null,
        svg: null,

        /**
         * Generate SVG filter and CSS
         * @param {Object} theme - Theme settings
         * @returns {Object} { svg, css }
         */
        create(theme) {
            const b = theme.brightness / 100;

            const svgFilter = `
                <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
                    <defs>
                        <filter id="dmFilter" color-interpolation-filters="linearRGB">
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
                        <filter id="dmFilterInvert">
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
                    filter: url(#dmFilter)
                            contrast(${theme.contrast}%)
                            sepia(${theme.sepia}%)
                            grayscale(${theme.grayscale}%) !important;
                    background-color: white !important;
                }

                html img,
                html video,
                html picture,
                html canvas,
                html iframe {
                    filter: url(#dmFilterInvert) !important;
                }
            `;

            return { svg: svgFilter, css };
        },

        /**
         * Apply Filter+ mode
         * @param {Object} theme - Theme settings
         */
        apply(theme) {
            this.remove();

            const { svg, css } = this.create(theme);

            // Insert SVG filters
            this.svg = document.createElement('div');
            this.svg.id = 'darkmoder-svg';
            this.svg.innerHTML = svg;
            document.body.insertBefore(this.svg, document.body.firstChild);

            // Insert CSS
            this.style = document.createElement('style');
            this.style.id = 'darkmoder-filterplus';
            this.style.textContent = css;
            document.documentElement.appendChild(this.style);
        },

        /**
         * Remove Filter+ mode styles
         */
        remove() {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }
            if (this.svg) {
                this.svg.remove();
                this.svg = null;
            }
        }
    };

    /**
     * Dynamic Engine - Analyzes and modifies CSS colors
     * Best visual results, preserves images naturally
     */
    const DynamicEngine = {
        styles: [],
        observer: null,
        processedSheets: new WeakSet(),
        theme: null,
        dirtyElements: new Set(),
        frameRequested: false,

        /**
         * Generate root CSS variables and base styles
         * @param {Object} theme - Theme settings
         * @returns {string} CSS string
         */
        createRootCSS(theme) {
            const bg = theme.darkSchemeBackgroundColor;
            const text = theme.darkSchemeTextColor;
            const border = '#3e4446';
            const link = '#6eb4ff';
            const linkVisited = '#b994ff';
            const linkActive = '#ff6e6e';
            const selection = '#3b5998';

            return `
                /* CSS Variables */
                :root {
                    --darkreader-neutral-background: ${bg};
                    --darkreader-neutral-text: ${text};
                    --darkreader-selection-background: ${selection};
                    --darkreader-selection-text: #fff;
                    color-scheme: dark;
                }

                /* Base elements */
                html, body {
                    background-color: ${bg} !important;
                    color: ${text} !important;
                }

                html {
                    background-image: none !important;
                }

                /* Links */
                a {
                    color: ${link} !important;
                }
                a:visited {
                    color: ${linkVisited} !important;
                }
                a:active {
                    color: ${linkActive} !important;
                }

                /* Selection */
                ::selection {
                    background-color: ${selection} !important;
                    color: #fff !important;
                }
                ::-moz-selection {
                    background-color: ${selection} !important;
                    color: #fff !important;
                }

                /* Form elements */
                input, textarea, select, button {
                    background-color: #1c1e1f !important;
                    border-color: ${border} !important;
                    color: ${text} !important;
                }

                input::placeholder,
                textarea::placeholder {
                    color: #7a7a7a !important;
                }

                input[type="checkbox"],
                input[type="radio"] {
                    appearance: none;
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    border: 1px solid ${border} !important;
                    background-color: #1c1e1f !important;
                    border-radius: 3px;
                }

                input[type="radio"] {
                    border-radius: 50%;
                }

                input[type="checkbox"]:checked,
                input[type="radio"]:checked {
                    background-color: ${link} !important;
                }

                /* Tables */
                table, td, th {
                    border-color: ${border} !important;
                }

                th {
                    background-color: #1f2123 !important;
                }

                /* Horizontal rule */
                hr {
                    border-color: ${border} !important;
                    background-color: ${border} !important;
                }

                /* Code blocks */
                pre, code {
                    background-color: #1a1c1e !important;
                    border-color: ${border} !important;
                }

                /* Blockquotes */
                blockquote {
                    border-color: ${border} !important;
                    background-color: rgba(0, 0, 0, 0.2) !important;
                }

                /* Media elements - don't filter */
                img, video, picture, canvas, iframe, embed, object {
                    filter: none !important;
                }

                /* Scrollbars */
                * {
                    scrollbar-color: #454a4d ${bg};
                    scrollbar-width: thin;
                }

                ::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                    background-color: ${bg};
                }

                ::-webkit-scrollbar-thumb {
                    background-color: #454a4d;
                    border-radius: 6px;
                    border: 3px solid ${bg};
                }

                ::-webkit-scrollbar-thumb:hover {
                    background-color: #5a5f62;
                }

                ::-webkit-scrollbar-corner {
                    background-color: ${bg};
                }

                ::-webkit-scrollbar-track {
                    background-color: ${bg};
                }
            `;
        },

        /**
         * Apply dynamic mode
         * @param {Object} theme - Theme settings
         * @param {Object} fixes - Site-specific fixes
         */
        apply(theme, fixes = null) {
            this.remove();
            this.theme = theme;

            // Add root styles
            const rootStyle = document.createElement('style');
            rootStyle.id = 'darkmoder-dynamic-root';
            rootStyle.textContent = this.createRootCSS(theme);
            document.documentElement.appendChild(rootStyle);
            this.styles.push(rootStyle);

            // Add site-specific fixes
            if (fixes && fixes.css) {
                const fixStyle = document.createElement('style');
                fixStyle.id = 'darkmoder-dynamic-fixes';
                fixStyle.textContent = fixes.css;
                document.documentElement.appendChild(fixStyle);
                this.styles.push(fixStyle);
            }

            // Process page after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.processPage(theme));
            } else {
                // Small delay to ensure styles are loaded
                setTimeout(() => this.processPage(theme), 0);
            }
        },

        /**
         * Process the entire page
         * @param {Object} theme - Theme settings
         */
        processPage(theme) {
            // Process existing stylesheets
            for (const sheet of document.styleSheets) {
                this.processStyleSheet(sheet, theme);
            }

            // Process inline styles - use querySelectorAll to start
            const elements = document.querySelectorAll('[style]');
            elements.forEach(el => this.dirtyElements.add(el));
            this.processDirtyElements();

            // Watch for changes
            this.observe(theme);
        },

        /**
         * Process a stylesheet
         * @param {CSSStyleSheet} sheet - Stylesheet to process
         * @param {Object} theme - Theme settings
         */
        processStyleSheet(sheet, theme) {
            if (this.processedSheets.has(sheet)) return;
            this.processedSheets.add(sheet);

            // Use RequestIdleCallback or setTimeout to break up heavy processing
            setTimeout(() => {
                 try {
                    const modified = CSSModifier.processStyleSheet(sheet, theme);
                    if (modified) {
                        const style = document.createElement('style');
                        style.className = 'darkmoder-dynamic-sheet';
                        style.textContent = modified;
                        document.documentElement.appendChild(style);
                        this.styles.push(style);
                    }
                } catch (e) {
                    // CORS or other errors - ignore
                }
            }, 0);
        },

        /**
         * Analyze an element's style and return changes without modifying DOM
         * @param {Element} el - Element to process
         * @param {Object} theme - Theme settings
         * @returns {Object|null} Changes object or null
         */
        analyzeElementStyle(el, theme) {
             try {
                // Avoid reprocessing if possible (simple check)
                if (el.dataset.dmProcessed) return null;

                const computed = getComputedStyle(el);
                const updates = {};
                let hasUpdates = false;

                // Process background color
                const bg = computed.backgroundColor;
                if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
                    const color = Color.parse(bg);
                    if (color && Color.isLight(color) && color.a > 0.1) {
                        const modified = Color.modifyBackgroundColor(color, theme);
                        if (modified && modified !== bg) {
                            updates['background-color'] = modified;
                            hasUpdates = true;
                        }
                    }
                }

                // Process text color
                const textColor = computed.color;
                if (textColor) {
                    const color = Color.parse(textColor);
                    if (color && Color.isDark(color)) {
                        const modified = Color.modifyTextColor(color, theme);
                        if (modified && modified !== textColor) {
                            updates['color'] = modified;
                            hasUpdates = true;
                        }
                    }
                }

                if (hasUpdates) {
                    return { el, updates };
                }
            } catch (e) {
                // Ignore errors
            }
            return null;
        },

        /**
         * Process accumulated dirty elements in a batch
         * Reads all styles first, then writes all styles
         */
        processDirtyElements() {
            if (this.frameRequested) return;
            this.frameRequested = true;

            requestAnimationFrame(() => {
                this.frameRequested = false;
                const batch = Array.from(this.dirtyElements);
                this.dirtyElements.clear();

                const changes = [];

                // READ PHASE: Calculate changes without touching DOM
                // This prevents layout thrashing
                for (const el of batch) {
                    // Skip our own UI or already disconnected elements
                    if (!document.contains(el) || el.closest('#darkmoder-ui')) continue;

                    const change = this.analyzeElementStyle(el, this.theme);
                    if (change) changes.push(change);
                }

                // WRITE PHASE: Apply all changes at once
                for (const { el, updates } of changes) {
                    for (const [prop, value] of Object.entries(updates)) {
                        el.style.setProperty(prop, value, 'important');
                    }
                    // Mark as processed to help avoid loops, though WeakSet would be better if we weren't using data-attr
                    el.dataset.dmProcessed = 'true';
                }
            });
        },

        /**
         * Start observing DOM changes
         * @param {Object} theme - Theme settings
         */
        observe(theme) {
            if (this.observer) return;

            // Debounced stylesheet processor
            const processNewSheets = debounce(() => {
                for (const sheet of document.styleSheets) {
                    if (!this.processedSheets.has(sheet)) {
                        this.processStyleSheet(sheet, theme);
                    }
                }
            }, 500);

            this.observer = new MutationObserver((mutations) => {
                let hasStyleMutations = false;
                let hasSheetMutations = false;

                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // New stylesheet added
                                if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
                                    hasSheetMutations = true;
                                }
                                // Element with inline style added
                                if (node.hasAttribute && node.hasAttribute('style')) {
                                    this.dirtyElements.add(node);
                                    hasStyleMutations = true;
                                }
                                // Check children for styles (expensive, so maybe limit depth or use cleaner selector)
                                // Only do this if specific node is added, not for massive tree insertions which might kill performance
                                if (node.children.length > 0 && node.children.length < 50) {
                                     const nested = node.querySelectorAll('[style]');
                                     nested.forEach(n => this.dirtyElements.add(n));
                                     if(nested.length > 0) hasStyleMutations = true;
                                }
                            }
                        }
                    } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        // Inline style changed
                        this.dirtyElements.add(mutation.target);
                        hasStyleMutations = true;
                    }
                }

                if (hasStyleMutations) {
                    this.processDirtyElements();
                }
                if (hasSheetMutations) {
                    processNewSheets();
                }
            });

            this.observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });
        },

        /**
         * Remove dynamic mode
         */
        remove() {
            // Stop observing
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }

            // Remove all injected styles
            for (const style of this.styles) {
                style.remove();
            }
            this.styles = [];

            // Reset processed sheets
            this.processedSheets = new WeakSet();
            this.dirtyElements.clear();

            // Remove any leftover elements
            document.querySelectorAll('[class^="darkmoder-dynamic"]').forEach(el => el.remove());
        }
    };

    /**
     * Static Engine - Simple CSS override
     * Fastest but least sophisticated
     */
    const StaticEngine = {
        style: null,

        /**
         * Generate static CSS
         * @param {Object} theme - Theme settings
         * @returns {string} CSS string
         */
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

                a {
                    color: #8ab4f8 !important;
                }

                a:visited {
                    color: #c58af9 !important;
                }

                img, video, canvas, iframe, embed, object {
                    filter: none !important;
                    background: none !important;
                }
            `;
        },

        /**
         * Apply static mode
         * @param {Object} theme - Theme settings
         */
        apply(theme) {
            this.remove();

            this.style = document.createElement('style');
            this.style.id = 'darkmoder-static';
            this.style.textContent = this.create(theme);

            document.documentElement.appendChild(this.style);
        },

        /**
         * Remove static mode
         */
        remove() {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }
        }
    };

    // ============================================================================
    // CONFIG LOADER
    // ============================================================================

    const ConfigLoader = {
        cache: {},
        cacheTimestamps: {},

        /**
         * Load a config file
         * @param {string} name - Config name (darkSites, dynamicFixes, etc.)
         * @returns {Promise} Config data
         */
        async loadConfig(name) {
            // Check cache
            if (this.cache[name] && this.cacheTimestamps[name]) {
                const age = Date.now() - this.cacheTimestamps[name];
                if (age < CONFIG.cacheDuration) {
                    return this.cache[name];
                }
            }

            // No base URL - use built-in
            if (!CONFIG.configBaseURL) {
                return this.getBuiltIn(name);
            }

            try {
                const url = CONFIG.configBaseURL + CONFIG.configFiles[name];
                const response = await this.fetch(url);

                if (response) {
                    const data = JSON.parse(response);

                    // Extract actual data from wrapper object
                    let result;
                    if (name === 'darkSites' && data.sites) {
                        result = data.sites;
                    } else if (name === 'dynamicFixes' && data.fixes) {
                        result = data.fixes;
                    } else if (name === 'inversionFixes' && data.fixes) {
                        result = data.fixes;
                    } else if (name === 'staticThemes' && data.themes) {
                        result = data.themes;
                    } else {
                        result = data;
                    }

                    // Cache result
                    this.cache[name] = result;
                    this.cacheTimestamps[name] = Date.now();

                    return result;
                }
            } catch (e) {
                console.warn(`DarkModer: Failed to load ${name}, using built-in`);
            }

            return this.getBuiltIn(name);
        },

        /**
         * Fetch URL content
         * @param {string} url - URL to fetch
         * @returns {Promise<string>} Response text
         */
        fetch(url) {
            return new Promise((resolve, reject) => {
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        onload: (response) => {
                            if (response.status >= 200 && response.status < 300) {
                                resolve(response.responseText);
                            } else {
                                reject(new Error(`HTTP ${response.status}`));
                            }
                        },
                        onerror: () => reject(new Error('Network error'))
                    });
                } else {
                    fetch(url)
                        .then(r => {
                            if (!r.ok) throw new Error(`HTTP ${r.status}`);
                            return r.text();
                        })
                        .then(resolve)
                        .catch(reject);
                }
            });
        },

        /**
         * Get built-in config data
         * @param {string} name - Config name
         * @returns {*} Built-in data
         */
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

        /**
         * Get site-specific fixes
         * @param {string} hostname - Site hostname
         * @param {Object} fixes - Fixes object
         * @returns {Object|null} Site fixes or null
         */
        getSiteFix(hostname, fixes) {
            if (!fixes || typeof fixes !== 'object') return null;

            for (const [pattern, fix] of Object.entries(fixes)) {
                // Exact match or subdomain match
                if (hostname === pattern || hostname.endsWith('.' + pattern)) {
                    return fix;
                }
                // Wildcard match
                if (pattern.includes('*')) {
                    const regex = new RegExp(
                        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
                    );
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
        /**
         * Get value from storage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default value if not found
         * @returns {*} Stored value or default
         */
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

        /**
         * Set value in storage
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         */
        set(key, value) {
            try {
                const json = JSON.stringify(value);

                if (typeof GM_setValue === 'function') {
                    GM_setValue(key, json);
                } else {
                    localStorage.setItem(key, json);
                }
            } catch (e) {
                console.warn('DarkModer: Failed to save settings', e);
            }
        },

        /**
         * Remove value from storage
         * @param {string} key - Storage key
         */
        remove(key) {
            try {
                if (typeof GM_deleteValue === 'function') {
                    GM_deleteValue(key);
                } else {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Ignore
            }
        }
    };

    // ============================================================================
    // SETTINGS UI
    // ============================================================================

    const UI = {
        container: null,
        isOpen: false,

        // Minified CSS for the UI (kept small to avoid bloat)
        styles: `
            #darkmoder-ui {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 11px;
                line-height: 1.4;
                color: #e8e6e3;
            }
            #darkmoder-ui * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            #darkmoder-ui .dm-popup {
                width: 300px;
                background: #1e2021;
                border-radius: 12px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
                overflow: hidden;
            }
            #darkmoder-ui .dm-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(to bottom, #2d2f30, #1e2021);
                border-bottom: 1px solid #3a3d3e;
            }
            #darkmoder-ui .dm-header-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 15px;
                font-weight: 600;
            }
            #darkmoder-ui .dm-logo {
                width: 26px;
                height: 26px;
            }
            #darkmoder-ui .dm-close {
                background: none;
                border: none;
                color: #7a7a7a;
                font-size: 22px;
                cursor: pointer;
                padding: 4px 8px;
                line-height: 1;
                border-radius: 4px;
                transition: all 0.2s;
            }
            #darkmoder-ui .dm-close:hover {
                color: #e8e6e3;
                background: rgba(255,255,255,0.1);
            }
            #darkmoder-ui .dm-body {
                padding: 16px;
                max-height: 70vh;
                overflow-y: auto;
            }
            #darkmoder-ui .dm-main-toggle {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                margin: -16px -16px 16px -16px;
                background: #181a1b;
                border-bottom: 1px solid #3a3d3e;
            }
            #darkmoder-ui .dm-site-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            #darkmoder-ui .dm-toggle {
                position: relative;
                width: 40px;
                height: 22px;
                cursor: pointer;
            }
            #darkmoder-ui .dm-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            #darkmoder-ui .dm-toggle-slider {
                position: absolute;
                inset: 0;
                background: #3a3d3e;
                border-radius: 22px;
                transition: 0.3s;
            }
            #darkmoder-ui .dm-toggle-slider::before {
                content: '';
                position: absolute;
                width: 18px;
                height: 18px;
                left: 2px;
                bottom: 2px;
                background: #7a7a7a;
                border-radius: 50%;
                transition: 0.3s;
            }
            #darkmoder-ui .dm-toggle input:checked + .dm-toggle-slider {
                background: #3d8cff;
            }
            #darkmoder-ui .dm-toggle input:checked + .dm-toggle-slider::before {
                transform: translateX(18px);
                background: white;
            }
            #darkmoder-ui .dm-tabs {
                display: flex;
                margin-bottom: 16px;
                border-radius: 8px;
                background: #2a2c2d;
                padding: 3px;
            }
            #darkmoder-ui .dm-tab {
                flex: 1;
                padding: 8px 10px;
                background: transparent;
                border: none;
                color: #7a7a7a;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                border-radius: 6px;
                transition: 0.2s;
            }
            #darkmoder-ui .dm-tab:hover {
                color: #e8e6e3;
            }
            #darkmoder-ui .dm-tab.active {
                background: #3d8cff;
                color: white;
            }
            #darkmoder-ui .dm-panel {
                display: none;
            }
            #darkmoder-ui .dm-panel.active {
                display: block;
            }
            #darkmoder-ui .dm-section {
                margin-bottom: 16px;
            }
            #darkmoder-ui .dm-section:last-child {
                margin-bottom: 0;
            }
            #darkmoder-ui .dm-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
                color: #a9a49d;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 500;
            }
            #darkmoder-ui .dm-value {
                color: #e8e6e3;
                font-weight: 600;
            }
            #darkmoder-ui .dm-slider {
                width: 100%;
                height: 6px;
                -webkit-appearance: none;
                background: #3a3d3e;
                border-radius: 3px;
                outline: none;
            }
            #darkmoder-ui .dm-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                background: #e8e6e3;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                transition: transform 0.2s;
            }
            #darkmoder-ui .dm-slider::-webkit-slider-thumb:hover {
                transform: scale(1.1);
            }
            #darkmoder-ui .dm-slider::-moz-range-thumb {
                width: 18px;
                height: 18px;
                background: #e8e6e3;
                border-radius: 50%;
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            }
            #darkmoder-ui .dm-mode-group {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
            }
            #darkmoder-ui .dm-mode-btn {
                padding: 10px 6px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #a9a49d;
                font-size: 10px;
                font-weight: 500;
                cursor: pointer;
                transition: 0.2s;
            }
            #darkmoder-ui .dm-mode-btn:hover {
                border-color: #5a5d5e;
                color: #e8e6e3;
                background: #333536;
            }
            #darkmoder-ui .dm-mode-btn.active {
                background: #3d8cff;
                border-color: #3d8cff;
                color: white;
            }
            #darkmoder-ui .dm-color-row {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            #darkmoder-ui .dm-color-input {
                width: 36px;
                height: 28px;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                padding: 0;
                cursor: pointer;
                background: #2a2c2d;
            }
            #darkmoder-ui .dm-color-text {
                flex: 1;
                padding: 6px 10px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #e8e6e3;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                font-size: 11px;
            }
            #darkmoder-ui .dm-color-text:focus {
                outline: none;
                border-color: #3d8cff;
            }
            #darkmoder-ui .dm-site-list {
                width: 100%;
                min-height: 120px;
                padding: 10px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #e8e6e3;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                font-size: 11px;
                resize: vertical;
                line-height: 1.5;
            }
            #darkmoder-ui .dm-site-list:focus {
                outline: none;
                border-color: #3d8cff;
            }
            #darkmoder-ui .dm-btn-row {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            #darkmoder-ui .dm-btn {
                flex: 1;
                min-width: 80px;
                padding: 10px 12px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #e8e6e3;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                transition: 0.2s;
            }
            #darkmoder-ui .dm-btn:hover {
                background: #3a3d3e;
            }
            #darkmoder-ui .dm-btn-primary {
                background: #3d8cff;
                border-color: #3d8cff;
            }
            #darkmoder-ui .dm-btn-primary:hover {
                background: #2d7cf0;
            }
            #darkmoder-ui .dm-footer {
                padding: 10px 16px;
                background: #181a1b;
                border-top: 1px solid #3a3d3e;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: #7a7a7a;
            }
            #darkmoder-ui .dm-footer a {
                color: #6eb4ff;
                text-decoration: none;
            }
            #darkmoder-ui .dm-footer a:hover {
                text-decoration: underline;
            }
            #darkmoder-ui select {
                padding: 8px 10px;
                background: #2a2c2d;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #e8e6e3;
                font-size: 11px;
                cursor: pointer;
                width: 100%;
            }
            #darkmoder-ui select:focus {
                outline: none;
                border-color: #3d8cff;
            }
        `,

        /**
         * Generate UI HTML
         * @param {Object} settings - Current settings
         * @returns {string} HTML string
         */
        createHTML(settings) {
            const t = settings.theme;
            const hostname = window.location.hostname;
            const shortHostname = hostname.length > 18 ? hostname.slice(0, 18) + '...' : hostname;
            const isSiteEnabled = !isURLMatched(window.location.href, settings.disabledFor);

            return `
                <div class="dm-popup">
                    <div class="dm-header">
                        <div class="dm-header-title">
                            <svg class="dm-logo" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                            </svg>
                            DarkModer
                        </div>
                        <button class="dm-close" id="dm-close" title="Close">×</button>
                    </div>

                    <div class="dm-body">
                        <div class="dm-main-toggle">
                            <div class="dm-site-toggle">
                                <label class="dm-toggle">
                                    <input type="checkbox" id="dm-enabled" ${settings.enabled ? 'checked' : ''}>
                                    <span class="dm-toggle-slider"></span>
                                </label>
                                <span id="dm-enabled-text">${settings.enabled ? 'On' : 'Off'}</span>
                            </div>
                            <div class="dm-site-toggle">
                                <span style="font-size: 10px; color: #7a7a7a;" title="${hostname}">${shortHostname}</span>
                                <label class="dm-toggle">
                                    <input type="checkbox" id="dm-site-enabled" ${isSiteEnabled ? 'checked' : ''}>
                                    <span class="dm-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="dm-tabs">
                            <button class="dm-tab active" data-tab="filter">Filter</button>
                            <button class="dm-tab" data-tab="sitelist">Site list</button>
                            <button class="dm-tab" data-tab="more">More</button>
                        </div>

                        <div class="dm-panel active" id="dm-panel-filter">
                            <div class="dm-section">
                                <div class="dm-label">Mode</div>
                                <div class="dm-mode-group">
                                    <button class="dm-mode-btn ${t.engine === 'filter' ? 'active' : ''}" data-engine="filter">Filter</button>
                                    <button class="dm-mode-btn ${t.engine === 'filterPlus' ? 'active' : ''}" data-engine="filterPlus">Filter+</button>
                                    <button class="dm-mode-btn ${t.engine === 'dynamic' ? 'active' : ''}" data-engine="dynamic">Dynamic</button>
                                    <button class="dm-mode-btn ${t.engine === 'static' ? 'active' : ''}" data-engine="static">Static</button>
                                </div>
                            </div>

                            <div class="dm-section">
                                <div class="dm-label">
                                    Brightness
                                    <span class="dm-value" id="dm-brightness-val">${t.brightness}%</span>
                                </div>
                                <input type="range" class="dm-slider" id="dm-brightness" min="50" max="150" value="${t.brightness}">
                            </div>

                            <div class="dm-section">
                                <div class="dm-label">
                                    Contrast
                                    <span class="dm-value" id="dm-contrast-val">${t.contrast}%</span>
                                </div>
                                <input type="range" class="dm-slider" id="dm-contrast" min="50" max="150" value="${t.contrast}">
                            </div>

                            <div class="dm-section">
                                <div class="dm-label">
                                    Sepia
                                    <span class="dm-value" id="dm-sepia-val">${t.sepia}%</span>
                                </div>
                                <input type="range" class="dm-slider" id="dm-sepia" min="0" max="100" value="${t.sepia}">
                            </div>

                            <div class="dm-section">
                                <div class="dm-label">
                                    Grayscale
                                    <span class="dm-value" id="dm-grayscale-val">${t.grayscale}%</span>
                                </div>
                                <input type="range" class="dm-slider" id="dm-grayscale" min="0" max="100" value="${t.grayscale}">
                            </div>

                            <div class="dm-section">
                                <div class="dm-label">Background Color</div>
                                <div class="dm-color-row">
                                    <input type="color" class="dm-color-input" id="dm-bg-color" value="${t.darkSchemeBackgroundColor}">
                                    <input type="text" class="dm-color-text" id="dm-bg-color-text" value="${t.darkSchemeBackgroundColor}">
                                </div>
                            </div>

                            <div class="dm-section">
                                <div class="dm-label">Text Color</div>
                                <div class="dm-color-row">
                                    <input type="color" class="dm-color-input" id="dm-text-color" value="${t.darkSchemeTextColor}">
                                    <input type="text" class="dm-color-text" id="dm-text-color-text" value="${t.darkSchemeTextColor}">
                                </div>
                            </div>
                        </div>

                        <div class="dm-panel" id="dm-panel-sitelist">
                            <div class="dm-section">
                                <div class="dm-label">Disabled Sites (one per line)</div>
                                <textarea class="dm-site-list" id="dm-disabled-sites"
                                    placeholder="example.com
*.example.org
/regex/">${(settings.disabledFor || []).join('\n')}</textarea>
                            </div>
                            <div class="dm-btn-row">
                                <button class="dm-btn" id="dm-toggle-current">Toggle ${shortHostname}</button>
                            </div>
                        </div>

                        <div class="dm-panel" id="dm-panel-more">
                            <div class="dm-section">
                                <div class="dm-label">Automation</div>
                                <select id="dm-automation">
                                    <option value="" ${!settings.automation.enabled ? 'selected' : ''}>Disabled</option>
                                    <option value="system" ${settings.automation.mode === 'system' ? 'selected' : ''}>System preference</option>
                                    <option value="time" ${settings.automation.mode === 'time' ? 'selected' : ''}>Time-based</option>
                                </select>
                            </div>

                            <div class="dm-btn-row">
                                <button class="dm-btn" id="dm-export">Export</button>
                                <button class="dm-btn" id="dm-import">Import</button>
                                <button class="dm-btn" id="dm-reset">Reset</button>
                            </div>
                        </div>
                    </div>

                    <div class="dm-footer">
                        <span>v${CONFIG.version}</span>
                        <a href="https://github.com/SysAdminDoc/DarkModer" target="_blank" rel="noopener">GitHub</a>
                    </div>
                </div>
            `;
        },

        /**
         * Open settings UI
         */
        open() {
            if (this.container) {
                this.container.style.display = 'block';
                this.isOpen = true;
                return;
            }

            const settings = DarkModer.getSettings();

            // Create container
            this.container = document.createElement('div');
            this.container.id = 'darkmoder-ui';
            this.container.innerHTML = this.createHTML(settings);

            // Create styles
            const style = document.createElement('style');
            style.id = 'darkmoder-ui-styles';
            style.textContent = this.styles;

            // Append to document
            document.head.appendChild(style);
            document.body.appendChild(this.container);

            // Attach event handlers
            this.attachEvents();
            this.isOpen = true;
        },

        /**
         * Close settings UI
         */
        close() {
            if (this.container) {
                this.container.style.display = 'none';
                this.isOpen = false;
            }
        },

        /**
         * Toggle settings UI
         */
        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        /**
         * Refresh UI with current settings
         */
        refresh() {
            if (this.container) {
                this.container.remove();
                document.getElementById('darkmoder-ui-styles')?.remove();
                this.container = null;
                this.isOpen = false;
                this.open();
            }
        },

        /**
         * Attach event handlers to UI elements
         */
        attachEvents() {
            const $ = sel => this.container.querySelector(sel);
            const $$ = sel => this.container.querySelectorAll(sel);

            // Close button
            $('#dm-close').addEventListener('click', () => this.close());

            // Main toggle
            $('#dm-enabled').addEventListener('change', (e) => {
                DarkModer.setEnabled(e.target.checked);
                $('#dm-enabled-text').textContent = e.target.checked ? 'On' : 'Off';
            });

            // Site toggle
            $('#dm-site-enabled').addEventListener('change', (e) => {
                DarkModer.toggleSite(window.location.hostname, !e.target.checked);
            });

            // Tab switching
            $$('.dm-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    $$('.dm-tab').forEach(t => t.classList.remove('active'));
                    $$('.dm-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    $(`#dm-panel-${tab.dataset.tab}`).classList.add('active');
                });
            });

            // Mode buttons
            $$('.dm-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    $$('.dm-mode-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    DarkModer.setEngine(btn.dataset.engine);
                });
            });

            // Sliders
            ['brightness', 'contrast', 'sepia', 'grayscale'].forEach(name => {
                const slider = $(`#dm-${name}`);
                slider.addEventListener('input', () => {
                    const val = parseInt(slider.value, 10);
                    $(`#dm-${name}-val`).textContent = val + '%';
                    DarkModer.setThemeOption(name, val);
                });
            });

            // Color pickers
            const colors = [
                { picker: '#dm-bg-color', text: '#dm-bg-color-text', key: 'darkSchemeBackgroundColor' },
                { picker: '#dm-text-color', text: '#dm-text-color-text', key: 'darkSchemeTextColor' }
            ];

            colors.forEach(({ picker, text, key }) => {
                $(picker).addEventListener('input', (e) => {
                    $(text).value = e.target.value;
                    DarkModer.setThemeOption(key, e.target.value);
                });

                $(text).addEventListener('change', (e) => {
                    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
                        $(picker).value = e.target.value;
                        DarkModer.setThemeOption(key, e.target.value);
                    }
                });
            });

            // Site list
            $('#dm-disabled-sites').addEventListener('change', (e) => {
                const sites = e.target.value
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean);
                DarkModer.setDisabledSites(sites);
            });

            // Toggle current site button
            $('#dm-toggle-current').addEventListener('click', () => {
                const hostname = window.location.hostname;
                const settings = DarkModer.getSettings();
                const isDisabled = (settings.disabledFor || []).includes(hostname);
                DarkModer.toggleSite(hostname, !isDisabled);
                $('#dm-site-enabled').checked = isDisabled;
                $('#dm-disabled-sites').value = DarkModer.getSettings().disabledFor.join('\n');
            });

            // Automation
            $('#dm-automation').addEventListener('change', (e) => {
                DarkModer.setAutomation(e.target.value);
            });

            // Export
            $('#dm-export').addEventListener('click', () => {
                const data = JSON.stringify(DarkModer.getSettings(), null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'darkmoder-settings.json';
                a.click();
                URL.revokeObjectURL(url);
            });

            // Import
            $('#dm-import').addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            try {
                                const settings = JSON.parse(evt.target.result);
                                DarkModer.importSettings(settings);
                                this.refresh();
                            } catch (err) {
                                alert('Invalid settings file');
                            }
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            });

            // Reset
            $('#dm-reset').addEventListener('click', () => {
                if (confirm('Reset all DarkModer settings to defaults?')) {
                    DarkModer.resetSettings();
                    this.refresh();
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });

            // Close on click outside
            this.container.addEventListener('click', (e) => {
                if (e.target === this.container) {
                    this.close();
                }
            });
        }
    };

    // ============================================================================
    // MAIN CONTROLLER
    // ============================================================================

    const DarkModer = {
        settings: null,
        darkSites: null,
        dynamicFixes: null,
        inversionFixes: null,

        /**
         * Initialize DarkModer
         */
        async init() {
            // Load settings
            this.settings = Storage.get(CONFIG.storageKey, { ...DEFAULT_SETTINGS });
            this.settings = { ...DEFAULT_SETTINGS, ...this.settings };
            this.settings.theme = { ...DEFAULT_THEME, ...this.settings.theme };

            // Ensure disabledFor is always an array
            if (!Array.isArray(this.settings.disabledFor)) {
                this.settings.disabledFor = [];
            }

            // Load saved config URL
            const savedConfigURL = Storage.get(CONFIG.storageKey + '_configURL', '');
            if (savedConfigURL) {
                CONFIG.configBaseURL = savedConfigURL;
            }

            // Load config files (async)
            this.darkSites = await ConfigLoader.loadConfig('darkSites');
            this.dynamicFixes = await ConfigLoader.loadConfig('dynamicFixes');
            this.inversionFixes = await ConfigLoader.loadConfig('inversionFixes');

            // Apply theme if enabled
            if (this.shouldApply()) {
                this.apply();
            }

            // Register menu command
            if (typeof GM_registerMenuCommand === 'function') {
                GM_registerMenuCommand('DarkModer Settings', () => UI.toggle());
            }

            console.log(`DarkModer v${CONFIG.version} initialized`);
        },

        /**
         * Check if DarkModer should apply to current page
         * @returns {boolean} True if should apply
         */
        shouldApply() {
            if (!this.settings.enabled) return false;

            const url = window.location.href;
            const hostname = window.location.hostname;

            // Check if site is in disabled list
            if (isURLMatched(url, this.settings.disabledFor)) {
                return false;
            }

            // Check if site is already dark
            if (this.settings.detectDarkTheme && Array.isArray(this.darkSites)) {
                if (isURLMatched(hostname, this.darkSites)) {
                    return false;
                }
            }

            return true;
        },

        /**
         * Apply dark mode
         */
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

            // Set data attributes
            document.documentElement.setAttribute('data-darkmoder-scheme', 'dark');
            document.documentElement.setAttribute('data-darkmoder-mode', theme.engine);
        },

        /**
         * Remove dark mode
         */
        remove() {
            FilterEngine.remove();
            FilterPlusEngine.remove();
            DynamicEngine.remove();
            StaticEngine.remove();

            document.documentElement.removeAttribute('data-darkmoder-scheme');
            document.documentElement.removeAttribute('data-darkmoder-mode');
        },

        /**
         * Get current settings (copy)
         * @returns {Object} Settings copy
         */
        getSettings() {
            return {
                ...this.settings,
                theme: { ...this.settings.theme }
            };
        },

        /**
         * Save settings to storage
         */
        saveSettings() {
            Storage.set(CONFIG.storageKey, this.settings);
        },

        /**
         * Set enabled state
         * @param {boolean} enabled - Enabled state
         */
        setEnabled(enabled) {
            this.settings.enabled = enabled;
            this.saveSettings();

            if (enabled) {
                this.apply();
            } else {
                this.remove();
            }
        },

        /**
         * Set theme engine
         * @param {string} engine - Engine name
         */
        setEngine(engine) {
            this.settings.theme.engine = engine;
            this.saveSettings();
            this.apply();
        },

        /**
         * Set a theme option
         * @param {string} key - Option key
         * @param {*} value - Option value
         */
        setThemeOption(key, value) {
            this.settings.theme[key] = value;
            this.saveSettings();
            this.apply();
        },

        /**
         * Toggle a site in disabled list
         * @param {string} hostname - Site hostname
         * @param {boolean} disable - True to disable, false to enable
         */
        toggleSite(hostname, disable) {
            if (!Array.isArray(this.settings.disabledFor)) {
                this.settings.disabledFor = [];
            }

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

        /**
         * Set disabled sites list
         * @param {Array} sites - Array of site patterns
         */
        setDisabledSites(sites) {
            this.settings.disabledFor = sites;
            this.saveSettings();

            if (this.shouldApply()) {
                this.apply();
            } else {
                this.remove();
            }
        },

        /**
         * Set automation mode
         * @param {string} mode - Automation mode ('', 'system', 'time')
         */
        setAutomation(mode) {
            this.settings.automation.enabled = !!mode;
            this.settings.automation.mode = mode;
            this.saveSettings();

            // TODO: Implement automation
        },

        /**
         * Reset settings to defaults
         */
        resetSettings() {
            this.settings = {
                ...DEFAULT_SETTINGS,
                theme: { ...DEFAULT_THEME }
            };
            this.saveSettings();
            this.apply();
        },

        /**
         * Import settings from object
         * @param {Object} settings - Settings to import
         */
        importSettings(settings) {
            this.settings = { ...DEFAULT_SETTINGS, ...settings };
            this.settings.theme = { ...DEFAULT_THEME, ...(settings.theme || {}) };
            this.saveSettings();
            this.apply();
        }
    };

    // ============================================================================
    // INITIALIZE
    // ============================================================================

    DarkModer.init();

    // Expose API for external use
    window.DarkModer = DarkModer;

})();
