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

  // 1. Fetch Latest Release from GitHub API
  async function fetchLatestRelease() {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch release: ${response.status}`);
      }

      const data = await response.json();
      const version = data.tag_name;
      
      // Look for the .exe asset
      const exeAsset = data.assets.find(asset => asset.name.endsWith('.exe'));
      
      if (exeAsset) {
        const downloadUrl = exeAsset.browser_download_url;
        const sizeInMb = (exeAsset.size / (1024 * 1024)).toFixed(1);
        
        // Update DOM
        btnDownload.href = downloadUrl;
        versionBadge.textContent = `Versión ${version} (Windows)`;
        sizeBadge.innerHTML = `<i class="fa-solid fa-circle-info"></i> Tamaño: ~${sizeInMb} MB | Última versión estable`;
        
        console.log(`[API] Successfully loaded latest release: ${version} (${sizeInMb} MB)`);
      } else {
        // Fallback if no .exe asset is found in the release
        useFallbackLink(version);
      }
    } catch (error) {
      console.warn('[API] Error fetching release from GitHub API, using fallback:', error.message);
      useFallbackLink(FALLBACK_VERSION);
    }
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
