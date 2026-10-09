# IP — IPTV Player for macOS

Clean, native-feeling IPTV player. Supports M3U playlists and Xtream Codes providers.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
cd ip
npm install
```

## Development

```bash
npm run dev
```

## Build DMG

First add your app icon (see below), then:

```bash
npm run dist:mac
```

DMG will be output to `release/`.

## App Icon

You need a `build/icon.icns` file. To generate one from a 1024×1024 PNG:

```bash
# 1. Create iconset folder
mkdir build/icon.iconset

# 2. Resize to all required sizes
sips -z 16 16   build/icon.png --out build/icon.iconset/icon_16x16.png
sips -z 32 32   build/icon.png --out build/icon.iconset/icon_16x16@2x.png
sips -z 32 32   build/icon.png --out build/icon.iconset/icon_32x32.png
sips -z 64 64   build/icon.png --out build/icon.iconset/icon_32x32@2x.png
sips -z 128 128 build/icon.png --out build/icon.iconset/icon_128x128.png
sips -z 256 256 build/icon.png --out build/icon.iconset/icon_128x128@2x.png
sips -z 256 256 build/icon.png --out build/icon.iconset/icon_256x256.png
sips -z 512 512 build/icon.png --out build/icon.iconset/icon_256x256@2x.png
sips -z 512 512 build/icon.png --out build/icon.iconset/icon_512x512.png
cp              build/icon.png    build/icon.iconset/icon_512x512@2x.png

# 3. Convert to .icns
iconutil -c icns build/icon.iconset -o build/icon.icns
```

Without an icon, `electron-builder` will use a default Electron icon.

## Adding a Library

1. Click **+ Add Library** in the sidebar
2. Choose **M3U URL** or **Xtream Codes**
3. Enter your provider details

## Keyboard Shortcuts (Player)

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| ← / → | Skip −10s / +10s |
| ↑ / ↓ | Volume up / down |
| F | Toggle fullscreen |
| M | Mute |
| Esc | Close player |
