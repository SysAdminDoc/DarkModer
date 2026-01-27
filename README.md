# Dark Reader Userscript

A complete recreation of the [Dark Reader](https://darkreader.org) browser extension as a userscript.

## Features

- **4 Theme Engines**: Filter, Filter+, Dynamic, and Static modes
- **Full Color Control**: Brightness, contrast, sepia, grayscale adjustments
- **Custom Colors**: Configure background and text colors
- **Site List**: Disable dark mode for specific sites
- **Self-Hosted Configs**: Host your own site fixes and dark site lists
- **Automation**: System preference or time-based activation
- **Settings UI**: Full settings panel (Alt+Shift+D)
- **Import/Export**: Backup and restore your settings

## Installation

### 1. Install a Userscript Manager

- **Tampermonkey** (recommended): [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) | [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Violentmonkey**: [Chrome](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)
- **Greasemonkey** (Firefox): [Firefox](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)

### 2. Install the Userscript

Click on `DarkReader-Full.user.js` and your userscript manager should prompt you to install it.

Or create a new userscript and paste the contents.

### 3. Usage

- **Toggle Settings**: Press `Alt+Shift+D` or use the userscript manager menu
- **Enable/Disable**: Use the main toggle in the settings panel
- **Per-Site Toggle**: Toggle dark mode for the current site
- **Change Mode**: Switch between Filter, Filter+, Dynamic, or Static

## Self-Hosted Configuration

Dark Reader uses configuration files for site-specific fixes. You can host these yourself for full control.

### Setup Self-Hosted Configs

1. **Upload config files** to your web server:
   ```
   https://yourdomain.com/darkreader-configs/
   ├── dark-sites.json
   ├── dynamic-theme-fixes.json
   ├── inversion-fixes.json
   └── static-themes.json
   ```

2. **Configure CORS** on your server to allow requests from any origin:
   ```
   Access-Control-Allow-Origin: *
   ```

   For **nginx**:
   ```nginx
   location /darkreader-configs/ {
       add_header Access-Control-Allow-Origin *;
       add_header Content-Type application/json;
   }
   ```

   For **Apache** (.htaccess):
   ```apache
   Header set Access-Control-Allow-Origin "*"
   ```

3. **Set the URL** in the userscript settings:
   - Open settings (Alt+Shift+D)
   - Go to "More" tab
   - Enter your config URL: `https://yourdomain.com/darkreader-configs/`

### Config File Formats

#### dark-sites.json
Sites that are already dark (Dark Reader will skip these):
```json
{
    "description": "Sites that are already dark",
    "version": "1.0.0",
    "sites": [
        "discord.com",
        "*.github.com",
        "youtube.com"
    ]
}
```

#### dynamic-theme-fixes.json
Site-specific CSS fixes for Dynamic mode:
```json
{
    "description": "Dynamic theme fixes",
    "version": "1.0.0",
    "fixes": {
        "example.com": {
            "invert": [".dark-icon"],
            "css": ".header { background-color: var(--darkreader-neutral-background) !important; }",
            "ignoreInlineStyle": [".color-picker"],
            "ignoreImageAnalysis": [".logo"]
        }
    }
}
```

#### inversion-fixes.json
Site-specific fixes for Filter/Filter+ modes:
```json
{
    "description": "Inversion fixes",
    "version": "1.0.0",
    "fixes": {
        "default": {
            "invert": ["img", "video", "picture"],
            "noinvert": ["img img"],
            "removebg": [],
            "css": ""
        },
        "example.com": {
            "invert": [".product-image"],
            "noinvert": [".logo"],
            "removebg": [".hero-bg"],
            "css": ""
        }
    }
}
```

#### static-themes.json
Complete CSS themes for specific sites:
```json
{
    "description": "Static CSS themes",
    "version": "1.0.0",
    "themes": {
        "example.com": {
            "css": "body { background: #1e1e1e !important; color: #e8e6e3 !important; }"
        }
    }
}
```

### Hosting Options

#### GitHub Pages (Free)
1. Create a repository
2. Add config files to a `configs` folder
3. Enable GitHub Pages
4. Use URL: `https://username.github.io/repo/configs/`

#### Cloudflare Workers (Free)
```javascript
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    const response = await fetch(request)
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('Access-Control-Allow-Origin', '*')
    return newResponse
}
```

#### Your Own Server
Just serve the JSON files with proper CORS headers.

## Theme Modes Explained

### Filter Mode
- Uses CSS `filter: invert(1) hue-rotate(180deg)`
- Fast and simple
- May affect images (they get re-inverted)
- Works on most sites

### Filter+ Mode
- Uses SVG filters for better color handling
- More vivid colors than Filter mode
- Slightly slower
- Better image handling

### Dynamic Mode (Recommended)
- Analyzes page CSS and modifies colors
- Best visual results
- Preserves images naturally
- May be slower on complex pages

### Static Mode
- Applies a simple dark CSS override
- Fastest mode
- May not work well on complex sites
- Good for simple pages

## API

The userscript exposes a global API for advanced users:

```javascript
// Access the API
const DR = window.DarkReaderUserscript;

// Enable/disable
DR.setEnabled(true);
DR.setEnabled(false);

// Change engine
DR.setEngine('dynamic'); // 'filter', 'filterPlus', 'dynamic', 'static'

// Change theme options
DR.setThemeOption('brightness', 110);
DR.setThemeOption('contrast', 95);
DR.setThemeOption('sepia', 10);
DR.setThemeOption('darkSchemeBackgroundColor', '#1a1a1a');
DR.setThemeOption('darkSchemeTextColor', '#e0e0e0');

// Toggle site
DR.toggleSite('example.com', true);  // Disable for site
DR.toggleSite('example.com', false); // Enable for site

// Get current settings
const settings = DR.getSettings();

// Reset to defaults
DR.resetSettings();
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Alt+Shift+D | Toggle settings panel |
| Escape | Close settings panel |

## Troubleshooting

### Script not working?
1. Make sure your userscript manager is enabled
2. Check if the site is in your disabled list
3. Try switching to Filter mode
4. Clear browser cache and reload

### Images look weird?
- Dynamic mode preserves images best
- In Filter mode, images are double-inverted (may still look off)
- Add problematic selectors to `ignoreImageAnalysis` in your config

### Site looks broken?
1. Try a different mode
2. Add site to disabled list
3. Create site-specific fixes in your config

### Performance issues?
- Use Filter or Static mode for better performance
- Dynamic mode can be slow on heavy pages

## Contributing

This is a userscript recreation of the Dark Reader extension. For the original extension:
- Website: https://darkreader.org
- GitHub: https://github.com/darkreader/darkreader

## License

MIT License - Same as original Dark Reader

## Credits

Based on [Dark Reader](https://darkreader.org) by Alexander Shutau and contributors.
