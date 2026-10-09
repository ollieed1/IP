# TV Remote — Handoff Notes

**Status:** Built and working in app, Samsung pairing blocked by TV auth.  
**Last updated:** 2026-10-09

---

## What's built

TV Remote is a fully implemented sidebar section in the IP Player macOS app.

- Auto-discovers Samsung (port 8001) and LG (port 3000) TVs on the local subnet
- Manual IP entry fallback
- D-pad, OK, power, volume, mute, back, home, menu buttons
- Saves auth token after first pairing so future connects are automatic
- LG control via SSAP WebSocket protocol
- Samsung control via Samsung Remote Control WebSocket protocol

---

## Current blocker — Samsung Frame 2022

The Samsung Frame 43 (QE43LS03BGUXXN, Tizen, 2022 model) sends `ms.channel.unauthorized` immediately without showing a pairing popup, even with:

- IP Remote: Enabled (Settings → Network → Expert Settings → IP Remote)
- Access Notification: Always (Settings → External Device Manager → Device Connection Manager)
- Device List: IP Player entry deleted

The TV API responds correctly on port 8001:
```
curl http://192.168.178.229:8001/api/v2/
→ 200 OK, TokenAuthSupport: true, remote_available: true
```

WebSocket connects, TV sends `ms.channel.unauthorized`, closes with code 1006.

### Suspected cause
Samsung Frame 2022 (Tizen 6.5+) changed the auth model. Direct WebSocket pairing may require SmartThings integration or a specific TV account state.

---

## To resume pairing

1. On TV: Settings → General & Privacy → External Device Manager → Device Connection Manager → Device List → delete "IP Player" if present
2. Make sure Access Notification is set to "Always"
3. TV should be on the normal home screen (not Art Mode)
4. Open IP Player → TV Remote → enter `192.168.178.229` → Samsung → Connect
5. Accept popup on TV screen

---

## SmartThings alternative (if direct WS still fails)

Samsung's recommended API for 2022+ TVs is SmartThings:
1. Install SmartThings app on phone, register the TV
2. Get a SmartThings Personal Access Token from account.smartthings.com/tokens
3. Use the SmartThings REST API to send commands:
   ```
   POST https://api.smartthings.com/v1/devices/{deviceId}/commands
   Authorization: Bearer {token}
   ```
4. Replace the WebSocket approach in RemoteControl.jsx with SmartThings API calls via the Netlify proxy (to avoid CORS)

---

## Key files

| File | Purpose |
|---|---|
| `src/renderer/src/components/RemoteControl.jsx` | Full remote UI + WebSocket logic |
| `src/main/tv-control.js` | Main process: discovery, IPC handlers, connection state |
| `src/preload/index.js` | IPC bridge: `tvDiscover`, `tvConnect`, `tvDisconnect`, `tvGetConn`, `tvSaveClientKey` |
| `src/renderer/src/styles/index.css` | Remote CSS (`.remote-wrap`, `.remote-dpad`, etc.) |
