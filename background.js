/**
 * DoH-Switcher // CyberDNS v2.0 - Background Service Worker
 * Manages badge status synchronized with persistent storage
 */

function updateBadge(activeState) {
  try {
    if (!activeState) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    if (activeState.connectionState === 'connected' && activeState.mode === 'secure') {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#00FFA3' }); // Neon Green
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#090B12' });
      }
    } else if (activeState.connectionState === 'connecting') {
      chrome.action.setBadgeText({ text: '...' });
      chrome.action.setBadgeBackgroundColor({ color: '#FCEE0A' }); // Accent Yellow
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#090B12' });
      }
    } else if (activeState.mode === 'off') {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF3158' }); // Error Red
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
      }
    } else {
      // mode === 'automatic'
      chrome.action.setBadgeText({ text: 'AUTO' });
      chrome.action.setBadgeBackgroundColor({ color: '#252D3D' }); // Steel Slate
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#DCE7F5' });
      }
    }
  } catch (err) {
    console.error('[DoH-Switcher] Failed to update badge:', err);
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
