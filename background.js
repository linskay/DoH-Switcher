/**
 * DoH-Switcher // CyberDNS v2.0 - Background Service Worker
 * Dynamic icon switching: Neon colored when ON, black/dark when OFF
 */

const ICONS_ACTIVE = {
  "16": "icons/icon-16.png",
  "32": "icons/icon-32.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png"
};

const ICONS_OFF = {
  "16": "icons/icon-off-16.png",
  "32": "icons/icon-off-32.png",
  "48": "icons/icon-off-48.png",
  "128": "icons/icon-off-128.png"
};

function updateBadge(activeState) {
  try {
    // 1. Remove the text badge completely per user request
    chrome.action.setBadgeText({ text: '' });

    // 2. Switch icon based on ON vs OFF state
    const isOnline = activeState && activeState.mode === 'secure' && activeState.connectionState === 'connected';

    if (isOnline) {
      // Colored glowing neon hacker icon
      chrome.action.setIcon({ path: ICONS_ACTIVE });
      const cleanTitle = (activeState.template || 'Active').replace(/\{(\?)?dns\}/gi, '');
      chrome.action.setTitle({ title: `DoH-Switcher: ONLINE (${cleanTitle})` });
    } else {
      // Dark/black monochrome hacker icon (lights off)
      chrome.action.setIcon({ path: ICONS_OFF });
      chrome.action.setTitle({ title: activeState && activeState.mode === 'off' ? 'DoH-Switcher: OFF (Killswitch)' : 'DoH-Switcher: AUTO' });
    }
  } catch (err) {
    console.error('[DoH-Switcher] Failed to update action icon:', err);
  }
}

function syncCurrentStatus() {
  chrome.storage.local.get(['activeState'], (res) => {
    updateBadge(res.activeState);
  });
}

// Lifecycle listeners
chrome.runtime.onInstalled.addListener(() => {
  syncCurrentStatus();
});

chrome.runtime.onStartup.addListener(() => {
  syncCurrentStatus();
});

// React whenever activeState changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.activeState) {
    updateBadge(changes.activeState.newValue);
  }
});

// Direct message listener from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'REFRESH_STATUS') {
    syncCurrentStatus();
    sendResponse({ ok: true });
  }
  return true;
});
