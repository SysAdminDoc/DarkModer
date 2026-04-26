# DarkModer Roadmap

Userscript recreation of Dark Reader — 4 theme engines, GitHub-hosted configs, per-site fixes. This roadmap extends v3.0.0.

## Planned Features

### Engines
- Port Dark Reader's latest Dynamic engine improvements (CSS Typed OM for faster re-theming, better shadow-DOM support)
- Add per-site engine override so the power user can force Filter on sites that Dynamic breaks
- Image analysis mode: sample image luminance and decide per-image whether to invert, darken, or leave alone
- SVG inline-icon detection pass so monochrome UI icons don't get double-inverted

### Config System
- Ship a bundled fallback config so first load works before `@resource` / network fetch completes (prevents FOUC)
- Auto-update bundled configs on script update; optional remote refresh with ETag caching
- Local overrides UI: per-site CSS overrides saved to `GM_setValue` that win over remote configs
- Share button that generates a PR-ready JSON block for a specific site fix

### UI/UX
- Rebuild settings panel as Shadow-DOM isolated component so host CSS can never bleed into the controls
- Catppuccin Mocha dark styling across the entire panel (match DarkReaderLocal)
- Search box over the site list with fuzzy matching
- Live preview thumbnail of the current page at each brightness/contrast step
- Remove Alt+Shift+D keyboard shortcut (per project rules) in favor of tray/menu-only entry
- Quick-action toolbar: one-click toggle site, one-click cycle engines, one-click reset

### Site List
- Import/export site list as JSON with timestamps
- Sync via userscript manager cloud sync if available; otherwise export-to-Gist one-liner
- Regex-based site rules ("darken all `*.gov.uk` except `legacy.*`")

### Performance
- Debounce MutationObserver re-paints (currently fires on every attribute change)
- Skip re-theming iframes from the same origin that have already been processed
- Defer non-visible viewport theming until IntersectionObserver fires
- Lazy-load fix configs for the site being visited instead of shipping all four JSONs up front

### Packaging
- `@updateURL` / `@downloadURL` pointing at GitHub raw main for auto-updates
- CI that runs a JSON schema validation on the four config files on every PR
- Optional Chrome MV3 extension build that reuses the same engine + configs (companion to DarkReaderLocal)

## Competitive Research

- **Dark Reader (upstream)** — The reference implementation; DarkModer trails on Dynamic engine quality. Closing the gap means tracking their Engine Reviewer guidelines and pulling their latest fix configs weekly.
- **Midnight Lizard** — Browser extension with deeper color controls and per-element tuning; UX is cluttered but the picker for swapping specific CSS variables is a great idea to borrow.
- **Dark Night Mode / Turn Off the Lights** — Userscript/extension with simpler filter-only modes; validates that a Filter-only fast path is valuable for low-end devices.
- **Stylus + user-maintained dark themes (userstyles.world)** — Alternative workflow using hand-written themes; DarkModer's Static mode should add a "load Stylus theme" import to absorb that community's work.

## Nice-to-Haves

- Per-element "pin light" right-click: force one element to stay light-themed (useful for color pickers, maps, medical imaging thumbnails)
- Scheduled themes (matte dim during day, deep dark at night) independent of system preference
- HDR-aware tone mapping when the display reports HDR capabilities
- A/B test two engines side-by-side via a split-screen bookmarklet
- Export the active page's computed color map as a CSS file for offline theming
- Tiny companion site for browsing/searching the community fix configs with live preview

## Open-Source Research (Round 2)

### Related OSS Projects
- **darkreader/darkreader** — https://github.com/darkreader/darkreader — Upstream MIT extension; also publishable as `darkreader` NPM package for programmatic use in userscripts.
- **midnight-lizard-extension/Midnight-Lizard** — https://github.com/midnight-lizard-extension/Midnight-Lizard — Per-site color schemes, selective grayscale, blue→red blue-light filter. MV2, unmaintained since 2021 but rich UX to study.
- **openstyles/stylus** — https://github.com/openstyles/stylus — Userstyles manager, per-domain CSS rules, regex matching. Gold-standard scoping architecture.
- **rbutcher/dark-background-light-text** — https://github.com/rbutcher/dark-background-light-text — Firefox extension that inverts with color preservation tuning; simpler filter pipeline worth comparing.
- **iamadamdev/bypass-paywalls-chrome** — https://github.com/iamadamdev/bypass-paywalls-chrome — Not a dark-mode tool but the canonical reference for per-site override configs shipped in a userscript/extension combo.
- **kfur/darkreader safari userscript gist** — https://gist.github.com/kfur/266c456dd69072eb7533f457ee5f18a0 — Prior art for packaging `darkreader` lib as a single userscript.
- **turnofftheligts/TurnOffTheLights** — https://github.com/turnofftheligts/TurnOffTheLights — Focus-mode dimmer for video sites; complementary feature set.

### Features to Borrow
- Selective grayscale (images full color, page grayscale) — borrow from `Midnight-Lizard` (per-element category rules).
- Blue-light → red-light replacement filter distinct from simple brightness/sepia — borrow from `Midnight-Lizard`.
- Per-domain regex user CSS overlays shipped alongside the filter engine — borrow from `Stylus` (`@-moz-document regexp("...")` style matchers).
- Import/apply userstyles.world stylesheets as site-specific fix sources — borrow from `Stylus` + userstyles.world integration.
- Auto-schedule via `matchMedia('(prefers-color-scheme: dark)')` + sunrise/sunset calculation from geolocation — borrow from `darkreader` automation tab.
- "Disable once" quick toggle that persists for session-only — borrow from `darkreader` popup button.
- Import Dark Reader's JSON settings file directly so users can migrate — borrow from `darkreader` settings schema.

### Patterns & Architectures Worth Studying
- `darkreader` dynamic engine: mutation observer → CSS rule rewriting → inline style analyzer. Four-stage pipeline decouples parsing, analyzing, modifying, and applying — directly portable to userscript form.
- `Stylus` include/exclude matchers (domain, regex, url, url-prefix) as an override layer beneath the main engine — prevents the "this one site breaks" paper cut.
- `Midnight-Lizard`'s per-element category tags (backgroundImage/buttonBackground/link/text/image/video/selection) — more granular than darkreader's categories, enables finer per-site tuning.
