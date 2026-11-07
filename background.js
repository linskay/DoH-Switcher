/**
 * DoH-Switcher // CyberDNS - Background Service Worker
 * Manages badge status and reflects Chrome secure DNS state
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
      chrome.action.setBadgeBackgroundColor({ color: '#3A3D4D' }); // Muted Steel
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#E0E0E0' });
      }
    } else {
      // mode === 'off' or unknown
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF003C' }); // Cyber Red
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
      }
    }
  } catch (err) {
    console.error('[DoH-Switcher] Failed to update badge:', err);
  }
}

function syncCurrentStatus() {
  if (chrome.privacy && chrome.privacy.services && chrome.privacy.services.secureDnsMode) {
    chrome.privacy.services.secureDnsMode.get({}, (details) => {
      if (chrome.runtime.lastError) {
        console.warn('[DoH-Switcher] Privacy API warning:', chrome.runtime.lastError.message);
        return;
      }
      updateBadge(details.value);
    });
  }
}

// Listen for browser lifecycle events
chrome.runtime.onInstalled.addListener(() => {
  syncCurrentStatus();
});

chrome.runtime.onStartup.addListener(() => {
  syncCurrentStatus();
});

// Listen to setting changes triggered anywhere in browser
if (chrome.privacy && chrome.privacy.services && chrome.privacy.services.secureDnsMode) {
  chrome.privacy.services.secureDnsMode.onChange.addListener((details) => {
    updateBadge(details.value);
  });
}

// Listen to messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'REFRESH_STATUS') {
    syncCurrentStatus();
    sendResponse({ ok: true });
  }
  return true;
});
