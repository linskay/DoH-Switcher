/**
 * DoH-Switcher // CyberDNS v2.0 - Root Popup Controller
 * Modular Vanilla JS // Native ES Modules // Manifest V3
 */

import { DEFAULT_PRESETS, DNS_STATE } from './js/constants.js';
import { normalizeDohUrl, formatDisplayUrl, testDohEndpoint } from './js/dns-core.js';
import {
  loadStateAndPresets,
  savePresets,
  saveActiveState,
  exportPresetsJson,
  parseImportedPresets
} from './js/storage.js';
import { sendNativePolicy, refreshOpenPolicyTabs } from './js/native-client.js';
import {
  getUiElements,
  updateHudUI,
  renderPresetsList,
  logTerminal,
  showToast,
  copyToClipboard
} from './js/ui.js';

// Application State
let ui = null;
let currentPresets = [];
let activeState = {
  mode: 'automatic',
  template: '',
  presetId: '',
  connectionState: DNS_STATE.DISCONNECTED,
  lastVerifiedLatency: null
};

let currentFilter = 'all';
let connectingPresetId = null;

/**
 * Initialize extension on popup open
 */
document.addEventListener('DOMContentLoaded', async () => {
  ui = getUiElements();
  setupEventListeners();

  const loaded = await loadStateAndPresets(DEFAULT_PRESETS);
  currentPresets = loaded.currentPresets;
  activeState = loaded.activeState;

  renderAll();
  log('SYS', 'DoH Switcher v2.0 initialized (Modular Architecture).');
});

/**
 * Helper logger tied to cached terminal output
 */
function log(prefix, message) {
  logTerminal(ui?.terminalOutput, prefix, message);
}

/**
 * Helper toast tied to UI
 */
function toast(message) {
  showToast(ui, message);
}

/**
 * Refresh full UI
 */
function renderAll() {
  updateHudUI(ui, activeState, currentPresets);
  renderPresetsList({
    ui,
    currentPresets,
    activeState,
    currentFilter,
    connectingPresetId,
    onActivate: activatePreset,
    onPing: pingSinglePreset,
    onToggleFavorite: toggleFavorite,
    onDelete: deletePreset
  });
}

/**
 * Bind DOM event listeners
 */
function setupEventListeners() {
  ui.btnSetAuto.addEventListener('click', handleSetAuto);
  ui.btnKillswitch.addEventListener('click', handleKillswitch);
  ui.btnResetDefaults.addEventListener('click', handleResetDefaults);

  if (ui.linkGithub) {
    ui.linkGithub.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/linskay/DoH-Switcher' });
    });
  }

  ui.btnOpenSettings.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://settings/security' });
  });

  ui.btnOpenPolicy.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://policy' });
  });

  ui.btnRunDiagnostics.addEventListener('click', runActiveDiagnostics);

  ui.btnToggleTerminal.addEventListener('click', () => {
    ui.terminalDrawer.classList.toggle('hidden');
  });

  ui.btnCloseTerminal.addEventListener('click', () => {
    ui.terminalDrawer.classList.add('hidden');
  });

  ui.btnClearLog.addEventListener('click', () => {
    ui.terminalOutput.innerHTML = '';
  });

  ui.btnExportJson.addEventListener('click', () => {
    exportPresetsJson(currentPresets);
    log('EXPORT', 'Presets exported to JSON.');
  });

  ui.btnImportJson.addEventListener('click', () => ui.fileImportInput.click());
  ui.fileImportInput.addEventListener('change', handleImportJson);

  // Filter Tabs (ALL, FAVS, CUSTOM)
  if (ui.filterTabs) {
    ui.filterTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab-pill');
      if (!tab) return;
      document.querySelectorAll('.tab-pill').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter') || 'all';
      renderAll();
    });
  }

  // Inject Form
  ui.btnToggleInject.addEventListener('click', () => {
    const isHidden = ui.injectForm.classList.contains('hidden');
    if (isHidden) {
      ui.injectForm.classList.remove('hidden');
      ui.injectToggleIcon.textContent = '-';
      ui.inputNodeName.focus();
    } else {
      ui.injectForm.classList.add('hidden');
      ui.injectToggleIcon.textContent = '+';
    }
  });

  ui.inputNodeUrl.addEventListener('input', validateInjectForm);
  ui.inputNodeName.addEventListener('input', validateInjectForm);
  ui.injectForm.addEventListener('submit', handleInjectSubmit);
}

/**
 * Toggle Favorite Status
 */
async function toggleFavorite(presetId) {
  const p = currentPresets.find(x => x.id === presetId);
  if (p) {
    p.isFavorite = !p.isFavorite;
    await savePresets(currentPresets);
    renderAll();
    log('FAV', `${p.name} -> ${p.isFavorite ? 'Pinned to Favorites' : 'Unpinned'}`);
  }
}

/**
 * Activate a DoH preset with strict multi-state verification and rollback
 */
async function activatePreset(preset) {
  const previousActiveState = JSON.parse(JSON.stringify(activeState));
  const cleanUrl = normalizeDohUrl(preset.url);
  connectingPresetId = preset.id;

  // 1. Set State to CONNECTING
  activeState.connectionState = DNS_STATE.CONNECTING;
  activeState.template = cleanUrl;
  activeState.presetId = preset.id;
  renderAll();
  copyToClipboard(cleanUrl);

  log('SWITCH', `Initiating switch to ${preset.name}...`);

  // 2. Send Command to Native Host
  try {
    const response = await sendNativePolicy('SET_DOH', 'secure', cleanUrl);
    connectingPresetId = null;

    log('NATIVE', `Policies applied (Reg: ${response.registry}, LocalState: ${response.localState}, Cache: ${response.cacheFlushed})`);
    refreshOpenPolicyTabs();

    // 3. Perform Live Verification Probe
    activeState.connectionState = DNS_STATE.VERIFYING;
    updateHudUI(ui, activeState, currentPresets);

    const diag = await testDohEndpoint(cleanUrl);
    if (diag.resolvedUrl && diag.resolvedUrl !== preset.url) {
      preset.url = diag.resolvedUrl;
      cleanUrl = diag.resolvedUrl;
      activeState.template = diag.resolvedUrl;
    }

    if (diag.ok) {
      activeState.connectionState = DNS_STATE.CONNECTED;
      activeState.mode = 'secure';
      activeState.lastVerifiedLatency = diag.latency;
      preset.latency = diag.latency;
      preset.status = 'ONLINE';
      await savePresets(currentPresets);
      await saveActiveState(activeState);

      renderAll();
      const info = diag.answers !== undefined ? ` [${diag.answers} ANSWERS]` : '';
      log('OK', `Verified ${preset.name} -> ${diag.latency}ms${info}`);
      toast(`CONNECTED // ${preset.name} (${diag.latency}ms)`);
    } else {
      activeState.connectionState = DNS_STATE.CONNECTED;
      activeState.mode = 'secure';
      preset.latency = null;
      preset.status = 'UNVERIFIED';
      await savePresets(currentPresets);
      await saveActiveState(activeState);

      renderAll();
      log('WARN', `Endpoint probe warning: ${diag.error}`);
      toast(`POLICY ACTIVE // ${preset.name} (${diag.error})`);
    }
  } catch (err) {
    connectingPresetId = null;
    activeState = previousActiveState;
    renderAll();
    log('ERR', `Native host error: ${err.message}. Rolled back.`);
    toast(`ERROR // ${err.message}`);
  }
}

/**
 * Revert to Automatic System Mode
 */
async function handleSetAuto() {
  activeState.mode = 'automatic';
  activeState.template = '';
  activeState.presetId = '';
  activeState.connectionState = DNS_STATE.DISCONNECTED;
  activeState.lastVerifiedLatency = null;
  await saveActiveState(activeState);
  renderAll();

  try {
    await sendNativePolicy('SET_DOH', 'automatic', '');
    log('NATIVE', 'Reverted policies to opportunistic auto mode.');
    refreshOpenPolicyTabs();
  } catch (err) {
    log('ERR', `Host error: ${err.message}`);
  }

  log('MODE', 'Reverted to Chromium Opportunistic Auto DNS.');
  toast('MODE // SYSTEM AUTO DEFAULT');
}

/**
 * Killswitch: Disable DoH completely
 */
async function handleKillswitch() {
  activeState.mode = 'off';
  activeState.template = '';
  activeState.presetId = '';
  activeState.connectionState = DNS_STATE.DISCONNECTED;
  activeState.lastVerifiedLatency = null;
  await saveActiveState(activeState);
  renderAll();

  try {
    await sendNativePolicy('SET_DOH', 'off', '');
    log('NATIVE', 'Killswitch applied to system policy (mode: off).');
    refreshOpenPolicyTabs();
  } catch (err) {
    log('ERR', `Host error: ${err.message}`);
  }

  log('KILL', 'Secure DNS Terminated. Fallback to Plaintext DNS.');
  toast('KILLSWITCH // SECURE DNS TERMINATED');
}

/**
 * Run Diagnostics on currently active endpoint
 */
async function runActiveDiagnostics() {
  if (!activeState.template) {
    toast('NO ACTIVE DOH TO TEST');
    return;
  }

  toast('RUNNING DIAGNOSTICS PROBE...');
  log('TEST', `Probing active endpoint: ${activeState.template}...`);

  const diag = await testDohEndpoint(activeState.template);
  if (diag.ok) {
    activeState.lastVerifiedLatency = diag.latency;
    updateHudUI(ui, activeState, currentPresets);
    log('DIAG', `ENDPOINT: ONLINE | HTTPS: OK (200) | LATENCY: ${diag.latency}ms | RESULT: OPERATIONAL`);
    toast(`DIAGNOSTICS // OPERATIONAL (${diag.latency}ms)`);
  } else {
    log('DIAG', `ENDPOINT: UNREACHABLE | ERROR: ${diag.error} | RESULT: FAILED`);
    toast(`DIAGNOSTICS FAILED // ${diag.error}`);
  }
}

/**
 * Ping Single Preset from card
 */
async function pingSinglePreset(preset) {
  log('TEST', `Pinging ${preset.name}...`);
  preset.status = 'PROBING...';
  renderAll();

  const diag = await testDohEndpoint(preset.url);
  if (diag.resolvedUrl && diag.resolvedUrl !== preset.url) {
    preset.url = diag.resolvedUrl;
  }
  preset.latency = diag.ok ? diag.latency : null;
  preset.status = diag.ok ? 'ONLINE' : 'OFFLINE';
  await savePresets(currentPresets);
  renderAll();

  if (diag.ok) {
    log('OK', `${preset.name} -> ${diag.latency}ms ONLINE`);
    toast(`${preset.name} // ${diag.latency}ms ONLINE`);
  } else {
    log('ERR', `${preset.name} -> OFFLINE (${diag.error})`);
    toast(`${preset.name} // OFFLINE (${diag.error})`);
  }
}

/**
 * Delete a preset
 */
async function deletePreset(presetId) {
  if (activeState.presetId === presetId) {
    await handleSetAuto();
  }
  const deleted = currentPresets.find(p => p.id === presetId);
  currentPresets = currentPresets.filter(p => p.id !== presetId);
  await savePresets(currentPresets);
  renderAll();
  log('DELETE', `Removed node: ${deleted ? deleted.name : presetId}`);
  toast('NODE DELETED FROM MATRIX');
}

/**
 * Validate Inject Form
 */
function validateInjectForm() {
  const name = ui.inputNodeName.value.trim();
  let url = ui.inputNodeUrl.value.trim();

  if (!url) {
    ui.urlValidationMsg.textContent = 'Enter domain or URL (e.g. dns.dagami.ru)';
    ui.urlValidationMsg.className = 'url-msg';
    ui.btnSubmitInject.disabled = true;
    return;
  }

  if (url.startsWith('http://')) {
    ui.urlValidationMsg.textContent = 'SECURITY REJECT: Plaintext HTTP is insecure! Strict HTTPS required.';
    ui.urlValidationMsg.className = 'url-msg';
    ui.btnSubmitInject.disabled = true;
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  let isValidUrl = false;
  try {
    const parsed = new URL(url);
    isValidUrl = (parsed.protocol === 'https:') && parsed.hostname.length > 2;
  } catch {
    isValidUrl = false;
  }

  if (!isValidUrl) {
    ui.urlValidationMsg.textContent = 'SYNTAX ERROR: Invalid HTTPS domain or URL format';
    ui.urlValidationMsg.className = 'url-msg';
    ui.btnSubmitInject.disabled = true;
    return;
  }

  const normalized = normalizeDohUrl(url);
  ui.urlValidationMsg.textContent = `TARGET: ${formatDisplayUrl(normalized)}`;
  ui.urlValidationMsg.className = 'url-msg valid';
  ui.btnSubmitInject.disabled = (name.length === 0);
}

/**
 * Handle Inject Form Submit
 */
async function handleInjectSubmit(e) {
  e.preventDefault();

  const name = ui.inputNodeName.value.trim();
  let url = ui.inputNodeUrl.value.trim();
  const category = ui.inputNodeCategory.value || 'custom';

  if (!name || !url) return;

  if (url.startsWith('http://')) {
    toast('SECURITY REJECT // HTTP FORBIDDEN');
    return;
  }

  url = normalizeDohUrl(url);

  const existingIndex = currentPresets.findIndex(p =>
    p.url.toLowerCase() === url.toLowerCase() || p.name.toLowerCase() === name.toLowerCase()
  );

  let targetPreset;
  if (existingIndex >= 0) {
    currentPresets[existingIndex].name = name;
    currentPresets[existingIndex].url = url;
    currentPresets[existingIndex].category = category;
    currentPresets[existingIndex].tag = category.toUpperCase();
    targetPreset = currentPresets[existingIndex];
    log('INJECT', `Updated existing node: ${name} (${url})`);
  } else {
    targetPreset = {
      id: 'custom-' + Date.now(),
      name: name,
      url: url,
      tag: category.toUpperCase(),
      category: category,
      features: ['⚡ CUSTOM'],
      isFavorite: false,
      latency: null,
      status: null
    };
    currentPresets.push(targetPreset);
    log('INJECT', `Added custom node: ${name} (${url})`);
  }

  await savePresets(currentPresets);

  ui.inputNodeName.value = '';
  ui.inputNodeUrl.value = '';
  validateInjectForm();
  ui.injectForm.classList.add('hidden');
  ui.injectToggleIcon.textContent = '+';

  renderAll();
  toast(`NODE SAVED // ${name}`);
  activatePreset(targetPreset);
}

/**
 * Restore Factory Presets
 */
async function handleResetDefaults() {
  currentPresets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
  await savePresets(currentPresets);
  renderAll();
  log('RESET', 'Matrix restored to factory defaults.');
  toast('RESTORED FACTORY PRESETS');
}

/**
 * Import Presets from JSON File
 */
function handleImportJson(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const res = parseImportedPresets(evt.target.result, currentPresets);
      currentPresets = res.updatedPresets;
      await savePresets(currentPresets);
      renderAll();

      const warnMsg = res.rejectedInsecure > 0 ? ` (${res.rejectedInsecure} insecure HTTP rejected)` : '';
      log('IMPORT', `Successfully imported ${res.importedCount} verified presets${warnMsg}.`);
      toast(`IMPORTED ${res.importedCount} PRESETS${warnMsg}`);
    } catch (err) {
      toast('INVALID JSON FILE');
      log('ERR', `Failed to parse JSON file: ${err.message}`);
    }
  };
  reader.readAsText(file);
}
