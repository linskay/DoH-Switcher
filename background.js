/**
 * DoH-Switcher // CyberDNS - Background Service Worker
 * Manages badge status synchronized with persistent storage
 */

function updateBadge(mode) {
  try {
    if (mode === 'secure') {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#00F0FF' }); // Cyber Cyan
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#0A0B10' });
      }
    } else if (mode === 'automatic') {
      chrome.action.setBadgeText({ text: 'AUTO' });
      chrome.action.setBadgeBackgroundColor({ color: '#3A3D4D' }); // Steel Gray
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#E0E0E0' });
      }
    } else if (mode === 'off') {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF003C' }); // Cyber Red
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error('[DoH-Switcher] Failed to update badge:', err);
  }
}

function syncCurrentStatus() {
  chrome.storage.local.get(['activeMode'], (res) => {
    const mode = res.activeMode || 'automatic';
    updateBadge(mode);
  });
}

// Lifecycle listeners
chrome.runtime.onInstalled.addListener(() => {
  syncCurrentStatus();
});

chrome.runtime.onStartup.addListener(() => {
  syncCurrentStatus();
});

// React whenever activeMode changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.activeMode) {
    updateBadge(changes.activeMode.newValue);
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
