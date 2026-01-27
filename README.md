# DarkModer

A complete recreation of the [Dark Reader](https://darkreader.org) browser extension as a userscript.

## Features

- **4 Theme Engines**: Filter, Filter+, Dynamic, and Static modes
- **Full Color Control**: Brightness, contrast, sepia, grayscale adjustments
- **Custom Colors**: Configure background and text colors
- **Site List**: Disable dark mode for specific sites
- **Auto-Updating Configs**: Configs hosted on GitHub, automatically loaded
- **Automation**: System preference or time-based activation
- **Settings UI**: Full settings panel (Alt+Shift+D)
- **Import/Export**: Backup and restore your settings

## Installation

### 1. Install a Userscript Manager

- **Tampermonkey** (recommended): [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) | [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Violentmonkey**: [Chrome](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)
- **Greasemonkey** (Firefox): [Firefox](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)

### 2. Install DarkModer

**[Click here to install](https://github.com/SysAdminDoc/DarkModer/raw/refs/heads/main/DarkReader-Full.user.js)**

Or manually: Click on `DarkReader-Full.user.js` in this repo and your userscript manager should prompt you to install it.

### 3. Usage

- **Toggle Settings**: Press `Alt+Shift+D` or use the userscript manager menu
- **Enable/Disable**: Use the main toggle in the settings panel
- **Per-Site Toggle**: Toggle dark mode for the current site
- **Change Mode**: Switch between Filter, Filter+, Dynamic, or Static

## Config Files

DarkModer automatically loads config files from this repository:

| File | Purpose |
|------|---------|
| [`dark-sites.json`](https://raw.githubusercontent.com/SysAdminDoc/DarkModer/refs/heads/main/dark-sites.json) | Sites already dark (skip list) |
| [`dynamic-theme-fixes.json`](https://raw.githubusercontent.com/SysAdminDoc/DarkModer/refs/heads/main/dynamic-theme-fixes.json) | Per-site CSS fixes for Dynamic mode |
| [`inversion-fixes.json`](https://raw.githubusercontent.com/SysAdminDoc/DarkModer/refs/heads/main/inversion-fixes.json) | Per-site fixes for Filter modes |
| [`static-themes.json`](https://raw.githubusercontent.com/SysAdminDoc/DarkModer/refs/heads/main/static-themes.json) | Complete CSS themes for specific sites |

### Contributing Fixes

Found a site that doesn't look right? You can:
1. Fork this repo
2. Edit the appropriate config file
3. Submit a pull request

Or open an issue with the site URL and description of the problem.

## Custom Config URL

Want to host your own configs? 

1. Fork this repo or host JSON files on any server
2. Open settings (Alt+Shift+D) > More tab
3. Enter your config base URL
4. Configs will load from your URL instead

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

## Troubleshooting

### Script not working?
1. Make sure your userscript manager is enabled
2. Check if the site is in your disabled list
3. Try switching to Filter mode
4. Clear browser cache and reload

### Images look weird?
- Dynamic mode preserves images best
- In Filter mode, images are double-inverted (may still look off)

### Site looks broken?
1. Try a different mode
2. Add site to disabled list
3. Open an issue to request a fix

### Performance issues?
- Use Filter or Static mode for better performance
- Dynamic mode can be slow on heavy pages

## License

MIT License - Same as original Dark Reader

## Credits

Based on [Dark Reader](https://darkreader.org) by Alexander Shutau and contributors.
