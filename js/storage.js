/**
 * DoH-Switcher // Storage & Configuration Manager
 */
import { normalizeDohUrl } from './dns-core.js';
import { DNS_STATE } from './constants.js';

/**
 * Load Presets and Active State from chrome.storage.local
 */
export function loadStateAndPresets(defaultPresets) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['presets', 'activeState'], (res) => {
      let currentPresets;
      if (res.presets && Array.isArray(res.presets) && res.presets.length > 0) {
        // Filter out auto-injected dagami-dns preset and auto-repair/normalize all preset URLs
        currentPresets = res.presets
          .filter(p => p.id !== 'dagami-dns')
          .map(p => {
            if (p.url) {
              p.url = normalizeDohUrl(p.url);
            }
            return p;
          });
        chrome.storage.local.set({ presets: currentPresets });
      } else {
        currentPresets = [...defaultPresets];
        chrome.storage.local.set({ presets: currentPresets });
      }

      let activeState = {
        mode: 'automatic',
        template: '',
        presetId: '',
        connectionState: DNS_STATE.DISCONNECTED,
        lastVerifiedLatency: null
      };

      if (res.activeState) {
        activeState = Object.assign(activeState, res.activeState);
        if (activeState.template) {
          activeState.template = normalizeDohUrl(activeState.template);
        }
      }

      resolve({ currentPresets, activeState });
    });
  });
}

/**
 * Save Presets to storage
 */
export function savePresets(presets) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ presets }, () => resolve());
  });
}

/**
 * Save Active State to storage
 */
export function saveActiveState(activeState) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ activeState }, () => resolve());
  });
}

/**
 * Export Presets as downloadable JSON file
 */
export function exportPresetsJson(presets) {
  const data = JSON.stringify(presets, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `doh-switcher-presets-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate imported presets JSON file content
 */
export function parseImportedPresets(fileContent, existingPresets) {
  const imported = JSON.parse(fileContent);
  if (!Array.isArray(imported) || imported.length === 0) {
    throw new Error('File does not contain a JSON array of presets.');
  }

  let importedCount = 0;
  let rejectedInsecure = 0;
  const updatedPresets = [...existingPresets];

  imported.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const name = (item.name || '').trim();
    let url = (item.url || '').trim();
    if (!name || !url) return;

    // 1. Strict HTTPS Check: Explicitly reject plaintext HTTP
    if (url.startsWith('http://')) {
      rejectedInsecure++;
      return;
    }

    // 2. Protocol prefix & validation
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.hostname.length < 3) return;
    } catch {
      return;
    }

    const cleanUrl = normalizeDohUrl(url);

    // 3. Merge without duplicating URLs
    if (!updatedPresets.some(p => p.url.toLowerCase() === cleanUrl.toLowerCase())) {
      updatedPresets.push({
        id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        name: name.slice(0, 48),
        url: cleanUrl,
        tag: (item.tag || 'CUSTOM').toUpperCase().slice(0, 16),
        category: item.category || 'custom',
        features: ['⚡ CUSTOM'],
        isFavorite: !!item.isFavorite,
        latency: null,
        status: null
      });
      importedCount++;
    }
  });

  return { importedCount, rejectedInsecure, updatedPresets };
}
