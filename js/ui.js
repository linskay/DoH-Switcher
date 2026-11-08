/**
 * DoH-Switcher // Cyberpunk UI View & DOM Renderer
 */
import { DNS_STATE } from './constants.js';
import { formatDisplayUrl } from './dns-core.js';

let toastTimeout = null;

/**
 * Cache and return all interactive DOM elements
 */
export function getUiElements() {
  return {
    sysStateDot: document.getElementById('sysStateDot'),
    sysStateLabel: document.getElementById('sysStateLabel'),
    brandHackerIcon: document.getElementById('brandHackerIcon'),
    masterHud: document.getElementById('masterHud'),
    connectionBadge: document.getElementById('connectionBadge'),
    activeDnsName: document.getElementById('activeDnsName'),
    activeDnsUrl: document.getElementById('activeDnsUrl'),
    activeLatency: document.getElementById('activeLatency'),
    activePolicyStatus: document.getElementById('activePolicyStatus'),
    btnRunDiagnostics: document.getElementById('btnRunDiagnostics'),

    btnSetAuto: document.getElementById('btnSetAuto'),
    btnKillswitch: document.getElementById('btnKillswitch'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    btnOpenPolicy: document.getElementById('btnOpenPolicy'),
    btnResetDefaults: document.getElementById('btnResetDefaults'),

    presetsList: document.getElementById('presetsList'),
    nodeCounter: document.getElementById('nodeCounter'),

    btnToggleInject: document.getElementById('btnToggleInject'),
    injectToggleIcon: document.getElementById('injectToggleIcon'),
    injectForm: document.getElementById('injectForm'),
    inputNodeName: document.getElementById('inputNodeName'),
    inputNodeUrl: document.getElementById('inputNodeUrl'),
    inputNodeCategory: document.getElementById('inputNodeCategory'),
    urlValidationMsg: document.getElementById('urlValidationMsg'),
    btnSubmitInject: document.getElementById('btnSubmitInject'),

    btnToggleTerminal: document.getElementById('btnToggleTerminal'),
    terminalDrawer: document.getElementById('terminalDrawer'),
    terminalOutput: document.getElementById('terminalOutput'),
    btnCloseTerminal: document.getElementById('btnCloseTerminal'),
    btnExportJson: document.getElementById('btnExportJson'),
    btnImportJson: document.getElementById('btnImportJson'),
    btnClearLog: document.getElementById('btnClearLog'),
    fileImportInput: document.getElementById('fileImportInput'),

    cyberToast: document.getElementById('cyberToast'),
    toastMsg: document.getElementById('toastMsg'),
    filterTabs: document.getElementById('filterTabs'),
    linkGithub: document.getElementById('linkGithub')
  };
}

/**
 * Update Master HUD UI based on current activeState
 */
export function updateHudUI(ui, activeState, currentPresets) {
  if (ui.brandHackerIcon) {
    ui.brandHackerIcon.src = (activeState.mode === 'secure' && activeState.connectionState === DNS_STATE.CONNECTED)
      ? 'icons/icon-32.png'
      : 'icons/icon-off-32.png';
  }
  ui.masterHud.classList.remove('hud-connected', 'hud-connecting', 'hud-error');
  ui.connectionBadge.className = 'hud-badge';

  const matched = currentPresets.find(p => p.id === activeState.presetId) ||
                  currentPresets.find(p => p.url.toLowerCase() === (activeState.template || '').toLowerCase());

  if (activeState.mode === 'off') {
    // 1. KILLSWITCH ACTIVE (OFF)
    ui.masterHud.classList.add('hud-error');
    ui.connectionBadge.className = 'hud-badge badge-error';
    ui.connectionBadge.textContent = 'OFFLINE (KILL)';
    ui.activeDnsName.textContent = 'Plaintext DNS (DoH Inactive)';
    ui.activeDnsUrl.textContent = 'All DoH tunnels terminated';
    ui.activePolicyStatus.textContent = 'DISABLED';
    ui.activeLatency.textContent = '-- ms';

    if (ui.sysStateDot) {
      ui.sysStateDot.className = 'state-dot state-dot-off';
    }
    if (ui.sysStateLabel) {
      ui.sysStateLabel.textContent = 'DOH OFF';
      ui.sysStateLabel.style.color = 'var(--neon-error)';
    }
  } else if (activeState.connectionState === DNS_STATE.CONNECTED && activeState.mode === 'secure') {
    // 2. CONNECTED (ONLINE)
    ui.masterHud.classList.add('hud-connected');
    ui.connectionBadge.classList.add('badge-connected');
    ui.connectionBadge.textContent = 'CONNECTED';
    ui.activeDnsName.textContent = matched ? matched.name : 'Custom DoH Endpoint';
    ui.activeDnsUrl.textContent = formatDisplayUrl(activeState.template) || 'https://...';
    ui.activePolicyStatus.textContent = 'ENFORCED';
    ui.activeLatency.textContent = activeState.lastVerifiedLatency ? `${activeState.lastVerifiedLatency} ms` : '-- ms';

    if (ui.sysStateDot) {
      ui.sysStateDot.className = 'state-dot state-dot-on';
    }
    if (ui.sysStateLabel) {
      ui.sysStateLabel.textContent = 'DOH ONLINE';
      ui.sysStateLabel.style.color = 'var(--neon-success)';
    }
  } else if (activeState.connectionState === DNS_STATE.CONNECTING || activeState.connectionState === DNS_STATE.VERIFYING) {
    // 3. SWITCHING / PROBING
    ui.masterHud.classList.add('hud-connecting');
    ui.connectionBadge.classList.add('badge-connecting');
    ui.connectionBadge.textContent = activeState.connectionState === DNS_STATE.VERIFYING ? 'VERIFYING...' : 'CONNECTING...';
    ui.activeDnsName.textContent = matched ? matched.name : 'Switching DoH...';
    ui.activeDnsUrl.textContent = formatDisplayUrl(activeState.template) || 'https://...';
    ui.activePolicyStatus.textContent = 'PROBING';
    ui.activeLatency.textContent = 'TESTING';

    if (ui.sysStateDot) {
      ui.sysStateDot.className = 'state-dot state-dot-connecting';
    }
    if (ui.sysStateLabel) {
      ui.sysStateLabel.textContent = 'CONNECTING...';
      ui.sysStateLabel.style.color = 'var(--neon-accent)';
    }
  } else {
    // 4. SYSTEM AUTO
    ui.connectionBadge.classList.add('badge-idle');
    ui.connectionBadge.textContent = 'SYSTEM AUTO';
    ui.activeDnsName.textContent = 'Opportunistic System Resolver';
    ui.activeDnsUrl.textContent = 'Chromium automatic opportunistic DoH';
    ui.activePolicyStatus.textContent = 'DEFAULT';
    ui.activeLatency.textContent = '-- ms';

    if (ui.sysStateDot) {
      ui.sysStateDot.className = 'state-dot state-dot-auto';
    }
    if (ui.sysStateLabel) {
      ui.sysStateLabel.textContent = 'AUTO DNS';
      ui.sysStateLabel.style.color = 'var(--text-secondary)';
    }
  }
}

/**
 * Render Presets in the list with filtering and favorites
 */
export function renderPresetsList({
  ui,
  currentPresets,
  activeState,
  currentFilter,
  connectingPresetId,
  onActivate,
  onPing,
  onToggleFavorite,
  onDelete
}) {
  ui.presetsList.innerHTML = '';

  // Filter
  const filtered = currentPresets.filter(p => {
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

  ui.nodeCounter.textContent = `${filtered.length} NODES`;

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
      onToggleFavorite(preset.id);
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

    // URL (clean display without {?dns})
    const urlSpan = document.createElement('span');
    urlSpan.className = 'card-url';
    urlSpan.textContent = formatDisplayUrl(preset.url);
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
      onPing(preset);
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
        onActivate(preset);
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
      onDelete(preset.id);
    });
    actions.appendChild(btnDel);

    // Clicking anywhere on card connects
    card.addEventListener('click', () => {
      if (!isThisActive && !isThisConnecting) {
        onActivate(preset);
      }
    });

    card.appendChild(actions);
    ui.presetsList.appendChild(card);
  });
}

/**
 * Log message to Cyber Terminal
 */
export function logTerminal(terminalOutput, prefix, message) {
  if (!terminalOutput) return;
  const line = document.createElement('div');
  line.className = `term-line ${prefix.toLowerCase()}`;
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  line.textContent = `[${timeStr}] [${prefix}] ${message}`;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

/**
 * Show Cyber Toast
 */
export function showToast(ui, message) {
  if (!ui.cyberToast || !ui.toastMsg) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  ui.toastMsg.textContent = message;
  ui.cyberToast.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    ui.cyberToast.classList.add('hidden');
  }, 2600);
}

/**
 * Safe clipboard copy
 */
export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
