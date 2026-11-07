/**
 * DoH-Switcher // CyberDNS - Popup Interface Controller
 * Manifest V3 - Pure Vanilla JS
 */

const DEFAULT_PRESETS = [
  {
    id: "cloudflare-main",
    name: "Cloudflare (1.1.1.1)",
    url: "https://chrome.cloudflare-dns.com/dns-query",
    tag: "Fast / Private",
    isDefault: true
  },
  {
    id: "cloudflare-sec",
    name: "Cloudflare Security",
    url: "https://security.cloudflare-dns.com/dns-query",
    tag: "Malware Block",
    isDefault: true
  },
  {
    id: "google-dns",
    name: "Google Public DNS",
    url: "https://dns.google/dns-query",
    tag: "High Speed",
    isDefault: true
  },
  {
    id: "adguard-dns",
    name: "AdGuard DNS",
    url: "https://dns.adguard-dns.com/dns-query",
    tag: "AdBlocker",
    isDefault: true
  },
  {
    id: "quad9-sec",
    name: "Quad9 (Threat Block)",
    url: "https://dns.quad9.net/dns-query",
    tag: "Security",
    isDefault: true
  },
  {
    id: "mullvad-doh",
    name: "Mullvad DNS",
    url: "https://dns.mullvad.net/dns-query",
    tag: "Strict No-Logs",
    isDefault: true
  },
  {
    id: "control-d",
    name: "Control D (Free)",
    url: "https://freedns.controld.com/p0",
    tag: "Uncensored",
    isDefault: true
  }
];

// App State
let currentPresets = [];
let currentDnsMode = 'automatic'; // 'secure' | 'automatic' | 'off'
let currentTemplate = '';
let activePresetId = '';
let hasNativeHost = false;
let toastTimeout = null;

// DOM Elements
const hudStatusCard = document.getElementById('hudStatusCard');
const statusText = document.getElementById('statusText');
const activeServerName = document.getElementById('activeServerName');
const activeServerUrl = document.getElementById('activeServerUrl');
const policyWarning = document.getElementById('policyWarning');
const presetsList = document.getElementById('presetsList');
const nodesCount = document.getElementById('nodesCount');

const btnSetAuto = document.getElementById('btnSetAuto');
const btnKillswitch = document.getElementById('btnKillswitch');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnResetDefaults = document.getElementById('btnResetDefaults');

const btnToggleInject = document.getElementById('btnToggleInject');
const injectToggleIcon = document.getElementById('injectToggleIcon');
const injectForm = document.getElementById('injectForm');
const inputNodeName = document.getElementById('inputNodeName');
const inputNodeUrl = document.getElementById('inputNodeUrl');
const urlValidationMsg = document.getElementById('urlValidationMsg');
const btnSubmitInject = document.getElementById('btnSubmitInject');

const cyberToast = document.getElementById('cyberToast');
const toastMsg = document.getElementById('toastMsg');

/**
 * Initialize extension popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadStateAndPresets();
  renderPresetsList();
  updateHudUI(currentDnsMode, currentTemplate);
  checkNativeHost();
});

/**
 * Bind DOM Event Listeners
 */
function setupEventListeners() {
  btnSetAuto.addEventListener('click', handleSetAuto);
  btnKillswitch.addEventListener('click', handleKillswitch);
  btnResetDefaults.addEventListener('click', handleResetDefaults);

  btnOpenSettings.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://settings/security' });
  });

  const btnOpenPolicy = document.getElementById('btnOpenPolicy');
  if (btnOpenPolicy) {
    btnOpenPolicy.addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://policy' });
    });
  }

  btnToggleInject.addEventListener('click', () => {
    const isHidden = injectForm.classList.contains('hidden');
    if (isHidden) {
      injectForm.classList.remove('hidden');
      injectToggleIcon.textContent = '-';
      inputNodeName.focus();
    } else {
      injectForm.classList.add('hidden');
      injectToggleIcon.textContent = '+';
    }
  });

  inputNodeUrl.addEventListener('input', validateInjectForm);
  inputNodeName.addEventListener('input', validateInjectForm);
  injectForm.addEventListener('submit', handleInjectSubmit);
}

/**
 * Load Presets and Active State from chrome.storage.local
 */
function loadStateAndPresets() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['presets', 'activeMode', 'activeTemplate', 'activePresetId'], (res) => {
      // 1. Presets list
      if (res.presets && Array.isArray(res.presets) && res.presets.length > 0) {
        currentPresets = res.presets;
      } else {
        currentPresets = [...DEFAULT_PRESETS];
        chrome.storage.local.set({ presets: currentPresets });
      }

      // 2. Active DNS State
      currentDnsMode = res.activeMode || 'automatic';
      currentTemplate = res.activeTemplate || '';
      activePresetId = res.activePresetId || '';

      resolve();
    });
  });
}

/**
 * Save presets to storage
 */
function savePresets() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ presets: currentPresets }, () => {
      resolve();
    });
  });
}

/**
 * Save active state to storage
 */
function saveActiveState(mode, template, presetId) {
  currentDnsMode = mode;
  currentTemplate = template;
  activePresetId = presetId || '';

  chrome.storage.local.set({
    activeMode: mode,
    activeTemplate: template,
    activePresetId: activePresetId
  });
}

/**
 * Check if the Native Policy Host is installed and responsive
 */
function checkNativeHost() {
  try {
    chrome.runtime.sendNativeMessage('com.doh.switcher', { action: 'PING' }, (response) => {
      if (chrome.runtime.lastError) {
        hasNativeHost = false;
        console.info('[DoH-Switcher] Native Host not connected yet. Run install-host.bat for 1-click system policy sync.');
      } else if (response && response.success) {
        hasNativeHost = true;
      }
    });
  } catch (e) {
    hasNativeHost = false;
  }
}

/**
 * Update Master HUD UI based on mode and active template
 */
function updateHudUI(mode, template) {
  hudStatusCard.classList.remove('mode-secure', 'mode-automatic', 'mode-off');

  if (mode === 'secure') {
    hudStatusCard.classList.add('mode-secure');
    statusText.textContent = 'SECURE (ENCRYPTED)';

    // Find if matches any known preset
    const matched = currentPresets.find(p => 
      (activePresetId && p.id === activePresetId) ||
      (template && p.url.trim().toLowerCase() === template.trim().toLowerCase())
    );

    if (matched) {
      activeServerName.textContent = matched.name;
      activeServerUrl.textContent = matched.url;
    } else if (template) {
      activeServerName.textContent = 'Custom DoH Endpoint';
      activeServerUrl.textContent = template;
    } else {
      activeServerName.textContent = 'Secure DNS';
      activeServerUrl.textContent = 'https://...';
    }
  } else if (mode === 'automatic') {
    hudStatusCard.classList.add('mode-automatic');
    statusText.textContent = 'AUTOMATIC (SYSTEM)';
    activeServerName.textContent = 'Opportunistic Chromium Resolver';
    activeServerUrl.textContent = 'System DNS (Upgrades to DoH if supported)';
  } else if (mode === 'off') {
    hudStatusCard.classList.add('mode-off');
    statusText.textContent = 'DISABLED (OFF)';
    activeServerName.textContent = 'Unencrypted Plaintext DNS';
    activeServerUrl.textContent = 'Direct System Resolution (DoH Inactive)';
  } else {
    statusText.textContent = 'READY';
    activeServerName.textContent = 'Select a DoH Server';
    activeServerUrl.textContent = '--';
  }
}

/**
 * Render Presets in list
 */
function renderPresetsList() {
  presetsList.innerHTML = '';
  nodesCount.textContent = `${currentPresets.length} NODES`;

  currentPresets.forEach((preset) => {
    const isThisActive = (currentDnsMode === 'secure') && 
      ((activePresetId && preset.id === activePresetId) ||
       (currentTemplate && currentTemplate.toLowerCase() === preset.url.trim().toLowerCase()));

    const card = document.createElement('div');
    card.className = `preset-card ${isThisActive ? 'is-active' : ''}`;
    card.setAttribute('data-id', preset.id);

    // Left info
    const info = document.createElement('div');
    info.className = 'preset-info';

    const headerRow = document.createElement('div');
    headerRow.className = 'preset-header-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'preset-name';
    nameSpan.textContent = preset.name;
    headerRow.appendChild(nameSpan);

    if (preset.tag) {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'preset-tag';
      tagSpan.textContent = preset.tag;
      headerRow.appendChild(tagSpan);
    }

    const urlSpan = document.createElement('span');
    urlSpan.className = 'preset-url';
    urlSpan.textContent = preset.url;

    info.appendChild(headerRow);
    info.appendChild(urlSpan);
    card.appendChild(info);

    // Right actions
    const actions = document.createElement('div');
    actions.className = 'preset-actions';

    if (isThisActive) {
      const activePill = document.createElement('span');
      activePill.className = 'active-pill';
      activePill.textContent = 'ACTIVE';
      actions.appendChild(activePill);
    } else {
      const btnConnect = document.createElement('button');
      btnConnect.className = 'btn-connect';
      btnConnect.textContent = 'CONNECT';
      btnConnect.addEventListener('click', (e) => {
        e.stopPropagation();
        activatePreset(preset);
      });
      actions.appendChild(btnConnect);
    }

    // Delete button (available for all presets)
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-delete';
    btnDel.innerHTML = '&#x2715;'; // Cross
    btnDel.title = 'Delete node';
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePreset(preset.id);
    });
    actions.appendChild(btnDel);

    // Clicking card activates it
    card.addEventListener('click', () => {
      if (!isThisActive) {
        activatePreset(preset);
      }
    });

    presetsList.appendChild(card);
  });
}

/**
 * Copy text to clipboard safely
 */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

/**
 * Activate a DoH preset
 */
function activatePreset(preset) {
  saveActiveState('secure', preset.url, preset.id);
  updateHudUI('secure', preset.url);
  renderPresetsList();
  copyToClipboard(preset.url);

  // Send to Native Messaging Host for instant Windows Policy application
  try {
    chrome.runtime.sendNativeMessage(
      'com.doh.switcher',
      { action: 'SET_DOH', mode: 'secure', template: preset.url },
      (response) => {
        if (!chrome.runtime.lastError && response && response.success) {
          showToast(`POLICY ENFORCED // ${preset.name}`);
        } else {
          // Native host not installed yet: notify user
          showToast(`COPIED // ${preset.name}`);
        }
      }
    );
  } catch (err) {
    showToast(`ACTIVE // ${preset.name}`);
  }
}

/**
 * Switch back to Automatic Mode
 */
function handleSetAuto() {
  saveActiveState('automatic', '', '');
  updateHudUI('automatic', '');
  renderPresetsList();

  try {
    chrome.runtime.sendNativeMessage(
      'com.doh.switcher',
      { action: 'SET_DOH', mode: 'automatic', template: '' },
      () => {
        if (chrome.runtime.lastError) {}
      }
    );
  } catch (err) {}

  showToast('MODE // REVERTED TO SYSTEM AUTO');
}

/**
 * Killswitch: Disable DoH completely
 */
function handleKillswitch() {
  saveActiveState('off', '', '');
  updateHudUI('off', '');
  renderPresetsList();

  try {
    chrome.runtime.sendNativeMessage(
      'com.doh.switcher',
      { action: 'SET_DOH', mode: 'off', template: '' },
      () => {
        if (chrome.runtime.lastError) {}
      }
    );
  } catch (err) {}

  showToast('KILLSWITCH // SECURE DNS TERMINATED');
}

/**
 * Validate Custom Node inputs
 */
function validateInjectForm() {
  const name = inputNodeName.value.trim();
  const url = inputNodeUrl.value.trim();

  let isValidUrl = false;
  try {
    if (url.startsWith('https://')) {
      const parsed = new URL(url);
      isValidUrl = parsed.protocol === 'https:' && parsed.hostname.length > 2;
    }
  } catch (e) {
    isValidUrl = false;
  }

  if (!url) {
    urlValidationMsg.textContent = 'Must start with https://';
    urlValidationMsg.className = 'validation-msg';
    btnSubmitInject.disabled = true;
    return;
  }

  if (!url.startsWith('https://')) {
    urlValidationMsg.textContent = 'SECURITY REJECT: URL must start with https://';
    urlValidationMsg.className = 'validation-msg';
    btnSubmitInject.disabled = true;
    return;
  }

  if (!isValidUrl) {
    urlValidationMsg.textContent = 'SYNTAX ERROR: Invalid HTTPS URL format';
    urlValidationMsg.className = 'validation-msg';
    btnSubmitInject.disabled = true;
    return;
  }

  urlValidationMsg.textContent = 'ENDPOINT PROTOCOL VERIFIED [HTTPS OK]';
  urlValidationMsg.className = 'validation-msg valid';
  btnSubmitInject.disabled = (name.length === 0);
}

/**
 * Handle Custom Node Form Submit
 */
async function handleInjectSubmit(e) {
  e.preventDefault();

  const name = inputNodeName.value.trim();
  const url = inputNodeUrl.value.trim();

  if (!name || !url.startsWith('https://')) {
    return;
  }

  // Check duplicate
  const exists = currentPresets.some(p => p.url.toLowerCase() === url.toLowerCase());
  if (exists) {
    showToast('NODE ALREADY IN MATRIX');
    return;
  }

  const newPreset = {
    id: 'custom-' + Date.now(),
    name: name,
    url: url,
    tag: 'CUSTOM',
    isDefault: false
  };

  currentPresets.push(newPreset);
  await savePresets();

  // Reset form
  inputNodeName.value = '';
  inputNodeUrl.value = '';
  validateInjectForm();
  injectForm.classList.add('hidden');
  injectToggleIcon.textContent = '+';

  // Immediately render list & activate
  renderPresetsList();
  activatePreset(newPreset);
  showToast(`NODE INJECTED // ${newPreset.name}`);
}

/**
 * Delete a preset from the list
 */
async function deletePreset(presetId) {
  if (activePresetId === presetId) {
    activePresetId = '';
    currentTemplate = '';
    saveActiveState('automatic', '', '');
    updateHudUI('automatic', '');
  }
  currentPresets = currentPresets.filter(p => p.id !== presetId);
  await savePresets();
  renderPresetsList();
  showToast('NODE DELETED FROM MATRIX');
}

/**
 * Restore factory default presets
 */
async function handleResetDefaults() {
  currentPresets = [...DEFAULT_PRESETS];
  await savePresets();
  renderPresetsList();
  showToast('MATRIX RESTORED TO FACTORY PRESETS');
}

/**
 * Show Cyber Toast HUD notification
 */
function showToast(message) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  toastMsg.textContent = message;
  cyberToast.classList.remove('hidden');

  toastTimeout = setTimeout(() => {
    cyberToast.classList.add('hidden');
  }, 2400);
}
