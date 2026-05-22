// DOM Elements Cache
const elStatusDot = document.getElementById('status-dot');
const elStatusText = document.getElementById('status-text');
const elLcuPill = document.getElementById('lcu-pill');

const elScreenWelcome = document.getElementById('screen-welcome');
const elScreenWorkspace = document.getElementById('screen-workspace');

const elCheckAutoRunesWelcome = document.getElementById('check-auto-runes-welcome');
const elCheckAutoSpellsWelcome = document.getElementById('check-auto-spells-welcome');
const elCheckAutoItemsWelcome = document.getElementById('check-auto-items-welcome');
const elCheckAutoRunes = document.getElementById('check-auto-runes');
const elCheckAutoSpells = document.getElementById('check-auto-spells');
const elCheckAutoItems = document.getElementById('check-auto-items');

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
const elSettingsCheckItems = document.getElementById('settings-check-items');
const elSettingsCheckFlashD = document.getElementById('settings-check-flash-d');
const elSettingsCheckDebugBrowser = document.getElementById('settings-check-debug-browser');
const elListStartingItems = document.getElementById('list-starting-items');
const elListBootsItems = document.getElementById('list-boots-items');
const elListCoreItems = document.getElementById('list-core-items');
const elBtnSettingsDone = document.getElementById('btn-settings-done');

const elInputLolPath = document.getElementById('input-lol-path');
const elBtnSavePath = document.getElementById('btn-save-path');
const elPathSuccessLbl = document.getElementById('path-success-lbl');

const elBtnMinimize = document.getElementById('btn-minimize');
const elBtnClose = document.getElementById('btn-close');

// Local visual state data memory
let activeScrapedData = null;
let activeRuneSetIndex = 0;
let ddragonVersion = '14.10.1'; // Default fallback version
let appConfig = {
  autoApplyRunes: true,
  autoApplySpells: true,
  autoApplyItems: true,
  customLoLPath: '',
  flashOnD: false,
  debugBrowser: false,
  pinnedRole: 'default'
};

// ==========================================================================
// INITIAL STATE LOADING & BINDINGS
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Fetch initial configuration & states from main process
  try {
    const state = await window.api.getInitialState();
    appConfig = state.config;
    if (state.ddragonVersion) {
      ddragonVersion = state.ddragonVersion;
    }
    updateConfigUI(appConfig);
    updateLcuStatusUI(state.appState.lcuStatus);
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
    appConfig.autoApplyItems = elCheckAutoItems.checked;
    appConfig.flashOnD = elSettingsCheckFlashD.checked;
    appConfig.debugBrowser = elSettingsCheckDebugBrowser.checked;
    
    // Sync states
    elCheckAutoRunesWelcome.checked = appConfig.autoApplyRunes;
    elCheckAutoSpellsWelcome.checked = appConfig.autoApplySpells;
    elCheckAutoItemsWelcome.checked = appConfig.autoApplyItems;
    elSettingsCheckRunes.checked = appConfig.autoApplyRunes;
    elSettingsCheckSpells.checked = appConfig.autoApplySpells;
    elSettingsCheckItems.checked = appConfig.autoApplyItems;

    window.api.toggleAutoApply({
      autoApplyRunes: appConfig.autoApplyRunes,
      autoApplySpells: appConfig.autoApplySpells,
      autoApplyItems: appConfig.autoApplyItems,
      flashOnD: appConfig.flashOnD,
      debugBrowser: appConfig.debugBrowser
    });

    updateBottomActionLayout();
  };

  elSettingsCheckFlashD.addEventListener('change', handleToggleChange);
  elSettingsCheckDebugBrowser.addEventListener('change', handleToggleChange);

  [elCheckAutoRunesWelcome, elCheckAutoSpellsWelcome, elCheckAutoItemsWelcome, elCheckAutoRunes, elCheckAutoSpells, elCheckAutoItems, elSettingsCheckRunes, elSettingsCheckSpells, elSettingsCheckItems].forEach(box => {
    box.addEventListener('change', (e) => {
      // Sync identical checkboxes
      if (box === elCheckAutoRunesWelcome || box === elSettingsCheckRunes) {
        elCheckAutoRunes.checked = e.target.checked;
      } else if (box === elCheckAutoSpellsWelcome || box === elSettingsCheckSpells) {
        elCheckAutoSpells.checked = e.target.checked;
      } else if (box === elCheckAutoItemsWelcome || box === elSettingsCheckItems) {
        elCheckAutoItems.checked = e.target.checked;
      } else if (box === elCheckAutoRunes) {
        elCheckAutoRunesWelcome.checked = e.target.checked;
        elSettingsCheckRunes.checked = e.target.checked;
      } else if (box === elCheckAutoSpells) {
        elCheckAutoSpellsWelcome.checked = e.target.checked;
        elSettingsCheckSpells.checked = e.target.checked;
      } else if (box === elCheckAutoItems) {
        elCheckAutoItemsWelcome.checked = e.target.checked;
        elSettingsCheckItems.checked = e.target.checked;
      }
      handleToggleChange();
    });
  });

  // Manual applying click handler
  elBtnManualApply.addEventListener('click', () => {
    if (activeScrapedData) {
      // Pick first/selected rune set
      const runeSet = activeScrapedData.runeSets
        ? activeScrapedData.runeSets[activeRuneSetIndex]
        : activeScrapedData.runes;
      window.api.applyBuild({
        runes: runeSet.raw,
        summoners: activeScrapedData.summoners.raw,
        items: activeScrapedData.items
      });

      // Show temporary manual success indicator
      elActionStatusIndicator.innerHTML = '<span class="indicator-green-text">✅ ¡Runas y hechizos aplicados con éxito!</span>';
      elActionStatusIndicator.classList.add('active');
    }
  });

  // 5. Bind role selector buttons click events
  if (elRoleSelector) {
    const buttons = elRoleSelector.querySelectorAll('.role-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        // Visually update immediately for responsiveness
        updateActiveRoleUI(role);
        // Trigger main thread change-role IPC
        window.api.changeRole(role);
      });
    });
  }

  // 6. Bind pin role button
  const elBtnPinRole = document.getElementById('btn-pin-role');
  if (elBtnPinRole) {
    elBtnPinRole.addEventListener('click', () => {
      const activeBtn = elRoleSelector.querySelector('.role-btn.active');
      const activeRole = activeBtn ? activeBtn.getAttribute('data-role') : 'default';

      if (appConfig.pinnedRole && appConfig.pinnedRole !== 'default') {
        if (appConfig.pinnedRole === activeRole) {
          // If clicking while looking at the pinned role, unpin it
          appConfig.pinnedRole = 'default';
          window.api.pinRole('default');
          updatePinnedRoleUI('default');
        } else {
          // If looking at a different role, pin this new role instead!
          if (activeRole && activeRole !== 'default') {
            appConfig.pinnedRole = activeRole;
            window.api.pinRole(activeRole);
            updatePinnedRoleUI(activeRole);
          }
        }
      } else {
        // Pin the active role
        if (activeRole && activeRole !== 'default') {
          appConfig.pinnedRole = activeRole;
          window.api.pinRole(activeRole);
          updatePinnedRoleUI(activeRole);
        }
      }
    });
  }
});

// Sync visual toggle checkbox states
function updateConfigUI(config) {
  elCheckAutoRunesWelcome.checked = config.autoApplyRunes;
  elCheckAutoSpellsWelcome.checked = config.autoApplySpells;
  elCheckAutoItemsWelcome.checked = config.autoApplyItems;
  elCheckAutoRunes.checked = config.autoApplyRunes;
  elCheckAutoSpells.checked = config.autoApplySpells;
  elCheckAutoItems.checked = config.autoApplyItems;
  elSettingsCheckRunes.checked = config.autoApplyRunes;
  elSettingsCheckSpells.checked = config.autoApplySpells;
  elSettingsCheckItems.checked = config.autoApplyItems;
  elSettingsCheckFlashD.checked = !!config.flashOnD;
  elSettingsCheckDebugBrowser.checked = !!config.debugBrowser;
  elInputLolPath.value = config.customLoLPath || '';

  updatePinnedRoleUI(config.pinnedRole);
}

// Update the visual representation of the pinned role button
function updatePinnedRoleUI(pinnedRole) {
  const elBtnPinRole = document.getElementById('btn-pin-role');
  const elPinRoleText = document.getElementById('pin-role-text');
  if (!elBtnPinRole || !elPinRoleText) return;

  const roleLabels = {
    'default': 'default',
    'top': 'TOP',
    'jungle': 'JUG',
    'mid': 'MID',
    'bot': 'BOT',
    'support': 'SUP'
  };

  if (pinnedRole && pinnedRole !== 'default') {
    elBtnPinRole.classList.add('pinned');
    elPinRoleText.textContent = `Fijado: ${roleLabels[pinnedRole] || pinnedRole.toUpperCase()}`;
    elBtnPinRole.title = `Rol ${pinnedRole.toUpperCase()} fijado. Haz clic para desanclar.`;
  } else {
    elBtnPinRole.classList.remove('pinned');
    elPinRoleText.textContent = 'Fijar Rol';
    elBtnPinRole.title = 'Fijar rol seleccionado para que se aplique siempre';
  }
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
  if (appConfig.autoApplyRunes && appConfig.autoApplySpells && appConfig.autoApplyItems) {
    elActionStatusIndicator.innerHTML = '';
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
window.api.onChampSelectUpdate(({ active, championName, championDisplayName, championImage, role, ddragonVersion: newVersion }) => {
  if (newVersion) {
    ddragonVersion = newVersion;
  }
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
      elChampPortrait.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championImage}`;
      elChampBgBanner.style.backgroundImage = `url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg')`;
      
      // Update role selector active state
      updateActiveRoleUI(role || 'default');
    } else {
      // Hovering slot but no selection locked
      elChampName.textContent = 'SELECCIONANDO...';
      elChampPortrait.src = '';
      elChampBgBanner.style.backgroundImage = 'none';
      
      // Reset role selector active state to default/ALL
      updateActiveRoleUI('default');
    }
  }
});

// Helper to update active role button visual state
function updateActiveRoleUI(activeRole) {
  if (!elRoleSelector) return;
  const buttons = elRoleSelector.querySelectorAll('.role-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-role') === activeRole) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

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
  if (data && data.ddragonVersion) {
    ddragonVersion = data.ddragonVersion;
  }
  activeScrapedData = data;
  renderBuildDetails(data);
  if (data.role) {
    updateActiveRoleUI(data.role);
  }
});

// ==========================================================================
// TEMPLATE ENGINE / RENDERING LOGIC
// ==========================================================================
function renderBuildDetails(data) {
  const summoners = data.summoners;
  const items = data.items || { startingBuild: [], popularBoots: [], coreItems: [] };

  // 1. Reset tab state and render tab selector
  activeRuneSetIndex = 0;
  
  // Sort the runeSets descending by playrate defensively
  if (data.runeSets && data.runeSets.length > 0) {
    data.runeSets.sort((a, b) => (b.playrate || 0) - (a.playrate || 0));
    // Make sure data.runes points to the most popular set
    data.runes = data.runeSets[0];
  }

  renderRuneSetTabs(data.runeSets || [data.runes]);

  // 2. Render the first (most popular) rune set
  renderRuneSet(data.runes);

  // 3. Draw Summoner Spells
  elListSpells.innerHTML = '';
  [summoners.spell1, summoners.spell2].forEach((spell) => {
    const container = document.createElement('div');
    container.className = 'spell-icon-container';
    container.title = spell.name;

    const img = document.createElement('img');
    img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/spell/${spell.icon}`;
    img.className = 'rune-img';
    img.alt = spell.name;

    container.appendChild(img);
    elListSpells.appendChild(container);
  });

  // 4. Draw Recommended Items
  renderItemGroup(elListStartingItems, items.startingBuild);
  renderItemGroup(elListBootsItems, items.popularBoots);
  renderItemGroup(elListCoreItems, items.coreItems.slice(0, 6));

  // 5. Update Footer Indicators
  updateBottomActionLayout();
}

// Render the rune trees for a single rune set
function renderRuneSet(runeSet) {
  if (!runeSet) return;

  // Primary Tree Header
  elIconPrimaryStyle.src = `https://ddragon.leagueoflegends.com/cdn/img/${runeSet.primaryStyleIcon}`;
  elNamePrimaryStyle.textContent = runeSet.primaryStyleName;

  // Primary Tree Perks
  elListPrimaryRunes.innerHTML = '';
  runeSet.primaryPerks.forEach((perk, index) => {
    const isKeystone = index === 0;
    elListPrimaryRunes.appendChild(createRuneRowHtml(perk, isKeystone));
  });

  // Secondary Tree Header
  elIconSubStyle.src = `https://ddragon.leagueoflegends.com/cdn/img/${runeSet.subStyleIcon}`;
  elNameSubStyle.textContent = runeSet.subStyleName;

  // Secondary Tree Perks
  elListSecondaryRunes.innerHTML = '';
  runeSet.secondaryPerks.forEach((perk) => {
    elListSecondaryRunes.appendChild(createRuneRowHtml(perk, false));
  });

  // Stat Shards
  elListShards.innerHTML = '';
  runeSet.shardsPerks.forEach((perk) => {
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
}

// Build the tab selector row above the rune preview
function renderRuneSetTabs(runeSets) {
  const tabsContainer = document.getElementById('rune-set-tabs');
  if (!tabsContainer) return;

  if (!runeSets || runeSets.length <= 1) {
    tabsContainer.style.display = 'none';
    return;
  }

  tabsContainer.style.display = 'flex';
  tabsContainer.innerHTML = '';

  runeSets.forEach((set, index) => {
    const tab = document.createElement('button');
    tab.className = 'rune-set-tab' + (index === 0 ? ' active' : '');
    tab.id = `rune-set-tab-${index}`;
    tab.title = `${set.primaryStyleName} + ${set.subStyleName}`;

    // Keystone icon
    const keystone = set.primaryPerks && set.primaryPerks[0];
    if (keystone && keystone.icon) {
      const keystoneImg = document.createElement('img');
      keystoneImg.src = `https://ddragon.leagueoflegends.com/cdn/img/${keystone.icon}`;
      keystoneImg.className = 'tab-keystone';
      keystoneImg.alt = keystone.name || '';
      tab.appendChild(keystoneImg);
    }

    const labelDiv = document.createElement('div');
    labelDiv.className = 'tab-labels';

    const mainLabel = document.createElement('div');
    mainLabel.className = 'tab-label';
    mainLabel.textContent = set.primaryStyleName;

    const subLabel = document.createElement('div');
    subLabel.className = 'tab-sub';
    subLabel.textContent = `+ ${set.subStyleName}`;

    labelDiv.appendChild(mainLabel);
    labelDiv.appendChild(subLabel);

    // Inyectar el badge de playrate
    if (set.playrate) {
      const playrateBadge = document.createElement('div');
      playrateBadge.className = 'tab-playrate';
      playrateBadge.textContent = `${set.playrate}% PR`;
      labelDiv.appendChild(playrateBadge);
    }

    tab.appendChild(labelDiv);

    tab.addEventListener('click', () => switchRuneSet(index));
    tabsContainer.appendChild(tab);
  });
}

// Switch the displayed rune set when a tab is clicked
function switchRuneSet(index) {
  if (!activeScrapedData || !activeScrapedData.runeSets || !activeScrapedData.runeSets[index]) return;
  activeRuneSetIndex = index;

  // Update tab active states
  document.querySelectorAll('.rune-set-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  // Re-render rune columns with the selected set
  renderRuneSet(activeScrapedData.runeSets[index]);

  // Auto-apply if enabled
  if (appConfig.autoApplyRunes) {
    window.api.applyBuild({ runes: activeScrapedData.runeSets[index].raw });
  }
}

// Helper to render a group of item items beautifully
function renderItemGroup(container, itemsList) {
  if (!container) return;
  container.innerHTML = '';
  if (!itemsList || itemsList.length === 0) {
    const emptySpan = document.createElement('span');
    emptySpan.className = 'rune-desc';
    emptySpan.textContent = 'Ninguno';
    container.appendChild(emptySpan);
    return;
  }

  itemsList.forEach(item => {
    const wrapper = document.createElement('div');
    wrapper.className = 'item-wrapper';
    wrapper.title = `${item.name} (${item.gold} oro)`;

    const img = document.createElement('img');
    img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${item.id}.png`;
    img.className = 'item-icon';
    img.alt = item.name;
    
    // In case specific DDragon item ID fails to load, try Onetricks CDN, then fall back to placeholder
    img.onerror = () => {
      if (img.src.includes('ddragon.leagueoflegends.com')) {
        img.src = `https://d3liizu15b1tmi.cloudfront.net/onetricks/16.9.1/img/item/${item.id}.png`;
      } else {
        img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/3601.png`;
      }
    };

    wrapper.appendChild(img);
    container.appendChild(wrapper);
  });
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
