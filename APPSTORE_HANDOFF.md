# IP Player — Amazon Appstore Submission Handoff

**Status:** In progress — Amazon Developer account ID verification pending.  
**Last updated:** 2026-10-09

---

## What's been built

| Platform | Status | Location |
|---|---|---|
| Web app | Live | `groogle.co.uk/iptv/app/` |
| macOS DMG | Live | `groogle.co.uk/downloads/IP-0.1.0-arm64.dmg` |
| Android APK (debug) | Live | `groogle.co.uk/downloads/IPPlayer.apk` |
| Samsung Tizen app | Code done | `samsung/` folder, manual Tizen Studio deploy |
| LG webOS app | Not built | — |
| Apple TV | Not planned | Requires paid Apple Developer account |
| Download landing page | Live | `groogle.co.uk/iptv` |

---

## Android app — `android/`

Simple WebView wrapper that loads `https://groogle.co.uk/iptv/app/`.

- Package: `co.groogle.iptv`
- minSdk 21, targetSdk 34
- Includes both `LAUNCHER` + `LEANBACK_LAUNCHER` intent filters (shows on Fire TV home screen)
- `android.hardware.touchscreen` marked `required=false` (Fire TV has no touchscreen)
- Full screen immersive, keep screen on, back button navigates WebView history

---

## Next steps to submit to Amazon Appstore

### 1. Generate signing keystore (one time only)

```bash
cd /Users/oliver/ip/android
bash keygen.sh
```

Choose a strong password. **Keep `keystore.jks` safe — you need it for every future update.**

### 2. Build signed release APK

```bash
export KEYSTORE_PATH=$(pwd)/keystore.jks
export KEYSTORE_PASS=<your-password>
export KEY_ALIAS=iptv
export KEY_PASS=<your-password>
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### 3. Create app icon

- Size: **512×512 PNG**
- Amazon also needs: 114×114, 512×512 (they auto-resize from 512)
- Design: dark background, play button or TV screen, "IP" or antenna motif

### 4. Take screenshots

- Resolution: **1920×1080** (Fire TV) or 1280×720
- Minimum 3 screenshots required
- Easiest: run in an Android emulator with Fire TV skin, or sideload on a real Fire Stick and use `adb exec-out screencap -p > screen.png`

### 5. Fill in listing on Amazon Developer Console

- URL: `developer.amazon.com`
- Click **"Add a New App"** (orange button, middle column)
- Platform: **Android**
- App title: **IP Player**
- Category: **Entertainment** / Video
- Short description: `Stream your IPTV library on Fire TV with M3U and Xtream Codes support.`
- Long description: see below
- Content rating: answer questionnaire (no adult content → "All Ages")
- Price: **Free** (add IAP later)

### 6. Upload APK

Upload the signed release APK from step 2.  
Amazon will test on their Fire TV device farm before approving.

---

## Suggested app store description

**Short (160 chars):**
```
Watch your IPTV library on Fire TV. Add any M3U playlist or Xtream Codes source and browse movies, series, and live TV.
```

**Long:**
```
IP Player brings your IPTV library to Fire TV.

Add your M3U playlist URL or Xtream Codes login and instantly browse your full library — movies, TV series, and live channels — in a clean, fast interface built for the big screen.

Features:
• M3U and Xtream Codes support
• Movies, TV series, and live TV in one app
• Continue watching — picks up where you left off
• Recently watched row for quick access
• D-pad and remote navigation
• No subscription required — use your own IPTV provider

Also available on web, macOS, Samsung Smart TV, and LG Smart TV at groogle.co.uk/iptv
```

---

## Amazon IAP (payments) — deferred

The Amazon In-App Purchasing SDK needs to be added manually:

1. Download the SDK from `developer.amazon.com/apps-and-games/sdk-download`
2. Copy the `.aar` file into `android/app/libs/`
3. In `android/app/build.gradle`, uncomment:
   ```groovy
   implementation fileTree(dir: 'libs', include: ['*.aar'])
   ```
4. The payment flow code was drafted and removed — re-implement in `MainActivity.java` using `PurchasingService` and `PurchasingListener`

Amazon handles promo codes natively — you can generate codes in the developer console to give to friends for free access.

---

## Repos

- IPTV app source: `ollieed1/ip` (private)
- Groogle website (hosts downloads + web app): `ollieed1/groogle-v4`

---

## Blocked on

Amazon Developer account ID verification — waiting for feedback. Once resolved, continue from step 5 above.
