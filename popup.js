/**
 * DoH-Switcher // CyberDNS v2.0 - Popup Controller
 * Pure Vanilla JS // Manifest V3
 */

const DEFAULT_PRESETS = [
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

const DNS_STATE = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  VERIFYING: 'verifying'
};

// Application State
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
let toastTimeout = null;

// DOM Elements
const sysStateDot = document.getElementById('sysStateDot');
const sysStateLabel = document.getElementById('sysStateLabel');
const masterHud = document.getElementById('masterHud');
const connectionBadge = document.getElementById('connectionBadge');
const activeDnsName = document.getElementById('activeDnsName');
const activeDnsUrl = document.getElementById('activeDnsUrl');
const activeLatency = document.getElementById('activeLatency');
const activePolicyStatus = document.getElementById('activePolicyStatus');
const btnRunDiagnostics = document.getElementById('btnRunDiagnostics');

const btnSetAuto = document.getElementById('btnSetAuto');
const btnKillswitch = document.getElementById('btnKillswitch');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnOpenPolicy = document.getElementById('btnOpenPolicy');
const btnResetDefaults = document.getElementById('btnResetDefaults');

const presetsList = document.getElementById('presetsList');
const nodeCounter = document.getElementById('nodeCounter');

const btnToggleInject = document.getElementById('btnToggleInject');
const injectToggleIcon = document.getElementById('injectToggleIcon');
const injectForm = document.getElementById('injectForm');
const inputNodeName = document.getElementById('inputNodeName');
const inputNodeUrl = document.getElementById('inputNodeUrl');
const inputNodeCategory = document.getElementById('inputNodeCategory');
const urlValidationMsg = document.getElementById('urlValidationMsg');
const btnSubmitInject = document.getElementById('btnSubmitInject');

const btnToggleTerminal = document.getElementById('btnToggleTerminal');
const terminalDrawer = document.getElementById('terminalDrawer');
const terminalOutput = document.getElementById('terminalOutput');
const btnCloseTerminal = document.getElementById('btnCloseTerminal');
const btnExportJson = document.getElementById('btnExportJson');
const btnImportJson = document.getElementById('btnImportJson');
const btnClearLog = document.getElementById('btnClearLog');
const fileImportInput = document.getElementById('fileImportInput');

const cyberToast = document.getElementById('cyberToast');
const toastMsg = document.getElementById('toastMsg');

/**
 * Initialize extension on popup open
 */
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadStateAndPresets();
  renderPresetsList();
  updateHudUI();
  logTerminal('SYS', 'DoH Switcher v2.0 initialized.');
});

/**
 * Bind DOM event listeners
 */
function setupEventListeners() {
  btnSetAuto.addEventListener('click', handleSetAuto);
  btnKillswitch.addEventListener('click', handleKillswitch);
  btnResetDefaults.addEventListener('click', handleResetDefaults);
  const linkGithub = document.getElementById('linkGithub');
  if (linkGithub) {
    linkGithub.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/linskay/DoH-Switcher' });
    });
  }

  btnOpenSettings.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://settings/security' });
  });

  btnOpenPolicy.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://policy' });
  });

  btnRunDiagnostics.addEventListener('click', runActiveDiagnostics);

  btnToggleTerminal.addEventListener('click', () => {
    terminalDrawer.classList.toggle('hidden');
  });

  btnCloseTerminal.addEventListener('click', () => {
    terminalDrawer.classList.add('hidden');
  });

  btnClearLog.addEventListener('click', () => {
    terminalOutput.innerHTML = '';
  });

  btnExportJson.addEventListener('click', exportPresetsJson);
  btnImportJson.addEventListener('click', () => fileImportInput.click());
  fileImportInput.addEventListener('change', importPresetsJson);

  // Filter Tabs (ALL, FAVS, CUSTOM)
  const filterTabs = document.getElementById('filterTabs');
  if (filterTabs) {
    filterTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab-pill');
      if (!tab) return;
      document.querySelectorAll('.tab-pill').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter') || 'all';
      renderPresetsList();
    });
  }

  // Inject Form
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
    chrome.storage.local.get(['presets', 'activeState'], (res) => {
            if (res.presets && Array.isArray(res.presets) && res.presets.length > 0) {
        // Filter out auto-injected dagami-dns preset
        currentPresets = res.presets.filter(p => p.id !== 'dagami-dns');
      } else {
        currentPresets = [...DEFAULT_PRESETS];
        chrome.storage.local.set({ presets: currentPresets });
      }

      if (res.activeState) {
        activeState = Object.assign(activeState, res.activeState);
      } else {
        activeState.mode = 'automatic';
        activeState.connectionState = DNS_STATE.DISCONNECTED;
      }

      resolve();
    });
  });
}

/**
 * Save Presets to storage
 */
function savePresets() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ presets: currentPresets }, () => resolve());
  });
}

/**
 * Save Active State to storage
 */
function saveActiveState() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ activeState: activeState }, () => resolve());
  });
}

/**
 * Normalize DoH Template URL to RFC 8484 GET format
 */
function normalizeDohUrl(url) {
  let clean = (url || '').trim();
  if (!clean) return '';

  if (!clean.startsWith('https://') && !clean.startsWith('http://')) {
    clean = 'https://' + clean;
  }

  try {
    const rawNoQuery = clean.replace('{?dns}', '');
    const parsed = new URL(rawNoQuery);
    if (parsed.pathname === '' || parsed.pathname === '/') {
      parsed.pathname = '/dns-query';
    }
    clean = parsed.origin + parsed.pathname;
    if (parsed.search) {
      clean += parsed.search;
    }
  } catch (e) {}

  if (!clean.includes('{?dns}') && !clean.includes('?')) {
    clean += '{?dns}';
  }

  return clean;
}

/**
 * Update Master HUD UI based on current activeState
 */
function updateHudUI() {
  masterHud.classList.remove('hud-connected', 'hud-connecting', 'hud-error');
  connectionBadge.className = 'hud-badge';

  const matched = currentPresets.find(p => p.id === activeState.presetId) ||
                  currentPresets.find(p => p.url.toLowerCase() === (activeState.template || '').toLowerCase());

  if (activeState.mode === 'off') {
    // 1. KILLSWITCH ACTIVE (OFF)
    masterHud.classList.add('hud-error');
    connectionBadge.className = 'hud-badge badge-error';
    connectionBadge.textContent = 'OFFLINE (KILL)';
    activeDnsName.textContent = 'Plaintext DNS (DoH Inactive)';
    activeDnsUrl.textContent = 'All DoH tunnels terminated';
    activePolicyStatus.textContent = 'DISABLED';
    activeLatency.textContent = '-- ms';

    if (sysStateDot) {
      sysStateDot.className = 'state-dot state-dot-off';
    }
    if (sysStateLabel) {
      sysStateLabel.textContent = 'DOH OFF';
      sysStateLabel.style.color = 'var(--neon-error)';
    }
  } else if (activeState.connectionState === DNS_STATE.CONNECTED && activeState.mode === 'secure') {
    // 2. CONNECTED (ONLINE)
    masterHud.classList.add('hud-connected');
    connectionBadge.classList.add('badge-connected');
    connectionBadge.textContent = 'CONNECTED';
    activeDnsName.textContent = matched ? matched.name : 'Custom DoH Endpoint';
    activeDnsUrl.textContent = activeState.template || 'https://...';
    activePolicyStatus.textContent = 'ENFORCED';
    activeLatency.textContent = activeState.lastVerifiedLatency ? `${activeState.lastVerifiedLatency} ms` : '-- ms';

    if (sysStateDot) {
      sysStateDot.className = 'state-dot state-dot-on';
    }
    if (sysStateLabel) {
      sysStateLabel.textContent = 'DOH ONLINE';
      sysStateLabel.style.color = 'var(--neon-success)';
    }
  } else if (activeState.connectionState === DNS_STATE.CONNECTING || activeState.connectionState === DNS_STATE.VERIFYING) {
    // 3. SWITCHING / PROBING
    masterHud.classList.add('hud-connecting');
    connectionBadge.classList.add('badge-connecting');
    connectionBadge.textContent = activeState.connectionState === DNS_STATE.VERIFYING ? 'VERIFYING...' : 'CONNECTING...';
    activeDnsName.textContent = matched ? matched.name : 'Switching DoH...';
    activeDnsUrl.textContent = activeState.template || 'https://...';
    activePolicyStatus.textContent = 'PROBING';
    activeLatency.textContent = 'TESTING';

    if (sysStateDot) {
      sysStateDot.className = 'state-dot state-dot-connecting';
    }
    if (sysStateLabel) {
      sysStateLabel.textContent = 'CONNECTING...';
      sysStateLabel.style.color = 'var(--neon-accent)';
    }
  } else {
    // 4. SYSTEM AUTO
    connectionBadge.classList.add('badge-idle');
    connectionBadge.textContent = 'SYSTEM AUTO';
    activeDnsName.textContent = 'Opportunistic System Resolver';
    activeDnsUrl.textContent = 'Chromium automatic opportunistic DoH';
    activePolicyStatus.textContent = 'DEFAULT';
    activeLatency.textContent = '-- ms';

    if (sysStateDot) {
      sysStateDot.className = 'state-dot state-dot-auto';
    }
    if (sysStateLabel) {
      sysStateLabel.textContent = 'AUTO DNS';
      sysStateLabel.style.color = 'var(--text-secondary)';
    }
  }
}

/**
 * Render Presets in the list with filtering and favorites
 */
function renderPresetsList() {
  presetsList.innerHTML = '';

  // Filter
  let filtered = currentPresets.filter(p => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'favorites') return !!p.isFavorite;
    if (currentFilter === 'custom') return p.category === 'custom' || (!p.category && !p.isDefault);
    return p.category === currentFilter;
  });

  // Sort: Favorites first, then alphabetical
  filtered.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  nodeCounter.textContent = `${filtered.length} NODES`;

  filtered.forEach((preset) => {
    const isThisActive = (activeState.connectionState === DNS_STATE.CONNECTED) &&
      (activeState.presetId === preset.id ||
       (activeState.template && activeState.template.toLowerCase() === preset.url.toLowerCase()));

    const isThisConnecting = (connectingPresetId === preset.id);

    const card = document.createElement('div');
    card.className = `preset-card ${isThisActive ? 'is-active' : ''}`;
    card.setAttribute('data-id', preset.id);

    // Left Section
    const cardLeft = document.createElement('div');
    cardLeft.className = 'card-left';

    // Favorite Star Button
    const btnStar = document.createElement('button');
    btnStar.className = `btn-star ${preset.isFavorite ? 'favorited' : ''}`;
    btnStar.textContent = preset.isFavorite ? '★' : '☆';
    btnStar.title = preset.isFavorite ? 'Remove from favorites' : 'Add to favorites';
    btnStar.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(preset.id);
    });
    cardLeft.appendChild(btnStar);

    // Card Details
    const details = document.createElement('div');
    details.className = 'card-details';

    // Title Row
    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'card-name';
    nameSpan.textContent = preset.name;
    titleRow.appendChild(nameSpan);

    if (preset.tag) {
      const badgeSpan = document.createElement('span');
      badgeSpan.className = `card-badge badge-${preset.category || 'privacy'}`;
      badgeSpan.textContent = preset.tag;
      titleRow.appendChild(badgeSpan);
    }
    details.appendChild(titleRow);

    // URL
    const urlSpan = document.createElement('span');
    urlSpan.className = 'card-url';
    urlSpan.textContent = preset.url;
    details.appendChild(urlSpan);

    // Metrics Row (Latency & Status)
    const metricsRow = document.createElement('div');
    metricsRow.className = 'card-metrics-row';

    const latSpan = document.createElement('span');
    latSpan.className = 'card-metric';
    latSpan.textContent = 'LATENCY: ';
    const latVal = document.createElement('span');
    latVal.className = 'card-metric-val';
    latVal.textContent = preset.latency ? `${preset.latency} ms` : '-- ms';
    latSpan.appendChild(latVal);
    metricsRow.appendChild(latSpan);

    const statSpan = document.createElement('span');
    statSpan.className = 'card-metric';
    statSpan.textContent = 'STATUS: ';
    const statVal = document.createElement('span');
    statVal.className = `card-metric-val ${preset.status === 'ONLINE' ? 'online' : (preset.status === 'OFFLINE' ? 'offline' : '')}`;
    statVal.textContent = preset.status || 'UNTESTED';
    statSpan.appendChild(statVal);
    metricsRow.appendChild(statSpan);

    details.appendChild(metricsRow);
    cardLeft.appendChild(details);
    card.appendChild(cardLeft);

    // Right Actions
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    // Ping / Test button for individual node
    const btnPing = document.createElement('button');
    btnPing.className = 'btn-ping';
    btnPing.innerHTML = '<svg class="icon-bolt" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    btnPing.title = 'Test endpoint latency';
    btnPing.addEventListener('click', (e) => {
      e.stopPropagation();
      pingSinglePreset(preset);
    });
    actions.appendChild(btnPing);

    // Connect / Active Status Button
    if (isThisActive) {
      const activePill = document.createElement('span');
      activePill.className = 'active-pill';
      activePill.textContent = 'ACTIVE';
      actions.appendChild(activePill);
    } else if (isThisConnecting) {
      const connPill = document.createElement('span');
      connPill.className = 'btn-connecting-pill';
      connPill.textContent = 'CONNECTING...';
      actions.appendChild(connPill);
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

    // Delete Cross Button (available for all presets)
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-delete';
    btnDel.innerHTML = '<svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><line x1="1.5" y1="1.5" x2="8.5" y2="8.5"/><line x1="8.5" y1="1.5" x2="1.5" y2="8.5"/></svg>';
    btnDel.title = 'Delete node';
    btnDel.setAttribute('aria-label', 'Delete node');
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePreset(preset.id);
    });
    actions.appendChild(btnDel);

    // Clicking anywhere on card connects
    card.addEventListener('click', () => {
      if (!isThisActive && !isThisConnecting) {
        activatePreset(preset);
      }
    });

    card.appendChild(actions);
    presetsList.appendChild(card);
  });
}

/**
 * Toggle Favorite Status
 */
async function toggleFavorite(presetId) {
  const p = currentPresets.find(x => x.id === presetId);
  if (p) {
    p.isFavorite = !p.isFavorite;
    await savePresets();
    renderPresetsList();
    logTerminal('FAV', `${p.name} -> ${p.isFavorite ? 'Pinned to Favorites' : 'Unpinned'}`);
  }
}

/**
 * Activate a DoH preset with strict multi-state verification
 */
async function activatePreset(preset) {
  const cleanUrl = normalizeDohUrl(preset.url);
  connectingPresetId = preset.id;

  // 1. Set State to CONNECTING
  activeState.connectionState = DNS_STATE.CONNECTING;
  activeState.template = cleanUrl;
  activeState.presetId = preset.id;
  updateHudUI();
  renderPresetsList();
  copyToClipboard(cleanUrl);

  logTerminal('SWITCH', `Initiating switch to ${preset.name}...`);

  // 2. Send Command to Native Host
  try {
    chrome.runtime.sendNativeMessage(
      'com.doh.switcher',
      { action: 'SET_DOH', mode: 'secure', template: cleanUrl },
      async (response) => {
        connectingPresetId = null;

        if (chrome.runtime.lastError || !response || !response.success) {
          const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : (response ? response.message : 'Unknown host failure');
          activeState.connectionState = DNS_STATE.ERROR;
          updateHudUI();
          renderPresetsList();
          logTerminal('ERR', `Native host error: ${err}`);
          showToast(`ERROR // ${err}`);
          return;
        }

        // Host reported success
        logTerminal('NATIVE', `Policies applied (Reg: ${response.registry}, LocalState: ${response.localState}, Cache: ${response.cacheFlushed})`);

        // 3. Perform Live Verification Probe
        activeState.connectionState = DNS_STATE.VERIFYING;
        updateHudUI();

        const diag = await testDohEndpoint(cleanUrl);
        if (diag.ok) {
          activeState.connectionState = DNS_STATE.CONNECTED;
          activeState.mode = 'secure';
          activeState.lastVerifiedLatency = diag.latency;
          preset.latency = diag.latency;
          preset.status = 'ONLINE';
          await savePresets();
          await saveActiveState();

          updateHudUI();
          renderPresetsList();
          logTerminal('OK', `Verified ${preset.name} -> ${diag.latency}ms [RESOLVED]`);
          showToast(`CONNECTED // ${preset.name} (${diag.latency}ms)`);
        } else {
          // Endpoint unverified or timeout, but policy was written
          activeState.connectionState = DNS_STATE.CONNECTED;
          activeState.mode = 'secure';
          preset.status = 'TIMEOUT';
          await savePresets();
          await saveActiveState();

          updateHudUI();
          renderPresetsList();
          logTerminal('WARN', `Endpoint probe timeout: ${diag.error}`);
          showToast(`POLICY ACTIVE // ${preset.name} (Probe timeout)`);
        }
      }
    );
  } catch (err) {
    connectingPresetId = null;
    activeState.connectionState = DNS_STATE.ERROR;
    updateHudUI();
    renderPresetsList();
    logTerminal('ERR', `Execution exception: ${err.message}`);
    showToast(`SYS EXCEPTION // ${err.message}`);
  }
}

/**
 * Live DoH Endpoint Test (RFC 8484 DNS Query Probe)
 */
async function testDohEndpoint(endpointUrl) {
  const clean = normalizeDohUrl(endpointUrl);
  // RFC 8484 standard query for example.com (Type A, IN)
  const dnsQueryBase64 = 'AAABAAABAAAAAAAAB2V4YW1wbGUDY29tAAABAAEA';
  
  let targetUrl = clean;
  if (clean.includes('{?dns}')) {
    targetUrl = clean.replace('{?dns}', `?dns=${dnsQueryBase64}`);
  } else if (!clean.includes('?')) {
    targetUrl = `${clean}?dns=${dnsQueryBase64}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  const t0 = performance.now();
  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/dns-message, application/dns-json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const t1 = performance.now();
    const latency = Math.round(t1 - t0);

    if (res.ok) {
      return { ok: true, latency: latency, status: res.status };
    } else {
      return { ok: false, latency: latency, error: `HTTP ${res.status}` };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const t1 = performance.now();
    return { ok: false, latency: Math.round(t1 - t0), error: err.name === 'AbortError' ? 'TIMEOUT (3.5s)' : err.message };
  }
}

/**
 * Run Diagnostics on currently active endpoint
 */
async function runActiveDiagnostics() {
  if (!activeState.template) {
    showToast('NO ACTIVE DOH TO TEST');
    return;
  }

  showToast('RUNNING DIAGNOSTICS PROBE...');
  logTerminal('TEST', `Probing active endpoint: ${activeState.template}...`);

  const diag = await testDohEndpoint(activeState.template);
  if (diag.ok) {
    activeState.lastVerifiedLatency = diag.latency;
    updateHudUI();
    logTerminal('DIAG', `ENDPOINT: ONLINE | HTTPS: OK (200) | LATENCY: ${diag.latency}ms | RESULT: OPERATIONAL`);
    showToast(`DIAGNOSTICS // OPERATIONAL (${diag.latency}ms)`);
  } else {
    logTerminal('DIAG', `ENDPOINT: UNREACHABLE | ERROR: ${diag.error} | RESULT: FAILED`);
    showToast(`DIAGNOSTICS FAILED // ${diag.error}`);
  }
}

/**
 * Ping Single Preset from card
 */
async function pingSinglePreset(preset) {
  logTerminal('TEST', `Pinging ${preset.name}...`);
  const diag = await testDohEndpoint(preset.url);
  preset.latency = diag.latency;
  preset.status = diag.ok ? 'ONLINE' : 'OFFLINE';
  await savePresets();
  renderPresetsList();

  if (diag.ok) {
    logTerminal('OK', `${preset.name} -> ${diag.latency}ms ONLINE`);
    showToast(`${preset.name} // ${diag.latency}ms ONLINE`);
  } else {
    logTerminal('ERR', `${preset.name} -> OFFLINE (${diag.error})`);
    showToast(`${preset.name} // OFFLINE (${diag.error})`);
  }
}

/**
 * Revert to Automatic System Mode
 */
function handleSetAuto() {
  activeState.mode = 'automatic';
  activeState.template = '';
  activeState.presetId = '';
  activeState.connectionState = DNS_STATE.DISCONNECTED;
  activeState.lastVerifiedLatency = null;
  saveActiveState();
  updateHudUI();
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

  logTerminal('MODE', 'Reverted to Chromium Opportunistic Auto DNS.');
  showToast('MODE // SYSTEM AUTO DEFAULT');
}

/**
 * Killswitch: Disable DoH completely
 */
function handleKillswitch() {
  activeState.mode = 'off';
  activeState.template = '';
  activeState.presetId = '';
  activeState.connectionState = DNS_STATE.DISCONNECTED;
  activeState.lastVerifiedLatency = null;
  saveActiveState();
  updateHudUI();
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

  logTerminal('KILL', 'Secure DNS Terminated. Fallback to Plaintext DNS.');
  showToast('KILLSWITCH // SECURE DNS TERMINATED');
}

/**
 * Delete a preset
 */
async function deletePreset(presetId) {
  if (activeState.presetId === presetId) {
    handleSetAuto();
  }
  const deleted = currentPresets.find(p => p.id === presetId);
  currentPresets = currentPresets.filter(p => p.id !== presetId);
  await savePresets();
  renderPresetsList();
  logTerminal('DELETE', `Removed node: ${deleted ? deleted.name : presetId}`);
  showToast('NODE DELETED FROM MATRIX');
}

/**
 * Validate Inject Form
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
    urlValidationMsg.className = 'url-msg';
    btnSubmitInject.disabled = true;
    return;
  }

  if (!url.startsWith('https://')) {
    urlValidationMsg.textContent = 'SECURITY REJECT: URL must start with https://';
    urlValidationMsg.className = 'url-msg';
    btnSubmitInject.disabled = true;
    return;
  }

  if (!isValidUrl) {
    urlValidationMsg.textContent = 'SYNTAX ERROR: Invalid HTTPS URL format';
    urlValidationMsg.className = 'url-msg';
    btnSubmitInject.disabled = true;
    return;
  }

  urlValidationMsg.textContent = 'ENDPOINT PROTOCOL VERIFIED [HTTPS OK]';
  urlValidationMsg.className = 'url-msg valid';
  btnSubmitInject.disabled = (name.length === 0);
}

/**
 * Handle Inject Form Submit
 */
async function handleInjectSubmit(e) {
  e.preventDefault();

  const name = inputNodeName.value.trim();
  let url = inputNodeUrl.value.trim();
  const category = inputNodeCategory.value || 'custom';

  if (!name || !url.startsWith('https://')) return;

  url = normalizeDohUrl(url);

  // Prevent duplicates
  const exists = currentPresets.some(p => p.url.toLowerCase() === url.toLowerCase());
  if (exists) {
    showToast('NODE ALREADY IN MATRIX');
    return;
  }

  const newPreset = {
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

  currentPresets.push(newPreset);
  await savePresets();

  inputNodeName.value = '';
  inputNodeUrl.value = '';
  validateInjectForm();
  injectForm.classList.add('hidden');
  injectToggleIcon.textContent = '+';

  renderPresetsList();
  logTerminal('INJECT', `Added custom node: ${newPreset.name}`);
  activatePreset(newPreset);
}

/**
 * Restore Factory Presets
 */
async function handleResetDefaults() {
  currentPresets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
  await savePresets();
  renderPresetsList();
  logTerminal('RESET', 'Matrix restored to factory defaults.');
  showToast('RESTORED FACTORY PRESETS');
}

/**
 * Export Presets as JSON File
 */
function exportPresetsJson() {
  const data = JSON.stringify(currentPresets, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `doh-switcher-presets-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  logTerminal('EXPORT', 'Presets exported to JSON.');
}

/**
 * Import Presets from JSON File
 */
function importPresetsJson(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported) && imported.length > 0) {
        // Merge without duplicating URLs
        imported.forEach(item => {
          if (item.name && item.url && !currentPresets.some(p => p.url.toLowerCase() === item.url.toLowerCase())) {
            currentPresets.push(item);
          }
        });
        await savePresets();
        renderPresetsList();
        logTerminal('IMPORT', `Successfully imported ${imported.length} presets.`);
        showToast(`IMPORTED ${imported.length} PRESETS`);
      }
    } catch (err) {
      showToast('INVALID JSON FILE');
      logTerminal('ERR', `Failed to parse JSON file: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

/**
 * Log message to Cyber Terminal
 */
function logTerminal(prefix, message) {
  const line = document.createElement('div');
  line.className = `term-line ${prefix.toLowerCase()}`;
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  line.textContent = `[${timeStr}] [${prefix}] ${message}`;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

/**
 * Safe clipboard copy
 */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

/**
 * Show Cyber Toast
 */
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMsg.textContent = message;
  cyberToast.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    cyberToast.classList.add('hidden');
  }, 2600);
}
