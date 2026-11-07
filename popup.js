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
    name: "Quad9 (Malware Block)",
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
let currentDnsMode = 'unknown'; // 'secure' | 'automatic' | 'off'
let currentTemplate = '';
let isControlledByPolicy = false;
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
  await loadPresets();
  await refreshCurrentState();
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
 * Load presets from chrome.storage.local
 */
function loadPresets() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['presets'], (result) => {
      if (result.presets && Array.isArray(result.presets) && result.presets.length > 0) {
        currentPresets = result.presets;
      } else {
        currentPresets = [...DEFAULT_PRESETS];
        chrome.storage.local.set({ presets: currentPresets });
      }
      resolve(currentPresets);
    });
  });
}

/**
 * Save presets to chrome.storage.local
 */
function savePresets() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ presets: currentPresets }, () => {
      resolve();
    });
  });
}

/**
 * Read current Chromium Secure DNS state via chrome.privacy
 */
function refreshCurrentState() {
  return new Promise((resolve) => {
    if (!chrome.privacy || !chrome.privacy.services || !chrome.privacy.services.secureDnsMode) {
      updateHudUI('unknown', '', false);
      resolve();
      return;
    }

    chrome.privacy.services.secureDnsMode.get({}, (modeDetails) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to query secureDnsMode:', chrome.runtime.lastError.message);
      }
      currentDnsMode = modeDetails ? modeDetails.value : 'unknown';
      const levelOfControl = modeDetails ? modeDetails.levelOfControl : '';
      isControlledByPolicy = (levelOfControl === 'not_controllable' || levelOfControl === 'controlled_by_other_extension');

      chrome.privacy.services.secureDnsTemplates.get({}, (templateDetails) => {
        if (chrome.runtime.lastError) {
          console.warn('Failed to query secureDnsTemplates:', chrome.runtime.lastError.message);
        }
        currentTemplate = (templateDetails && templateDetails.value) ? templateDetails.value.trim() : '';
        
        updateHudUI(currentDnsMode, currentTemplate, isControlledByPolicy);
        renderPresetsList();
        notifyBackgroundBadge();
        resolve();
      });
    });
  });
}

/**
 * Update Master HUD UI based on mode and active template
 */
function updateHudUI(mode, template, isLocked) {
  hudStatusCard.classList.remove('mode-secure', 'mode-automatic', 'mode-off');
  policyWarning.style.display = isLocked ? 'block' : 'none';

  if (mode === 'secure') {
    hudStatusCard.classList.add('mode-secure');
    statusText.textContent = 'SECURE (ENCRYPTED)';

    // Find if matches any known preset
    const matched = currentPresets.find(p => p.url.trim().toLowerCase() === template.toLowerCase());
    if (matched) {
      activeServerName.textContent = matched.name;
    } else if (template) {
      activeServerName.textContent = 'Custom DoH Endpoint';
    } else {
      activeServerName.textContent = 'Secure DNS (No Template)';
    }
    activeServerUrl.textContent = template || 'https://...';
  } else if (mode === 'automatic') {
    hudStatusCard.classList.add('mode-automatic');
    statusText.textContent = 'AUTOMATIC (SYSTEM)';
    activeServerName.textContent = 'Opportunistic Chromium Resolver';
    activeServerUrl.textContent = 'OS System DNS (Upgrades to DoH if supported)';
  } else if (mode === 'off') {
    hudStatusCard.classList.add('mode-off');
    statusText.textContent = 'DISABLED (OFF)';
    activeServerName.textContent = 'Unencrypted Plaintext DNS';
    activeServerUrl.textContent = 'Direct System Resolution (DoH Inactive)';
  } else {
    statusText.textContent = 'STATUS UNKNOWN';
    activeServerName.textContent = 'Cannot read Chromium settings';
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
      (currentTemplate.toLowerCase() === preset.url.trim().toLowerCase());

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

    // Right action
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

    // Delete button (allowed for all custom, and default ones if requested)
    if (!preset.isDefault) {
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-delete';
      btnDel.innerHTML = '&#x2715;'; // Cross icon
      btnDel.title = 'Delete custom node';
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePreset(preset.id);
      });
      actions.appendChild(btnDel);
    }

    // Clicking card activates it if not already active
    card.addEventListener('click', () => {
      if (!isThisActive) {
        activatePreset(preset);
      }
    });

    presetsList.appendChild(card);
  });
}

/**
 * Activate a DoH preset in Chrome
 */
function activatePreset(preset) {
  if (isControlledByPolicy) {
    showToast('SYS ERROR: Overridden by OS/Group Policy!');
    return;
  }

  // 1. Set Template URL
  chrome.privacy.services.secureDnsTemplates.set({ value: preset.url }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error setting secureDnsTemplates:', chrome.runtime.lastError.message);
      showToast('ERROR: ' + chrome.runtime.lastError.message);
      return;
    }

    // 2. Set Mode to 'secure'
    chrome.privacy.services.secureDnsMode.set({ value: 'secure' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting secureDnsMode:', chrome.runtime.lastError.message);
        showToast('ERROR: ' + chrome.runtime.lastError.message);
        return;
      }

      currentDnsMode = 'secure';
      currentTemplate = preset.url;
      updateHudUI(currentDnsMode, currentTemplate, isControlledByPolicy);
      renderPresetsList();
      notifyBackgroundBadge();
      showToast(`CONNECTED // ${preset.name}`);
    });
  });
}

/**
 * Switch back to Automatic Opportunistic Mode
 */
function handleSetAuto() {
  if (isControlledByPolicy) {
    showToast('SYS ERROR: Locked by OS/Group Policy');
    return;
  }

  chrome.privacy.services.secureDnsMode.set({ value: 'automatic' }, () => {
    if (chrome.runtime.lastError) {
      showToast('ERROR: ' + chrome.runtime.lastError.message);
      return;
    }
    currentDnsMode = 'automatic';
    updateHudUI(currentDnsMode, currentTemplate, isControlledByPolicy);
    renderPresetsList();
    notifyBackgroundBadge();
    showToast('MODE // REVERTED TO SYSTEM AUTO');
  });
}

/**
 * Killswitch: Disable DoH completely (off)
 */
function handleKillswitch() {
  if (isControlledByPolicy) {
    showToast('SYS ERROR: Locked by OS/Group Policy');
    return;
  }

  chrome.privacy.services.secureDnsMode.set({ value: 'off' }, () => {
    if (chrome.runtime.lastError) {
      showToast('ERROR: ' + chrome.runtime.lastError.message);
      return;
    }
    currentDnsMode = 'off';
    updateHudUI(currentDnsMode, currentTemplate, isControlledByPolicy);
    renderPresetsList();
    notifyBackgroundBadge();
    showToast('KILLSWITCH // SECURE DNS TERMINATED');
  });
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

  // Automatically activate the newly added preset!
  activatePreset(newPreset);
  showToast(`NODE INJECTED // ${newPreset.name}`);
}

/**
 * Delete a custom preset
 */
async function deletePreset(presetId) {
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
 * Notify background worker to refresh badge
 */
function notifyBackgroundBadge() {
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'REFRESH_STATUS' }, () => {
      // Suppress potential unhandled response warning if background is idle
      if (chrome.runtime.lastError) {
        // Ignored safely
      }
    });
  }
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
