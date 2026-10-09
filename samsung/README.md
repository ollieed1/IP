# IP — Samsung TV (Tizen)

A Samsung TV IPTV app companion to the macOS Electron+React app. Pure HTML/CSS/JavaScript — no build step required.

## Prerequisites

- Tizen Studio 4.0+ — [download from Samsung](https://developer.samsung.com/smarttv/develop/tools/tizen-studio.html)
- Samsung Developer account (free)
- Samsung TV with Developer Mode enabled, or the Tizen Emulator

## Setup

### 1. Download HLS.js locally (required for Tizen packaging)

Tizen packages cannot load external CDN scripts. Before packaging, download HLS.js locally:

```bash
curl -o js/hls.min.js https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js
```

Then update `index.html` — change the HLS.js `<script>` src from:
```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js" defer></script>
```
to:
```html
<script src="js/hls.min.js" defer></script>
```

### 2. Import into Tizen Studio

1. Open Tizen Studio
2. **File → Import → Tizen → Tizen Project**
3. Select the `samsung/` directory
4. Click **Finish**
5. **Project → Build Package** — this generates a `.wgt` file

### 3. Enable Developer Mode on your Samsung TV

1. On the TV: **Settings → Support → About Smart TV**
2. On the remote: press **Home** 5 times rapidly on the version number
3. Enable **Developer Mode**, enter your computer's IP address when prompted
4. Restart the TV

### 4. Deploy to TV

1. In Tizen Studio: **Tools → Device Manager**
2. Click the **+** button, enter the TV's IP address, connect
3. Right-click the project → **Run As → Tizen Web Application**

### 5. Tizen Emulator (no TV needed)

1. Tizen Studio → **Tools → Emulator Manager**
2. Create a TV emulator — choose **HD 1920×1080**
3. Start the emulator
4. Deploy using **Run As → Tizen Web Application** as above

## Adding content

On first launch the app shows the **Add Library** screen. Two source types are supported:

- **M3U URL** — paste any `.m3u` or `.m3u8` playlist URL
- **Xtream Codes** — enter server URL, username, and password

Libraries and content are cached in `localStorage`. Add multiple libraries from the **Add Library** card on the home screen.

## Controls

| Remote button | Action |
|---|---|
| D-pad up/down/left/right | Navigate |
| OK / Enter | Select |
| Back | Go back / exit |
| Play | Play |
| Pause | Pause |
| Play/Pause toggle | Toggle playback |
| Left arrow / Rewind | Skip back 10 seconds |
| Right arrow / Fast Forward | Skip forward 30 seconds |
| Stop | Stop playback |

## File structure

```
samsung/
├── config.xml          Tizen app manifest
├── index.html          Single-page app shell
├── css/
│   └── style.css       TV design system (dark theme, 32px base)
├── js/
│   ├── nav.js          Spatial D-pad navigation
│   ├── storage.js      localStorage wrapper
│   ├── m3u.js          M3U/M3U8 playlist parser
│   ├── xtream.js       Xtream Codes API client
│   ├── player.js       HLS.js video player controller
│   └── app.js          Main app — screens, routing, content
└── img/
    └── icon.png        App icon (add before packaging)
```

## Notes

- The `img/icon.png` referenced in `config.xml` must exist before packaging. Add any 512×512 PNG.
- The `tizen.*` API calls in `app.js` are wrapped in `try/catch` so the app works in a regular browser for development.
- For development testing, open `index.html` directly in Chrome. Use DevTools device emulation at 1920×1080.
