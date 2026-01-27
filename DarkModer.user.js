// ==UserScript==
// @name         DarkModer
// @namespace    https://github.com/SysAdminDoc/DarkModer
// @version      3.0.0
// @description  Dark mode for every website. Complete Dark Reader recreation as userscript with all features.
// @author       SysAdminDoc (Based on Dark Reader by Alexander Shutau)
// @license      MIT
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
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
        version: '3.0.0',
        storageKey: 'darkModer',
        configBaseURL: 'https://raw.githubusercontent.com/SysAdminDoc/DarkModer/refs/heads/main/',
        configFiles: {
            darkSites: 'dark-sites.json',
            dynamicFixes: 'dynamic-theme-fixes.json',
            inversionFixes: 'inversion-fixes.json',
            staticThemes: 'static-themes.json'
        },
        cacheDuration: 60 * 60 * 1000, // 1 hour
        maxInlineElements: 200,
        inlineElementBatchSize: 50,
        stylesheetBatchSize: 5,
        observerBatchSize: 3,
        maxCSSRules: 1000,
        colorSamplingThreshold: 0.3,
        maxColorSamples: 30
    };

    // ============================================================================
    // COLOR SCHEME PRESETS (NEW in v3.0.0)
    // ============================================================================

    const COLOR_SCHEMES = {
        'Default': {
            background: '#181a1b',
            text: '#e8e6e3',
            selectionBg: '#004daa',
            selectionText: '#ffffff',
            link: '#3391ff',
            border: '#3a3d3e'
        },
        'Dracula': {
            background: '#282a36',
            text: '#f8f8f2',
            selectionBg: '#44475a',
            selectionText: '#f8f8f2',
            link: '#8be9fd',
            border: '#44475a'
        },
        'Nord': {
            background: '#2e3440',
            text: '#eceff4',
            selectionBg: '#4c566a',
            selectionText: '#eceff4',
            link: '#88c0d0',
            border: '#3b4252'
        },
        'Solarized Dark': {
            background: '#002b36',
            text: '#839496',
            selectionBg: '#073642',
            selectionText: '#93a1a1',
            link: '#268bd2',
            border: '#073642'
        },
        'Monokai': {
            background: '#272822',
            text: '#f8f8f2',
            selectionBg: '#49483e',
            selectionText: '#f8f8f2',
            link: '#66d9ef',
            border: '#3e3d32'
        },
        'One Dark': {
            background: '#282c34',
            text: '#abb2bf',
            selectionBg: '#3e4451',
            selectionText: '#abb2bf',
            link: '#61afef',
            border: '#3b4048'
        },
        'Gruvbox': {
            background: '#282828',
            text: '#ebdbb2',
            selectionBg: '#504945',
            selectionText: '#ebdbb2',
            link: '#83a598',
            border: '#3c3836'
        },
        'Tokyo Night': {
            background: '#1a1b26',
            text: '#a9b1d6',
            selectionBg: '#33467c',
            selectionText: '#c0caf5',
            link: '#7aa2f7',
            border: '#292e42'
        },
        'Catppuccin Mocha': {
            background: '#1e1e2e',
            text: '#cdd6f4',
            selectionBg: '#45475a',
            selectionText: '#cdd6f4',
            link: '#89b4fa',
            border: '#313244'
        },
        'GitHub Dark': {
            background: '#0d1117',
            text: '#c9d1d9',
            selectionBg: '#388bfd',
            selectionText: '#ffffff',
            link: '#58a6ff',
            border: '#30363d'
        },
        'Amoled': {
            background: '#000000',
            text: '#ffffff',
            selectionBg: '#1a1a1a',
            selectionText: '#ffffff',
            link: '#4da6ff',
            border: '#1a1a1a'
        },
        'Sepia': {
            background: '#232018',
            text: '#c8b89a',
            selectionBg: '#3d3426',
            selectionText: '#c8b89a',
            link: '#d4a574',
            border: '#3d3426'
        }
    };

    // ============================================================================
    // DEFAULT THEME SETTINGS
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
        selectionBgColor: '#004daa',
        selectionTextColor: '#ffffff',
        linkColor: '#3391ff',
        visitedLinkColor: '#9e6eff',
        borderColor: '#3a3d3e',
        styleSystemControls: true,
        colorScheme: 'Default',
        immediateModify: true
    };

    // ============================================================================
    // DEFAULT SETTINGS
    // ============================================================================

    const DEFAULT_SETTINGS = {
        enabled: true,
        fetchNews: false,
        theme: { ...DEFAULT_THEME },
        presets: [],
        siteSettings: {},
        customThemes: [],
        themePresets: {},
        enabledByDefault: true,
        enabledFor: [],
        disabledFor: [],
        disabledSites: [],
        siteFixesUser: {},
        changeBrowserTheme: false,
        syncSettings: false,
        syncSitesFixes: false,
        colorScheme: 'Default',
        automation: {
            enabled: false,
            mode: 'disabled', // 'disabled', 'time', 'system', 'location'
            behavior: 'OnOff',
            startTime: '18:00',
            endTime: '09:00',
            latitude: null,
            longitude: null
        },
        time: {
            activation: '18:00',
            deactivation: '09:00'
        },
        location: {
            latitude: null,
            longitude: null
        },
        shortcuts: {
            toggle: 'Alt+Shift+D',
            toggleSite: 'Alt+Shift+S',
            openSettings: 'Alt+Shift+A'
        },
        previewNewDesign: true,
        enableForPDF: true,
        enableForProtectedPages: false,
        enableContextMenus: false,
        detectDarkTheme: true
    };


    // ============================================================================
    // NAMED CSS COLORS (Pre-computed table - created once, not per-call)
    // ============================================================================

    const NAMED_COLORS = {
        // Basic colors
        white: [255, 255, 255],
        black: [0, 0, 0],
        red: [255, 0, 0],
        green: [0, 128, 0],
        blue: [0, 0, 255],
        yellow: [255, 255, 0],
        cyan: [0, 255, 255],
        magenta: [255, 0, 255],

        // Gray scale
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

        // Reds
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

        // Pinks
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

        // Cyans
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

        // Purples
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

        // Whites
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

        // Slate colors
        slategray: [112, 128, 144],
        slategrey: [112, 128, 144],
        lightslategray: [119, 136, 153],
        lightslategrey: [119, 136, 153],
        darkslategray: [47, 79, 79],
        darkslategrey: [47, 79, 79],

        // Transparent
        transparent: [0, 0, 0, 0]
    };

    // ============================================================================
    // BUILT-IN DARK SITES LIST
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
        'twitter.com',
        'x.com',
        'spotify.com',
        'slack.com',
        'notion.so',
        'figma.com',
        'linear.app',
        'vercel.com',
        'vitejs.dev',
        'hulu.com',
        'disneyplus.com',
        'primevideo.com',
        'hbomax.com'
    ];

    // ============================================================================
    // BUILT-IN DYNAMIC THEME FIXES
    // ============================================================================

    const BUILT_IN_DYNAMIC_FIXES = {
        // Example fixes structure
        // 'example.com': 'INVERT\n.icon\n\nCSS\n.element { color: white !important; }'
    };

    // ============================================================================
    // BUILT-IN INVERSION FIXES
    // ============================================================================

    const BUILT_IN_INVERSION_FIXES = {
        // Example fixes structure
        // 'example.com': 'INVERT\nimg\n\nNO INVERT\n.logo'
    };


    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Throttle function execution to prevent excessive calls
     * @param {Function} fn - Function to throttle
     * @param {number} delay - Minimum delay between calls in ms
     * @returns {Function} Throttled function
     */
    function throttle(fn, delay) {
        let lastCall = 0;
        let lastResult;

        return function(...args) {
            const now = Date.now();

            if (now - lastCall >= delay) {
                lastCall = now;
                lastResult = fn.apply(this, args);
            }

            return lastResult;
        };
    }

    /**
     * Debounce function execution to prevent rapid successive calls
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in ms after last call
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
     * Extract hostname from URL
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
     * Supports exact match, wildcard (*), and regex (/pattern/)
     * @param {string} url - URL to check
     * @param {Array} patterns - Array of patterns to match against
     * @returns {boolean} True if matched
     */
    function isURLMatched(url, patterns) {
        if (!patterns || !Array.isArray(patterns)) {
            return false;
        }

        const hostname = getURLHostname(url) || url;

        return patterns.some(pattern => {
            if (!pattern || typeof pattern !== 'string') {
                return false;
            }

            // Regex pattern: /pattern/
            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                try {
                    const regex = new RegExp(pattern.slice(1, -1));
                    return regex.test(url);
                } catch (e) {
                    return false;
                }
            }

            // Wildcard pattern: *.example.com
            if (pattern.includes('*')) {
                const escapedPattern = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*');
                const regex = new RegExp('^' + escapedPattern + '$', 'i');
                return regex.test(hostname) || regex.test(url);
            }

            // Exact match or subdomain match
            return hostname === pattern || hostname.endsWith('.' + pattern);
        });
    }

    /**
     * Generate a unique identifier
     * @returns {string} Unique ID
     */
    function generateUID() {
        return Math.random().toString(36).substring(2, 11);
    }

    /**
     * Parse a keyboard shortcut string
     * @param {string} shortcut - Shortcut string (e.g., "Alt+Shift+D")
     * @returns {Object|null} Parsed shortcut object
     */
    function parseShortcut(shortcut) {
        if (!shortcut || typeof shortcut !== 'string') {
            return null;
        }

        const parts = shortcut.toLowerCase().split('+').map(p => p.trim());

        return {
            ctrl: parts.includes('ctrl') || parts.includes('control'),
            alt: parts.includes('alt'),
            shift: parts.includes('shift'),
            meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
            key: parts.find(p => !['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd', 'command'].includes(p)) || ''
        };
    }

    /**
     * Check if a keyboard event matches a shortcut
     * @param {KeyboardEvent} event - Keyboard event
     * @param {string} shortcut - Shortcut string to match
     * @returns {boolean} True if matched
     */
    function matchShortcut(event, shortcut) {
        const parsed = parseShortcut(shortcut);

        if (!parsed) {
            return false;
        }

        return event.ctrlKey === parsed.ctrl &&
               event.altKey === parsed.alt &&
               event.shiftKey === parsed.shift &&
               event.metaKey === parsed.meta &&
               event.key.toLowerCase() === parsed.key;
    }

    /**
     * Escape HTML special characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(str).replace(/[&<>"']/g, char => htmlEntities[char]);
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    function deepMerge(target, source) {
        const result = { ...target };

        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }


    // ============================================================================
    // SUN CALCULATOR (for sunrise/sunset automation)
    // Based on NOAA Solar Calculator algorithms
    // ============================================================================

    const SunCalc = {
        /**
         * Calculate sunrise and sunset times for a given date and location
         * @param {Date} date - Date to calculate for
         * @param {number} lat - Latitude in degrees
         * @param {number} lng - Longitude in degrees
         * @returns {Object} Object with sunrise and sunset Date objects
         */
        calculate(date, lat, lng) {
            const rad = Math.PI / 180;
            const dayMs = 1000 * 60 * 60 * 24;
            const J1970 = 2440588;
            const J2000 = 2451545;

            // Convert date to Julian
            const toJulian = d => d.valueOf() / dayMs - 0.5 + J1970;
            const fromJulian = j => new Date((j + 0.5 - J1970) * dayMs);
            const toDays = d => toJulian(d) - J2000;

            // Obliquity of the ecliptic
            const e = rad * 23.4397;

            /**
             * Calculate right ascension
             */
            const rightAscension = (l, b) => {
                return Math.atan2(
                    Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e),
                    Math.cos(l)
                );
            };

            /**
             * Calculate declination
             */
            const declination = (l, b) => {
                return Math.asin(
                    Math.sin(b) * Math.cos(e) +
                    Math.cos(b) * Math.sin(e) * Math.sin(l)
                );
            };

            /**
             * Calculate solar mean anomaly
             */
            const solarMeanAnomaly = d => {
                return rad * (357.5291 + 0.98560028 * d);
            };

            /**
             * Calculate ecliptic longitude
             */
            const eclipticLongitude = M => {
                const C = rad * (
                    1.9148 * Math.sin(M) +
                    0.02 * Math.sin(2 * M) +
                    0.0003 * Math.sin(3 * M)
                );
                const P = rad * 102.9372;
                return M + C + P + Math.PI;
            };

            /**
             * Calculate Julian cycle
             */
            const julianCycle = (d, lw) => {
                return Math.round(d - 0.0009 - lw / (2 * Math.PI));
            };

            /**
             * Calculate approximate transit
             */
            const approxTransit = (Ht, lw, n) => {
                return 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
            };

            /**
             * Calculate solar transit in Julian days
             */
            const solarTransitJ = (ds, M, L) => {
                return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
            };

            /**
             * Calculate hour angle
             */
            const hourAngle = (h, phi, d) => {
                const cosH = (Math.sin(h) - Math.sin(phi) * Math.sin(d)) /
                             (Math.cos(phi) * Math.cos(d));

                // Clamp to valid range
                if (cosH < -1) return Math.PI;
                if (cosH > 1) return 0;

                return Math.acos(cosH);
            };

            /**
             * Calculate sunset time in Julian days
             */
            const getSetJ = (h, lw, phi, dec, n, M, L) => {
                const w = hourAngle(h, phi, dec);
                const a = approxTransit(w, lw, n);
                return solarTransitJ(a, M, L);
            };

            try {
                const lw = rad * -lng;
                const phi = rad * lat;
                const d = toDays(date);
                const n = julianCycle(d, lw);
                const ds = approxTransit(0, lw, n);
                const M = solarMeanAnomaly(ds);
                const L = eclipticLongitude(M);
                const dec = declination(L, 0);
                const Jnoon = solarTransitJ(ds, M, L);

                // Sun altitude at sunrise/sunset
                const h0 = rad * -0.833;

                const Jset = getSetJ(h0, lw, phi, dec, n, M, L);
                const Jrise = Jnoon - (Jset - Jnoon);

                return {
                    sunrise: fromJulian(Jrise),
                    sunset: fromJulian(Jset),
                    noon: fromJulian(Jnoon)
                };
            } catch (e) {
                console.warn('SunCalc: Calculation error', e);
                return {
                    sunrise: null,
                    sunset: null,
                    noon: null
                };
            }
        },

        /**
         * Check if it's currently dark (between sunset and sunrise)
         * @param {Date} now - Current time
         * @param {number} lat - Latitude
         * @param {number} lng - Longitude
         * @returns {boolean} True if dark
         */
        isDark(now, lat, lng) {
            const { sunrise, sunset } = this.calculate(now, lat, lng);

            if (!sunrise || !sunset) {
                return true; // Default to dark if calculation fails
            }

            return now < sunrise || now > sunset;
        }
    };


    // ============================================================================
    // DARK THEME DETECTOR
    // Two-phase detection system to prevent white flash
    // ============================================================================

    const DarkThemeDetector = {
        /**
         * CSS selectors that indicate dark mode on html element (Phase 1 - early)
         */
        earlyDarkSelectors: [
            'html[data-theme="dark"]',
            'html[data-color-mode="dark"]',
            'html[data-dark-mode="true"]',
            'html[data-bs-theme="dark"]',
            'html[data-color-scheme="dark"]',
            'html[data-mode="dark"]',
            'html.dark',
            'html.dark-mode',
            'html.dark-theme',
            'html.theme-dark',
            ':root[data-theme="dark"]',
            ':root[data-color-mode="dark"]',
            ':root.dark'
        ],

        /**
         * CSS selectors that indicate dark mode on body element (Phase 2)
         */
        bodyDarkSelectors: [
            'body[data-theme="dark"]',
            'body[data-color-mode="dark"]',
            'body[data-dark-mode="true"]',
            'body[data-bs-theme="dark"]',
            'body.dark',
            'body.dark-mode',
            'body.dark-theme',
            'body.theme-dark',
            'body[dark]'
        ],

        /**
         * Phase 1: Early detection before body is available
         * Runs at document-start to prevent white flash
         * @returns {Object} Detection result {isDark: boolean, reason: string|null}
         */
        detectEarly() {
            // Check for meta darkreader-lock tag
            if (document.querySelector('meta[name="darkreader-lock"]')) {
                return {
                    isDark: true,
                    reason: 'meta-lock'
                };
            }

            // Check color-scheme meta tag
            const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
            if (colorSchemeMeta) {
                const content = colorSchemeMeta.getAttribute('content') || '';
                if (content.includes('dark') && !content.includes('light')) {
                    return {
                        isDark: true,
                        reason: 'meta-color-scheme'
                    };
                }
            }

            // Check early dark selectors on html element
            if (this.hasEarlyDarkSelector()) {
                return {
                    isDark: true,
                    reason: 'html-selector'
                };
            }

            return {
                isDark: false,
                reason: null
            };
        },

        /**
         * Phase 2: Full detection after DOM is ready
         * Can optionally use color sampling (disabled by default for performance)
         * @param {boolean} useColorSampling - Whether to sample page colors
         * @returns {Object} Detection result
         */
        detect(useColorSampling = false) {
            // Check for meta darkreader-lock tag
            if (document.querySelector('meta[name="darkreader-lock"]')) {
                return {
                    isDark: true,
                    reason: 'meta-lock'
                };
            }

            // Temporarily disable our provisional style if present
            const provisional = document.getElementById('darkmoder-provisional');
            if (provisional) {
                provisional.disabled = true;
            }

            try {
                // Check color-scheme meta tag
                const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
                if (colorSchemeMeta) {
                    const content = colorSchemeMeta.getAttribute('content') || '';
                    if (content.includes('dark') && !content.includes('light')) {
                        return {
                            isDark: true,
                            reason: 'meta-color-scheme'
                        };
                    }
                }

                // Check computed color-scheme property
                if (!provisional && document.documentElement) {
                    try {
                        const computedStyle = getComputedStyle(document.documentElement);
                        const colorScheme = computedStyle.colorScheme ||
                                           computedStyle.getPropertyValue('color-scheme');

                        if (colorScheme && colorScheme.includes('dark') && !colorScheme.includes('light')) {
                            return {
                                isDark: true,
                                reason: 'color-scheme-property'
                            };
                        }
                    } catch (e) {
                        // Ignore getComputedStyle errors
                    }
                }

                // Check CSS class/attribute selectors
                if (this.hasDarkModeSelector()) {
                    return {
                        isDark: true,
                        reason: 'css-selector'
                    };
                }

                // Optional: Sample page colors
                if (useColorSampling && document.body) {
                    const avgLuminance = this.samplePageColors();
                    if (avgLuminance < CONFIG.colorSamplingThreshold) {
                        return {
                            isDark: true,
                            reason: 'color-sampling'
                        };
                    }
                }

                return {
                    isDark: false,
                    reason: null
                };
            } finally {
                // Re-enable provisional style
                if (provisional) {
                    provisional.disabled = false;
                }
            }
        },

        /**
         * Check if any early dark selector matches
         * @returns {boolean} True if matched
         */
        hasEarlyDarkSelector() {
            for (const selector of this.earlyDarkSelectors) {
                try {
                    if (document.querySelector(selector)) {
                        return true;
                    }
                } catch (e) {
                    // Invalid selector, skip
                }
            }
            return false;
        },

        /**
         * Check if any dark mode selector matches (html or body)
         * @returns {boolean} True if matched
         */
        hasDarkModeSelector() {
            // Check html selectors first
            if (this.hasEarlyDarkSelector()) {
                return true;
            }

            // Check body selectors
            if (document.body) {
                for (const selector of this.bodyDarkSelectors) {
                    try {
                        if (document.querySelector(selector)) {
                            return true;
                        }
                    } catch (e) {
                        // Invalid selector, skip
                    }
                }
            }

            return false;
        },

        /**
         * Calculate relative luminance from RGB values
         * @param {number} r - Red (0-255)
         * @param {number} g - Green (0-255)
         * @param {number} b - Blue (0-255)
         * @returns {number} Luminance (0-1)
         */
        getLuminance(r, g, b) {
            return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        },

        /**
         * Parse a CSS color string to RGB
         * @param {string} color - CSS color value
         * @returns {Object|null} {r, g, b} or null
         */
        parseColor(color) {
            if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
                return null;
            }

            const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
                return {
                    r: parseInt(rgbMatch[1], 10),
                    g: parseInt(rgbMatch[2], 10),
                    b: parseInt(rgbMatch[3], 10)
                };
            }

            return null;
        },

        /**
         * Sample colors from key page elements to estimate theme
         * @returns {number} Average luminance (0-1)
         */
        samplePageColors() {
            const samples = [];
            const MAX_SAMPLES = CONFIG.maxColorSamples;

            // Sample key structural elements
            const keyElements = [
                document.documentElement,
                document.body,
                document.querySelector('main'),
                document.querySelector('article'),
                document.querySelector('#content'),
                document.querySelector('.content'),
                document.querySelector('#main'),
                document.querySelector('.main'),
                document.querySelector('header'),
                document.querySelector('nav')
            ].filter(Boolean);

            for (const el of keyElements) {
                if (samples.length >= MAX_SAMPLES) break;

                try {
                    const style = getComputedStyle(el);
                    const bgColor = style.backgroundColor;
                    const parsed = this.parseColor(bgColor);

                    if (parsed) {
                        const luminance = this.getLuminance(parsed.r, parsed.g, parsed.b);
                        // Weight key elements more heavily
                        samples.push(luminance, luminance, luminance);
                    }
                } catch (e) {
                    // Skip elements that can't be computed
                }
            }

            // Sample elements at grid points
            const step = 200;
            const maxWidth = Math.min(window.innerWidth, 800);
            const maxHeight = Math.min(window.innerHeight, 600);

            for (let x = step; x < maxWidth && samples.length < MAX_SAMPLES; x += step) {
                for (let y = step; y < maxHeight && samples.length < MAX_SAMPLES; y += step) {
                    try {
                        const el = document.elementFromPoint(x, y);

                        if (!el) continue;
                        if (el.id && el.id.startsWith('darkmoder')) continue;
                        if (el.className && typeof el.className === 'string' &&
                            el.className.includes('darkmoder')) continue;

                        const style = getComputedStyle(el);
                        const bgColor = style.backgroundColor;
                        const parsed = this.parseColor(bgColor);

                        if (parsed) {
                            const luminance = this.getLuminance(parsed.r, parsed.g, parsed.b);
                            samples.push(luminance);
                        }
                    } catch (e) {
                        // Skip on error
                    }
                }
            }

            if (samples.length === 0) {
                return 1; // Default to light if no samples
            }

            return samples.reduce((a, b) => a + b, 0) / samples.length;
        },

        /**
         * Observe theme changes and call callback when detected
         * @param {Function} callback - Called with detection result
         * @returns {Function} Cleanup function
         */
        observe(callback) {
            let lastState = null;

            const check = () => {
                const result = this.detect(false);
                if (lastState === null || lastState !== result.isDark) {
                    lastState = result.isDark;
                    callback(result);
                }
            };

            // Debounced check
            const debouncedCheck = debounce(check, 100);

            // Observe html element
            const htmlObserver = new MutationObserver(debouncedCheck);
            htmlObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class', 'data-theme', 'data-color-mode', 'data-dark-mode', 'data-bs-theme', 'style']
            });

            // Observe body element when available
            let bodyObserver = null;
            if (document.body) {
                bodyObserver = new MutationObserver(debouncedCheck);
                bodyObserver.observe(document.body, {
                    attributes: true,
                    attributeFilter: ['class', 'data-theme', 'data-color-mode', 'data-dark-mode', 'style']
                });
            }

            // Listen for system color scheme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const mediaHandler = () => debouncedCheck();

            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', mediaHandler);
            } else if (mediaQuery.addListener) {
                mediaQuery.addListener(mediaHandler);
            }

            // Initial check
            check();

            // Return cleanup function
            return () => {
                htmlObserver.disconnect();
                if (bodyObserver) {
                    bodyObserver.disconnect();
                }
                if (mediaQuery.removeEventListener) {
                    mediaQuery.removeEventListener('change', mediaHandler);
                } else if (mediaQuery.removeListener) {
                    mediaQuery.removeListener(mediaHandler);
                }
            };
        }
    };


    // ============================================================================
    // COLOR MANIPULATION
    // ============================================================================

    const Color = {
        /**
         * Parse a CSS color string to RGBA object
         * @param {string} input - CSS color value
         * @returns {Object|null} {r, g, b, a} or null if invalid
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

            // Hex color: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
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

            // RGB/RGBA with commas: rgb(R, G, B) or rgba(R, G, B, A)
            match = input.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
            if (match) {
                return {
                    r: parseInt(match[1], 10),
                    g: parseInt(match[2], 10),
                    b: parseInt(match[3], 10),
                    a: match[4] !== undefined ? parseFloat(match[4]) : 1
                };
            }

            // RGB/RGBA with spaces: rgb(R G B) or rgb(R G B / A)
            match = input.match(/^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/);
            if (match) {
                let alpha = 1;
                if (match[4]) {
                    alpha = match[4].endsWith('%')
                        ? parseFloat(match[4]) / 100
                        : parseFloat(match[4]);
                }
                return {
                    r: parseInt(match[1], 10),
                    g: parseInt(match[2], 10),
                    b: parseInt(match[3], 10),
                    a: alpha
                };
            }

            // HSL/HSLA: hsl(H, S%, L%) or hsla(H, S%, L%, A)
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
            if (named) {
                return named;
            }

            return null;
        },

        /**
         * Get named color RGB values
         * @param {string} name - Color name
         * @returns {Object|null} {r, g, b, a} or null
         */
        getNamedColor(name) {
            const color = NAMED_COLORS[name];
            if (color) {
                if (color.length === 4) {
                    return { r: color[0], g: color[1], b: color[2], a: color[3] };
                }
                return { r: color[0], g: color[1], b: color[2], a: 1 };
            }
            return null;
        },

        /**
         * Convert RGB to HSL
         * @param {number} r - Red (0-255)
         * @param {number} g - Green (0-255)
         * @param {number} b - Blue (0-255)
         * @returns {Object} {h, s, l} with h in degrees, s and l as percentages
         */
        rgbToHsl(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s;
            const l = (max + min) / 2;

            if (max === min) {
                h = s = 0;
            } else {
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
         * @returns {Object} {r, g, b, a}
         */
        hslToRgb(h, s, l, a = 1) {
            h /= 360;
            s /= 100;
            l /= 100;

            let r, g, b;

            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };

                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;

                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }

            return {
                r: Math.round(r * 255),
                g: Math.round(g * 255),
                b: Math.round(b * 255),
                a: a
            };
        },

        /**
         * Convert color object to rgba() string
         * @param {Object} color - {r, g, b, a}
         * @returns {string} CSS rgba() value
         */
        toRgba(color) {
            return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
        },

        /**
         * Convert color object to hex string
         * @param {Object} color - {r, g, b}
         * @returns {string} CSS hex value
         */
        toHex(color) {
            const r = Math.round(color.r).toString(16).padStart(2, '0');
            const g = Math.round(color.g).toString(16).padStart(2, '0');
            const b = Math.round(color.b).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        },

        /**
         * Calculate relative luminance
         * @param {Object} color - {r, g, b}
         * @returns {number} Luminance (0-1)
         */
        getLuminance(color) {
            const rsrgb = color.r / 255;
            const gsrgb = color.g / 255;
            const bsrgb = color.b / 255;

            const rlin = rsrgb <= 0.03928
                ? rsrgb / 12.92
                : Math.pow((rsrgb + 0.055) / 1.055, 2.4);
            const glin = gsrgb <= 0.03928
                ? gsrgb / 12.92
                : Math.pow((gsrgb + 0.055) / 1.055, 2.4);
            const blin = bsrgb <= 0.03928
                ? bsrgb / 12.92
                : Math.pow((bsrgb + 0.055) / 1.055, 2.4);

            return 0.2126 * rlin + 0.7152 * glin + 0.0722 * blin;
        },

        /**
         * Check if color is light
         * @param {Object} color - {r, g, b}
         * @returns {boolean} True if light
         */
        isLight(color) {
            return this.getLuminance(color) > 0.179;
        },

        /**
         * Check if color is dark
         * @param {Object} color - {r, g, b}
         * @returns {boolean} True if dark
         */
        isDark(color) {
            return !this.isLight(color);
        },

        /**
         * Modify background color for dark mode
         * @param {Object} color - Original color
         * @param {Object} theme - Theme settings
         * @returns {string|null} Modified CSS color or null
         */
        modifyBackgroundColor(color, theme) {
            if (!color || color.a < 0.1) {
                return null;
            }

            const hsl = this.rgbToHsl(color.r, color.g, color.b);
            const luminance = this.getLuminance(color);

            // Dark mode: invert lightness for light backgrounds
            if (theme.mode === 1) {
                if (luminance > 0.5) {
                    // Light background -> make dark
                    hsl.l = Math.max(5, Math.min(15, 100 - hsl.l));
                } else if (luminance > 0.2) {
                    // Medium background -> make darker
                    hsl.l = Math.max(5, hsl.l * 0.3);
                }
                // Clamp to dark range
                hsl.l = clamp(hsl.l, 0, 20);
            }

            // Apply brightness adjustment
            hsl.l = hsl.l * (theme.brightness / 100);

            // Apply contrast adjustment
            hsl.l = ((hsl.l - 50) * (theme.contrast / 100)) + 50;
            hsl.l = clamp(hsl.l, 0, 100);

            // Apply sepia effect
            if (theme.sepia > 0) {
                hsl.h = hsl.h * (1 - theme.sepia / 100) + 40 * (theme.sepia / 100);
                hsl.s = Math.max(hsl.s, theme.sepia * 0.1);
            }

            // Apply grayscale
            hsl.s = hsl.s * (1 - theme.grayscale / 100);

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        },

        /**
         * Modify text color for dark mode
         * @param {Object} color - Original color
         * @param {Object} theme - Theme settings
         * @returns {string|null} Modified CSS color or null
         */
        modifyTextColor(color, theme) {
            if (!color) {
                return null;
            }

            const hsl = this.rgbToHsl(color.r, color.g, color.b);
            const luminance = this.getLuminance(color);

            // Dark mode: make dark text light
            if (theme.mode === 1) {
                if (luminance < 0.5) {
                    // Dark text -> make light
                    hsl.l = Math.max(75, Math.min(95, 100 - hsl.l));
                } else if (luminance < 0.8) {
                    // Medium text -> make lighter
                    hsl.l = Math.min(95, hsl.l + 40);
                }
                // Clamp to light range
                hsl.l = clamp(hsl.l, 70, 95);
            }

            // Apply brightness adjustment
            hsl.l = hsl.l * (theme.brightness / 100);

            // Apply contrast adjustment
            hsl.l = ((hsl.l - 50) * (theme.contrast / 100)) + 50;
            hsl.l = clamp(hsl.l, 0, 100);

            // Apply sepia effect
            if (theme.sepia > 0) {
                hsl.h = hsl.h * (1 - theme.sepia / 100) + 40 * (theme.sepia / 100);
            }

            // Apply grayscale
            hsl.s = hsl.s * (1 - theme.grayscale / 100);

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        },

        /**
         * Modify border color for dark mode
         * @param {Object} color - Original color
         * @param {Object} theme - Theme settings
         * @returns {string|null} Modified CSS color or null
         */
        modifyBorderColor(color, theme) {
            if (!color || color.a < 0.1) {
                return null;
            }

            const hsl = this.rgbToHsl(color.r, color.g, color.b);

            // Dark mode: set border to medium gray
            if (theme.mode === 1) {
                hsl.l = clamp(30, 20, 50);
            }

            // Apply grayscale
            hsl.s = hsl.s * (1 - theme.grayscale / 100);

            const result = this.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
            return this.toRgba(result);
        }
    };


    // ============================================================================
    // CSS MODIFIER
    // ============================================================================

    const CSSModifier = {
        /**
         * Process a single CSS declaration
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

            // Outline color
            if (prop === 'outline-color') {
                const color = Color.parse(value);
                if (color && color.a > 0.1) {
                    return Color.modifyBorderColor(color, theme);
                }
            }

            // Box shadow - simplify in dark mode
            if (prop === 'box-shadow' && value !== 'none') {
                return 'none';
            }

            // Text shadow - simplify in dark mode
            if (prop === 'text-shadow' && value !== 'none') {
                return 'none';
            }

            return null;
        },

        /**
         * Process a CSS rule
         * @param {CSSStyleRule} rule - CSS rule
         * @param {Object} theme - Theme settings
         * @param {string} selectorPrefix - Optional selector prefix
         * @returns {string|null} Modified CSS rule string or null
         */
        processRule(rule, theme, selectorPrefix = '') {
            if (!rule.style) {
                return null;
            }

            const modifications = [];
            const selector = selectorPrefix
                ? `${selectorPrefix} ${rule.selectorText}`
                : rule.selectorText;

            for (let i = 0; i < rule.style.length; i++) {
                const property = rule.style[i];
                const value = rule.style.getPropertyValue(property);
                const priority = rule.style.getPropertyPriority(property);

                const modified = this.processDeclaration(property, value, theme);
                if (modified) {
                    const important = priority ? ' !important' : '';
                    modifications.push(`${property}: ${modified}${important}`);
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
            const MAX_RULES = CONFIG.maxCSSRules;
            let ruleCount = 0;

            try {
                const cssRules = sheet.cssRules || sheet.rules;
                if (!cssRules) {
                    return '';
                }

                for (const rule of cssRules) {
                    if (ruleCount++ > MAX_RULES) {
                        break;
                    }

                    // Style rule
                    if (rule.type === CSSRule.STYLE_RULE) {
                        const modified = this.processRule(rule, theme);
                        if (modified) {
                            rules.push(modified);
                        }
                    }
                    // Media rule
                    else if (rule.type === CSSRule.MEDIA_RULE) {
                        const mediaRules = [];

                        for (const innerRule of rule.cssRules) {
                            if (ruleCount++ > MAX_RULES) {
                                break;
                            }

                            if (innerRule.type === CSSRule.STYLE_RULE) {
                                const modified = this.processRule(innerRule, theme);
                                if (modified) {
                                    mediaRules.push(modified);
                                }
                            }
                        }

                        if (mediaRules.length > 0) {
                            rules.push(`@media ${rule.conditionText} { ${mediaRules.join(' ')} }`);
                        }
                    }
                    // Supports rule
                    else if (rule.type === CSSRule.SUPPORTS_RULE) {
                        const supportsRules = [];

                        for (const innerRule of rule.cssRules) {
                            if (ruleCount++ > MAX_RULES) {
                                break;
                            }

                            if (innerRule.type === CSSRule.STYLE_RULE) {
                                const modified = this.processRule(innerRule, theme);
                                if (modified) {
                                    supportsRules.push(modified);
                                }
                            }
                        }

                        if (supportsRules.length > 0) {
                            rules.push(`@supports ${rule.conditionText} { ${supportsRules.join(' ')} }`);
                        }
                    }
                }
            } catch (e) {
                // CORS error - expected for external stylesheets
            }

            return rules.join('\n');
        }
    };

    // ============================================================================
    // SITE FIXES PROCESSOR
    // Processes Dark Reader style fix syntax
    // ============================================================================

    const SiteFixesProcessor = {
        /**
         * Parse site fixes text into structured object
         * Supports: INVERT, CSS, IGNORE INLINE STYLE, IGNORE IMAGE ANALYSIS, NO INVERT, REMOVE BG
         * @param {string} fixText - Fix text in Dark Reader format
         * @returns {Object|null} Parsed fixes object
         */
        parseFixes(fixText) {
            if (!fixText || typeof fixText !== 'string') {
                return null;
            }

            const result = {
                invert: [],
                css: '',
                ignoreInlineStyle: [],
                ignoreImageAnalysis: [],
                noInvert: [],
                removeBg: []
            };

            const lines = fixText.split('\n');
            let currentSection = null;
            let cssLines = [];

            for (const line of lines) {
                const trimmed = line.trim();

                if (!trimmed) {
                    continue;
                }

                // Section headers
                if (trimmed === 'INVERT') {
                    currentSection = 'invert';
                } else if (trimmed === 'CSS') {
                    currentSection = 'css';
                } else if (trimmed === 'IGNORE INLINE STYLE') {
                    currentSection = 'ignoreInlineStyle';
                } else if (trimmed === 'IGNORE IMAGE ANALYSIS') {
                    currentSection = 'ignoreImageAnalysis';
                } else if (trimmed === 'NO INVERT') {
                    currentSection = 'noInvert';
                } else if (trimmed === 'REMOVE BG') {
                    currentSection = 'removeBg';
                } else if (currentSection) {
                    // Content lines
                    if (currentSection === 'css') {
                        cssLines.push(line); // Preserve original indentation
                    } else if (Array.isArray(result[currentSection])) {
                        result[currentSection].push(trimmed);
                    }
                }
            }

            result.css = cssLines.join('\n');
            return result;
        },

        /**
         * Apply color template variables to CSS
         * Replaces ${white} and ${black} with theme colors
         * @param {string} css - CSS with template variables
         * @param {Object} theme - Theme settings
         * @returns {string} CSS with variables replaced
         */
        applyColorTemplate(css, theme) {
            const bg = theme.darkSchemeBackgroundColor;
            const text = theme.darkSchemeTextColor;

            return css
                .replace(/\$\{white\}/g, bg)
                .replace(/\$\{black\}/g, text)
                .replace(/var\(--darkreader-neutral-background\)/g, bg)
                .replace(/var\(--darkreader-neutral-text\)/g, text);
        },

        /**
         * Generate CSS from parsed fixes
         * @param {Object} fixes - Parsed fixes object
         * @param {Object} theme - Theme settings
         * @returns {string} Generated CSS
         */
        generateFixCSS(fixes, theme) {
            if (!fixes) {
                return '';
            }

            let css = '';

            // INVERT selectors
            if (fixes.invert && fixes.invert.length > 0) {
                const selector = fixes.invert.join(', ');
                css += `${selector} {\n`;
                css += `    filter: invert(1) hue-rotate(180deg) !important;\n`;
                css += `}\n\n`;
            }

            // NO INVERT selectors (counter inversion for Filter mode)
            if (fixes.noInvert && fixes.noInvert.length > 0) {
                const selector = fixes.noInvert.join(', ');
                css += `${selector} {\n`;
                css += `    filter: none !important;\n`;
                css += `}\n\n`;
            }

            // REMOVE BG selectors
            if (fixes.removeBg && fixes.removeBg.length > 0) {
                const selector = fixes.removeBg.join(', ');
                css += `${selector} {\n`;
                css += `    background-image: none !important;\n`;
                css += `    background-color: #000 !important;\n`;
                css += `}\n\n`;
            }

            // Custom CSS with color template replacement
            if (fixes.css) {
                css += this.applyColorTemplate(fixes.css, theme);
                css += '\n';
            }

            return css;
        }
    };


    // ============================================================================
    // THEME ENGINES
    // ============================================================================

    // --------------------------------------------------------------------------
    // Filter Engine - Simple CSS filter inversion
    // --------------------------------------------------------------------------

    const FilterEngine = {
        style: null,

        /**
         * Generate filter CSS
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

                html img,
                html video,
                html picture,
                html canvas,
                html [style*="background-image"]:not([style*="gradient"]),
                html iframe,
                html embed,
                html object,
                html svg image {
                    filter: invert(1) hue-rotate(180deg) !important;
                }

                html [data-darkmoder-inline-bgcolor] {
                    background-color: inherit !important;
                }
            `;
        },

        /**
         * Apply filter engine
         * @param {Object} theme - Theme settings
         */
        apply(theme) {
            this.remove();

            this.style = document.createElement('style');
            this.style.id = 'darkmoder-filter';
            this.style.textContent = this.create(theme);

            const target = document.head || document.documentElement;
            target.appendChild(this.style);
        },

        /**
         * Remove filter engine styles
         */
        remove() {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }

            // Also remove any lingering filter style
            const existing = document.getElementById('darkmoder-filter');
            if (existing) {
                existing.remove();
            }
        }
    };

    // --------------------------------------------------------------------------
    // Filter+ Engine - SVG filter based inversion (better colors)
    // --------------------------------------------------------------------------

    const FilterPlusEngine = {
        style: null,
        svgContainer: null,

        /**
         * Get SVG filter definition
         * @returns {string} SVG markup
         */
        getSVGFilter() {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
                    <filter id="darkmoder-filter">
                        <feColorMatrix type="matrix" values="
                            0.33 -0.67 -0.67 0 1
                            -0.67 0.33 -0.67 0 1
                            -0.67 -0.67 0.33 0 1
                            0 0 0 1 0
                        "/>
                    </filter>
                </svg>
            `;
        },

        /**
         * Generate filter+ CSS
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
                    filter: url(#darkmoder-filter)
                            brightness(${brightness})
                            contrast(${contrast})
                            sepia(${sepia})
                            grayscale(${grayscale}) !important;
                }

                html img,
                html video,
                html picture,
                html canvas,
                html [style*="background-image"]:not([style*="gradient"]),
                html iframe,
                html embed,
                html object {
                    filter: url(#darkmoder-filter) !important;
                }
            `;
        },

        /**
         * Insert SVG filter into document
         */
        insertSVG() {
            if (this.svgContainer) {
                return;
            }

            this.svgContainer = document.createElement('div');
            this.svgContainer.id = 'darkmoder-svg-filters';
            this.svgContainer.innerHTML = this.getSVGFilter();

            const target = document.body || document.documentElement;
            target.appendChild(this.svgContainer);
        },

        /**
         * Apply filter+ engine
         * @param {Object} theme - Theme settings
         */
        apply(theme) {
            this.remove();

            // Insert SVG when body is available
            if (document.body) {
                this.insertSVG();
            } else {
                document.addEventListener('DOMContentLoaded', () => this.insertSVG(), { once: true });
            }

            this.style = document.createElement('style');
            this.style.id = 'darkmoder-filterplus';
            this.style.textContent = this.create(theme);

            const target = document.head || document.documentElement;
            target.appendChild(this.style);
        },

        /**
         * Remove filter+ engine styles
         */
        remove() {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }

            if (this.svgContainer) {
                this.svgContainer.remove();
                this.svgContainer = null;
            }

            // Also remove any lingering elements
            const existingStyle = document.getElementById('darkmoder-filterplus');
            if (existingStyle) {
                existingStyle.remove();
            }

            const existingSvg = document.getElementById('darkmoder-svg-filters');
            if (existingSvg) {
                existingSvg.remove();
            }
        }
    };


    // --------------------------------------------------------------------------
    // Dynamic Engine - Intelligent color analysis and modification
    // This is the most sophisticated engine with performance optimizations
    // --------------------------------------------------------------------------

    const DynamicEngine = {
        styles: [],
        observer: null,
        processedSheets: new WeakSet(),
        theme: null,
        fixes: null,
        ignoreInlineStyle: new Set(),
        ignoreImageAnalysis: new Set(),

        /**
         * Generate root CSS with base dark theme styles
         * @param {Object} theme - Theme settings
         * @returns {string} CSS string
         */
        createRootCSS(theme) {
            const bg = theme.darkSchemeBackgroundColor;
            const text = theme.darkSchemeTextColor;
            const border = theme.borderColor || '#3a3d3e';
            const link = theme.linkColor || '#3391ff';
            const visitedLink = theme.visitedLinkColor || '#9e6eff';

            // Selection colors
            const selectionBg = theme.selectionColor === 'auto'
                ? (theme.selectionBgColor || '#004daa')
                : theme.selectionBgColor;
            const selectionText = theme.selectionColor === 'auto'
                ? (theme.selectionTextColor || '#ffffff')
                : theme.selectionTextColor;

            // Optional font customization
            let fontCSS = '';
            if (theme.useFont && theme.fontFamily) {
                fontCSS = `
                    html, body, input, textarea, select, button {
                        font-family: ${theme.fontFamily} !important;
                    }
                `;
            }

            // Optional text stroke
            let textStrokeCSS = '';
            if (theme.textStroke > 0) {
                const strokeWidth = theme.textStroke * 0.1;
                textStrokeCSS = `
                    body * {
                        -webkit-text-stroke: ${strokeWidth}px !important;
                    }
                `;
            }

            return `
                /* Root element styles */
                html {
                    background-color: ${bg} !important;
                    color-scheme: dark !important;
                }

                html, body {
                    background-color: ${bg} !important;
                    color: ${text} !important;
                }

                ${fontCSS}
                ${textStrokeCSS}

                /* Links */
                a {
                    color: ${link} !important;
                }
                a:visited {
                    color: ${visitedLink} !important;
                }

                /* Selection */
                ::selection {
                    background-color: ${selectionBg} !important;
                    color: ${selectionText} !important;
                }
                ::-moz-selection {
                    background-color: ${selectionBg} !important;
                    color: ${selectionText} !important;
                }

                /* Form elements */
                input, textarea, select, button {
                    background-color: #1c1e1f !important;
                    color: ${text} !important;
                    border-color: ${border} !important;
                }
                input::placeholder, textarea::placeholder {
                    color: #7a7a7a !important;
                }

                /* Tables */
                table, td, th {
                    border-color: ${border} !important;
                }
                th {
                    background-color: #1f2123 !important;
                }

                /* Misc elements */
                hr {
                    border-color: ${border} !important;
                    background-color: ${border} !important;
                }
                pre, code {
                    background-color: #1a1c1e !important;
                    border-color: ${border} !important;
                }
                blockquote {
                    border-color: ${border} !important;
                    background-color: rgba(0, 0, 0, 0.2) !important;
                }

                /* Preserve media elements */
                img, video, picture, canvas, iframe, embed, object {
                    filter: none !important;
                }

                /* Scrollbar styling */
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
                ::-webkit-scrollbar-track {
                    background-color: ${bg};
                }
                ::-webkit-scrollbar-corner {
                    background-color: ${bg};
                }
            `;
        },

        /**
         * Apply dynamic engine
         * @param {Object} theme - Theme settings
         * @param {string|null} fixes - Site fixes text
         */
        apply(theme, fixes = null) {
            this.remove();
            this.theme = theme;
            this.fixes = fixes;

            // Parse site fixes
            if (fixes) {
                const parsed = SiteFixesProcessor.parseFixes(fixes);
                if (parsed) {
                    this.ignoreInlineStyle = new Set(parsed.ignoreInlineStyle || []);
                    this.ignoreImageAnalysis = new Set(parsed.ignoreImageAnalysis || []);
                }
            }

            // Wait for documentElement
            if (!document.documentElement) {
                document.addEventListener('DOMContentLoaded', () => this.apply(theme, fixes), { once: true });
                return;
            }

            // Apply root styles
            const rootStyle = document.createElement('style');
            rootStyle.id = 'darkmoder-dynamic-root';
            rootStyle.textContent = this.createRootCSS(theme);

            const target = document.head || document.documentElement;
            target.appendChild(rootStyle);
            this.styles.push(rootStyle);

            // Apply site-specific fixes
            if (fixes) {
                const parsed = SiteFixesProcessor.parseFixes(fixes);
                if (parsed) {
                    const fixCSS = SiteFixesProcessor.generateFixCSS(parsed, theme);
                    if (fixCSS) {
                        const fixStyle = document.createElement('style');
                        fixStyle.id = 'darkmoder-dynamic-fixes';
                        fixStyle.textContent = fixCSS;
                        target.appendChild(fixStyle);
                        this.styles.push(fixStyle);
                    }
                }
            }

            // Process page content
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.processPage(theme), { once: true });
            } else {
                // Use requestIdleCallback for non-blocking processing
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(() => this.processPage(theme), { timeout: 100 });
                } else {
                    setTimeout(() => this.processPage(theme), 10);
                }
            }
        },

        /**
         * Process page stylesheets and inline styles
         * @param {Object} theme - Theme settings
         */
        processPage(theme) {
            const sheets = Array.from(document.styleSheets);
            let index = 0;
            const BATCH_SIZE = CONFIG.stylesheetBatchSize;

            /**
             * Process stylesheets in batches to avoid blocking
             */
            const processBatch = () => {
                const endIndex = Math.min(index + BATCH_SIZE, sheets.length);

                for (; index < endIndex; index++) {
                    this.processStyleSheet(sheets[index], theme);
                }

                if (index < sheets.length) {
                    if (typeof requestIdleCallback === 'function') {
                        requestIdleCallback(processBatch, { timeout: 50 });
                    } else {
                        setTimeout(processBatch, 0);
                    }
                }
            };

            // Start batch processing
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(processBatch, { timeout: 100 });
            } else {
                setTimeout(processBatch, 0);
            }

            // Process inline styles
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(() => this.processInlineStyles(theme), { timeout: 200 });
            } else {
                setTimeout(() => this.processInlineStyles(theme), 50);
            }

            // Start observing for changes
            this.observe(theme);
        },

        /**
         * Process a single stylesheet
         * @param {CSSStyleSheet} sheet - Stylesheet to process
         * @param {Object} theme - Theme settings
         */
        processStyleSheet(sheet, theme) {
            // Skip already processed sheets
            if (this.processedSheets.has(sheet)) {
                return;
            }
            this.processedSheets.add(sheet);

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
                // CORS error or other issue - skip this sheet
            }
        },

        /**
         * Process inline styles on elements (throttled)
         * @param {Object} theme - Theme settings
         */
        processInlineStyles: throttle(function(theme) {
            const elements = document.querySelectorAll('[style]');
            const maxElements = Math.min(elements.length, CONFIG.maxInlineElements);

            for (let i = 0; i < maxElements; i++) {
                const el = elements[i];

                // Skip our own UI
                if (el.closest('#darkmoder-ui')) {
                    continue;
                }

                // Skip already processed
                if (el.hasAttribute('data-darkmoder-processed')) {
                    continue;
                }

                // Check IGNORE INLINE STYLE rules
                if (this.shouldIgnoreInlineStyle(el)) {
                    continue;
                }

                this.processElementStyle(el, theme);
                el.setAttribute('data-darkmoder-processed', '1');
            }
        }, 200),

        /**
         * Check if element should be ignored based on site fixes
         * @param {Element} el - Element to check
         * @returns {boolean} True if should ignore
         */
        shouldIgnoreInlineStyle(el) {
            for (const selector of this.ignoreInlineStyle) {
                try {
                    if (el.matches(selector)) {
                        return true;
                    }
                } catch (e) {
                    // Invalid selector
                }
            }
            return false;
        },

        /**
         * Process inline style on a single element
         * @param {Element} el - Element to process
         * @param {Object} theme - Theme settings
         */
        processElementStyle(el, theme) {
            if (!el || !el.isConnected || !el.style) {
                return;
            }

            // Skip script-related elements
            const tagName = el.tagName;
            if (tagName === 'SCRIPT' || tagName === 'NOSCRIPT' || tagName === 'HEAD' || tagName === 'META') {
                return;
            }

            try {
                const style = el.style;
                const bgColor = style.backgroundColor || style.background;
                const textColor = style.color;

                // Process background color
                if (bgColor && bgColor !== 'transparent' && bgColor !== 'inherit') {
                    const color = Color.parse(bgColor);
                    if (color && Color.isLight(color) && color.a > 0.1) {
                        const modified = Color.modifyBackgroundColor(color, theme);
                        if (modified) {
                            style.setProperty('background-color', modified, 'important');
                        }
                    }
                }

                // Process text color
                if (textColor && textColor !== 'inherit') {
                    const color = Color.parse(textColor);
                    if (color && Color.isDark(color)) {
                        const modified = Color.modifyTextColor(color, theme);
                        if (modified) {
                            style.setProperty('color', modified, 'important');
                        }
                    }
                }
            } catch (e) {
                // Skip elements that cause errors
            }
        },

        /**
         * Observe DOM changes and process new content
         * @param {Object} theme - Theme settings
         */
        observe(theme) {
            if (this.observer) {
                return;
            }

            let pendingElements = new Set();
            let pendingSheets = new Set();
            let frameRequested = false;

            /**
             * Process pending items in batches
             */
            const processBatch = () => {
                frameRequested = false;

                // Process pending stylesheets
                const SHEET_BATCH_SIZE = CONFIG.observerBatchSize;
                let sheetCount = 0;
                const sheetsToRemove = [];

                for (const sheet of pendingSheets) {
                    if (sheetCount >= SHEET_BATCH_SIZE) {
                        break;
                    }
                    if (!this.processedSheets.has(sheet)) {
                        this.processStyleSheet(sheet, theme);
                    }
                    sheetsToRemove.push(sheet);
                    sheetCount++;
                }

                for (const sheet of sheetsToRemove) {
                    pendingSheets.delete(sheet);
                }

                // Process pending elements
                const ELEMENT_BATCH_SIZE = CONFIG.inlineElementBatchSize;
                let processed = 0;

                for (const el of pendingElements) {
                    if (processed >= ELEMENT_BATCH_SIZE) {
                        break;
                    }
                    pendingElements.delete(el);

                    if (el.isConnected && !el.hasAttribute('data-darkmoder-processed')) {
                        el.setAttribute('data-darkmoder-processed', '1');
                        this.processElementStyle(el, theme);
                    }
                    processed++;
                }

                // Schedule another batch if needed
                if (pendingSheets.size > 0 || pendingElements.size > 0) {
                    scheduleProcess();
                }
            };

            /**
             * Schedule batch processing
             */
            const scheduleProcess = () => {
                if (!frameRequested) {
                    frameRequested = true;
                    requestAnimationFrame(processBatch);
                }
            };

            // Create mutation observer
            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Check for new stylesheets
                                if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
                                    // Skip our own styles
                                    if (node.className && node.className.includes('darkmoder')) {
                                        continue;
                                    }
                                    if (node.id && node.id.startsWith('darkmoder')) {
                                        continue;
                                    }
                                    if (node.sheet) {
                                        pendingSheets.add(node.sheet);
                                    }
                                }

                                // Check for inline styles
                                if (node.hasAttribute && node.hasAttribute('style')) {
                                    if (!node.hasAttribute('data-darkmoder-processed')) {
                                        pendingElements.add(node);
                                    }
                                }

                                // Check children for inline styles
                                const styledChildren = node.querySelectorAll ?
                                    node.querySelectorAll('[style]') : [];
                                for (const child of styledChildren) {
                                    if (!child.hasAttribute('data-darkmoder-processed')) {
                                        pendingElements.add(child);
                                    }
                                }
                            }
                        }
                    } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const target = mutation.target;
                        if (!target.hasAttribute('data-darkmoder-processed')) {
                            pendingElements.add(target);
                        }
                    }
                }

                if (pendingSheets.size > 0 || pendingElements.size > 0) {
                    scheduleProcess();
                }
            });

            // Start observing
            this.observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });
        },

        /**
         * Remove dynamic engine and clean up
         */
        remove() {
            // Disconnect observer
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }

            // Remove all injected styles
            for (const style of this.styles) {
                style.remove();
            }
            this.styles = [];

            // Reset tracking
            this.processedSheets = new WeakSet();
            this.ignoreInlineStyle = new Set();
            this.ignoreImageAnalysis = new Set();

            // Remove any lingering elements
            document.querySelectorAll('[class*="darkmoder-dynamic"]').forEach(el => el.remove());
            document.querySelectorAll('#darkmoder-dynamic-root, #darkmoder-dynamic-fixes').forEach(el => el.remove());

            // Clean up processed attributes (deferred)
            const cleanup = () => {
                document.querySelectorAll('[data-darkmoder-processed]').forEach(el => {
                    el.removeAttribute('data-darkmoder-processed');
                });
            };

            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(cleanup, { timeout: 1000 });
            } else {
                setTimeout(cleanup, 100);
            }
        },

        /**
         * Export generated CSS
         * @returns {string} Combined CSS from all styles
         */
        exportCSS() {
            let css = '/* DarkModer Generated CSS */\n\n';
            for (const style of this.styles) {
                css += style.textContent + '\n\n';
            }
            return css;
        }
    };


    // --------------------------------------------------------------------------
    // Static Engine - Simple static CSS replacement
    // --------------------------------------------------------------------------

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
            const border = theme.borderColor || '#3a3d3e';
            const link = theme.linkColor || '#3391ff';
            const visitedLink = theme.visitedLinkColor || '#9e6eff';

            return `
                /* Static dark mode - applies to all major elements */
                html, body, article, section, nav, aside, header, footer, main,
                div, span, p, h1, h2, h3, h4, h5, h6, ul, ol, li, dl, dt, dd,
                form, fieldset, legend, table, caption, tbody, tfoot, thead, tr, th, td,
                address, blockquote, pre, figure, figcaption, details, summary {
                    background-color: ${bg} !important;
                    color: ${text} !important;
                    border-color: ${border} !important;
                }

                /* Links */
                a {
                    color: ${link} !important;
                }
                a:visited {
                    color: ${visitedLink} !important;
                }

                /* Form elements */
                input, textarea, select, button, optgroup, option {
                    background-color: #1c1e1f !important;
                    color: ${text} !important;
                    border-color: ${border} !important;
                }

                input::placeholder, textarea::placeholder {
                    color: #7a7a7a !important;
                }

                /* Code elements */
                code, pre, kbd, samp {
                    background-color: #1a1c1e !important;
                    color: ${text} !important;
                }

                /* Images and media - don't modify */
                img, video, picture, canvas, svg, iframe {
                    /* Preserve original colors */
                }
            `;
        },

        /**
         * Apply static engine
         * @param {Object} theme - Theme settings
         */
        apply(theme) {
            this.remove();

            this.style = document.createElement('style');
            this.style.id = 'darkmoder-static';
            this.style.textContent = this.create(theme);

            const target = document.head || document.documentElement;
            target.appendChild(this.style);
        },

        /**
         * Remove static engine
         */
        remove() {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }

            const existing = document.getElementById('darkmoder-static');
            if (existing) {
                existing.remove();
            }
        }
    };

    // ============================================================================
    // CONFIG LOADER
    // Loads remote configuration files with caching
    // ============================================================================

    const ConfigLoader = {
        cache: {},
        cacheTimestamps: {},

        /**
         * Load a configuration file
         * @param {string} name - Config name (darkSites, dynamicFixes, etc.)
         * @returns {Promise<*>} Configuration data
         */
        async loadConfig(name) {
            // Check cache
            if (this.cache[name] && this.cacheTimestamps[name]) {
                const age = Date.now() - this.cacheTimestamps[name];
                if (age < CONFIG.cacheDuration) {
                    return this.cache[name];
                }
            }

            // If no base URL, use built-in
            if (!CONFIG.configBaseURL) {
                return this.getBuiltIn(name);
            }

            try {
                const url = CONFIG.configBaseURL + CONFIG.configFiles[name];
                const response = await this.fetch(url);

                if (response) {
                    const data = JSON.parse(response);

                    // Extract the relevant array/object from the response
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

                    // Update cache
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
         * Fetch a URL with timeout
         * @param {string} url - URL to fetch
         * @param {number} timeout - Timeout in ms
         * @returns {Promise<string>} Response text
         */
        fetch(url, timeout = 3000) {
            return new Promise((resolve, reject) => {
                let timedOut = false;

                const timer = setTimeout(() => {
                    timedOut = true;
                    reject(new Error('Timeout'));
                }, timeout);

                // Use GM_xmlhttpRequest if available (bypasses CORS)
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        timeout: timeout,
                        onload: (response) => {
                            if (timedOut) return;
                            clearTimeout(timer);

                            if (response.status >= 200 && response.status < 300) {
                                resolve(response.responseText);
                            } else {
                                reject(new Error(`HTTP ${response.status}`));
                            }
                        },
                        onerror: () => {
                            if (timedOut) return;
                            clearTimeout(timer);
                            reject(new Error('Network error'));
                        },
                        ontimeout: () => {
                            if (timedOut) return;
                            clearTimeout(timer);
                            reject(new Error('Timeout'));
                        }
                    });
                } else {
                    // Fallback to fetch API
                    fetch(url, { signal: AbortSignal.timeout(timeout) })
                        .then(r => {
                            if (!r.ok) throw new Error(`HTTP ${r.status}`);
                            return r.text();
                        })
                        .then(text => {
                            if (timedOut) return;
                            clearTimeout(timer);
                            resolve(text);
                        })
                        .catch(e => {
                            if (timedOut) return;
                            clearTimeout(timer);
                            reject(e);
                        });
                }
            });
        },

        /**
         * Get built-in configuration
         * @param {string} name - Config name
         * @returns {*} Built-in config data
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
         * Get site-specific fix from fixes object
         * @param {string} hostname - Site hostname
         * @param {Object} fixes - Fixes object
         * @returns {string|null} Fix text or null
         */
        getSiteFix(hostname, fixes) {
            if (!fixes || typeof fixes !== 'object') {
                return null;
            }

            // Direct match
            if (fixes[hostname]) {
                return fixes[hostname];
            }

            // Check parent domains
            const parts = hostname.split('.');
            for (let i = 1; i < parts.length - 1; i++) {
                const domain = parts.slice(i).join('.');
                if (fixes[domain]) {
                    return fixes[domain];
                }
            }

            // Check wildcard patterns
            for (const [pattern, fix] of Object.entries(fixes)) {
                if (pattern.includes('*')) {
                    const escapedPattern = pattern
                        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                        .replace(/\*/g, '.*');
                    const regex = new RegExp('^' + escapedPattern + '$', 'i');
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
    // Persistent storage with GM_* API fallback to localStorage
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
                    if (val === undefined) {
                        return defaultValue;
                    }
                    // GM_getValue might return string or object depending on userscript manager
                    return typeof val === 'string' ? JSON.parse(val) : val;
                }

                // Fallback to localStorage
                const stored = localStorage.getItem(key);
                return stored ? JSON.parse(stored) : defaultValue;
            } catch (e) {
                console.warn('DarkModer: Failed to read settings', e);
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
                // Ignore removal errors
            }
        }
    };


    // ============================================================================
    // SETTINGS UI
    // ============================================================================

    const UI = {
        container: null,
        isOpen: false,
        currentTab: 'theme',

        /**
         * CSS styles for the settings panel
         */
        styles: `
            #darkmoder-ui {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #e8e6e3;
            }

            #darkmoder-ui * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            #darkmoder-ui .dm-popup {
                width: 360px;
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
                background: rgba(255, 255, 255, 0.1);
            }

            #darkmoder-ui .dm-tabs {
                display: flex;
                background: #181a1b;
                border-bottom: 1px solid #3a3d3e;
            }

            #darkmoder-ui .dm-tab {
                flex: 1;
                padding: 10px;
                text-align: center;
                cursor: pointer;
                border: none;
                background: none;
                color: #7a7a7a;
                font-size: 11px;
                transition: all 0.2s;
            }

            #darkmoder-ui .dm-tab:hover {
                color: #e8e6e3;
                background: rgba(255, 255, 255, 0.05);
            }

            #darkmoder-ui .dm-tab.active {
                color: #3391ff;
                border-bottom: 2px solid #3391ff;
            }

            #darkmoder-ui .dm-body {
                padding: 16px;
                max-height: 65vh;
                overflow-y: auto;
            }

            #darkmoder-ui .dm-panel {
                display: none;
            }

            #darkmoder-ui .dm-panel.active {
                display: block;
            }

            #darkmoder-ui .dm-main-toggle {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                margin-bottom: 16px;
                background: #181a1b;
                border-radius: 8px;
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

            #darkmoder-ui .dm-toggle .dm-slider {
                position: absolute;
                inset: 0;
                background: #3a3d3e;
                border-radius: 22px;
                transition: 0.3s;
            }

            #darkmoder-ui .dm-toggle .dm-slider:before {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                left: 3px;
                bottom: 3px;
                background: #7a7a7a;
                border-radius: 50%;
                transition: 0.3s;
            }

            #darkmoder-ui .dm-toggle input:checked + .dm-slider {
                background: #3391ff;
            }

            #darkmoder-ui .dm-toggle input:checked + .dm-slider:before {
                transform: translateX(18px);
                background: #fff;
            }

            #darkmoder-ui .dm-section {
                margin-bottom: 16px;
            }

            #darkmoder-ui .dm-section-title {
                font-size: 11px;
                font-weight: 600;
                color: #7a7a7a;
                text-transform: uppercase;
                margin-bottom: 8px;
            }

            #darkmoder-ui .dm-mode-btns {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }

            #darkmoder-ui .dm-mode-btn {
                flex: 1;
                min-width: 70px;
                padding: 8px;
                background: #2d2f30;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #e8e6e3;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }

            #darkmoder-ui .dm-mode-btn:hover {
                background: #3a3d3e;
            }

            #darkmoder-ui .dm-mode-btn.active {
                background: #3391ff;
                border-color: #3391ff;
            }

            #darkmoder-ui .dm-slider-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            #darkmoder-ui .dm-slider-label {
                width: 70px;
                font-size: 11px;
            }

            #darkmoder-ui .dm-slider-input {
                flex: 1;
                height: 4px;
                -webkit-appearance: none;
                background: #3a3d3e;
                border-radius: 2px;
                outline: none;
            }

            #darkmoder-ui .dm-slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                background: #3391ff;
                border-radius: 50%;
                cursor: pointer;
            }

            #darkmoder-ui .dm-slider-input::-moz-range-thumb {
                width: 14px;
                height: 14px;
                background: #3391ff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }

            #darkmoder-ui .dm-slider-value {
                width: 35px;
                text-align: right;
                font-size: 11px;
            }

            #darkmoder-ui .dm-color-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            #darkmoder-ui .dm-color-label {
                width: 100px;
                font-size: 11px;
            }

            #darkmoder-ui .dm-color-picker {
                width: 30px;
                height: 24px;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                cursor: pointer;
                padding: 0;
            }

            #darkmoder-ui .dm-color-text {
                flex: 1;
                background: #2d2f30;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                color: #e8e6e3;
                padding: 4px 8px;
                font-size: 11px;
            }

            #darkmoder-ui .dm-select {
                width: 100%;
                background: #2d2f30;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #e8e6e3;
                padding: 8px;
                font-size: 11px;
            }

            #darkmoder-ui .dm-textarea {
                width: 100%;
                min-height: 100px;
                background: #2d2f30;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #e8e6e3;
                padding: 8px;
                font-size: 11px;
                font-family: monospace;
                resize: vertical;
            }

            #darkmoder-ui .dm-input {
                width: 100%;
                background: #2d2f30;
                border: 1px solid #3a3d3e;
                border-radius: 6px;
                color: #e8e6e3;
                padding: 8px;
                font-size: 11px;
            }

            #darkmoder-ui .dm-btn {
                padding: 8px 16px;
                background: #3391ff;
                border: none;
                border-radius: 6px;
                color: #fff;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }

            #darkmoder-ui .dm-btn:hover {
                background: #2778e6;
            }

            #darkmoder-ui .dm-btn-secondary {
                background: #2d2f30;
                border: 1px solid #3a3d3e;
                color: #e8e6e3;
            }

            #darkmoder-ui .dm-btn-secondary:hover {
                background: #3a3d3e;
            }

            #darkmoder-ui .dm-btn-row {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }

            #darkmoder-ui .dm-checkbox-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            #darkmoder-ui .dm-checkbox {
                width: 16px;
                height: 16px;
                accent-color: #3391ff;
            }

            #darkmoder-ui .dm-preset-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background: #2d2f30;
                border-radius: 6px;
                margin-bottom: 8px;
            }

            #darkmoder-ui .dm-preset-name {
                font-size: 12px;
            }

            #darkmoder-ui .dm-preset-btns {
                display: flex;
                gap: 4px;
            }

            #darkmoder-ui .dm-preset-btn {
                padding: 4px 8px;
                font-size: 10px;
                background: #3a3d3e;
                border: none;
                border-radius: 4px;
                color: #e8e6e3;
                cursor: pointer;
            }

            #darkmoder-ui .dm-preset-btn:hover {
                background: #4a4d4e;
            }

            #darkmoder-ui .dm-preset-btn.delete {
                background: #aa3333;
            }

            #darkmoder-ui .dm-preset-btn.delete:hover {
                background: #cc4444;
            }

            #darkmoder-ui .dm-shortcut-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            #darkmoder-ui .dm-shortcut-input {
                width: 150px;
                background: #2d2f30;
                border: 1px solid #3a3d3e;
                border-radius: 4px;
                color: #e8e6e3;
                padding: 6px 8px;
                font-size: 11px;
            }

            #darkmoder-ui .dm-info {
                font-size: 10px;
                color: #7a7a7a;
                margin-top: 4px;
            }
        `,

        /**
         * SVG logo for the header
         */
        logo: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#3391ff"/>
            <path d="M12 6C8.69 6 6 8.69 6 12s2.69 6 6 6c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.21 0 4-1.79 4-4 0-3.31-3.58-6-8-6z" fill="#1e2021"/>
        </svg>`,


        /**
         * Create the UI container and inject into page
         */
        create() {
            if (this.container) {
                return;
            }

            this.container = document.createElement('div');
            this.container.id = 'darkmoder-ui';
            this.container.innerHTML = this.getHTML();

            // Add styles
            const styleEl = document.createElement('style');
            styleEl.textContent = this.styles;
            this.container.appendChild(styleEl);

            document.body.appendChild(this.container);
            this.bindEvents();
            this.updateUI();
        },

        /**
         * Get the effective theme for the current site
         * @returns {Object} Theme settings
         */
        getSiteTheme() {
            const hostname = window.location.hostname;
            const settings = DarkModer.settings;

            if (settings.siteSettings && settings.siteSettings[hostname]) {
                return { ...settings.theme, ...settings.siteSettings[hostname] };
            }
            return settings.theme;
        },

        /**
         * Generate HTML for the settings panel
         * @returns {string} HTML string
         */
        getHTML() {
            const hostname = window.location.hostname;
            const settings = DarkModer.settings;
            const theme = this.getSiteTheme();

            // Generate color scheme options
            const schemeOptions = Object.keys(COLOR_SCHEMES).map(name =>
                `<option value="${name}" ${theme.colorScheme === name ? 'selected' : ''}>${name}</option>`
            ).join('');

            // Generate presets list
            const presetsList = (settings.presets || []).map((preset, i) =>
                `<div class="dm-preset-item">
                    <span class="dm-preset-name">${escapeHtml(preset.name)}</span>
                    <div class="dm-preset-btns">
                        <button class="dm-preset-btn" data-preset-apply="${i}">Apply</button>
                        <button class="dm-preset-btn delete" data-preset-delete="${i}">Delete</button>
                    </div>
                </div>`
            ).join('') || '<p class="dm-info">No presets saved yet</p>';

            // Site fix text
            const siteFixText = settings.siteFixesUser && settings.siteFixesUser[hostname]
                ? escapeHtml(settings.siteFixesUser[hostname])
                : '';

            // Location info
            const locationInfo = settings.location.latitude
                ? `Lat: ${settings.location.latitude.toFixed(2)}, Lng: ${settings.location.longitude.toFixed(2)}`
                : 'No location set';

            return `
                <div class="dm-popup">
                    <!-- Header -->
                    <div class="dm-header">
                        <div class="dm-header-title">
                            <div class="dm-logo">${this.logo}</div>
                            <span>DarkModer</span>
                        </div>
                        <button class="dm-close" id="dm-close">&times;</button>
                    </div>

                    <!-- Tabs -->
                    <div class="dm-tabs">
                        <button class="dm-tab active" data-tab="theme">Theme</button>
                        <button class="dm-tab" data-tab="colors">Colors</button>
                        <button class="dm-tab" data-tab="sites">Sites</button>
                        <button class="dm-tab" data-tab="more">More</button>
                    </div>

                    <!-- Body -->
                    <div class="dm-body">

                        <!-- Theme Panel -->
                        <div class="dm-panel active" data-panel="theme">
                            <!-- Global toggle -->
                            <div class="dm-main-toggle">
                                <span>DarkModer enabled</span>
                                <label class="dm-toggle">
                                    <input type="checkbox" id="dm-enabled" ${settings.enabled ? 'checked' : ''}>
                                    <span class="dm-slider"></span>
                                </label>
                            </div>

                            <!-- Site toggle -->
                            <div class="dm-main-toggle">
                                <span>Enabled for ${escapeHtml(hostname)}</span>
                                <label class="dm-toggle">
                                    <input type="checkbox" id="dm-site-enabled" ${!isURLMatched(hostname, settings.disabledFor) ? 'checked' : ''}>
                                    <span class="dm-slider"></span>
                                </label>
                            </div>

                            <!-- Mode selection -->
                            <div class="dm-section">
                                <div class="dm-section-title">Mode</div>
                                <div class="dm-mode-btns">
                                    <button class="dm-mode-btn ${theme.engine === 'filter' ? 'active' : ''}" data-engine="filter">Filter</button>
                                    <button class="dm-mode-btn ${theme.engine === 'filterPlus' ? 'active' : ''}" data-engine="filterPlus">Filter+</button>
                                    <button class="dm-mode-btn ${theme.engine === 'dynamic' ? 'active' : ''}" data-engine="dynamic">Dynamic</button>
                                    <button class="dm-mode-btn ${theme.engine === 'static' ? 'active' : ''}" data-engine="static">Static</button>
                                </div>
                            </div>

                            <!-- Adjustments -->
                            <div class="dm-section">
                                <div class="dm-section-title">Adjustments</div>
                                <div class="dm-slider-row">
                                    <span class="dm-slider-label">Brightness</span>
                                    <input type="range" class="dm-slider-input" id="dm-brightness" min="50" max="150" value="${theme.brightness}">
                                    <span class="dm-slider-value" id="dm-brightness-val">${theme.brightness}</span>
                                </div>
                                <div class="dm-slider-row">
                                    <span class="dm-slider-label">Contrast</span>
                                    <input type="range" class="dm-slider-input" id="dm-contrast" min="50" max="150" value="${theme.contrast}">
                                    <span class="dm-slider-value" id="dm-contrast-val">${theme.contrast}</span>
                                </div>
                                <div class="dm-slider-row">
                                    <span class="dm-slider-label">Sepia</span>
                                    <input type="range" class="dm-slider-input" id="dm-sepia" min="0" max="100" value="${theme.sepia}">
                                    <span class="dm-slider-value" id="dm-sepia-val">${theme.sepia}</span>
                                </div>
                                <div class="dm-slider-row">
                                    <span class="dm-slider-label">Grayscale</span>
                                    <input type="range" class="dm-slider-input" id="dm-grayscale" min="0" max="100" value="${theme.grayscale}">
                                    <span class="dm-slider-value" id="dm-grayscale-val">${theme.grayscale}</span>
                                </div>
                            </div>

                            <!-- Color scheme -->
                            <div class="dm-section">
                                <div class="dm-section-title">Color Scheme</div>
                                <select class="dm-select" id="dm-color-scheme">${schemeOptions}</select>
                            </div>
                        </div>

                        <!-- Colors Panel -->
                        <div class="dm-panel" data-panel="colors">
                            <div class="dm-section">
                                <div class="dm-section-title">Background Color</div>
                                <div class="dm-color-row">
                                    <input type="color" class="dm-color-picker" id="dm-bg-color" value="${theme.darkSchemeBackgroundColor}">
                                    <input type="text" class="dm-color-text" id="dm-bg-color-text" value="${theme.darkSchemeBackgroundColor}">
                                </div>
                            </div>

                            <div class="dm-section">
                                <div class="dm-section-title">Text Color</div>
                                <div class="dm-color-row">
                                    <input type="color" class="dm-color-picker" id="dm-text-color" value="${theme.darkSchemeTextColor}">
                                    <input type="text" class="dm-color-text" id="dm-text-color-text" value="${theme.darkSchemeTextColor}">
                                </div>
                            </div>

                            <div class="dm-section">
                                <div class="dm-section-title">Selection Background</div>
                                <div class="dm-color-row">
                                    <input type="color" class="dm-color-picker" id="dm-selection-bg" value="${theme.selectionBgColor || '#004daa'}">
                                    <input type="text" class="dm-color-text" id="dm-selection-bg-text" value="${theme.selectionBgColor || '#004daa'}">
                                </div>
                            </div>

                            <div class="dm-section">
                                <div class="dm-section-title">Selection Text</div>
                                <div class="dm-color-row">
                                    <input type="color" class="dm-color-picker" id="dm-selection-text" value="${theme.selectionTextColor || '#ffffff'}">
                                    <input type="text" class="dm-color-text" id="dm-selection-text-text" value="${theme.selectionTextColor || '#ffffff'}">
                                </div>
                            </div>

                            <div class="dm-section">
                                <div class="dm-section-title">Font</div>
                                <div class="dm-checkbox-row">
                                    <input type="checkbox" class="dm-checkbox" id="dm-use-font" ${theme.useFont ? 'checked' : ''}>
                                    <label>Use custom font</label>
                                </div>
                                <input type="text" class="dm-input" id="dm-font-family" placeholder="Font name (e.g., Arial, Roboto)" value="${theme.fontFamily || ''}">
                            </div>

                            <div class="dm-section">
                                <div class="dm-section-title">Text Stroke</div>
                                <div class="dm-slider-row">
                                    <input type="range" class="dm-slider-input" id="dm-text-stroke" min="0" max="10" value="${theme.textStroke || 0}">
                                    <span class="dm-slider-value" id="dm-text-stroke-val">${theme.textStroke || 0}</span>
                                </div>
                            </div>

                            <div class="dm-checkbox-row">
                                <input type="checkbox" class="dm-checkbox" id="dm-site-only">
                                <label>Apply only to this site</label>
                            </div>
                        </div>

                        <!-- Sites Panel -->
                        <div class="dm-panel" data-panel="sites">
                            <div class="dm-section">
                                <div class="dm-section-title">Disabled Sites</div>
                                <textarea class="dm-textarea" id="dm-disabled-sites" placeholder="One site per line (e.g., google.com)">${(settings.disabledFor || []).join('\n')}</textarea>
                            </div>

                            <div class="dm-section">
                                <div class="dm-checkbox-row">
                                    <input type="checkbox" class="dm-checkbox" id="dm-detect-dark" ${settings.detectDarkTheme ? 'checked' : ''}>
                                    <label>Detect dark theme</label>
                                </div>
                                <p class="dm-info">Automatically skip sites that already have a dark theme</p>
                            </div>

                            <div class="dm-section">
                                <div class="dm-section-title">Site CSS Fixes (${escapeHtml(hostname)})</div>
                                <textarea class="dm-textarea" id="dm-site-fixes" placeholder="INVERT&#10;.icon&#10;&#10;CSS&#10;.element { color: white !important; }">${siteFixText}</textarea>
                                <p class="dm-info">Supports: INVERT, CSS, IGNORE INLINE STYLE, NO INVERT, REMOVE BG</p>
                            </div>
                        </div>

                        <!-- More Panel -->
                        <div class="dm-panel" data-panel="more">
                            <!-- Automation -->
                            <div class="dm-section">
                                <div class="dm-section-title">Automation</div>
                                <select class="dm-select" id="dm-automation">
                                    <option value="" ${!settings.automation.mode ? 'selected' : ''}>Disabled</option>
                                    <option value="time" ${settings.automation.mode === 'time' ? 'selected' : ''}>Time-based</option>
                                    <option value="system" ${settings.automation.mode === 'system' ? 'selected' : ''}>System theme</option>
                                    <option value="location" ${settings.automation.mode === 'location' ? 'selected' : ''}>Sunrise/Sunset</option>
                                </select>

                                <div id="dm-time-settings" style="display: ${settings.automation.mode === 'time' ? 'block' : 'none'}; margin-top: 10px;">
                                    <div class="dm-slider-row">
                                        <span class="dm-slider-label">Activate</span>
                                        <input type="time" class="dm-input" id="dm-time-on" value="${settings.time.activation}" style="flex:1">
                                    </div>
                                    <div class="dm-slider-row">
                                        <span class="dm-slider-label">Deactivate</span>
                                        <input type="time" class="dm-input" id="dm-time-off" value="${settings.time.deactivation}" style="flex:1">
                                    </div>
                                </div>

                                <div id="dm-location-settings" style="display: ${settings.automation.mode === 'location' ? 'block' : 'none'}; margin-top: 10px;">
                                    <button class="dm-btn dm-btn-secondary" id="dm-get-location">Get Location</button>
                                    <p class="dm-info" id="dm-location-info">${locationInfo}</p>
                                </div>
                            </div>

                            <!-- Keyboard Shortcuts -->
                            <div class="dm-section">
                                <div class="dm-section-title">Keyboard Shortcuts</div>
                                <div class="dm-shortcut-row">
                                    <span>Toggle extension</span>
                                    <input type="text" class="dm-shortcut-input" id="dm-shortcut-toggle" value="${settings.shortcuts?.toggle || 'Alt+Shift+D'}">
                                </div>
                                <div class="dm-shortcut-row">
                                    <span>Toggle site</span>
                                    <input type="text" class="dm-shortcut-input" id="dm-shortcut-site" value="${settings.shortcuts?.toggleSite || 'Alt+Shift+S'}">
                                </div>
                                <div class="dm-shortcut-row">
                                    <span>Open settings</span>
                                    <input type="text" class="dm-shortcut-input" id="dm-shortcut-settings" value="${settings.shortcuts?.openSettings || 'Alt+Shift+A'}">
                                </div>
                            </div>

                            <!-- Theme Presets -->
                            <div class="dm-section">
                                <div class="dm-section-title">Theme Presets</div>
                                <div id="dm-presets-list">${presetsList}</div>
                                <div class="dm-btn-row">
                                    <input type="text" class="dm-input" id="dm-preset-name" placeholder="Preset name" style="flex:1">
                                    <button class="dm-btn" id="dm-save-preset">Save</button>
                                </div>
                            </div>

                            <!-- Import/Export -->
                            <div class="dm-section">
                                <div class="dm-section-title">Import/Export</div>
                                <div class="dm-btn-row">
                                    <button class="dm-btn dm-btn-secondary" id="dm-export">Export Settings</button>
                                    <button class="dm-btn dm-btn-secondary" id="dm-import">Import Settings</button>
                                </div>
                                <button class="dm-btn dm-btn-secondary" id="dm-export-css" style="margin-top:8px;width:100%">Export Generated CSS</button>
                            </div>

                            <!-- Reset -->
                            <div class="dm-btn-row">
                                <button class="dm-btn dm-btn-secondary" id="dm-reset" style="flex:1">Reset All Settings</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },


        /**
         * Bind event handlers for UI elements
         */
        bindEvents() {
            const $ = sel => this.container.querySelector(sel);
            const $$ = sel => this.container.querySelectorAll(sel);

            // Close button
            $('#dm-close').addEventListener('click', () => this.close());

            // Global enable toggle
            $('#dm-enabled').addEventListener('change', (e) => {
                DarkModer.settings.enabled = e.target.checked;
                DarkModer.saveSettings();
                if (e.target.checked) {
                    DarkModer.apply();
                } else {
                    DarkModer.remove();
                }
            });

            // Site enable toggle
            $('#dm-site-enabled').addEventListener('change', (e) => {
                const hostname = window.location.hostname;
                if (e.target.checked) {
                    DarkModer.settings.disabledFor = DarkModer.settings.disabledFor.filter(s => s !== hostname);
                } else {
                    if (!DarkModer.settings.disabledFor.includes(hostname)) {
                        DarkModer.settings.disabledFor.push(hostname);
                    }
                }
                DarkModer.saveSettings();
                if (DarkModer.settings.enabled && e.target.checked) {
                    DarkModer.apply();
                } else {
                    DarkModer.remove();
                }
            });

            // Tab switching
            $$('.dm-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    $$('.dm-tab').forEach(t => t.classList.remove('active'));
                    $$('.dm-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    $(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
                    this.currentTab = tab.dataset.tab;
                });
            });

            // Engine mode buttons
            $$('.dm-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    $$('.dm-mode-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.updateTheme({ engine: btn.dataset.engine });
                });
            });

            // Adjustment sliders
            ['brightness', 'contrast', 'sepia', 'grayscale'].forEach(name => {
                const slider = $(`#dm-${name}`);
                slider.addEventListener('input', () => {
                    $(`#dm-${name}-val`).textContent = slider.value;
                    this.updateTheme({ [name]: parseInt(slider.value) });
                });
            });

            // Text stroke slider
            $('#dm-text-stroke').addEventListener('input', (e) => {
                $('#dm-text-stroke-val').textContent = e.target.value;
                this.updateTheme({ textStroke: parseInt(e.target.value) });
            });

            // Color scheme selector
            $('#dm-color-scheme').addEventListener('change', (e) => {
                const scheme = COLOR_SCHEMES[e.target.value];
                if (scheme) {
                    this.updateTheme({
                        colorScheme: e.target.value,
                        darkSchemeBackgroundColor: scheme.background,
                        darkSchemeTextColor: scheme.text,
                        selectionBgColor: scheme.selectionBg,
                        selectionTextColor: scheme.selectionText,
                        linkColor: scheme.link,
                        borderColor: scheme.border
                    });
                    this.updateUI();
                }
            });

            // Color pickers
            const colorInputs = [
                { picker: '#dm-bg-color', text: '#dm-bg-color-text', key: 'darkSchemeBackgroundColor' },
                { picker: '#dm-text-color', text: '#dm-text-color-text', key: 'darkSchemeTextColor' },
                { picker: '#dm-selection-bg', text: '#dm-selection-bg-text', key: 'selectionBgColor' },
                { picker: '#dm-selection-text', text: '#dm-selection-text-text', key: 'selectionTextColor' }
            ];

            colorInputs.forEach(({ picker, text, key }) => {
                $(picker).addEventListener('input', (e) => {
                    $(text).value = e.target.value;
                    this.updateTheme({ [key]: e.target.value });
                });
                $(text).addEventListener('change', (e) => {
                    $(picker).value = e.target.value;
                    this.updateTheme({ [key]: e.target.value });
                });
            });

            // Font settings
            $('#dm-use-font').addEventListener('change', (e) => {
                this.updateTheme({ useFont: e.target.checked });
            });

            $('#dm-font-family').addEventListener('change', (e) => {
                this.updateTheme({ fontFamily: e.target.value });
            });

            // Site-only checkbox
            $('#dm-site-only').addEventListener('change', (e) => {
                if (e.target.checked) {
                    const hostname = window.location.hostname;
                    const theme = this.getSiteTheme();
                    if (!DarkModer.settings.siteSettings) {
                        DarkModer.settings.siteSettings = {};
                    }
                    DarkModer.settings.siteSettings[hostname] = { ...theme };
                    DarkModer.saveSettings();
                }
            });

            // Disabled sites textarea
            $('#dm-disabled-sites').addEventListener('change', (e) => {
                DarkModer.settings.disabledFor = e.target.value
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean);
                DarkModer.saveSettings();
            });

            // Detect dark theme checkbox
            $('#dm-detect-dark').addEventListener('change', (e) => {
                DarkModer.settings.detectDarkTheme = e.target.checked;
                DarkModer.saveSettings();
            });

            // Site fixes textarea
            $('#dm-site-fixes').addEventListener('change', (e) => {
                const hostname = window.location.hostname;
                if (!DarkModer.settings.siteFixesUser) {
                    DarkModer.settings.siteFixesUser = {};
                }
                DarkModer.settings.siteFixesUser[hostname] = e.target.value;
                DarkModer.saveSettings();
                DarkModer.apply();
            });

            // Automation selector
            $('#dm-automation').addEventListener('change', (e) => {
                DarkModer.settings.automation.mode = e.target.value;
                DarkModer.settings.automation.enabled = !!e.target.value;
                DarkModer.saveSettings();

                $('#dm-time-settings').style.display = e.target.value === 'time' ? 'block' : 'none';
                $('#dm-location-settings').style.display = e.target.value === 'location' ? 'block' : 'none';

                DarkModer.checkAutomation();
            });

            // Time settings
            $('#dm-time-on').addEventListener('change', (e) => {
                DarkModer.settings.time.activation = e.target.value;
                DarkModer.saveSettings();
                DarkModer.checkAutomation();
            });

            $('#dm-time-off').addEventListener('change', (e) => {
                DarkModer.settings.time.deactivation = e.target.value;
                DarkModer.saveSettings();
                DarkModer.checkAutomation();
            });

            // Get location button
            $('#dm-get-location').addEventListener('click', () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            DarkModer.settings.location.latitude = pos.coords.latitude;
                            DarkModer.settings.location.longitude = pos.coords.longitude;
                            DarkModer.saveSettings();
                            $('#dm-location-info').textContent =
                                `Lat: ${pos.coords.latitude.toFixed(2)}, Lng: ${pos.coords.longitude.toFixed(2)}`;
                            DarkModer.checkAutomation();
                        },
                        (err) => {
                            $('#dm-location-info').textContent = 'Failed to get location: ' + err.message;
                        }
                    );
                } else {
                    $('#dm-location-info').textContent = 'Geolocation not supported';
                }
            });

            // Keyboard shortcut inputs
            $('#dm-shortcut-toggle').addEventListener('change', (e) => {
                if (!DarkModer.settings.shortcuts) {
                    DarkModer.settings.shortcuts = {};
                }
                DarkModer.settings.shortcuts.toggle = e.target.value;
                DarkModer.saveSettings();
            });

            $('#dm-shortcut-site').addEventListener('change', (e) => {
                if (!DarkModer.settings.shortcuts) {
                    DarkModer.settings.shortcuts = {};
                }
                DarkModer.settings.shortcuts.toggleSite = e.target.value;
                DarkModer.saveSettings();
            });

            $('#dm-shortcut-settings').addEventListener('change', (e) => {
                if (!DarkModer.settings.shortcuts) {
                    DarkModer.settings.shortcuts = {};
                }
                DarkModer.settings.shortcuts.openSettings = e.target.value;
                DarkModer.saveSettings();
            });

            // Save preset button
            $('#dm-save-preset').addEventListener('click', () => {
                const name = $('#dm-preset-name').value.trim();
                if (!name) {
                    alert('Please enter a preset name');
                    return;
                }
                if (!DarkModer.settings.presets) {
                    DarkModer.settings.presets = [];
                }
                DarkModer.settings.presets.push({
                    name: name,
                    theme: { ...DarkModer.settings.theme },
                    created: Date.now()
                });
                DarkModer.saveSettings();
                this.updateUI();
                $('#dm-preset-name').value = '';
            });

            // Preset apply/delete buttons (delegated)
            this.container.addEventListener('click', (e) => {
                // Apply preset
                if (e.target.dataset.presetApply !== undefined) {
                    const idx = parseInt(e.target.dataset.presetApply);
                    const preset = DarkModer.settings.presets[idx];
                    if (preset) {
                        DarkModer.settings.theme = { ...preset.theme };
                        DarkModer.saveSettings();
                        DarkModer.apply();
                        this.updateUI();
                    }
                }
                // Delete preset
                if (e.target.dataset.presetDelete !== undefined) {
                    const idx = parseInt(e.target.dataset.presetDelete);
                    if (confirm('Delete this preset?')) {
                        DarkModer.settings.presets.splice(idx, 1);
                        DarkModer.saveSettings();
                        this.updateUI();
                    }
                }
            });

            // Export settings
            $('#dm-export').addEventListener('click', () => {
                const data = JSON.stringify(DarkModer.settings, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'darkmoder-settings.json';
                a.click();
                URL.revokeObjectURL(url);
            });

            // Import settings
            $('#dm-import').addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            try {
                                const imported = JSON.parse(ev.target.result);
                                DarkModer.settings = { ...DEFAULT_SETTINGS, ...imported };
                                DarkModer.settings.theme = { ...DEFAULT_THEME, ...imported.theme };
                                DarkModer.saveSettings();
                                DarkModer.apply();
                                this.updateUI();
                                alert('Settings imported successfully!');
                            } catch (err) {
                                alert('Invalid settings file: ' + err.message);
                            }
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            });

            // Export generated CSS
            $('#dm-export-css').addEventListener('click', () => {
                const css = DynamicEngine.exportCSS();
                if (!css || css.trim().length < 100) {
                    alert('No CSS generated. Make sure Dynamic mode is active.');
                    return;
                }
                const blob = new Blob([css], { type: 'text/css' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `darkmoder-${window.location.hostname}.css`;
                a.click();
                URL.revokeObjectURL(url);
            });

            // Reset all settings
            $('#dm-reset').addEventListener('click', () => {
                if (confirm('Reset all settings to default? This cannot be undone.')) {
                    DarkModer.settings = { ...DEFAULT_SETTINGS };
                    DarkModer.settings.theme = { ...DEFAULT_THEME };
                    DarkModer.saveSettings();
                    DarkModer.apply();
                    this.updateUI();
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });

            // Close when clicking outside
            this.container.addEventListener('click', (e) => {
                if (e.target === this.container) {
                    this.close();
                }
            });
        },


        /**
         * Update theme from UI state
         */
        updateTheme() {
            const $ = (sel) => this.panel.querySelector(sel);

            // Get current values from sliders
            const brightness = parseInt($('#dm-brightness').value, 10);
            const contrast = parseInt($('#dm-contrast').value, 10);
            const sepia = parseInt($('#dm-sepia').value, 10);
            const grayscale = parseInt($('#dm-grayscale').value, 10);
            const textStroke = parseInt($('#dm-text-stroke').value, 10);

            // Get colors
            const bgColor = $('#dm-bg-color').value;
            const textColor = $('#dm-text-color').value;
            const selectionBg = $('#dm-selection-bg').value;
            const selectionText = $('#dm-selection-text').value;

            // Get mode
            let mode = 1; // Dynamic default
            if ($('#dm-mode-filter').classList.contains('active')) {
                mode = 0;
            } else if ($('#dm-mode-filter-plus').classList.contains('active')) {
                mode = 2;
            } else if ($('#dm-mode-static').classList.contains('active')) {
                mode = 3;
            }

            // Get font settings
            const useFont = $('#dm-use-font').checked;
            const fontFamily = $('#dm-font-family').value.trim();

            // Update theme object
            DarkModer.settings.theme = {
                ...DarkModer.settings.theme,
                mode,
                brightness,
                contrast,
                sepia,
                grayscale,
                textStroke,
                backgroundColor: bgColor,
                textColor,
                selectionColor: selectionBg,
                selectionTextColor: selectionText,
                useFont,
                fontFamily: fontFamily || DEFAULT_THEME.fontFamily
            };

            // Save and apply
            DarkModer.saveSettings();
            DarkModer.apply();
        },

        /**
         * Update UI controls from current settings
         */
        updateUI() {
            if (!this.panel) {
                return;
            }

            const $ = (sel) => this.panel.querySelector(sel);
            const settings = DarkModer.settings;
            const theme = settings.theme;

            // Update enabled state
            const toggleBtn = $('#dm-toggle');
            if (toggleBtn) {
                toggleBtn.classList.toggle('active', settings.enabled);
                toggleBtn.textContent = settings.enabled ? 'ON' : 'OFF';
            }

            // Update site toggle
            const siteToggle = $('#dm-site-toggle');
            if (siteToggle) {
                const hostname = getURLHostname(location.href);
                const disabledSites = settings.disabledSites || [];
                const disabledFor = settings.disabledFor || [];
                const isDisabled = disabledSites.includes(hostname) || disabledFor.includes(hostname);
                siteToggle.classList.toggle('active', !isDisabled);
                siteToggle.textContent = isDisabled ? 'DISABLED' : 'ENABLED';
            }

            // Update sliders
            const sliderIds = [
                'dm-brightness',
                'dm-contrast',
                'dm-sepia',
                'dm-grayscale',
                'dm-text-stroke'
            ];

            const sliderProps = [
                'brightness',
                'contrast',
                'sepia',
                'grayscale',
                'textStroke'
            ];

            for (let i = 0; i < sliderIds.length; i++) {
                const slider = $('#' + sliderIds[i]);
                if (slider) {
                    slider.value = theme[sliderProps[i]];
                    const valueSpan = slider.parentElement.querySelector('.dm-slider-value');
                    if (valueSpan) {
                        valueSpan.textContent = theme[sliderProps[i]];
                    }
                }
            }

            // Update color pickers
            const bgColorInput = $('#dm-bg-color');
            if (bgColorInput) {
                bgColorInput.value = theme.backgroundColor;
            }

            const textColorInput = $('#dm-text-color');
            if (textColorInput) {
                textColorInput.value = theme.textColor;
            }

            const selBgInput = $('#dm-selection-bg');
            if (selBgInput) {
                selBgInput.value = theme.selectionColor;
            }

            const selTextInput = $('#dm-selection-text');
            if (selTextInput) {
                selTextInput.value = theme.selectionTextColor;
            }

            // Update mode buttons
            const modeButtons = [
                { id: 'dm-mode-filter', mode: 0 },
                { id: 'dm-mode-dynamic', mode: 1 },
                { id: 'dm-mode-filter-plus', mode: 2 },
                { id: 'dm-mode-static', mode: 3 }
            ];

            for (const btn of modeButtons) {
                const el = $('#' + btn.id);
                if (el) {
                    el.classList.toggle('active', theme.mode === btn.mode);
                }
            }

            // Update font settings
            const useFontCheck = $('#dm-use-font');
            if (useFontCheck) {
                useFontCheck.checked = theme.useFont;
            }

            const fontFamilyInput = $('#dm-font-family');
            if (fontFamilyInput) {
                fontFamilyInput.value = theme.fontFamily;
            }

            // Update automation settings
            const autoMode = $('#dm-auto-mode');
            if (autoMode) {
                autoMode.value = settings.automation.mode || 'disabled';
            }

            const autoStart = $('#dm-auto-start');
            if (autoStart) {
                autoStart.value = settings.automation.startTime || settings.time?.activation || '18:00';
            }

            const autoEnd = $('#dm-auto-end');
            if (autoEnd) {
                autoEnd.value = settings.automation.endTime || settings.time?.deactivation || '09:00';
            }

            // Also update time inputs if they exist (alternative IDs)
            const timeOn = $('#dm-time-on');
            if (timeOn) {
                timeOn.value = settings.time?.activation || settings.automation.startTime || '18:00';
            }

            const timeOff = $('#dm-time-off');
            if (timeOff) {
                timeOff.value = settings.time?.deactivation || settings.automation.endTime || '09:00';
            }

            // Update keyboard shortcuts
            const shortcutToggle = $('#dm-shortcut-toggle');
            if (shortcutToggle) {
                shortcutToggle.value = settings.shortcuts.toggle;
            }

            const shortcutSite = $('#dm-shortcut-site');
            if (shortcutSite) {
                shortcutSite.value = settings.shortcuts.toggleSite;
            }

            const shortcutSettings = $('#dm-shortcut-settings');
            if (shortcutSettings) {
                shortcutSettings.value = settings.shortcuts.openSettings;
            }

            // Update color scheme selector
            const schemeSelect = $('#dm-color-scheme');
            if (schemeSelect) {
                schemeSelect.value = settings.colorScheme || 'Default';
            }

            // Update theme presets list
            this.updatePresetsList();

            // Update disabled sites list
            this.updateDisabledSitesList();
        },

        /**
         * Update the presets dropdown
         */
        updatePresetsList() {
            const select = this.panel?.querySelector('#dm-preset-list');
            if (!select) {
                return;
            }

            // Clear existing options except placeholder
            select.innerHTML = '<option value="">-- Select Preset --</option>';

            // Add saved presets
            const presets = DarkModer.settings.themePresets || {};
            for (const name of Object.keys(presets)) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
            }
        },

        /**
         * Update the disabled sites list
         */
        updateDisabledSitesList() {
            const container = this.panel?.querySelector('#dm-disabled-sites-list');
            if (!container) {
                return;
            }

            container.innerHTML = '';

            // Combine both arrays for display
            const disabledSites = DarkModer.settings.disabledSites || [];
            const disabledFor = DarkModer.settings.disabledFor || [];
            const sites = [...new Set([...disabledSites, ...disabledFor])];

            if (sites.length === 0) {
                container.innerHTML = '<div style="color:#888;font-style:italic;padding:8px;">No disabled sites</div>';
                return;
            }

            for (const site of sites) {
                const item = document.createElement('div');
                item.className = 'dm-site-item';
                item.innerHTML = `
                    <span class="dm-site-name">${escapeHtml(site)}</span>
                    <button class="dm-site-remove" data-site="${escapeHtml(site)}">Remove</button>
                `;
                container.appendChild(item);

                // Add remove handler
                item.querySelector('.dm-site-remove').addEventListener('click', () => {
                    // Remove from both arrays
                    let idx = DarkModer.settings.disabledSites.indexOf(site);
                    if (idx !== -1) {
                        DarkModer.settings.disabledSites.splice(idx, 1);
                    }
                    idx = DarkModer.settings.disabledFor.indexOf(site);
                    if (idx !== -1) {
                        DarkModer.settings.disabledFor.splice(idx, 1);
                    }
                    DarkModer.saveSettings();
                    DarkModer.apply();
                    this.updateDisabledSitesList();
                    this.updateUI();
                });
            }
        },

        /**
         * Open the settings panel
         */
        open() {
            if (!this.container) {
                this.create();
            }

            this.updateUI();
            this.container.classList.add('visible');
            this.isOpen = true;

            // Focus first input
            requestAnimationFrame(() => {
                const firstSlider = this.panel?.querySelector('input[type="range"]');
                if (firstSlider) {
                    firstSlider.focus();
                }
            });
        },

        /**
         * Close the settings panel
         */
        close() {
            if (this.container) {
                this.container.classList.remove('visible');
            }
            this.isOpen = false;
        },

        /**
         * Toggle the settings panel
         */
        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        /**
         * Destroy the UI
         */
        destroy() {
            if (this.container) {
                this.container.remove();
                this.container = null;
                this.panel = null;
            }
            this.isOpen = false;
        }
    };


    // ==========================================================================
    // DARKMODER MAIN CONTROLLER
    // ==========================================================================

    /**
     * Main DarkModer controller
     * Manages state, settings, and coordinates all subsystems
     */
    const DarkModer = {
        /** Current settings */
        settings: null,

        /** Is theme currently applied */
        isApplied: false,

        /** Site has native dark theme detected */
        siteHasDarkTheme: false,

        /** Current active engine */
        activeEngine: null,

        /** Provisional background style element */
        provisionalStyle: null,

        /** Automation interval ID */
        automationInterval: null,

        /** Remote config cache */
        remoteConfig: null,

        /** Site-specific settings cache */
        currentSiteTheme: null,

        /**
         * Initialize DarkModer
         */
        async init() {
            // Load saved settings
            await this.loadSettings();

            // Apply provisional dark background immediately to prevent white flash
            if (this.settings.enabled && this.shouldApply()) {
                this.applyProvisional();
            }

            // Wait for DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.onDOMReady();
                });
            } else {
                this.onDOMReady();
            }
        },

        /**
         * Called when DOM is ready
         */
        async onDOMReady() {
            // Setup dark theme monitoring
            this.setupThemeMonitoring();

            // Load remote configs
            await this.loadRemoteConfigs();

            // Apply theme if enabled
            if (this.settings.enabled) {
                this.apply();
            }

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Setup automation
            this.setupAutomationInterval();

            // Register menu command
            this.registerMenuCommand();
        },

        /**
         * Load settings from storage
         */
        async loadSettings() {
            const saved = await Storage.get('darkmoder_settings');

            if (saved) {
                // Merge with defaults to ensure all keys exist
                this.settings = deepMerge({ ...DEFAULT_SETTINGS }, saved);
                this.settings.theme = deepMerge({ ...DEFAULT_THEME }, saved.theme || {});
            } else {
                // Use defaults
                this.settings = { ...DEFAULT_SETTINGS };
                this.settings.theme = { ...DEFAULT_THEME };
            }

            // Ensure arrays are always arrays (fix for older saved settings)
            if (!Array.isArray(this.settings.disabledSites)) {
                this.settings.disabledSites = [];
            }
            if (!Array.isArray(this.settings.disabledFor)) {
                this.settings.disabledFor = [];
            }

            // Ensure objects are always objects
            if (!this.settings.themePresets || typeof this.settings.themePresets !== 'object') {
                this.settings.themePresets = {};
            }
            if (!this.settings.siteSettings || typeof this.settings.siteSettings !== 'object') {
                this.settings.siteSettings = {};
            }
            if (!this.settings.automation || typeof this.settings.automation !== 'object') {
                this.settings.automation = { ...DEFAULT_SETTINGS.automation };
            }
            if (!this.settings.shortcuts || typeof this.settings.shortcuts !== 'object') {
                this.settings.shortcuts = { ...DEFAULT_SETTINGS.shortcuts };
            }

            // Load site-specific theme if exists
            const hostname = getURLHostname(location.href);
            if (this.settings.siteSettings && this.settings.siteSettings[hostname]) {
                this.currentSiteTheme = this.settings.siteSettings[hostname];
            }
        },

        /**
         * Save settings to storage
         */
        async saveSettings() {
            await Storage.set('darkmoder_settings', this.settings);
        },

        /**
         * Setup keyboard shortcut listener
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Don't trigger in input fields
                const target = e.target;
                const tagName = target.tagName.toLowerCase();
                if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
                    return;
                }

                const shortcuts = this.settings.shortcuts;

                // Check toggle shortcut
                if (shortcuts.toggle && matchShortcut(e, parseShortcut(shortcuts.toggle))) {
                    e.preventDefault();
                    this.toggle();
                    return;
                }

                // Check toggle site shortcut
                if (shortcuts.toggleSite && matchShortcut(e, parseShortcut(shortcuts.toggleSite))) {
                    e.preventDefault();
                    this.toggleSite();
                    return;
                }

                // Check open settings shortcut
                if (shortcuts.openSettings && matchShortcut(e, parseShortcut(shortcuts.openSettings))) {
                    e.preventDefault();
                    UI.toggle();
                    return;
                }
            });
        },

        /**
         * Setup automation check interval
         */
        setupAutomationInterval() {
            // Clear existing interval
            if (this.automationInterval) {
                clearInterval(this.automationInterval);
                this.automationInterval = null;
            }

            // Only setup if automation is enabled
            const mode = this.settings.automation?.mode || 'disabled';
            if (mode === 'disabled' || mode === '') {
                return;
            }

            // Check every minute
            this.automationInterval = setInterval(() => {
                this.checkAutomation();
            }, 60000);

            // Also check immediately
            this.checkAutomation();
        },

        /**
         * Check automation rules and apply/remove theme accordingly
         */
        checkAutomation() {
            const mode = this.settings.automation?.mode || 'disabled';

            if (mode === 'disabled' || mode === '') {
                return;
            }

            let shouldEnable = false;

            if (mode === 'system') {
                // Follow system dark mode preference
                shouldEnable = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else if (mode === 'time') {
                // Time-based automation
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                // Get times from either automation or time settings
                const startTime = this.settings.automation?.startTime || this.settings.time?.activation || '18:00';
                const endTime = this.settings.automation?.endTime || this.settings.time?.deactivation || '09:00';

                const startParts = startTime.split(':');
                const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);

                const endParts = endTime.split(':');
                const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

                if (startMinutes < endMinutes) {
                    // Normal range (e.g., 9:00 to 17:00)
                    shouldEnable = currentMinutes >= startMinutes && currentMinutes < endMinutes;
                } else {
                    // Overnight range (e.g., 20:00 to 06:00)
                    shouldEnable = currentMinutes >= startMinutes || currentMinutes < endMinutes;
                }
            } else if (mode === 'location') {
                // Sunrise/sunset based on location
                const lat = this.settings.automation?.latitude || this.settings.location?.latitude;
                const lon = this.settings.automation?.longitude || this.settings.location?.longitude;

                if (lat !== null && lon !== null) {
                    const times = SunCalc.getTimes(new Date(), lat, lon);

                    const now = new Date();
                    const sunrise = times.sunrise;
                    const sunset = times.sunset;

                    // Enable dark mode between sunset and sunrise
                    shouldEnable = now < sunrise || now >= sunset;
                }
            }

            // Apply or remove based on automation result
            if (shouldEnable && !this.settings.enabled) {
                this.settings.enabled = true;
                this.saveSettings();
                this.apply();
            } else if (!shouldEnable && this.settings.enabled) {
                this.settings.enabled = false;
                this.saveSettings();
                this.remove();
            }
        },


        /**
         * Apply provisional dark background before full processing
         * Prevents white flash during page load
         */
        applyProvisional() {
            if (this.provisionalStyle) {
                return; // Already applied
            }

            const bgColor = this.getEffectiveTheme().backgroundColor;

            this.provisionalStyle = document.createElement('style');
            this.provisionalStyle.id = 'darkmoder-provisional';
            this.provisionalStyle.textContent = `
                html, body {
                    background-color: ${bgColor} !important;
                }
            `;

            // Insert as early as possible
            const target = document.head || document.documentElement;
            if (target) {
                target.insertBefore(this.provisionalStyle, target.firstChild);
            }
        },

        /**
         * Remove provisional background
         */
        removeProvisional() {
            if (this.provisionalStyle) {
                this.provisionalStyle.remove();
                this.provisionalStyle = null;
            }
        },

        /**
         * Setup dark theme monitoring for early detection
         * Uses DarkThemeDetector's two-phase approach
         */
        setupThemeMonitoring() {
            // Skip if detection is disabled
            if (!this.settings.detectDarkTheme) {
                this.siteHasDarkTheme = false;
                return;
            }

            // Phase 1: Early detection (immediate)
            const earlyResult = DarkThemeDetector.detectEarly();

            if (earlyResult.isDark) {
                // Site already has dark theme, skip our processing
                this.siteHasDarkTheme = true;
                if (CONFIG.debugMode) {
                    console.log('[DarkModer] Early dark theme detected, skipping');
                }
                this.removeProvisional();
                return;
            }

            // Phase 2: Full detection (after page loads)
            requestIdleCallback(() => {
                const fullResult = DarkThemeDetector.detect();

                if (fullResult.isDark) {
                    this.siteHasDarkTheme = true;
                    if (CONFIG.debugMode) {
                        console.log('[DarkModer] Dark theme detected in full scan, removing');
                    }
                    this.remove();
                    return;
                }

                this.siteHasDarkTheme = false;

                // Setup observer for dynamic theme changes
                DarkThemeDetector.observe((isDark) => {
                    if (isDark && this.isApplied) {
                        this.siteHasDarkTheme = true;
                        if (CONFIG.debugMode) {
                            console.log('[DarkModer] Dynamic dark theme detected, removing');
                        }
                        this.remove();
                    } else if (!isDark && !this.isApplied && this.settings.enabled) {
                        this.siteHasDarkTheme = false;
                        this.apply();
                    }
                });
            }, { timeout: 1000 });
        },

        /**
         * Load remote configuration files
         */
        async loadRemoteConfigs() {
            try {
                // Load site fixes
                const siteFixes = await ConfigLoader.fetch(
                    'site-fixes',
                    'https://raw.githubusercontent.com/nickshanks/darkmoder/main/site-fixes.txt'
                );

                if (siteFixes) {
                    const parsed = SiteFixesProcessor.parseFixes(siteFixes);
                    this.remoteConfig = {
                        siteFixes: parsed
                    };
                }
            } catch (e) {
                // Silent fail - use built-in configs
                if (CONFIG.debugMode) {
                    console.log('[DarkModer] Failed to load remote configs:', e);
                }
            }
        },

        /**
         * Register Tampermonkey/Greasemonkey menu command
         */
        registerMenuCommand() {
            if (typeof GM_registerMenuCommand === 'function') {
                GM_registerMenuCommand('DarkModer Settings', () => {
                    UI.toggle();
                });
            }
        },

        /**
         * Get effective theme (considering site-specific overrides)
         */
        getEffectiveTheme() {
            const baseTheme = this.settings.theme;

            // Check for site-specific settings
            if (this.currentSiteTheme) {
                return {
                    ...baseTheme,
                    ...this.currentSiteTheme
                };
            }

            return baseTheme;
        },

        /**
         * Check if theme should be applied to current site
         */
        shouldApply() {
            // Skip if site has native dark theme
            if (this.siteHasDarkTheme && this.settings.detectDarkTheme) {
                return false;
            }

            const hostname = getURLHostname(location.href);

            // Check if site is in disabled list (check both arrays for compatibility)
            const disabledSites = this.settings.disabledSites || [];
            const disabledFor = this.settings.disabledFor || [];
            const allDisabled = [...disabledSites, ...disabledFor];

            if (allDisabled.includes(hostname)) {
                return false;
            }

            // Check for pattern matches in disabled list
            for (const pattern of allDisabled) {
                if (isURLMatched(location.href, pattern)) {
                    return false;
                }
            }

            // Check if site has built-in dark mode
            if (BUILT_IN_DARK_SITES.some(pattern => isURLMatched(location.href, pattern))) {
                return false;
            }

            return true;
        },

        /**
         * Apply the dark theme
         */
        apply() {
            // Check if we should apply
            if (!this.settings.enabled) {
                this.remove();
                return;
            }

            if (!this.shouldApply()) {
                if (CONFIG.debugMode) {
                    if (this.siteHasDarkTheme) {
                        console.log('[DarkModer] Skipping - site has native dark theme');
                    } else {
                        console.log('[DarkModer] Skipping - site in disabled list or built-in dark');
                    }
                }
                this.remove();
                return;
            }

            // Get effective theme with site-specific overrides
            const theme = this.getEffectiveTheme();

            // Remove any existing engine
            if (this.activeEngine) {
                this.activeEngine.remove();
                this.activeEngine = null;
            }

            // Remove provisional background
            this.removeProvisional();

            // Get site fix if available
            const hostname = getURLHostname(location.href);
            let siteFix = null;

            // Check remote configs
            if (this.remoteConfig?.siteFixes?.[hostname]) {
                siteFix = this.remoteConfig.siteFixes[hostname];
            }

            // Check built-in fixes
            const builtInFix = ConfigLoader.getSiteFix(hostname);
            if (builtInFix) {
                siteFix = siteFix ? { ...siteFix, ...builtInFix } : builtInFix;
            }

            // Select and apply engine based on mode
            switch (theme.mode) {
                case 0:
                    // Filter mode
                    this.activeEngine = FilterEngine;
                    break;

                case 1:
                    // Dynamic mode (default)
                    this.activeEngine = DynamicEngine;
                    break;

                case 2:
                    // Filter+ mode
                    this.activeEngine = FilterPlusEngine;
                    break;

                case 3:
                    // Static mode
                    this.activeEngine = StaticEngine;
                    break;

                default:
                    this.activeEngine = DynamicEngine;
            }

            // Apply the engine
            this.activeEngine.apply(theme, siteFix);
            this.isApplied = true;

            if (CONFIG.debugMode) {
                console.log('[DarkModer] Theme applied with mode:', theme.mode);
            }
        },

        /**
         * Remove the dark theme
         */
        remove() {
            // Remove active engine
            if (this.activeEngine) {
                this.activeEngine.remove();
                this.activeEngine = null;
            }

            // Remove provisional background
            this.removeProvisional();

            this.isApplied = false;

            if (CONFIG.debugMode) {
                console.log('[DarkModer] Theme removed');
            }
        },

        /**
         * Toggle dark mode on/off
         */
        toggle() {
            this.settings.enabled = !this.settings.enabled;
            this.saveSettings();

            if (this.settings.enabled) {
                this.apply();
            } else {
                this.remove();
            }

            // Update UI if open
            if (UI.isOpen) {
                UI.updateUI();
            }
        },

        /**
         * Toggle dark mode for current site
         */
        toggleSite() {
            const hostname = getURLHostname(location.href);

            // Check both arrays
            const inDisabledSites = (this.settings.disabledSites || []).indexOf(hostname);
            const inDisabledFor = (this.settings.disabledFor || []).indexOf(hostname);
            const isCurrentlyDisabled = inDisabledSites !== -1 || inDisabledFor !== -1;

            if (!isCurrentlyDisabled) {
                // Add to disabledFor (primary array for UI additions)
                if (!this.settings.disabledFor) {
                    this.settings.disabledFor = [];
                }
                this.settings.disabledFor.push(hostname);
                this.remove();
            } else {
                // Remove from both arrays
                if (inDisabledSites !== -1) {
                    this.settings.disabledSites.splice(inDisabledSites, 1);
                }
                if (inDisabledFor !== -1) {
                    this.settings.disabledFor.splice(inDisabledFor, 1);
                }
                if (this.settings.enabled) {
                    this.apply();
                }
            }

            this.saveSettings();

            // Update UI if open
            if (UI.isOpen) {
                UI.updateUI();
            }
        },

        /**
         * Reset all settings to defaults
         */
        resetSettings() {
            this.settings = { ...DEFAULT_SETTINGS };
            this.settings.theme = { ...DEFAULT_THEME };
            this.saveSettings();

            // Re-apply with default settings
            if (this.settings.enabled) {
                this.apply();
            }

            // Update UI if open
            if (UI.isOpen) {
                UI.updateUI();
            }
        },

        /**
         * Export settings as JSON
         */
        exportSettings() {
            return JSON.stringify(this.settings, null, 2);
        },

        /**
         * Import settings from JSON
         */
        importSettings(json) {
            try {
                const imported = JSON.parse(json);

                // Validate basic structure
                if (typeof imported !== 'object' || imported === null) {
                    throw new Error('Invalid settings format');
                }

                // Merge with defaults
                this.settings = deepMerge({ ...DEFAULT_SETTINGS }, imported);
                this.settings.theme = deepMerge({ ...DEFAULT_THEME }, imported.theme || {});

                this.saveSettings();

                // Re-apply
                if (this.settings.enabled) {
                    this.apply();
                } else {
                    this.remove();
                }

                // Update UI if open
                if (UI.isOpen) {
                    UI.updateUI();
                }

                return true;
            } catch (e) {
                console.error('[DarkModer] Failed to import settings:', e);
                return false;
            }
        },

        /**
         * Get the generated CSS (for Dynamic mode)
         */
        getGeneratedCSS() {
            if (this.activeEngine === DynamicEngine) {
                return DynamicEngine.exportCSS();
            }
            return '';
        },

        /**
         * Apply a color scheme preset
         */
        applyColorScheme(schemeName) {
            const scheme = COLOR_SCHEMES[schemeName];
            if (!scheme) {
                return false;
            }

            // Apply scheme colors to theme
            this.settings.theme.backgroundColor = scheme.background;
            this.settings.theme.textColor = scheme.text;
            this.settings.theme.selectionColor = scheme.selection;
            this.settings.theme.selectionTextColor = scheme.selectionText;
            this.settings.colorScheme = schemeName;

            this.saveSettings();
            this.apply();

            return true;
        },

        /**
         * Save current theme as preset
         */
        saveThemePreset(name) {
            if (!name || name.trim().length === 0) {
                return false;
            }

            if (!this.settings.themePresets) {
                this.settings.themePresets = {};
            }

            this.settings.themePresets[name] = { ...this.settings.theme };
            this.saveSettings();

            return true;
        },

        /**
         * Apply a saved theme preset
         */
        applyThemePreset(name) {
            const preset = this.settings.themePresets?.[name];
            if (!preset) {
                return false;
            }

            this.settings.theme = deepMerge({ ...DEFAULT_THEME }, preset);
            this.saveSettings();
            this.apply();

            return true;
        },

        /**
         * Delete a theme preset
         */
        deleteThemePreset(name) {
            if (this.settings.themePresets?.[name]) {
                delete this.settings.themePresets[name];
                this.saveSettings();
                return true;
            }
            return false;
        },

        /**
         * Save site-specific settings
         */
        saveSiteSettings(hostname, siteTheme) {
            if (!this.settings.siteSettings) {
                this.settings.siteSettings = {};
            }

            this.settings.siteSettings[hostname] = siteTheme;
            this.currentSiteTheme = siteTheme;
            this.saveSettings();
            this.apply();
        },

        /**
         * Clear site-specific settings
         */
        clearSiteSettings(hostname) {
            if (this.settings.siteSettings?.[hostname]) {
                delete this.settings.siteSettings[hostname];

                if (hostname === getURLHostname(location.href)) {
                    this.currentSiteTheme = null;
                }

                this.saveSettings();
                this.apply();
            }
        }
    };


    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================

    /**
     * requestIdleCallback polyfill for browsers that don't support it
     */
    if (typeof window.requestIdleCallback !== 'function') {
        window.requestIdleCallback = function(callback, options) {
            const start = Date.now();
            return setTimeout(function() {
                callback({
                    didTimeout: false,
                    timeRemaining: function() {
                        return Math.max(0, 50 - (Date.now() - start));
                    }
                });
            }, options?.timeout || 1);
        };
    }

    if (typeof window.cancelIdleCallback !== 'function') {
        window.cancelIdleCallback = function(id) {
            clearTimeout(id);
        };
    }

    /**
     * Start DarkModer
     * Uses immediate execution to prevent any flash of unstyled content
     */
    (function startDarkModer() {
        // Ensure we're running in a valid context
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        // Don't run in iframes by default (can be changed via CONFIG)
        if (window !== window.top && !CONFIG.applyToIframes) {
            return;
        }

        // Don't run on about:blank or similar
        if (location.protocol === 'about:' || location.protocol === 'data:') {
            return;
        }

        // Initialize DarkModer
        DarkModer.init().catch((err) => {
            console.error('[DarkModer] Initialization error:', err);
        });

        // Expose for debugging if debug mode is enabled
        if (CONFIG.debugMode) {
            unsafeWindow.DarkModer = DarkModer;
            unsafeWindow.DarkModerUI = UI;
            unsafeWindow.DarkModerConfig = CONFIG;
        }
    })();

})();
