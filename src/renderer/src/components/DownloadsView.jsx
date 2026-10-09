import React from 'react'

const PLATFORMS = [
  {
    id: 'web',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9"/>
        <path d="M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9"/>
        <path d="M3.6 9h16.8M3.6 15h16.8"/>
      </svg>
    ),
    name: 'Web App',
    subtitle: 'Any browser, any device',
    description: "You're using it right now. Works on any device with a browser — phone, tablet, computer, or smart TV browser.",
    badge: 'Live',
    badgeStyle: 'live',
    cta: null,
  },
  {
    id: 'macos',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
    name: 'macOS',
    subtitle: 'Native desktop app',
    description: 'Full Electron app with ffmpeg audio support. Plays AC3/EAC3 streams that the web version cannot.',
    badge: 'Download',
    badgeStyle: 'available',
    cta: { label: 'Download .dmg', href: 'https://groogle.co.uk/downloads/IP-0.1.0-arm64.dmg' },
  },
  {
    id: 'samsung',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M9.5 10l1.5 1.5L14.5 8"/>
      </svg>
    ),
    name: 'Samsung Smart TV',
    subtitle: 'Tizen OS · Developer Mode',
    description: 'Install via Tizen Studio over WiFi. Both devices must be on the same network. Enable Developer Mode in Settings → Apps → 12345.',
    badge: 'Guide',
    badgeStyle: 'guide',
    cta: { label: 'View setup guide', href: 'https://developer.tizen.org/development/tizen-studio/download' },
  },
  {
    id: 'lg',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <circle cx="12" cy="10" r="2.5"/>
        <path d="M12 7.5V5M12 15v-2.5M16.2 10h2.3M5.5 10h2.3"/>
      </svg>
    ),
    name: 'LG Smart TV',
    subtitle: 'webOS · Developer Mode',
    description: 'Install via ares CLI over WiFi. Install the "Developer Mode" app from LG Content Store first, then use npm install -g @webosose/ares-cli.',
    badge: 'Guide',
    badgeStyle: 'guide',
    cta: { label: 'View setup guide', href: 'https://webostv.developer.lge.com/develop/tools/cli-installation' },
  },
  {
    id: 'android',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18V9a6 6 0 0 1 12 0v9"/>
        <rect x="4" y="15" width="16" height="6" rx="2"/>
        <path d="M9 3.5L7 1M15 3.5L17 1"/>
        <circle cx="9.5" cy="18" r="0.5" fill="currentColor"/>
        <circle cx="14.5" cy="18" r="0.5" fill="currentColor"/>
      </svg>
    ),
    name: 'Android TV / Fire Stick',
    subtitle: 'Sideload via ADB',
    description: 'The easiest TV option. Enable Apps from Unknown Sources, install the free Downloader app, then enter the APK URL to install automatically.',
    badge: 'Download',
    badgeStyle: 'available',
    cta: { label: 'Download APK', href: 'https://groogle.co.uk/downloads/IPPlayer.apk' },
  },
]

export default function DownloadsView() {
  return (
    <div className="downloads-page">
      <div className="downloads-hero">
        <h1 className="downloads-title">Get IP Player</h1>
        <p className="downloads-subtitle">Available on every screen</p>
      </div>
      <div className="downloads-grid">
        {PLATFORMS.map(p => (
          <div key={p.id} className="platform-card">
            <div className="platform-card-icon">{p.icon}</div>
            <div className="platform-card-body">
              <div className="platform-card-header">
                <span className="platform-name">{p.name}</span>
                <span className={`platform-badge platform-badge-${p.badgeStyle}`}>{p.badge}</span>
              </div>
              <span className="platform-subtitle">{p.subtitle}</span>
              <p className="platform-desc">{p.description}</p>
            </div>
            {p.cta && (
              <a
                className="platform-cta"
                href={p.cta.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {p.cta.label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M7 7h10v10"/></svg>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
