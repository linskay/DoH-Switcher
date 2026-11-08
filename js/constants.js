/**
 * DoH-Switcher // Constants & Presets
 */

export const DEFAULT_PRESETS = [
  {
    id: "cloudflare-main",
    name: "Cloudflare (1.1.1.1)",
    url: "https://chrome.cloudflare-dns.com/dns-query",
    tag: "FAST / PRIVACY",
    category: "privacy",
    features: ["⚡ FAST", "🔒 NO-LOGS"],
    isFavorite: true,
    latency: null,
    status: null
  },
  {
    id: "cloudflare-sec",
    name: "Cloudflare Security",
    url: "https://security.cloudflare-dns.com/dns-query",
    tag: "MALWARE BLOCK",
    category: "security",
    features: ["🛡️ MALWARE", "⚡ FAST"],
    isFavorite: false,
    latency: null,
    status: null
  },
  {
    id: "google-dns",
    name: "Google Public DNS",
    url: "https://dns.google/dns-query{?dns}",
    tag: "HIGH SPEED",
    category: "default",
    features: ["⚡ GLOBAL", "🌐 ANYCAST"],
    isFavorite: false,
    latency: null,
    status: null
  },
  {
    id: "adguard-dns",
    name: "AdGuard DNS",
    url: "https://dns.adguard-dns.com/dns-query{?dns}",
    tag: "AD BLOCKER",
    category: "adblock",
    features: ["🚫 ADBLOCK", "🛡️ TRACKERS"],
    isFavorite: true,
    latency: null,
    status: null
  },
  {
    id: "quad9-sec",
    name: "Quad9 (Threat Block)",
    url: "https://dns.quad9.net/dns-query{?dns}",
    tag: "THREAT INTEL",
    category: "security",
    features: ["🛡️ THREATS", "🔒 PRIVACY"],
    isFavorite: false,
    latency: null,
    status: null
  },
  {
    id: "mullvad-doh",
    name: "Mullvad DNS",
    url: "https://dns.mullvad.net/dns-query{?dns}",
    tag: "STRICT NO-LOGS",
    category: "privacy",
    features: ["🔒 ANONYMOUS", "⚡ FAST"],
    isFavorite: false,
    latency: null,
    status: null
  },
  {
    id: "control-d",
    name: "Control D (Free)",
    url: "https://freedns.controld.com/p0{?dns}",
    tag: "UNCENSORED",
    category: "privacy",
    features: ["🌐 UNFILTERED", "🔒 FREE"],
    isFavorite: false,
    latency: null,
    status: null
  }
];

export const DNS_STATE = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  VERIFYING: 'verifying'
};
