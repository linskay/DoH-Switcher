/**
 * DoH-Switcher // Native Messaging Policy Host Client
 */

const NATIVE_HOST_NAME = 'com.doh.switcher';

/**
 * Send command to native policy host (doh-host.exe)
 * Returns a Promise that resolves to response or rejects with Error
 */
export function sendNativePolicy(action, mode, template = '') {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendNativeMessage(
        NATIVE_HOST_NAME,
        { action, mode, template },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Host connection error'));
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response?.message || 'Host execution failed'));
            return;
          }
          resolve(response);
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Best-effort auto-refresh of open policy tabs (where supported)
 */
export function refreshOpenPolicyTabs() {
  try {
    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(t => {
          if (t.url && (t.url.startsWith('chrome://policy') || t.url.startsWith('edge://policy'))) {
            chrome.tabs.reload(t.id).catch(() => {});
          }
        });
      });
    }
  } catch (e) {}
}
