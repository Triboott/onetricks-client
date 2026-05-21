// DOM Elements Cache
const elStatusDot = document.getElementById('status-dot');
const elStatusText = document.getElementById('status-text');
const elLcuPill = document.getElementById('lcu-pill');

const elScreenWelcome = document.getElementById('screen-welcome');
const elScreenWorkspace = document.getElementById('screen-workspace');
const elScreenDebug = document.getElementById('screen-debug');
const elBtnDebugMode = document.getElementById('btn-debug-mode');
const elDebugSearch = document.getElementById('debug-search');
const elDebugChampGrid = document.getElementById('debug-champ-grid');

const elCheckAutoRunesWelcome = document.getElementById('check-auto-runes-welcome');
const elCheckAutoSpellsWelcome = document.getElementById('check-auto-spells-welcome');
const elCheckAutoRunes = document.getElementById('check-auto-runes');
const elCheckAutoSpells = document.getElementById('check-auto-spells');

const elChampBgBanner = document.getElementById('champ-bg-banner');
const elChampPortrait = document.getElementById('champ-portrait');
const elChampName = document.getElementById('champ-name');
const elRoleSelector = document.getElementById('role-selector');

const elLoadingOverlay = document.getElementById('loading-overlay');
const elLoadingText = document.getElementById('loading-text');

const elIconPrimaryStyle = document.getElementById('icon-primary-style');
const elNamePrimaryStyle = document.getElementById('name-primary-style');
const elListPrimaryRunes = document.getElementById('list-primary-runes');

const elIconSubStyle = document.getElementById('icon-sub-style');
const elNameSubStyle = document.getElementById('name-sub-style');
const elListSecondaryRunes = document.getElementById('list-secondary-runes');

const elListShards = document.getElementById('list-shards');
const elListSpells = document.getElementById('list-spells');

const elActionStatusIndicator = document.getElementById('action-status-indicator');
const elBtnManualApply = document.getElementById('btn-manual-apply');

const elBtnSettings = document.getElementById('btn-settings');
const elBtnSettingsClose = document.getElementById('btn-settings-close');
const elSettingsOverlay = document.getElementById('settings-overlay');
const elSettingsCheckRunes = document.getElementById('settings-check-runes');
const elSettingsCheckSpells = document.getElementById('settings-check-spells');
const elBtnSettingsDone = document.getElementById('btn-settings-done');

const elInputLolPath = document.getElementById('input-lol-path');
const elBtnSavePath = document.getElementById('btn-save-path');
const elPathSuccessLbl = document.getElementById('path-success-lbl');

const elBtnMinimize = document.getElementById('btn-minimize');
const elBtnClose = document.getElementById('btn-close');

// Local visual state data memory
let activeScrapedData = null;
let appConfig = {
  autoApplyRunes: true,
  autoApplySpells: true,
  customLoLPath: ''
};
let allChampionsList = [];
let currentScreenBeforeDebug = 'screen-welcome';

// ==========================================================================
// INITIAL STATE LOADING & BINDINGS
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Fetch initial configuration & states from main process
  try {
    const state = await window.api.getInitialState();
    appConfig = state.config;
    updateConfigUI(appConfig);
    updateLcuStatusUI(state.appState.lcuStatus);

    // Populate champion list for the debug mode
    const champions = state.champions || {};
    allChampionsList = Object.keys(champions).map(id => ({
      id: parseInt(id),
      name: champions[id].name,
      displayName: champions[id].displayName,
      image: champions[id].image
    })).sort((a, b) => a.displayName.localeCompare(b.displayName));

    renderChampionGrid(allChampionsList);
  } catch (err) {
    console.error('Failed to get initial state:', err);
  }

  // 2. Bind Header window custom actions (Minimize / Close)
  elBtnMinimize.addEventListener('click', () => window.api.minimizeWindow());
  elBtnClose.addEventListener('click', () => window.api.closeWindow());

  // 3. Bind Settings overlays openers/closers
  elBtnSettings.addEventListener('click', () => {
    elSettingsOverlay.classList.add('active');
  });
  
  const closeSettings = () => {
    elSettingsOverlay.classList.remove('active');
    elPathSuccessLbl.style.display = 'none';
  };
  elBtnSettingsClose.addEventListener('click', closeSettings);
  elBtnSettingsDone.addEventListener('click', closeSettings);

  // 4. Bind settings save buttons & toggles
  elBtnSavePath.addEventListener('click', () => {
    const pathStr = elInputLolPath.value.trim();
    window.api.saveCustomPath(pathStr);
    elPathSuccessLbl.style.display = 'block';
    setTimeout(() => {
      elPathSuccessLbl.style.display = 'none';
    }, 3000);
  });

  // Wire sync across all identical checkboxes in UI
  const handleToggleChange = () => {
    appConfig.autoApplyRunes = elCheckAutoRunes.checked;
    appConfig.autoApplySpells = elCheckAutoSpells.checked;
    
    // Sync states
    elCheckAutoRunesWelcome.checked = appConfig.autoApplyRunes;
    elCheckAutoSpellsWelcome.checked = appConfig.autoApplySpells;
    elSettingsCheckRunes.checked = appConfig.autoApplyRunes;
    elSettingsCheckSpells.checked = appConfig.autoApplySpells;

    window.api.toggleAutoApply({
      autoApplyRunes: appConfig.autoApplyRunes,
      autoApplySpells: appConfig.autoApplySpells
    });

    updateBottomActionLayout();
  };

  [elCheckAutoRunesWelcome, elCheckAutoSpellsWelcome, elCheckAutoRunes, elCheckAutoSpells, elSettingsCheckRunes, elSettingsCheckSpells].forEach(box => {
    box.addEventListener('change', (e) => {
      // Sync identical checkboxes
      if (box === elCheckAutoRunesWelcome || box === elSettingsCheckRunes) {
        elCheckAutoRunes.checked = e.target.checked;
      } else if (box === elCheckAutoSpellsWelcome || box === elSettingsCheckSpells) {
        elCheckAutoSpells.checked = e.target.checked;
      } else if (box === elCheckAutoRunes) {
        elCheckAutoRunesWelcome.checked = e.target.checked;
        elSettingsCheckRunes.checked = e.target.checked;
      } else if (box === elCheckAutoSpells) {
        elCheckAutoSpellsWelcome.checked = e.target.checked;
        elSettingsCheckSpells.checked = e.target.checked;
      }
      handleToggleChange();
    });
  });

  // Manual applying click handler
  elBtnManualApply.addEventListener('click', () => {
    if (activeScrapedData) {
      window.api.applyBuild({
        runes: activeScrapedData.runes.raw,
        summoners: activeScrapedData.summoners.raw
      });

      // Show temporary manual success indicator
      elActionStatusIndicator.innerHTML = '<span class="indicator-green-text">✅ ¡Runas y hechizos aplicados con éxito!</span>';
      elActionStatusIndicator.classList.add('active');
    }
  });

  // Bind role tabs manual selection clicks
  const roleTabs = elRoleSelector.querySelectorAll('.role-tab');
  roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const selectedRole = tab.getAttribute('data-role');
      // Highlight visually
      roleTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Request scraper change role
      window.api.changeRole(selectedRole);
    });
  });

  // 5. Bind MODO TEST toggle
  elBtnDebugMode.addEventListener('click', () => {
    const isDebugActive = elScreenDebug.classList.contains('active');
    
    if (isDebugActive) {
      elScreenDebug.classList.remove('active');
      elBtnDebugMode.classList.remove('active');
      
      // Determine which screen to return to
      if (activeScrapedData) {
        elScreenWorkspace.classList.add('active');
      } else {
        elScreenWelcome.classList.add('active');
      }
    } else {
      // Record active screen before going into debug
      if (elScreenWorkspace.classList.contains('active')) {
        currentScreenBeforeDebug = 'screen-workspace';
        elScreenWorkspace.classList.remove('active');
      } else {
        currentScreenBeforeDebug = 'screen-welcome';
        elScreenWelcome.classList.remove('active');
      }
      
      elScreenDebug.classList.add('active');
      elBtnDebugMode.classList.add('active');
      elDebugSearch.value = '';
      renderChampionGrid(allChampionsList);
      elDebugSearch.focus();
    }
  });

  // 6. Bind debug search input for real-time filtering
  elDebugSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtered = allChampionsList.filter(champ => {
      const normName = champ.displayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normName.includes(query);
    });
    renderChampionGrid(filtered);
  });
});

// Sync visual toggle checkbox states
function updateConfigUI(config) {
  elCheckAutoRunesWelcome.checked = config.autoApplyRunes;
  elCheckAutoSpellsWelcome.checked = config.autoApplySpells;
  elCheckAutoRunes.checked = config.autoApplyRunes;
  elCheckAutoSpells.checked = config.autoApplySpells;
  elSettingsCheckRunes.checked = config.autoApplyRunes;
  elSettingsCheckSpells.checked = config.autoApplySpells;
  elInputLolPath.value = config.customLoLPath || '';
}

// Update connection pill visual styles in header
function updateLcuStatusUI(status) {
  elStatusDot.className = 'status-dot ' + status;
  
  if (status === 'connected') {
    elStatusText.textContent = 'LCU CONECTADO';
    elLcuPill.style.borderColor = 'rgba(16, 185, 129, 0.25)';
  } else if (status === 'scanning') {
    elStatusText.textContent = 'BUSCANDO CLIENTE...';
    elLcuPill.style.borderColor = 'rgba(245, 158, 11, 0.25)';
  } else {
    elStatusText.textContent = 'DESCONECTADO';
    elLcuPill.style.borderColor = 'rgba(255, 255, 255, 0.05)';
  }
}

// Update manual/auto layout of bottom actions footer
function updateBottomActionLayout() {
  if (appConfig.autoApplyRunes && appConfig.autoApplySpells) {
    elActionStatusIndicator.innerHTML = '<span class="indicator-green-text">✅ Runas aplicadas automáticamente</span>';
    elActionStatusIndicator.classList.add('active');
    elBtnManualApply.style.display = 'none';
  } else {
    elActionStatusIndicator.classList.remove('active');
    elBtnManualApply.style.display = 'block';
  }
}

// ==========================================================================
// BACKGROUND THREAD EVENTS LISTENERS (IPC BRIDGES)
// ==========================================================================

// Connection status updates listener
window.api.onLcuStatus(({ status, config }) => {
  updateLcuStatusUI(status);
  if (config) {
    appConfig = config;
    updateConfigUI(config);
  }
});

// Champion selection changes listener
window.api.onChampSelectUpdate(({ active, championName, championDisplayName, championImage, activeRole }) => {
  // Always close debug mode when champion select session details change
  elScreenDebug.classList.remove('active');
  elBtnDebugMode.classList.remove('active');

  if (!active) {
    // Screen welcome transition
    elScreenWorkspace.classList.remove('active');
    elScreenWelcome.classList.add('active');
    activeScrapedData = null;
  } else {
    // Screen workspace transition
    elScreenWelcome.classList.remove('active');
    elScreenWorkspace.classList.add('active');

    if (championName && championImage) {
      elChampName.textContent = championDisplayName.toUpperCase();
      elChampPortrait.src = `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${championImage}`;
      elChampBgBanner.style.backgroundImage = `url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg')`;
      
      // Update role selector tabs with the detected active role
      const detectedRole = activeRole || 'default';
      const roleTabs = elRoleSelector.querySelectorAll('.role-tab');
      roleTabs.forEach(tab => {
        if (tab.getAttribute('data-role') === detectedRole) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    } else {
      // Hovering slot but no selection locked
      elChampName.textContent = 'SELECCIONANDO...';
      elChampPortrait.src = '';
      elChampBgBanner.style.backgroundImage = 'none';
      
      // Reset role selector tabs to AUTO (default)
      const roleTabs = elRoleSelector.querySelectorAll('.role-tab');
      roleTabs.forEach(tab => {
        if (tab.getAttribute('data-role') === 'default') {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    }
  }
});

// Scraping stages listeners
window.api.onScrapeProgress(({ status, message }) => {
  elLoadingText.textContent = message;
  elLoadingOverlay.classList.add('active');
});

window.api.onScrapeError(({ message }) => {
  elLoadingText.textContent = `❌ ${message}`;
  setTimeout(() => {
    elLoadingOverlay.classList.remove('active');
  }, 3000);
});

window.api.onScrapeSuccess((data) => {
  elLoadingOverlay.classList.remove('active');
  activeScrapedData = data;
  renderBuildDetails(data);
});

// ==========================================================================
// TEMPLATE ENGINE / RENDERING LOGIC
// ==========================================================================
function renderBuildDetails(data) {
  const runes = data.runes;
  const summoners = data.summoners;

  // 1. Draw Primary Tree Header details
  elIconPrimaryStyle.src = `https://ddragon.leagueoflegends.com/cdn/img/${runes.primaryStyleIcon}`;
  elNamePrimaryStyle.textContent = runes.primaryStyleName;

  // 2. Draw Primary Tree Perks
  elListPrimaryRunes.innerHTML = '';
  runes.primaryPerks.forEach((perk, index) => {
    const isKeystone = index === 0;
    elListPrimaryRunes.appendChild(createRuneRowHtml(perk, isKeystone));
  });

  // 3. Draw Secondary Tree Header details
  elIconSubStyle.src = `https://ddragon.leagueoflegends.com/cdn/img/${runes.subStyleIcon}`;
  elNameSubStyle.textContent = runes.subStyleName;

  // 4. Draw Secondary Tree Perks
  elListSecondaryRunes.innerHTML = '';
  runes.secondaryPerks.forEach((perk) => {
    elListSecondaryRunes.appendChild(createRuneRowHtml(perk, false));
  });

  // 5. Draw Stat Shards
  elListShards.innerHTML = '';
  runes.shardsPerks.forEach((perk) => {
    const container = document.createElement('div');
    container.className = 'shard-icon-container';
    container.title = perk.name;
    
    const img = document.createElement('img');
    img.src = `https://ddragon.leagueoflegends.com/cdn/img/${perk.icon}`;
    img.className = 'rune-img';
    img.alt = perk.name;
    
    container.appendChild(img);
    elListShards.appendChild(container);
  });

  // 6. Draw Summoner Spells
  elListSpells.innerHTML = '';
  [summoners.spell1, summoners.spell2].forEach((spell) => {
    const container = document.createElement('div');
    container.className = 'spell-icon-container';
    container.title = spell.name;
    
    const img = document.createElement('img');
    img.src = `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/spell/${spell.icon}`;
    img.className = 'rune-img';
    img.alt = spell.name;
    
    container.appendChild(img);
    elListSpells.appendChild(container);
  });

  // 7. Update Footer Indicators
  updateBottomActionLayout();
}

// Helper to construct a single visual row element for a rune
function createRuneRowHtml(perk, isKeystone) {
  const row = document.createElement('div');
  row.className = 'rune-row' + (isKeystone ? ' keystone' : '');
  row.title = perk.name;

  const iconBox = document.createElement('div');
  iconBox.className = 'rune-img-container';

  const img = document.createElement('img');
  img.src = `https://ddragon.leagueoflegends.com/cdn/img/${perk.icon}`;
  img.className = 'rune-img';
  img.alt = perk.name;
  iconBox.appendChild(img);

  const meta = document.createElement('div');
  meta.className = 'rune-meta';

  const name = document.createElement('div');
  name.className = 'rune-name';
  name.textContent = perk.name;

  const desc = document.createElement('div');
  desc.className = 'rune-desc';
  desc.textContent = perk.desc;

  meta.appendChild(name);
  meta.appendChild(desc);

  row.appendChild(iconBox);
  row.appendChild(meta);

  return row;
}

// Render dynamic grid of champion cards inside MODO TEST
function renderChampionGrid(list) {
  elDebugChampGrid.innerHTML = '';
  list.forEach(champ => {
    const card = document.createElement('div');
    card.className = 'debug-champ-card';
    card.setAttribute('data-id', champ.id);
    card.title = champ.displayName;

    const portrait = document.createElement('div');
    portrait.className = 'debug-champ-portrait';
    const img = document.createElement('img');
    img.src = `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${champ.image}`;
    img.alt = champ.displayName;
    img.loading = "lazy";
    portrait.appendChild(img);

    const name = document.createElement('div');
    name.className = 'debug-champ-name';
    name.textContent = champ.displayName;

    card.appendChild(portrait);
    card.appendChild(name);

    // Simulated click handler
    card.addEventListener('click', () => {
      window.api.simulateChampion(champ.id);
    });

    elDebugChampGrid.appendChild(card);
  });
}
