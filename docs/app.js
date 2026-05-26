/**
 * Onetricks Client Landing Page JS
 * - Consumes GitHub Releases API to fetch the latest download links dynamically.
 * - Handles interactive animations, scroll behavior, and fallback mechanisms.
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
      
      if (exeAsset) {
        const downloadUrl = exeAsset.browser_download_url;
        const sizeInMb = (exeAsset.size / (1024 * 1024)).toFixed(1);
        
        // Update DOM
        btnDownload.href = downloadUrl;
        versionBadge.textContent = `Versión ${version} (Windows)`;
        sizeBadge.innerHTML = `<i class="fa-solid fa-circle-info"></i> Tamaño: ~${sizeInMb} MB | Última versión estable`;
        
        console.log(`[API] Successfully loaded latest release: ${version} (${sizeInMb} MB)`);
      } else {
        useFallbackLink(version);
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

      // Update total downloads badge
      const downloadsBadge = document.getElementById('total-downloads-badge');
      if (downloadsBadge) {
        downloadsBadge.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Descargas totales: ${totalDownloads.toLocaleString('es-ES')}`;
      }

      initMockupUserCounter();
    } catch (error) {
      console.warn('[API] Error fetching releases from GitHub API, using fallback:', error.message);
      useFallbackLink(FALLBACK_VERSION);
      
      const downloadsBadge = document.getElementById('total-downloads-badge');
      if (downloadsBadge) {
        downloadsBadge.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Descargas totales: 1.420`;
      }
      
      initMockupUserCounter();
    }
  }

  // Active user counter logic for the website mockup screen
  async function initMockupUserCounter() {
    const elMockupCounter = document.getElementById('mockup-active-user-count');
    if (!elMockupCounter) return;

    // NOTE: Change this to your deployed server URL once hosted!
    const PING_SERVER_URL = 'http://localhost:3000';
    let simulatedUsers = 12 + Math.floor(Math.random() * 8);

    async function fetchRealActiveCount() {
      try {
        const res = await fetch(`${PING_SERVER_URL}/stats`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.activeUsers === 'number') {
            elMockupCounter.textContent = data.activeUsers.toLocaleString('es-ES');
            return;
          }
        }
        throw new Error("Invalid stats");
      } catch (err) {
        // Fallback if counter server is offline
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        simulatedUsers = Math.max(8, simulatedUsers + delta);
        elMockupCounter.textContent = simulatedUsers.toLocaleString('es-ES');
      }
    }

    await fetchRealActiveCount();

    // Check stats every 30 seconds
    setInterval(async () => {
      await fetchRealActiveCount();
    }, 30000);
  }

  // Fallback setup helper
  function useFallbackLink(version) {
    // Standard direct link constructed with the version tag
    const cleanVersion = version.startsWith('v') ? version : `v${version}`;
    const directDownloadUrl = `https://github.com/Triboott/onetricks-client/releases/download/${cleanVersion}/Onetricks-Client-Setup-${cleanVersion.replace('v', '')}.exe`;
    
    btnDownload.href = directDownloadUrl;
    versionBadge.textContent = `Versión ${cleanVersion} (Windows)`;
    sizeBadge.innerHTML = `<i class="fa-solid fa-circle-info"></i> Última versión estable | Descarga directa`;
    
    // Attach secondary event listener to open release page if download fails
    btnDownload.onerror = () => {
      window.location.href = `https://github.com/Triboott/onetricks-client/releases/latest`;
    };
  }

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
