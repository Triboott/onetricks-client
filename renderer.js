// DOM Elements Cache
const elStatusDot = document.getElementById('status-dot');
const elStatusText = document.getElementById('status-text');
const elLcuPill = document.getElementById('lcu-pill');

const elWelcomeProfileContainer = document.getElementById('welcome-profile-container');
const elWorkspaceProfileContainer = document.getElementById('workspace-profile-container');

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
const elSkillOrderBox = document.getElementById('skill-order-box');
const elSkillOrderValue = document.getElementById('skill-order-value');

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
const elSettingsCheckStartLogin = document.getElementById('settings-check-start-login');
const elListStartingItems = document.getElementById('list-starting-items');
const elListBootsItems = document.getElementById('list-boots-items');
const elListCoreItems = document.getElementById('list-core-items');
const elListRecommendedItems = document.getElementById('list-recommended-items');
const elBtnSettingsDone = document.getElementById('btn-settings-done');

const elInputLolPath = document.getElementById('input-lol-path');
const elBtnSavePath = document.getElementById('btn-save-path');
const elPathSuccessLbl = document.getElementById('path-success-lbl');

const elBtnMinimize = document.getElementById('btn-minimize');
const elBtnClose = document.getElementById('btn-close');

// Local visual state data memory
let activeScrapedData = null;
let activeRuneSetIndex = 0;
let activeRuneSet = null;
let runesReforged = [];
let ddragonVersion = '14.10.1'; // Default fallback version
let lastPlayerInfo = null; // Store last player info to allow re-rendering when DDragon loads
let appConfig = {
  autoApplyRunes: true,
  autoApplySpells: true,
  autoApplyItems: true,
  customLoLPath: '',
  flashOnD: false,
  debugBrowser: false,
  startAtLogin: false,
  pinnedRole: 'default'
};

// ==========================================================================
// INITIAL STATE LOADING & BINDINGS
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Load runesReforged.json from local cache
  try {
    const res = await fetch('ddragon_cache/runesReforged.json');
    runesReforged = await res.json();
    console.log('[RENDERER] Loaded runesReforged.json successfully');
  } catch (err) {
    console.error('[RENDERER] Failed to load runesReforged.json:', err);
  }

  // 1. Fetch initial configuration & states from main process
  try {
    const state = await window.api.getInitialState();
    appConfig = state.config;
    if (state.ddragonVersion) {
      ddragonVersion = state.ddragonVersion;
    }
    updateConfigUI(appConfig);
    updateLcuStatusUI(state.appState.lcuStatus);
    if (state.appState.lcuStatus === 'connected' && state.playerInfo) {
      updatePlayerProfileUI(state.playerInfo);
    } else {
      updatePlayerProfileUI(null);
    }
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
    appConfig.startAtLogin = elSettingsCheckStartLogin.checked;
    
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
      debugBrowser: appConfig.debugBrowser,
      startAtLogin: appConfig.startAtLogin
    });

    updateBottomActionLayout();
  };

  elSettingsCheckFlashD.addEventListener('change', handleToggleChange);
  elSettingsCheckDebugBrowser.addEventListener('change', handleToggleChange);
  elSettingsCheckStartLogin.addEventListener('change', handleToggleChange);

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
  elSettingsCheckStartLogin.checked = !!config.startAtLogin;
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

// Translate ranks to Spanish
const TIER_TRANSLATIONS = {
  'IRON': 'Hierro',
  'BRONZE': 'Bronce',
  'SILVER': 'Plata',
  'GOLD': 'Oro',
  'PLATINUM': 'Platino',
  'EMERALD': 'Esmeralda',
  'DIAMOND': 'Diamante',
  'MASTER': 'Maestro',
  'GRANDMASTER': 'Gran Maestro',
  'CHALLENGER': 'Aspirante',
  'UNRANKED': 'Unranked'
};

function updatePlayerProfileUI(playerInfo) {
  lastPlayerInfo = playerInfo;
  if (!playerInfo) {
    if (elWelcomeProfileContainer) {
      elWelcomeProfileContainer.innerHTML = `
        <div class="player-profile-card rank-disconnected">
          <div class="profile-card-content" style="justify-content: center; text-align: center; padding: 12px 16px;">
            <div class="profile-info" style="align-items: center; gap: 4px;">
              <span class="profile-name pulsing-text" style="color: var(--text-muted); font-size: 13px; font-weight: 700;">🔌 ESPERANDO CONEXIÓN LCU...</span>
              <span class="profile-tier" style="color: rgba(255, 255, 255, 0.25); font-size: 10px; font-weight: 500; letter-spacing: 0.5px;">Inicia selección de campeones o abre League of Legends</span>
            </div>
          </div>
        </div>
      `;
    }
    if (elWorkspaceProfileContainer) {
      elWorkspaceProfileContainer.innerHTML = '';
      elWorkspaceProfileContainer.style.display = 'none';
    }
    return;
  }

  const rawTier = (playerInfo.tier || 'UNRANKED').toUpperCase();
  const tierClass = rawTier.toLowerCase();
  const translatedTier = TIER_TRANSLATIONS[rawTier] || rawTier;
  
  const isApex = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rawTier);
  const divisionStr = isApex ? '' : ` ${playerInfo.division || ''}`;
  const tierLabel = rawTier === 'UNRANKED' || rawTier === 'NONE'
    ? 'SIN CLASIFICAR'
    : `${translatedTier}${divisionStr} (${playerInfo.lp} LP)`;
    
  const totalGames = playerInfo.wins + playerInfo.losses;
  const statsText = totalGames > 0
    ? `${playerInfo.winrate}% WR - ${totalGames} Partidas`
    : '0% WR - 0 Partidas';
    
  const avatarUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${playerInfo.profileIconId}.png`;

  const cardHtml = `
    <div class="player-profile-card rank-${tierClass}">
      <div class="rank-bg-glow"></div>
      <div class="profile-card-content">
        <div class="avatar-wrapper">
          <img class="profile-avatar" src="${avatarUrl}" alt="Avatar" onerror="if(!this.src.includes('14.10.1')){this.src='https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/${playerInfo.profileIconId}.png';}else{this.onerror=null;this.src='https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/29.png';}">
          <span class="profile-level">${playerInfo.summonerLevel}</span>
        </div>
        <div class="profile-info">
          <span class="profile-name">${playerInfo.displayName}</span>
          <div class="rank-badge-row">
            <span class="profile-tier">${tierLabel}</span>
          </div>
          <span class="profile-stats">${statsText}</span>
        </div>
      </div>
    </div>
  `;

  if (elWelcomeProfileContainer) {
    elWelcomeProfileContainer.innerHTML = cardHtml;
  }
  if (elWorkspaceProfileContainer) {
    elWorkspaceProfileContainer.innerHTML = cardHtml;
    elWorkspaceProfileContainer.style.display = 'block';
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
window.api.onLcuStatus(({ status, config, playerInfo, ddragonVersion: newVersion }) => {
  if (newVersion) {
    ddragonVersion = newVersion;
  }
  updateLcuStatusUI(status);
  if (status !== 'connected') {
    updatePlayerProfileUI(null);
  } else if (playerInfo) {
    updatePlayerProfileUI(playerInfo);
  }
  if (config) {
    appConfig = config;
    updateConfigUI(config);
  }
});

// Listener for asynchronous Data Dragon version initialization
window.api.onDDragonReady((newVersion) => {
  console.log(`[RENDERER] DDragon version ready: ${newVersion}`);
  ddragonVersion = newVersion;
  if (lastPlayerInfo) {
    updatePlayerProfileUI(lastPlayerInfo);
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
// Stat Shards metadata for high-fidelity 3x3 grid display
const SHARD_META = {
  5001: { name: 'Vida Plana', icon: 'perk-images/StatMods/StatModsHealthPlusIcon.png' },
  5002: { name: 'Armadura', icon: 'perk-images/StatMods/StatModsArmorIcon.png' },
  5003: { name: 'Resistencia Mágica', icon: 'perk-images/StatMods/StatModsMagicResIcon.png' },
  5005: { name: 'Velocidad de Ataque', icon: 'perk-images/StatMods/StatModsAttackSpeedIcon.png' },
  5007: { name: 'Aceleración de Habilidad', icon: 'perk-images/StatMods/StatModsCDRScalingIcon.png' },
  5008: { name: 'Fuerza Adaptable', icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png' },
  5010: { name: 'Velocidad de Movimiento', icon: 'perk-images/StatMods/StatModsMovementSpeedIcon.png' },
  5011: { name: 'Vida Escalar', icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png' },
  5012: { name: 'Resistencia Escalar', icon: 'perk-images/StatMods/StatModsAdaptiveForceScalingIcon.png' },
  5013: { name: 'Tenacidad y Resistencia a Ralentizaciones', icon: 'perk-images/StatMods/StatModsTenacityIcon.png' }
};

// State variables for Keystone-grouped selection
let activeKeystonesList = [];
let selectedKeystoneIndex = 0;
let selectedSetIndex = 0;
let selectedSummonerIndex = 0;

function renderBuildDetails(data) {
  const summoners = data.summoners;
  const items = data.items || { startingBuild: [], popularBoots: [], coreBuild: [], recommendedItems: [], coreItems: [] };

  // 1. Group the sets in data.runeSets by keystone
  const rawSets = data.runeSets || [data.runes];
  const keystonesMap = {};

  rawSets.forEach((set, originalIndex) => {
    const keystone = set.primaryPerks && set.primaryPerks[0];
    if (!keystone) return;
    
    const keystoneId = keystone.id;
    if (!keystonesMap[keystoneId]) {
      keystonesMap[keystoneId] = {
        id: keystoneId,
        name: keystone.name,
        icon: keystone.icon,
        playrateSum: 0,
        sets: []
      };
    }
    
    // Set the overall keystone playrate if available, otherwise sum set playrates
    if (set.keystonePlayrate !== undefined && set.keystonePlayrate !== null) {
      keystonesMap[keystoneId].playrateSum = set.keystonePlayrate;
    } else {
      keystonesMap[keystoneId].playrateSum += (set.playrate || 0);
    }
    
    keystonesMap[keystoneId].sets.push({
      set,
      originalIndex
    });
  });

  // Preserve the original order from the scraper's runeSets array (scraper already orders by website display order)
  Object.values(keystonesMap).forEach(group => {
    group.sets.sort((a, b) => a.originalIndex - b.originalIndex);
  });

  // Sort keystones by playrateSum descending
  activeKeystonesList = Object.values(keystonesMap).sort((a, b) => b.playrateSum - a.playrateSum);

  // Default selection: most popular keystone (index 0) and its first set (index 0)
  selectedKeystoneIndex = 0;
  selectedSetIndex = 0;

  // Render top keystone tabs
  renderKeystoneTabs();

  // Draw the selected set, shards, cards, and auto-apply!
  selectRuneSet(0, 0);

  // 3. Draw Summoner Spells (Multiple options ordered by playrate)
  const summonerOpts = data.summonersOptions || [summoners];
  const activeIdx = summonerOpts.findIndex(opt => 
    opt.raw.spell1Id === summoners.raw.spell1Id && opt.raw.spell2Id === summoners.raw.spell2Id
  );
  if (activeIdx !== -1) {
    selectedSummonerIndex = activeIdx;
  } else if (selectedSummonerIndex >= summonerOpts.length) {
    selectedSummonerIndex = 0;
  }
  renderSummonerOptions(summonerOpts);

  // 4. Draw Recommended Items
  renderItemGroup(elListStartingItems, items.startingBuild, true);
  renderItemGroup(elListBootsItems, items.popularBoots, true);
  renderItemGroup(elListCoreItems, items.coreBuild || items.coreItems || [], true);
  renderItemGroup(elListRecommendedItems, items.recommendedItems || [], true);

  // 5. Draw Skill Maxing Order
  if (items && items.skillOrder && items.skillOrder.maxOrder && items.skillOrder.maxOrder.length > 0) {
    elSkillOrderValue.innerHTML = '';
    
    // Create badges for each skill (e.g. E, Q, W)
    items.skillOrder.maxOrder.forEach((skill, index) => {
      const badge = document.createElement('span');
      badge.className = 'skill-badge';
      badge.textContent = skill;
      elSkillOrderValue.appendChild(badge);
      
      // If not the last skill, add an arrow separator
      if (index < items.skillOrder.maxOrder.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'skill-arrow';
        arrow.textContent = '→';
        elSkillOrderValue.appendChild(arrow);
      }
    });

    // Add playrate badge if available
    if (items.skillOrder.playrate) {
      const playrateBadge = document.createElement('span');
      playrateBadge.className = 'skill-playrate-badge';
      playrateBadge.textContent = `${items.skillOrder.playrate}%`;
      playrateBadge.title = 'Porcentaje de partidas usando este orden de habilidades';
      elSkillOrderValue.appendChild(playrateBadge);
    }
    
    elSkillOrderBox.style.display = 'block';
  } else {
    elSkillOrderBox.style.display = 'none';
  }

  // 6. Update Footer Indicators
  updateBottomActionLayout();
}

// Render top keystone tabs
function renderKeystoneTabs() {
  const container = document.getElementById('keystone-tabs');
  if (!container) return;
  
  container.innerHTML = '';
  
  activeKeystonesList.forEach((keystoneGroup, index) => {
    const tab = document.createElement('div');
    const isSelected = index === selectedKeystoneIndex;
    
    tab.className = 'keystone-tab' + (isSelected ? ' active' : '');
    tab.title = keystoneGroup.name;
    
    const img = document.createElement('img');
    img.src = `https://ddragon.leagueoflegends.com/cdn/img/${keystoneGroup.icon}`;
    img.className = 'keystone-tab-img';
    img.alt = keystoneGroup.name;
    
    const info = document.createElement('div');
    info.className = 'keystone-tab-info';
    
    const name = document.createElement('span');
    name.className = 'keystone-tab-name';
    name.textContent = keystoneGroup.name;
    
    const playrate = document.createElement('span');
    playrate.className = 'keystone-tab-playrate';
    const formattedPr = Number(keystoneGroup.playrateSum.toFixed(1));
    playrate.textContent = `${formattedPr}% PR`;
    
    info.appendChild(name);
    info.appendChild(playrate);
    
    tab.appendChild(img);
    tab.appendChild(info);
    
    tab.addEventListener('click', () => {
      selectRuneSet(index, 0);
    });
    
    container.appendChild(tab);
  });
  
  // Add help icon at the end of the container
  const helpIcon = document.createElement('div');
  helpIcon.className = 'keystone-help-icon';
  helpIcon.textContent = '?';
  helpIcon.title = 'Las runas clave más populares recopiladas de los mejores jugadores del mundo.';
  container.appendChild(helpIcon);
}

// Select specific set inside active keystone group
function selectRuneSet(keystoneIndex, setIndex) {
  if (!activeKeystonesList[keystoneIndex]) return;
  const keystoneGroup = activeKeystonesList[keystoneIndex];
  if (!keystoneGroup.sets[setIndex]) return;
  
  selectedKeystoneIndex = keystoneIndex;
  selectedSetIndex = setIndex;
  
  const selectedObj = keystoneGroup.sets[setIndex];
  const runeSet = selectedObj.set;
  activeRuneSet = runeSet;
  
  // Update the global index for backward-compatibility
  activeRuneSetIndex = selectedObj.originalIndex;
  
  // Render the selected rune set in the complete grid!
  renderRuneSet(runeSet);
  
  // Render the bottom card sets selector!
  renderRuneSetCards(keystoneGroup.sets, setIndex);
  
  // Highlight the correct keystone tab as active!
  document.querySelectorAll('.keystone-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === keystoneIndex);
  });
  
  // Auto-apply if enabled!
  if (appConfig.autoApplyRunes) {
    window.api.applyBuild({ runes: runeSet.raw });
  }
}

// Render bottom cards for sets selector
function renderRuneSetCards(sets, selectedIndex) {
  const container = document.getElementById('rune-sets-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  sets.forEach((setItem, index) => {
    const set = setItem.set;
    const card = document.createElement('div');
    const isSelected = index === selectedIndex;
    
    card.className = 'rune-set-card' + (isSelected ? ' active' : '');
    card.title = `${set.primaryStyleName} + ${set.subStyleName}`;
    
    // Card header
    const header = document.createElement('div');
    header.className = 'rune-set-card-header';
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'rune-set-card-title';
    titleSpan.textContent = `Set ${index + 1}`;
    
    const iconsDiv = document.createElement('div');
    iconsDiv.className = 'rune-set-card-icons';
    
    const primaryIcon = document.createElement('img');
    primaryIcon.src = `https://ddragon.leagueoflegends.com/cdn/img/${set.primaryStyleIcon}`;
    primaryIcon.className = 'rune-set-card-mini-icon';
    primaryIcon.alt = set.primaryStyleName;
    
    const plusSpan = document.createElement('span');
    plusSpan.className = 'rune-set-card-plus';
    plusSpan.textContent = '+';
    
    const subIcon = document.createElement('img');
    subIcon.src = `https://ddragon.leagueoflegends.com/cdn/img/${set.subStyleIcon}`;
    subIcon.className = 'rune-set-card-mini-icon';
    subIcon.alt = set.subStyleName;
    
    iconsDiv.appendChild(primaryIcon);
    iconsDiv.appendChild(plusSpan);
    iconsDiv.appendChild(subIcon);
    
    header.appendChild(titleSpan);
    header.appendChild(iconsDiv);
    
    // Card body
    const body = document.createElement('div');
    body.className = 'rune-set-card-body';
    
    const playrateLabel = document.createElement('div');
    playrateLabel.className = 'rune-set-card-playrate-label';
    playrateLabel.textContent = `${set.playrate}% Playrate`;
    
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'rune-set-card-progress-wrapper';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'rune-set-card-progress-bar';
    progressBar.style.width = `${set.playrate}%`;
    
    progressWrapper.appendChild(progressBar);
    body.appendChild(playrateLabel);
    body.appendChild(progressWrapper);
    
    // Card footer
    const footer = document.createElement('div');
    footer.className = 'rune-set-card-footer';
    footer.textContent = `${set.subStyleName}`;
    
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    
    card.addEventListener('click', () => {
      selectRuneSet(selectedKeystoneIndex, index);
    });
    
    container.appendChild(card);
  });
}

// Helper to re-resolve raw selectedPerkIds back to rich display structures and re-render grid
function reResolveAndRender(runeSet) {
  if (!runeSet || !runeSet.raw) return;

  // Let's resolve the raw selectedPerkIds to perk objects.
  const allReforgedRunes = {};
  runesReforged.forEach(style => {
    if (style && style.slots) {
      style.slots.forEach(slot => {
        if (slot && slot.runes) {
          slot.runes.forEach(rune => {
            allReforgedRunes[rune.id] = {
              id: rune.id,
              name: rune.name,
              icon: rune.icon,
              styleId: style.id
            };
          });
        }
      });
    }
  });

  const selectedIds = runeSet.raw.selectedPerkIds || [];
  
  const primaryPerks = [];
  const secondaryPerks = [];
  const shardsPerks = [];

  selectedIds.forEach(id => {
    if (SHARD_META[id]) {
      shardsPerks.push({
        id,
        name: SHARD_META[id].name,
        icon: SHARD_META[id].icon,
        isShard: true
      });
    } else {
      const info = allReforgedRunes[id];
      if (info) {
        if (info.styleId === runeSet.primaryStyleId) {
          primaryPerks.push({
            id: info.id,
            name: info.name,
            icon: info.icon,
            isShard: false
          });
        } else if (info.styleId === runeSet.subStyleId) {
          secondaryPerks.push({
            id: info.id,
            name: info.name,
            icon: info.icon,
            isShard: false
          });
        }
      }
    }
  });

  // Sort them by slot order to match the DDragon layout
  const primaryStyle = runesReforged.find(style => style.id === runeSet.primaryStyleId);
  if (primaryStyle && primaryStyle.slots) {
    primaryPerks.sort((a, b) => {
      const slotA = primaryStyle.slots.findIndex(s => s.runes.some(r => r.id === a.id));
      const slotB = primaryStyle.slots.findIndex(s => s.runes.some(r => r.id === b.id));
      return slotA - slotB;
    });
  }

  const secondaryStyle = runesReforged.find(style => style.id === runeSet.subStyleId);
  if (secondaryStyle && secondaryStyle.slots) {
    secondaryPerks.sort((a, b) => {
      const slotA = secondaryStyle.slots.findIndex(s => s.runes.some(r => r.id === a.id));
      const slotB = secondaryStyle.slots.findIndex(s => s.runes.some(r => r.id === b.id));
      return slotA - slotB;
    });
  }

  // Update original runeSet structures
  runeSet.primaryPerks = primaryPerks;
  runeSet.secondaryPerks = secondaryPerks;
  runeSet.shardsPerks = shardsPerks;

  // Redraw grid
  renderRuneSet(runeSet);

  // Auto-apply if enabled
  if (appConfig.autoApplyRunes) {
    window.api.applyBuild({ runes: runeSet.raw });
  }
}

// Render the complete interactive rune trees grid for a single rune set
function renderRuneSet(runeSet) {
  if (!runeSet) return;

  // Track the active perk IDs in a Set for super-fast lookups
  const activePerkIds = new Set([
    ...runeSet.primaryPerks.map(p => p.id),
    ...runeSet.secondaryPerks.map(p => p.id)
  ]);

  // Primary Tree Header
  elIconPrimaryStyle.src = `https://ddragon.leagueoflegends.com/cdn/img/${runeSet.primaryStyleIcon}`;
  elNamePrimaryStyle.textContent = runeSet.primaryStyleName;

  // Look up primary style in static runesReforged
  const primaryStyle = runesReforged.find(style => style.id === runeSet.primaryStyleId);

  // Render Primary Grid
  elListPrimaryRunes.innerHTML = '';
  if (primaryStyle && primaryStyle.slots) {
    primaryStyle.slots.forEach((slot, slotIndex) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'rune-row-grid';
      if (slotIndex === 0) {
        rowDiv.classList.add('keystone-row');
      }
      
      slot.runes.forEach(rune => {
        const itemDiv = document.createElement('div');
        const isActive = activePerkIds.has(rune.id);
        
        itemDiv.className = `rune-grid-item style-${runeSet.primaryStyleId} clickable`;
        itemDiv.classList.add(isActive ? 'active' : 'inactive');
        itemDiv.title = `${rune.name}: ${rune.shortDesc}`;
        
        const img = document.createElement('img');
        img.src = `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
        img.className = slotIndex === 0 ? 'keystone-img' : 'rune-img';
        img.alt = rune.name;
        
        // click event listener
        itemDiv.addEventListener('click', () => {
          if (isActive) return;
          
          const primaryStyle = runesReforged.find(style => style.id === runeSet.primaryStyleId);
          if (!primaryStyle || !primaryStyle.slots) return;
          
          const newPrimaryIds = primaryStyle.slots.map((s, idx) => {
            if (idx === slotIndex) {
              return rune.id;
            }
            const currentActive = runeSet.primaryPerks.find(p => s.runes.some(r => r.id === p.id));
            return currentActive ? currentActive.id : s.runes[0].id;
          });
          
          const newSecondaryIds = runeSet.secondaryPerks.map(p => p.id);
          const newShardIds = (runeSet.shardsPerks || []).map(p => p.id);
          
          runeSet.raw.selectedPerkIds = [
            ...newPrimaryIds,
            ...newSecondaryIds,
            ...newShardIds
          ];
          
          reResolveAndRender(runeSet);
        });
        
        itemDiv.appendChild(img);
        rowDiv.appendChild(itemDiv);
      });
      elListPrimaryRunes.appendChild(rowDiv);
    });
  } else {
    // Fallback: render vertical rows of selected ones if runesReforged not loaded
    runeSet.primaryPerks.forEach((perk, index) => {
      const isKeystone = index === 0;
      elListPrimaryRunes.appendChild(createRuneRowHtml(perk, isKeystone));
    });
  }

  // Secondary Tree Header
  elIconSubStyle.src = `https://ddragon.leagueoflegends.com/cdn/img/${runeSet.subStyleIcon}`;
  elNameSubStyle.textContent = runeSet.subStyleName;

  // Look up secondary style in static runesReforged
  const secondaryStyle = runesReforged.find(style => style.id === runeSet.subStyleId);

  // Render Secondary Grid
  elListSecondaryRunes.innerHTML = '';
  if (secondaryStyle && secondaryStyle.slots) {
    // Secondary tree ignores keystones slot[0], renders slot[1], slot[2], slot[3]
    for (let slotIndex = 1; slotIndex < secondaryStyle.slots.length; slotIndex++) {
      const slot = secondaryStyle.slots[slotIndex];
      const rowDiv = document.createElement('div');
      rowDiv.className = 'rune-row-grid';
      
      slot.runes.forEach(rune => {
        const itemDiv = document.createElement('div');
        const isActive = activePerkIds.has(rune.id);
        
        itemDiv.className = `rune-grid-item style-${runeSet.subStyleId} clickable`;
        itemDiv.classList.add(isActive ? 'active' : 'inactive');
        itemDiv.title = `${rune.name}: ${rune.shortDesc}`;
        
        const img = document.createElement('img');
        img.src = `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
        img.className = 'rune-img';
        img.alt = rune.name;
        
        // click event listener
        itemDiv.addEventListener('click', () => {
          let newSecondaryIds = runeSet.secondaryPerks.map(p => p.id);
          
          if (isActive) {
            newSecondaryIds = newSecondaryIds.filter(id => id !== rune.id);
          } else {
            const slotRuneIds = slot.runes.map(r => r.id);
            const activeInSameSlot = newSecondaryIds.find(id => slotRuneIds.includes(id));
            
            if (activeInSameSlot) {
              newSecondaryIds = newSecondaryIds.filter(id => id !== activeInSameSlot);
              newSecondaryIds.push(rune.id);
            } else {
              if (newSecondaryIds.length < 2) {
                newSecondaryIds.push(rune.id);
              } else {
                newSecondaryIds.shift();
                newSecondaryIds.push(rune.id);
              }
            }
          }
          
          // Auto-pad to always have exactly 2 active secondary runes in 2 different slots
          if (newSecondaryIds.length < 2) {
            const occupiedSlotIndex = newSecondaryIds.length === 1
              ? secondaryStyle.slots.findIndex(s => s && s.runes && s.runes.some(r => r.id === newSecondaryIds[0]))
              : -1;
            
            for (let sIdx = 1; sIdx < secondaryStyle.slots.length; sIdx++) {
              if (sIdx !== occupiedSlotIndex) {
                const fallbackRune = secondaryStyle.slots[sIdx].runes[0];
                if (fallbackRune) {
                  newSecondaryIds.push(fallbackRune.id);
                  if (newSecondaryIds.length === 2) break;
                }
              }
            }
          }
          
          newSecondaryIds.sort((a, b) => {
            const slotA = secondaryStyle.slots.findIndex(s => s && s.runes && s.runes.some(r => r.id === a));
            const slotB = secondaryStyle.slots.findIndex(s => s && s.runes && s.runes.some(r => r.id === b));
            return slotA - slotB;
          });
          
          const newPrimaryIds = runeSet.primaryPerks.map(p => p.id);
          const newShardIds = (runeSet.shardsPerks || []).map(p => p.id);
          
          runeSet.raw.selectedPerkIds = [
            ...newPrimaryIds,
            ...newSecondaryIds,
            ...newShardIds
          ];
          
          reResolveAndRender(runeSet);
        });
        
        itemDiv.appendChild(img);
        rowDiv.appendChild(itemDiv);
      });
      elListSecondaryRunes.appendChild(rowDiv);
    }
  } else {
    // Fallback
    runeSet.secondaryPerks.forEach((perk) => {
      elListSecondaryRunes.appendChild(createRuneRowHtml(perk, false));
    });
  }

  // Stat Shards 3x3 Grid
  elListShards.innerHTML = '';
  
  const shardRowsOptions = [
    [5008, 5005, 5007], // Row 1: Adaptive Force, Attack Speed, Haste
    [5008, 5010, 5011], // Row 2: Adaptive Force, MS, Scaling Health
    [5011, 5013, 5001]  // Row 3: Scaling Health, Tenacity, Flat Health
  ];

  const activeShards = runeSet.shardsPerks || [];
  const shardGridDiv = document.createElement('div');
  shardGridDiv.className = 'shards-grid';
  
  for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
    const rowOptions = [...shardRowsOptions[rowIndex]];
    const activeShard = activeShards[rowIndex];
    
    // Fallback swap if active shard is a legacy/non-standard choice
    if (activeShard && !rowOptions.includes(activeShard.id)) {
      rowOptions[2] = activeShard.id;
    }
    
    const rowDiv = document.createElement('div');
    rowDiv.className = 'shard-row';
    
    rowOptions.forEach(shardId => {
      const isSelected = activeShard && activeShard.id === shardId;
      const shardInfo = SHARD_META[shardId] || (activeShard && activeShard.id === shardId ? activeShard : { name: `Atributo ${shardId}`, icon: '' });
      
      const shardItem = document.createElement('div');
      shardItem.className = 'shard-grid-item clickable';
      shardItem.classList.add(isSelected ? 'active' : 'inactive');
      shardItem.title = shardInfo.name;
      
      const img = document.createElement('img');
      img.src = shardInfo.icon ? `https://ddragon.leagueoflegends.com/cdn/img/${shardInfo.icon}` : 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/StatMods/StatModsAdaptiveForceIcon.png';
      img.className = 'shard-img';
      img.alt = shardInfo.name;
      
      // click event listener
      shardItem.addEventListener('click', () => {
        if (isSelected) return;
        
        const newPrimaryIds = runeSet.primaryPerks.map(p => p.id);
        const newSecondaryIds = runeSet.secondaryPerks.map(p => p.id);
        
        const newShardIds = [0, 1, 2].map(rIdx => {
          if (rIdx === rowIndex) {
            return shardId;
          }
          const currentActive = activeShards[rIdx];
          return currentActive ? currentActive.id : shardRowsOptions[rIdx][0];
        });
        
        runeSet.raw.selectedPerkIds = [
          ...newPrimaryIds,
          ...newSecondaryIds,
          ...newShardIds
        ];
        
        reResolveAndRender(runeSet);
      });
      
      shardItem.appendChild(img);
      rowDiv.appendChild(shardItem);
    });
    shardGridDiv.appendChild(rowDiv);
  }
  elListShards.appendChild(shardGridDiv);
}

// Helper to render a group of item items beautifully
function renderItemGroup(container, itemsList, showPlayrates = false) {
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
    
    img.onerror = () => {
      if (img.src.includes('ddragon.leagueoflegends.com')) {
        img.src = `https://d3liizu15b1tmi.cloudfront.net/onetricks/16.9.1/img/item/${item.id}.png`;
      } else {
        img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/3601.png`;
      }
    };

    wrapper.appendChild(img);

    // Show playrate badge if enabled and playrate is provided
    if (showPlayrates && item.playrate !== undefined && item.playrate !== null) {
      const badge = document.createElement('span');
      badge.className = 'item-playrate-badge';
      
      let prText = item.playrate;
      if (typeof prText === 'number') {
        prText = Math.round(prText);
      }
      if (!String(prText).includes('%')) {
        prText = `${prText}%`;
      }
      badge.textContent = prText;
      wrapper.appendChild(badge);
    }

    container.appendChild(wrapper);
  });
}

// Helper to construct a single visual row element for a rune (kept as fallback)
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

// Render the clickable list of summoner options
function renderSummonerOptions(options) {
  elListSpells.innerHTML = '';
  elListSpells.className = 'runes-list vertical-spells-list';

  options.forEach((opt, idx) => {
    const row = document.createElement('div');
    const isActive = idx === selectedSummonerIndex;
    row.className = 'summoners-row' + (isActive ? ' active' : '');
    row.title = `Hechizos: ${opt.spell1.name} + ${opt.spell2.name} (${opt.playrate}% Playrate)`;
    row.setAttribute('data-index', idx);

    const pairDiv = document.createElement('div');
    pairDiv.className = 'summoners-spells-pair';

    // Spell 1
    const s1Div = document.createElement('div');
    s1Div.className = 'spell-icon-mini-container';
    const s1Img = document.createElement('img');
    s1Img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/spell/${opt.spell1.icon}`;
    s1Img.alt = opt.spell1.name;
    s1Div.appendChild(s1Img);

    // Spell 2
    const s2Div = document.createElement('div');
    s2Div.className = 'spell-icon-mini-container';
    const s2Img = document.createElement('img');
    s2Img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/spell/${opt.spell2.icon}`;
    s2Img.alt = opt.spell2.name;
    s2Div.appendChild(s2Img);

    pairDiv.appendChild(s1Div);
    pairDiv.appendChild(s2Div);

    const playrateSpan = document.createElement('span');
    playrateSpan.className = 'summoners-playrate';
    playrateSpan.textContent = `${opt.playrate}%`;

    row.appendChild(pairDiv);
    row.appendChild(playrateSpan);

    row.addEventListener('click', () => {
      selectSummonersOption(idx);
    });

    elListSpells.appendChild(row);
  });
}

// Select summoner option and auto-apply it
function selectSummonersOption(idx) {
  if (!activeScrapedData || !activeScrapedData.summonersOptions || !activeScrapedData.summonersOptions[idx]) return;

  selectedSummonerIndex = idx;
  const selectedOpt = activeScrapedData.summonersOptions[idx];

  // Update activeScrapedData.summoners so manual apply works with the chosen spells
  activeScrapedData.summoners = selectedOpt;

  // Visually toggle active rows
  const rows = elListSpells.querySelectorAll('.summoners-row');
  rows.forEach((row, i) => {
    row.classList.toggle('active', i === idx);
  });

  // Auto-apply if enabled
  if (appConfig.autoApplySpells) {
    window.api.applyBuild({ summoners: selectedOpt.raw });
  }
}
