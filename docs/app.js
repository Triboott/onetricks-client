/**
 * Onetricks Client Landing Page JS
 * - Consumes GitHub Releases API to fetch the latest download links dynamically.
 * - Handles interactive animations, scroll behavior, and fallback mechanisms.
 * - Bilingual Spanish and English dynamic support.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Config variables
  const GITHUB_OWNER = 'Triboott';
  const GITHUB_REPO = 'onetricks-client';
  const FALLBACK_VERSION = 'v1.0.7';
  
  // DOM Elements
  const btnDownload = document.getElementById('btn-download');
  const versionBadge = document.getElementById('download-version-badge');
  const sizeBadge = document.getElementById('file-size-badge');
  const navbar = document.querySelector('.navbar');
  const mockupShell = document.querySelector('.app-mockup-shell');
  const mockupWrapper = document.querySelector('.app-mockup-wrapper');

  // ==========================================================================
  // WEBSITE TRANSLATIONS SYSTEM
  // ==========================================================================
  const TRANSLATIONS = {
    en: {
      PAGE_TITLE: "Onetricks Client - Official Download | Ultimate LoL & Valorant Assistant",
      PAGE_DESC: "Download the official Onetricks Client for Windows. Get automatic real-time imports of optimal runes, summoner spells, and item builds from the best global OTP players for League of Legends & Valorant.",
      NAV_FEATURES: "<i class=\"fa-solid fa-wand-magic-sparkles\"></i> Features",
      NAV_INTERFACE: "<i class=\"fa-solid fa-desktop\"></i> Interface",
      HERO_TITLE: "THE ELITE TACTICAL <span class=\"gradient-text-accent\">ANALYSIS</span> ENGINE",
      HERO_DESC: "Open League of Legends or Valorant and let <strong>Onetricks Client</strong> handle the automated real-time import of profiles, optimal runes, and recommended builds from the best global <i>one-trick pony</i> players.",
      BTN_DOWNLOAD_MAIN: "DOWNLOAD FOR WINDOWS",
      BTN_DOWNLOAD_SUB: "Checking latest version...",
      META_SIZE: "<i class=\"fa-solid fa-circle-info\"></i> Checking file size...",
      META_DOWNLOADS: "<i class=\"fa-solid fa-cloud-arrow-down\"></i> Total downloads: Loading...",
      MOCKUP_SEC_TITLE: "Designed for Victory",
      MOCKUP_SEC_SUBTITLE: "An ultra-lightweight, futuristic, and optimized interface designed to integrate seamlessly during your matches.",
      MOCKUP_LOL_CONNECTED: "LOL CONNECTED",
      MOCKUP_VAL_ACTIVE: "VALORANT ACTIVE",
      MOCKUP_SYNC_ACTIVE: "Active Sync",
      MOCKUP_ACTIVE_USERS: "active users",
      MOCKUP_LINKED_PROFILES: "LINKED PROFILES",
      MOCKUP_AUTO_DETECTION: "Automatic detection active",
      MOCKUP_CHALLENGER: "Challenger",
      MOCKUP_DIAMOND_III: "Diamond III",
      FEATURES_SEC_TITLE: "Key Features",
      FEATURES_SEC_SUBTITLE: "Onetricks Client works in the background to provide you with the best competitive advantages.",
      FEATURE1_TITLE: "Instant Import",
      FEATURE1_DESC: "Apply optimal runes, high-priority summoner spells, and custom item sets directly in your in-game shop instantly with a single click or automatically.",
      FEATURE2_TITLE: "Global OTP Data",
      FEATURE2_DESC: "Access exclusive stats and imports from the best \"One Trick\" players in the world, adapting their winning builds and setups to the current meta.",
      FEATURE3_TITLE: "Elite Multi-Game Support",
      FEATURE3_DESC: "Simultaneous and automated detection for League of Legends and Valorant. The application switches context intelligently and immediately based on the active game.",
      CTA_TITLE: "Ready to dominate the Rift and the Server?",
      CTA_SUBTITLE: "One-click installation, background automatic updates, and ultra-optimized performance.",
      CTA_BTN: "<i class=\"fa-solid fa-angle-up\"></i> Back to top to download",
      FOOTER_LEGAL: "Onetricks Client is not endorsed by Riot Games and does not reflect the views of Riot Games or anyone officially involved in the production or management of Riot Games properties.",
      FOOTER_PROJECT: "Project",
      FOOTER_REPO: "<i class=\"fa-brands fa-github\"></i> Repository",
      FOOTER_RELEASES: "<i class=\"fa-solid fa-tags\"></i> Versions",
      FOOTER_OFFICIAL_LINKS: "Official Links",
      FOOTER_COPYRIGHT: "&copy; 2026 Onetricks Client. Developed by <a href=\"https://github.com/Triboott\" target=\"_blank\">Triboot</a> and <strong>ZeroBRR on Top</strong>.",
      
      // Dynamic strings
      VERSION_INFO: "Version {version} (Windows)",
      SIZE_INFO: "<i class=\"fa-solid fa-circle-info\"></i> Size: ~{size} MB | Latest stable release",
      SIZE_FALLBACK: "<i class=\"fa-solid fa-circle-info\"></i> Latest stable release | Direct download",
      TOTAL_DOWNLOADS: "<i class=\"fa-solid fa-cloud-arrow-down\"></i> Total downloads: {count}"
    },
    es: {
      PAGE_TITLE: "Onetricks Client - Sitio Oficial | Descargar Onetricks Client Gratis",
      PAGE_DESC: "Descarga la aplicación oficial de Onetricks Client. Importación automática y en tiempo real de runas, hechizos e item builds de los mejores OTPs para ganar en League of Legends y Valorant.",
      NAV_FEATURES: "<i class=\"fa-solid fa-wand-magic-sparkles\"></i> Características",
      NAV_INTERFACE: "<i class=\"fa-solid fa-desktop\"></i> Interfaz",
      HERO_TITLE: "EL MOTOR DE ANÁLISIS TÁCTICO DE <span class=\"gradient-text-accent\">ÉLITE</span>",
      HERO_DESC: "Abre League of Legends o Valorant y deja que <strong>Onetricks Client</strong> realice la importación automatizada de perfiles, runas óptimas y builds recomendadas de los mejores jugadores <i>one-trick pony</i> mundiales en tiempo real.",
      BTN_DOWNLOAD_MAIN: "DESCARGAR PARA WINDOWS",
      BTN_DOWNLOAD_SUB: "Buscando última versión...",
      META_SIZE: "<i class=\"fa-solid fa-circle-info\"></i> Comprobando tamaño de archivo...",
      META_DOWNLOADS: "<i class=\"fa-solid fa-cloud-arrow-down\"></i> Descargas totales: Cargando...",
      MOCKUP_SEC_TITLE: "Diseñado para la Victoria",
      MOCKUP_SEC_SUBTITLE: "Una interfaz ultraligera, futurista y optimizada para integrarse a la perfección durante tus partidas.",
      MOCKUP_LOL_CONNECTED: "LOL CONECTADO",
      MOCKUP_VAL_ACTIVE: "VALORANT ACTIVO",
      MOCKUP_SYNC_ACTIVE: "Sincronización Activa",
      MOCKUP_ACTIVE_USERS: "usuarios activos",
      MOCKUP_LINKED_PROFILES: "PERFILES ENLAZADOS",
      MOCKUP_AUTO_DETECTION: "Detección automática activa",
      MOCKUP_CHALLENGER: "Retador (Challenger)",
      MOCKUP_DIAMOND_III: "Diamante III",
      FEATURES_SEC_TITLE: "Características Principales",
      FEATURES_SEC_SUBTITLE: "Onetricks Client trabaja en segundo plano para ofrecerte las mejores ventajas competitivas.",
      FEATURE1_TITLE: "Importación Instantánea",
      FEATURE1_DESC: "Aplica runas óptimas, hechizos de invocador de alta prioridad y sets de objetos personalizados en tu tienda del juego al instante con un solo clic o de forma automática.",
      FEATURE2_TITLE: "Datos de OTP Mundiales",
      FEATURE2_DESC: "Accede a las estadísticas e importaciones exclusivas de los mejores jugadores \"One Trick\" mundiales, adaptando sus builds ganadoras y configuraciones al meta actual.",
      FEATURE3_TITLE: "Soporte Multijuego Nivel Élite",
      FEATURE3_DESC: "Detección simultánea y automatizada para League of Legends y Valorant. La aplicación cambia de contexto de forma inteligente e inmediata según el juego activo.",
      CTA_TITLE: "¿Listo para dominar la Grieta y el Servidor?",
      CTA_SUBTITLE: "Instalación en un clic, actualizaciones automáticas en segundo plano y rendimiento ultraoptimizado.",
      CTA_BTN: "<i class=\"fa-solid fa-angle-up\"></i> Volver arriba para descargar",
      FOOTER_LEGAL: "Onetricks Client no está respaldado por Riot Games y no refleja las opiniones de Riot Games o de cualquier persona oficialmente involucrada en la producción o administración de las propiedades de Riot Games.",
      FOOTER_PROJECT: "Proyecto",
      FOOTER_REPO: "<i class=\"fa-brands fa-github\"></i> Repositorio",
      FOOTER_RELEASES: "<i class=\"fa-solid fa-tags\"></i> Versiones",
      FOOTER_OFFICIAL_LINKS: "Enlaces Oficiales",
      FOOTER_COPYRIGHT: "&copy; 2026 Onetricks Client. Desarrollado por <a href=\"https://github.com/Triboott\" target=\"_blank\">Triboot</a> y <strong>ZeroBRR on Top</strong>.",
      
      // Dynamic strings
      VERSION_INFO: "Versión {version} (Windows)",
      SIZE_INFO: "<i class=\"fa-solid fa-circle-info\"></i> Tamaño: ~{size} MB | Última versión estable",
      SIZE_FALLBACK: "<i class=\"fa-solid fa-circle-info\"></i> Última versión estable | Descarga directa",
      TOTAL_DOWNLOADS: "<i class=\"fa-solid fa-cloud-arrow-down\"></i> Descargas totales: {count}"
    }
  };

  let currentLang = localStorage.getItem('onetricks_web_lang') || 'en';
  let latestReleaseData = null;

  function applyTranslations(lang) {
    currentLang = lang;
    localStorage.setItem('onetricks_web_lang', lang);

    // Update active lang label inside the toggle button
    const btnToggleLang = document.getElementById('btn-toggle-lang');
    if (btnToggleLang) {
      btnToggleLang.innerHTML = `<i class="fa-solid fa-globe"></i> <span>${lang.toUpperCase()}</span>`;
    }

    // Set page title and meta description
    document.title = TRANSLATIONS[lang].PAGE_TITLE;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', TRANSLATIONS[lang].PAGE_DESC);
    }

    // Apply translations
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(el => {
      const key = el.getAttribute('data-translate');
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        el.innerHTML = TRANSLATIONS[lang][key];
      }
    });

    // Re-apply dynamically fetched values if loaded
    if (latestReleaseData) {
      updateDynamicUI();
    }
  }

  function updateDynamicUI() {
    if (!latestReleaseData) return;
    const { version, sizeInMb, totalDownloads, downloadUrl } = latestReleaseData;

    btnDownload.href = downloadUrl;
    versionBadge.textContent = TRANSLATIONS[currentLang].VERSION_INFO.replace('{version}', version);

    if (sizeInMb) {
      sizeBadge.innerHTML = TRANSLATIONS[currentLang].SIZE_INFO.replace('{size}', sizeInMb);
    } else {
      sizeBadge.innerHTML = TRANSLATIONS[currentLang].SIZE_FALLBACK;
    }

    const downloadsBadge = document.getElementById('total-downloads-badge');
    if (downloadsBadge) {
      const formattedCount = totalDownloads.toLocaleString(currentLang === 'en' ? 'en-US' : 'es-ES');
      downloadsBadge.innerHTML = TRANSLATIONS[currentLang].TOTAL_DOWNLOADS.replace('{count}', formattedCount);
    }
  }

  // Bind Language Toggle Button click event
  const elBtnToggleLang = document.getElementById('btn-toggle-lang');
  if (elBtnToggleLang) {
    elBtnToggleLang.addEventListener('click', () => {
      const nextLang = currentLang === 'en' ? 'es' : 'en';
      applyTranslations(nextLang);
    });
  }

  // 1. Fetch Latest Release and total downloads from GitHub API
  async function fetchLatestRelease() {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.status}`);
      }

      const releases = await response.json();
      if (!releases || releases.length === 0) {
        throw new Error("No releases found");
      }

      // Find the latest non-draft release
      const latestRelease = releases.find(r => !r.draft && !r.prerelease) || releases[0];
      const version = latestRelease.tag_name;
      
      // Look for the .exe asset in the latest release
      const exeAsset = latestRelease.assets.find(asset => asset.name.endsWith('.exe'));
      
      let downloadUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
      let sizeInMb = null;

      if (exeAsset) {
        downloadUrl = exeAsset.browser_download_url;
        sizeInMb = (exeAsset.size / (1024 * 1024)).toFixed(1);
        console.log(`[API] Successfully loaded latest release: ${version} (${sizeInMb} MB)`);
      }

      // Calculate total downloads across all releases
      let totalDownloads = 0;
      releases.forEach(release => {
        if (release.assets) {
          release.assets.forEach(asset => {
            if (asset.name.endsWith('.exe')) {
              totalDownloads += (asset.download_count || 0);
            }
          });
        }
      });

      // Save globally and update
      latestReleaseData = { version, sizeInMb, totalDownloads, downloadUrl };
      updateDynamicUI();

      initMockupUserCounter();
    } catch (error) {
      console.warn('[API] Error fetching releases from GitHub API, using fallback:', error.message);
      
      latestReleaseData = {
        version: FALLBACK_VERSION,
        sizeInMb: null,
        totalDownloads: 1420,
        downloadUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${FALLBACK_VERSION}/Onetricks-Client-Setup-${FALLBACK_VERSION.replace('v', '')}.exe`
      };
      updateDynamicUI();
      
      initMockupUserCounter();
    }
  }

  // Active user counter logic for the website mockup screen (Render.com live server)
  async function initMockupUserCounter() {
    const elMockupCounter = document.getElementById('mockup-active-user-count');
    if (!elMockupCounter) return;

    const PING_SERVER_URL = 'https://onetricks-client.onrender.com';
    let simulatedUsers = 12 + Math.floor(Math.random() * 8);

    async function fetchRealActiveCount() {
      try {
        const res = await fetch(`${PING_SERVER_URL}/stats`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.activeUsers === 'number') {
            elMockupCounter.textContent = data.activeUsers.toLocaleString(currentLang === 'en' ? 'en-US' : 'es-ES');
            return;
          }
        }
        throw new Error("Invalid stats");
      } catch (err) {
        // Fallback if counter server is offline
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        simulatedUsers = Math.max(8, simulatedUsers + delta);
        elMockupCounter.textContent = simulatedUsers.toLocaleString(currentLang === 'en' ? 'en-US' : 'es-ES');
      }
    }

    await fetchRealActiveCount();

    // Check stats every 30 seconds
    setInterval(async () => {
      await fetchRealActiveCount();
    }, 30000);
  }

  // Initialize translations first
  applyTranslations(currentLang);

  // Initialize GitHub fetch
  fetchLatestRelease();

  // 2. Navbar glass scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.height = '64px';
      navbar.style.background = 'rgba(6, 8, 13, 0.9)';
      navbar.style.boxShadow = '0 5px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(138, 43, 226, 0.05)';
    } else {
      navbar.style.height = '80px';
      navbar.style.background = 'rgba(6, 8, 13, 0.7)';
      navbar.style.boxShadow = 'none';
    }
  });

  // 3. Interactive Parallax 3D effect on mousemove for App Mockup
  if (mockupWrapper && mockupShell && window.innerWidth > 991) {
    mockupWrapper.addEventListener('mousemove', (e) => {
      const rect = mockupWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left; // x coordinate inside wrapper
      const y = e.clientY - rect.top;  // y coordinate inside wrapper
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate rotation (-6 to 6 degrees for subtle feel)
      const rotateY = ((x - centerX) / centerX) * 8; 
      const rotateX = ((centerY - y) / centerY) * 8; 
      
      mockupShell.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });

    mockupWrapper.addEventListener('mouseleave', () => {
      // Return to original slight perspective tilt on mouse leave
      mockupShell.style.transform = 'rotateX(8deg) rotateY(0deg) translateY(0)';
    });
  }
});
