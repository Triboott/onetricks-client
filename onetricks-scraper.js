const { BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ─── DEBUG ────────────────────────────────────────────────────────────────────
// Ponlo a true para ver la ventana del navegador y las DevTools durante el scraping.
const DEBUG_BROWSER = true;
// ─────────────────────────────────────────────────────────────────────────────

// Local quick lookup map of Champion IDs to onetricks URL names (Data Dragon IDs)
const CHAMPION_MAP = {
  266: { name: 'Aatrox', displayName: 'Aatrox', image: 'Aatrox.png' },
  103: { name: 'Ahri', displayName: 'Ahri', image: 'Ahri.png' },
  84: { name: 'Akali', displayName: 'Akali', image: 'Akali.png' },
  166: { name: 'Akshan', displayName: 'Akshan', image: 'Akshan.png' },
  12: { name: 'Alistar', displayName: 'Alistar', image: 'Alistar.png' },
  32: { name: 'Amumu', displayName: 'Amumu', image: 'Amumu.png' },
  34: { name: 'Anivia', displayName: 'Anivia', image: 'Anivia.png' },
  1: { name: 'Annie', displayName: 'Annie', image: 'Annie.png' },
  523: { name: 'Aphelios', displayName: 'Aphelios', image: 'Aphelios.png' },
  22: { name: 'Ashe', displayName: 'Ashe', image: 'Ashe.png' },
  136: { name: 'AurelionSol', displayName: 'Aurelion Sol', image: 'AurelionSol.png' },
  899: { name: 'Aurora', displayName: 'Aurora', image: 'Aurora.png' },
  268: { name: 'Azir', displayName: 'Azir', image: 'Azir.png' },
  432: { name: 'Bard', displayName: 'Bard', image: 'Bard.png' },
  200: { name: 'Belveth', displayName: "Bel'Veth", image: 'Belveth.png' },
  53: { name: 'Blitzcrank', displayName: 'Blitzcrank', image: 'Blitzcrank.png' },
  63: { name: 'Brand', displayName: 'Brand', image: 'Brand.png' },
  201: { name: 'Braum', displayName: 'Braum', image: 'Braum.png' },
  233: { name: 'Briar', displayName: 'Briar', image: 'Briar.png' },
  51: { name: 'Caitlyn', displayName: 'Caitlyn', image: 'Caitlyn.png' },
  164: { name: 'Camille', displayName: 'Camille', image: 'Camille.png' },
  69: { name: 'Cassiopeia', displayName: 'Cassiopeia', image: 'Cassiopeia.png' },
  93: { name: 'ChoGath', displayName: "Cho'Gath", image: 'ChoGath.png' },
  42: { name: 'Corki', displayName: 'Corki', image: 'Corki.png' },
  122: { name: 'Darius', displayName: 'Darius', image: 'Darius.png' },
  131: { name: 'Diana', displayName: 'Diana', image: 'Diana.png' },
  119: { name: 'Draven', displayName: 'Draven', image: 'Draven.png' },
  36: { name: 'DrMundo', displayName: 'Dr. Mundo', image: 'DrMundo.png' },
  245: { name: 'Ekko', displayName: 'Ekko', image: 'Ekko.png' },
  60: { name: 'Elise', displayName: 'Elise', image: 'Elise.png' },
  28: { name: 'Evelynn', displayName: 'Evelynn', image: 'Evelynn.png' },
  81: { name: 'Ezreal', displayName: 'Ezreal', image: 'Ezreal.png' },
  9: { name: 'Fiddlesticks', displayName: 'Fiddlesticks', image: 'Fiddlesticks.png' },
  114: { name: 'Fiora', displayName: 'Fiora', image: 'Fiora.png' },
  105: { name: 'Fizz', displayName: 'Fizz', image: 'Fizz.png' },
  3: { name: 'Galio', displayName: 'Galio', image: 'Galio.png' },
  41: { name: 'Gangplank', displayName: 'Gangplank', image: 'Gangplank.png' },
  86: { name: 'Garen', displayName: 'Garen', image: 'Garen.png' },
  150: { name: 'Gnar', displayName: 'Gnar', image: 'Gnar.png' },
  79: { name: 'Gragas', displayName: 'Gragas', image: 'Gragas.png' },
  104: { name: 'Graves', displayName: 'Graves', image: 'Graves.png' },
  887: { name: 'Gwen', displayName: 'Gwen', image: 'Gwen.png' },
  120: { name: 'Hecarim', displayName: 'Hecarim', image: 'Hecarim.png' },
  74: { name: 'Heimerdinger', displayName: 'Heimerdinger', image: 'Heimerdinger.png' },
  910: { name: 'Hwei', displayName: 'Hwei', image: 'Hwei.png' },
  39: { name: 'Irelia', displayName: 'Irelia', image: 'Irelia.png' },
  427: { name: 'Ivern', displayName: 'Ivern', image: 'Ivern.png' },
  40: { name: 'Janna', displayName: 'Janna', image: 'Janna.png' },
  59: { name: 'JarvanIV', displayName: 'Jarvan IV', image: 'JarvanIV.png' },
  24: { name: 'Jax', displayName: 'Jax', image: 'Jax.png' },
  126: { name: 'Jayce', displayName: 'Jayce', image: 'Jayce.png' },
  202: { name: 'Jhin', displayName: 'Jhin', image: 'Jhin.png' },
  222: { name: 'Jinx', displayName: 'Jinx', image: 'Jinx.png' },
  145: { name: 'Kaisa', displayName: "Kai'Sa", image: 'Kaisa.png' },
  429: { name: 'Kalista', displayName: 'Kalista', image: 'Kalista.png' },
  43: { name: 'Karma', displayName: 'Karma', image: 'Karma.png' },
  30: { name: 'Karthus', displayName: 'Karthus', image: 'Karthus.png' },
  38: { name: 'Kassadin', displayName: 'Kassadin', image: 'Kassadin.png' },
  55: { name: 'Katarina', displayName: 'Katarina', image: 'Katarina.png' },
  10: { name: 'Kayle', displayName: 'Kayle', image: 'Kayle.png' },
  141: { name: 'Kayn', displayName: 'Kayn', image: 'Kayn.png' },
  85: { name: 'Kennen', displayName: 'Kennen', image: 'Kennen.png' },
  121: { name: 'Khazix', displayName: "Kha'Zix", image: 'Khazix.png' },
  203: { name: 'Kindred', displayName: 'Kindred', image: 'Kindred.png' },
  240: { name: 'Kled', displayName: 'Kled', image: 'Kled.png' },
  96: { name: 'KogMaw', displayName: "Kog'Maw", image: 'KogMaw.png' },
  897: { name: 'Ksante', displayName: "K'Sante", image: 'Ksante.png' },
  7: { name: 'Leblanc', displayName: 'LeBlanc', image: 'Leblanc.png' },
  64: { name: 'LeeSin', displayName: 'Lee Sin', image: 'LeeSin.png' },
  89: { name: 'Leona', displayName: 'Leona', image: 'Leona.png' },
  876: { name: 'Lillia', displayName: 'Lillia', image: 'Lillia.png' },
  127: { name: 'Lissandra', displayName: 'Lissandra', image: 'Lissandra.png' },
  236: { name: 'Lucian', displayName: 'Lucian', image: 'Lucian.png' },
  117: { name: 'Lulu', displayName: 'Lulu', image: 'Lulu.png' },
  99: { name: 'Lux', displayName: 'Lux', image: 'Lux.png' },
  54: { name: 'Malphite', displayName: 'Malphite', image: 'Malphite.png' },
  90: { name: 'Malzahar', displayName: 'Malzahar', image: 'Malzahar.png' },
  57: { name: 'Maokai', displayName: 'Maokai', image: 'Maokai.png' },
  11: { name: 'MasterYi', displayName: 'Master Yi', image: 'MasterYi.png' },
  902: { name: 'Milio', displayName: 'Milio', image: 'Milio.png' },
  21: { name: 'MissFortune', displayName: 'Miss Fortune', image: 'MissFortune.png' },
  62: { name: 'Wukong', displayName: 'Wukong', image: 'MonkeyKing.png' },
  82: { name: 'Mordekaiser', displayName: 'Mordekaiser', image: 'Mordekaiser.png' },
  25: { name: 'Morgana', displayName: 'Morgana', image: 'Morgana.png' },
  950: { name: 'Naafiri', displayName: 'Naafiri', image: 'Naafiri.png' },
  267: { name: 'Nami', displayName: 'Nami', image: 'Nami.png' },
  75: { name: 'Nasus', displayName: 'Nasus', image: 'Nasus.png' },
  111: { name: 'Nautilus', displayName: 'Nautilus', image: 'Nautilus.png' },
  518: { name: 'Neeko', displayName: 'Neeko', image: 'Neeko.png' },
  76: { name: 'Nidalee', displayName: 'Nidalee', image: 'Nidalee.png' },
  895: { name: 'Nilah', displayName: 'Nilah', image: 'Nilah.png' },
  56: { name: 'Nocturne', displayName: 'Nocturne', image: 'Nocturne.png' },
  20: { name: 'Nunu', displayName: 'Nunu & Willump', image: 'Nunu.png' },
  2: { name: 'Olaf', displayName: 'Olaf', image: 'Olaf.png' },
  61: { name: 'Orianna', displayName: 'Orianna', image: 'Orianna.png' },
  516: { name: 'Ornn', displayName: 'Ornn', image: 'Ornn.png' },
  80: { name: 'Pantheon', displayName: 'Pantheon', image: 'Pantheon.png' },
  78: { name: 'Poppy', displayName: 'Poppy', image: 'Poppy.png' },
  555: { name: 'Pyke', displayName: 'Pyke', image: 'Pyke.png' },
  246: { name: 'Qiyana', displayName: 'Qiyana', image: 'Qiyana.png' },
  133: { name: 'Quinn', displayName: 'Quinn', image: 'Quinn.png' },
  497: { name: 'Rakan', displayName: 'Rakan', image: 'Rakan.png' },
  33: { name: 'Rammus', displayName: 'Rammus', image: 'Rammus.png' },
  421: { name: 'RekSai', displayName: "Rek'Sai", image: 'RekSai.png' },
  526: { name: 'Rell', displayName: 'Rell', image: 'Rell.png' },
  58: { name: 'Renekton', displayName: 'Renekton', image: 'Renekton.png' },
  107: { name: 'Rengar', displayName: 'Rengar', image: 'Rengar.png' },
  92: { name: 'Riven', displayName: 'Riven', image: 'Riven.png' },
  68: { name: 'Rumble', displayName: 'Rumble', image: 'Rumble.png' },
  13: { name: 'Ryze', displayName: 'Ryze', image: 'Ryze.png' },
  360: { name: 'Samira', displayName: 'Samira', image: 'Samira.png' },
  113: { name: 'Sejuani', displayName: 'Sejuani', image: 'Sejuani.png' },
  235: { name: 'Senna', displayName: 'Senna', image: 'Senna.png' },
  147: { name: 'Seraphine', displayName: 'Seraphine', image: 'Seraphine.png' },
  875: { name: 'Sett', displayName: 'Sett', image: 'Sett.png' },
  35: { name: 'Shaco', displayName: 'Shaco', image: 'Shaco.png' },
  98: { name: 'Shen', displayName: 'Shen', image: 'Shen.png' },
  102: { name: 'Shyvana', displayName: 'Shyvana', image: 'Shyvana.png' },
  27: { name: 'Singed', displayName: 'Singed', image: 'Singed.png' },
  14: { name: 'Sion', displayName: 'Sion', image: 'Sion.png' },
  15: { name: 'Sivir', displayName: 'Sivir', image: 'Sivir.png' },
  72: { name: 'Skarner', displayName: 'Skarner', image: 'Skarner.png' },
  37: { name: 'Sona', displayName: 'Sona', image: 'Sona.png' },
  16: { name: 'Soraka', displayName: 'Soraka', image: 'Soraka.png' },
  50: { name: 'Swain', displayName: 'Swain', image: 'Swain.png' },
  517: { name: 'Sylas', displayName: 'Sylas', image: 'Sylas.png' },
  134: { name: 'Syndra', displayName: 'Syndra', image: 'Syndra.png' },
  223: { name: 'TahmKench', displayName: 'Tahm Kench', image: 'TahmKench.png' },
  163: { name: 'Taliyah', displayName: 'Taliyah', image: 'Taliyah.png' },
  91: { name: 'Talon', displayName: 'Talon', image: 'Talon.png' },
  44: { name: 'Taric', displayName: 'Taric', image: 'Taric.png' },
  17: { name: 'Teemo', displayName: 'Teemo', image: 'Teemo.png' },
  412: { name: 'Thresh', displayName: 'Thresh', image: 'Thresh.png' },
  18: { name: 'Tristana', displayName: 'Tristana', image: 'Tristana.png' },
  48: { name: 'Trundle', displayName: 'Trundle', image: 'Trundle.png' },
  23: { name: 'Tryndamere', displayName: 'Tryndamere', image: 'Tryndamere.png' },
  4: { name: 'TwistedFate', displayName: 'Twisted Fate', image: 'TwistedFate.png' },
  29: { name: 'Twitch', displayName: 'Twitch', image: 'Twitch.png' },
  77: { name: 'Udyr', displayName: 'Udyr', image: 'Udyr.png' },
  6: { name: 'Urgot', displayName: 'Urgot', image: 'Urgot.png' },
  110: { name: 'Varus', displayName: 'Varus', image: 'Varus.png' },
  67: { name: 'Vayne', displayName: 'Vayne', image: 'Vayne.png' },
  45: { name: 'Veigar', displayName: 'Veigar', image: 'Veigar.png' },
  161: { name: 'Velkoz', displayName: "Vel'Koz", image: 'Velkoz.png' },
  711: { name: 'Vex', displayName: 'Vex', image: 'Vex.png' },
  254: { name: 'Vi', displayName: 'Vi', image: 'Vi.png' },
  234: { name: 'Viego', displayName: 'Viego', image: 'Viego.png' },
  112: { name: 'Viktor', displayName: 'Viktor', image: 'Viktor.png' },
  8: { name: 'Vladimir', displayName: 'Vladimir', image: 'Vladimir.png' },
  106: { name: 'Volibear', displayName: 'Volibear', image: 'Volibear.png' },
  19: { name: 'Warwick', displayName: 'Warwick', image: 'Warwick.png' },
  498: { name: 'Xayah', displayName: 'Xayah', image: 'Xayah.png' },
  101: { name: 'Xerath', displayName: 'Xerath', image: 'Xerath.png' },
  5: { name: 'XinZhao', displayName: 'Xin Zhao', image: 'XinZhao.png' },
  157: { name: 'Yasuo', displayName: 'Yasuo', image: 'Yasuo.png' },
  777: { name: 'Yone', displayName: 'Yone', image: 'Yone.png' },
  83: { name: 'Yorick', displayName: 'Yorick', image: 'Yorick.png' },
  350: { name: 'Yuumi', displayName: 'Yuumi', image: 'Yuumi.png' },
  154: { name: 'Zac', displayName: 'Zac', image: 'Zac.png' },
  238: { name: 'Zed', displayName: 'Zed', image: 'Zed.png' },
  221: { name: 'Zeri', displayName: 'Zeri', image: 'Zeri.png' },
  115: { name: 'Ziggs', displayName: 'Ziggy', image: 'Ziggs.png' },
  26: { name: 'Zilean', displayName: 'Zilean', image: 'Zilean.png' },
  142: { name: 'Zoe', displayName: 'Zoe', image: 'Zoe.png' },
  143: { name: 'Zyra', displayName: 'Zyra', image: 'Zyra.png' }
};

class OnetricksScraper {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.ddragonVersion = '14.10.1'; // fallback version
    this.championsDict = { ...CHAMPION_MAP };
    this.runesDict = {}; // name -> id mapping
    this.perksMap = {}; // id -> { name, icon } mapping
    this.summonersDict = {}; // name -> id mapping
    this.spellsMap = {}; // id -> { name, icon } mapping
    this.stylesDict = {
      'Precision': 8000,
      'Domination': 8100,
      'Sorcery': 8200,
      'Resolve': 8400,
      'Inspiration': 8300
    };

    this.cacheDir = path.join(app.getPath('userData'), 'ddragon_cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    this.initDDragon();
  }

  // Load Data Dragon assets & cache them locally
  async initDDragon() {
    try {
      // 1. Get latest version
      const versionOk = await this.fetchLatestVersion();
      if (versionOk) {
        console.log(`DDragon initialized on version ${this.ddragonVersion}`);
      }

      // 2. Fetch Champion list, Runes, and Spells to populate dictionaries
      await Promise.all([
        this.loadChampions(),
        this.loadRunes(),
        this.loadSummoners()
      ]);

      console.log('Static Data Dragon assets loaded successfully.');
    } catch (e) {
      console.error('Failed to init DDragon:', e);
    }
  }

  fetchLatestVersion() {
    return new Promise((resolve) => {
      https.get('https://ddragon.leagueoflegends.com/api/versions.json', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const versions = JSON.parse(raw);
            if (versions && versions.length > 0) {
              this.ddragonVersion = versions[0];
              resolve(true);
            }
          } catch(e) {
            resolve(false);
          }
        });
      }).on('error', () => resolve(false));
    });
  }

  async loadChampions() {
    try {
      const data = await this.getDDragonJson(`cdn/${this.ddragonVersion}/data/es_ES/champion.json`, 'champion.json');
      if (data && data.data) {
        Object.values(data.data).forEach(c => {
          this.championsDict[parseInt(c.key)] = {
            name: c.id, // e.g. 'Aatrox', 'MissFortune'
            displayName: c.name, // e.g. 'Aatrox', 'Miss Fortune'
            image: c.image.full // e.g. 'Aatrox.png'
          };
        });
      }
    } catch (e) {
      console.error('Error loading champions dict:', e);
    }
  }

  async loadRunes() {
    try {
      const data = await this.getDDragonJson(`cdn/${this.ddragonVersion}/data/es_ES/runesReforged.json`, 'runesReforged.json');
      if (data && Array.isArray(data)) {
        data.forEach(style => {
          this.stylesDict[style.key] = style.id;
          style.slots.forEach((slot, slotIndex) => {
            slot.runes.forEach(rune => {
              // Populate meta dictionary mapping with styleId and isKeystone flag
              this.perksMap[rune.id] = {
                name: rune.name,
                icon: rune.icon,
                styleId: style.id,
                isKeystone: slotIndex === 0
              };

              // Normalize names to prevent mismatch
              this.runesDict[this.normalizeString(rune.name)] = rune.id;
              this.runesDict[this.normalizeString(rune.key)] = rune.id;
              // Map image filenames to perk IDs too for high resilience
              const filename = path.basename(rune.icon, '.png');
              this.runesDict[this.normalizeString(filename)] = rune.id;
            });
          });
        });
      }
    } catch (e) {
      console.error('Error loading runes dict:', e);
    }
  }

  async loadSummoners() {
    try {
      const data = await this.getDDragonJson(`cdn/${this.ddragonVersion}/data/es_ES/summoner.json`, 'summoner.json');
      if (data && data.data) {
        Object.values(data.data).forEach(spell => {
          const spellId = parseInt(spell.key);
          this.spellsMap[spellId] = {
            name: spell.name,
            icon: spell.image.full
          };

          this.summonersDict[this.normalizeString(spell.name)] = spellId;
          this.summonersDict[this.normalizeString(spell.id)] = spellId;
        });
      }
    } catch (e) {
      console.error('Error loading summoners dict:', e);
    }
  }


  getDDragonJson(endpoint, cacheFilename) {
    const cachePath = path.join(this.cacheDir, cacheFilename);

    // If cache file exists and is less than 3 days old, use it
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const diffMs = Date.now() - stats.mtimeMs;
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (diffMs < threeDaysMs) {
        try {
          return Promise.resolve(JSON.parse(fs.readFileSync(cachePath, 'utf8')));
        } catch (e) {}
      }
    }

    return new Promise((resolve, reject) => {
      https.get(`https://ddragon.leagueoflegends.com/${endpoint}`, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            fs.writeFileSync(cachePath, raw, 'utf8');
            resolve(data);
          } catch(e) {
            reject(e);
          }
        });
      }).on('error', (err) => {
        // Fallback to cache if request fails
        if (fs.existsSync(cachePath)) {
          try {
            return resolve(JSON.parse(fs.readFileSync(cachePath, 'utf8')));
          } catch(e) {}
        }
        reject(err);
      });
    });
  }

  resolveChampionId(id) {
    if (this.championsDict[id]) {
      return this.championsDict[id];
    }
    // Final safe generic fallback
    return { name: 'Unknown', displayName: 'Campeón', image: '' };
  }

  normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, ''); // remove non-alphanumeric
  }

  // Load Champion page in offscreen browser window to easily pass Cloudflare
  scrapeRunesAndSummoners(championName, role = '') {
    return new Promise((resolve, reject) => {
      let url = `https://www.onetricks.gg/es/champions/builds/${championName}`;
      if (role && role !== 'default') {
        url += `?role=${role}`;
      }
      
      const tempWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        show: DEBUG_BROWSER,
        title: `[DEBUG] Scraping: ${championName}`,
        webPreferences: {
          offscreen: !DEBUG_BROWSER,
          images: true,
          webSecurity: false
        }
      });

      if (DEBUG_BROWSER) {
        tempWindow.webContents.openDevTools({ mode: 'bottom' });
      }

      // Clear cookies/cache to avoid state bugs
      tempWindow.webContents.session.clearStorageData();

      // Enforce chrome user agent to avoid any bots detections
      tempWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Set timeout in case loading takes too long
      const timeout = setTimeout(() => {
        tempWindow.destroy();
        reject(new Error('Timeout waiting for Onetricks.gg to load'));
      }, 15000);

      tempWindow.webContents.on('did-finish-load', async () => {
        // Give client-side JS a few milliseconds to fully render / hydrate
        await new Promise(r => setTimeout(r, 1500));

        try {
          // Extract Next JSON props and raw HTML structures
          const scrapingResult = await tempWindow.webContents.executeJavaScript(`
            (function() {
              // 1. Try to find __NEXT_DATA__ JSON tag first
              let nextData = null;
              const nextEl = document.getElementById('__NEXT_DATA__');
              if (nextEl) {
                try {
                  nextData = JSON.parse(nextEl.textContent);
                } catch(e) {}
              }

              // 2. Extract DOM details (alt texts and image sources)
              const images = Array.from(document.querySelectorAll('img')).map(img => ({
                src: img.src,
                alt: img.alt,
                className: img.className
              }));

              return { nextData, images };
            })()
          `);

          tempWindow.destroy();
          clearTimeout(timeout);

          // Parse scraped results using our heuristics
          const data = this.parseScrapedData(championName, scrapingResult, role);
          resolve(this.resolveBuildDetails(data));
        } catch (err) {
          tempWindow.destroy();
          clearTimeout(timeout);
          reject(err);
        }
      });

      tempWindow.webContents.on('did-fail-load', (e, code, desc) => {
        // If error is just small resource issue, ignore, but if main load fails, reject
        if (desc !== 'ERR_ABORTED') {
          tempWindow.destroy();
          clearTimeout(timeout);
          reject(new Error(`Failed to load: ${desc} (code ${code})`));
        }
      });

      tempWindow.loadURL(url);
    });
  }

  // Parse scraped details
  parseScrapedData(championName, { nextData, images }, role = '') {
    const scrapedRole = (nextData && nextData.props && nextData.props.pageProps && nextData.props.pageProps.role) || role || 'default';
    let rawRunes = null;
    let rawSummoners = null;
    let rawItems = null;
    let rawRuneSets = [];

    // HEURISTIC 1: Check Next.js state data first (Primary/Optimal Path)
    if (nextData && nextData.props && nextData.props.pageProps) {
      const pp = nextData.props.pageProps;
      if (pp.firstItemStats) {
        let bestPatchData = null;
        const patchKeys = Object.keys(pp.firstItemStats || {});
        // Sort patchKeys so that specific versions (e.g. "16.10") are checked first, then major versions ("16"), then "all"
        const sortedKeys = patchKeys.sort((a, b) => {
          if (a === 'all') return 1;
          if (b === 'all') return -1;
          return b.localeCompare(a, undefined, { numeric: true });
        });

        for (const key of sortedKeys) {
          const pData = pp.firstItemStats[key];
          if (pData && pData.all && pData.all.popTree && pData.all.popRunes && Object.keys(pData.all.popRunes).length > 0) {
            // Find default first item key based on the absolute most popular classical build path
            let defaultItemKey = null;
            let maxPathPlayrate = -1;
            if (pData.all.popClassicPath && Array.isArray(pData.all.popClassicPath)) {
              for (const group of pData.all.popClassicPath) {
                if (Array.isArray(group)) {
                  for (const entry of group) {
                    if (entry && Array.isArray(entry[0]) && typeof entry[1] === 'number') {
                      if (entry[1] > maxPathPlayrate) {
                        maxPathPlayrate = entry[1];
                        if (entry[0].length > 0) {
                          defaultItemKey = entry[0][0].toString();
                        }
                      }
                    }
                  }
                }
              }
            }

            // Fallback: pick the first item key with the highest playrate if no path or item stats found
            if (!defaultItemKey || !pData[defaultItemKey] || !pData[defaultItemKey].popTree || !pData[defaultItemKey].popRunes || Object.keys(pData[defaultItemKey].popRunes).length === 0) {
              let maxPlayrate = -1;
              for (const itemKey of Object.keys(pData)) {
                if (itemKey !== 'all' && itemKey !== 'top' && pData[itemKey] && pData[itemKey].popTree && pData[itemKey].popRunes && Object.keys(pData[itemKey].popRunes).length > 0 && typeof pData[itemKey].playrate === 'number') {
                  if (pData[itemKey].playrate > maxPlayrate) {
                    maxPlayrate = pData[itemKey].playrate;
                    defaultItemKey = itemKey;
                  }
                }
              }
            }

            // Ultimate fallback to 'all'
            if (!defaultItemKey || !pData[defaultItemKey]) {
              defaultItemKey = 'all';
            }

            bestPatchData = pData[defaultItemKey];
            console.log(`[SCRAPER] Found optimal patch data in key: '${key}', item: '${defaultItemKey}'`);
            break;
          }
        }

        if (bestPatchData) {
          // Bypassed mostPopularKeystone to always fetch all 4 main sets from popTree
          if (bestPatchData.popTree && Array.isArray(bestPatchData.popTree)) {
            // Compute total playrates/games sum first to determine if we need to convert to percentages
            let sumPlayrates = 0;
            bestPatchData.popTree.forEach(entry => {
              if (entry && typeof entry[3] === 'number') sumPlayrates += entry[3];
            });

            // If the sum is around 100, they are already percentages.
            // If the sum is very large (e.g. total games), we convert entries to percentages.
            const isDirectPercentage = sumPlayrates > 0 && sumPlayrates <= 105;

            // ── DEBUG: dump raw structure to understand playrate fields ──────────
            console.log('[SCRAPER] RAW popTree:', JSON.stringify(bestPatchData.popTree));
            const firstKey = Object.keys(bestPatchData.popRunes)[0];
            console.log('[SCRAPER] RAW popRunes[firstKey][0]:', JSON.stringify(bestPatchData.popRunes[firstKey]?.[0]));
            // ─────────────────────────────────────────────────────────────────────
            for (const treeEntry of bestPatchData.popTree.slice(0, 4)) {
              const primaryStyleId = treeEntry[0];
              const subStyleId     = treeEntry[1];
              const keystoneId     = treeEntry[2];

              const keystoneBuilds = bestPatchData.popRunes[keystoneId];
              if (!keystoneBuilds || keystoneBuilds.length === 0) continue;

              // Find the build that has at least 2 runes belonging to the expected subStyleId.
              let chosenBuild = keystoneBuilds[0]; // fallback
              for (const build of keystoneBuilds) {
                const runes = build[0];
                if (!runes || runes.length < 6) continue;
                const matchingSecondaryRunes = runes.filter(runeId => this.perksMap[runeId]?.styleId === subStyleId);
                if (matchingSecondaryRunes.length >= 2) {
                  chosenBuild = build;
                  break;
                }
              }

              const runesList  = chosenBuild[0];
              const statShards = bestPatchData.popStat || [5005, 5008, 5002];

              // Determine playrate count: try treeEntry[3] first, then chosenBuild[1]
              const playrateCount = typeof treeEntry[3] === 'number' ? treeEntry[3]
                                  : typeof chosenBuild[1] === 'number' ? chosenBuild[1]
                                  : 0;

              let playratePercent = playrateCount;
              if (!isDirectPercentage && sumPlayrates > 0) {
                playratePercent = (playrateCount / sumPlayrates) * 100;
              }
              // If it's a decimal fraction (e.g. 0.1045), multiply by 100 to get percentage
              if (playratePercent > 0 && playratePercent <= 1.0) {
                playratePercent = playratePercent * 100;
              }
              playratePercent = Math.round(playratePercent * 10) / 10;

              const actualSecondaryRunes = runesList.filter(runeId => this.perksMap[runeId]?.styleId === subStyleId);
              console.log(`[SCRAPER] Set ${rawRuneSets.length + 1}: Primary=${primaryStyleId}, Sub=${subStyleId}, Keystone=${keystoneId}, treeEntry[3]=${treeEntry[3]}, build[1]=${chosenBuild[1]}, playratePercent=${playratePercent}`);
              console.log(`[SCRAPER]   Secondary runes found: ${actualSecondaryRunes.join(', ')} (expected subStyleId: ${subStyleId})`);

              rawRuneSets.push({
                name: championName,
                primaryStyleId,
                subStyleId,
                selectedPerkIds: [...runesList, ...statShards],
                _playrate: playratePercent
              });
            }
          }

          // Sort by playrate descending so leftmost tab = most played (matches web order)
          rawRuneSets.sort((a, b) => b._playrate - a._playrate);
          rawRunes = rawRuneSets[0] || null;


          // 5. Get summoners from JSON
          if (bestPatchData.sSpells && bestPatchData.sSpells.length > 0) {
            const spells = bestPatchData.sSpells[0][0];
            console.log('[SCRAPER] Summoner spells parsed:', spells);
            rawSummoners = {
              spell1Id: parseInt(spells[0]),
              spell2Id: parseInt(spells[1])
            };
          }

          // 6. Extract Item Builds from JSON!
          const itemData = (nextData && nextData.props && nextData.props.pageProps && nextData.props.pageProps.itemData) || bestPatchData.itemData || {};
          
          let startingBuild = [];
          if (bestPatchData.startingItems && bestPatchData.startingItems.length > 0) {
            const firstSet = bestPatchData.startingItems[0][0];
            startingBuild = firstSet.map(idStr => {
              const id = idStr.toString();
              return {
                id,
                name: itemData[id] ? itemData[id].name : `Objeto ${id}`,
                gold: itemData[id] ? itemData[id].gold : 0
              };
            });
          }

          let popularBoots = [];
          if (bestPatchData.boots && bestPatchData.boots.length > 0) {
            popularBoots = bestPatchData.boots.slice(0, 2).map(b => {
              const id = b[0].toString();
              return {
                id,
                name: itemData[id] ? itemData[id].name : `Botas ${id}`,
                gold: itemData[id] ? itemData[id].gold : 0
              };
            });
          }

          let coreItems = [];
          if (bestPatchData.popularItems && bestPatchData.popularItems.length > 0) {
            const startingIds = startingBuild.map(i => i.id);
            const bootsIds = popularBoots.map(i => i.id);
            
            // Try to extract from popClassicPath or popCore to get the purchase order sequence
            let sequentialIds = [];
            if (bestPatchData.popClassicPath && bestPatchData.popClassicPath.length > 0 && bestPatchData.popClassicPath[0][0]) {
              const pathEntry = bestPatchData.popClassicPath[0][0];
              if (Array.isArray(pathEntry[0])) {
                sequentialIds = pathEntry[0].map(id => id.toString());
              } else {
                sequentialIds = pathEntry.map(id => id.toString());
              }
            } else if (bestPatchData.popCore && bestPatchData.popCore.length > 0 && bestPatchData.popCore[0][0]) {
              sequentialIds = bestPatchData.popCore[0][0].map(id => id.toString());
            }

            // Filter out starting items and boots from the sequential list
            const cleanSequentialIds = sequentialIds.filter(id => !startingIds.includes(id) && !bootsIds.includes(id));

            // Map them to rich item objects
            const seqItems = cleanSequentialIds.map(id => ({
              id,
              name: itemData[id] ? itemData[id].name : `Objeto ${id}`,
              gold: itemData[id] ? itemData[id].gold : 0
            }));

            // Filter out starting, boots, and already added sequential items from popularItems list
            const filteredPopularItems = bestPatchData.popularItems.filter(item => {
              const id = item[0].toString();
              return !startingIds.includes(id) && !bootsIds.includes(id) && !cleanSequentialIds.includes(id);
            });

            // Map extra items
            const extraItems = filteredPopularItems.map(item => {
              const id = item[0].toString();
              return {
                id,
                name: itemData[id] ? itemData[id].name : `Objeto ${id}`,
                gold: itemData[id] ? itemData[id].gold : 0
              };
            });

            coreItems = [...seqItems, ...extraItems].slice(0, 6);
          }

          rawItems = {
            startingBuild,
            popularBoots,
            coreItems
          };
        }
      }
    }

    // HEURISTIC 2: Fallback to recursive pageProps search if primary failed
    if (!rawRunes && nextData && nextData.props && nextData.props.pageProps) {
      console.log('[SCRAPER] Primary heuristic failed. Falling back to recursive pageProps search...');
      const pageProps = nextData.props.pageProps;
      const foundRunes = this.searchNextPropsForRunes(pageProps);
      if (foundRunes) {
        rawRunes = foundRunes;
        console.log('[SCRAPER] Runes found via recursive search:', foundRunes);
      }
    }

    // HEURISTIC 3: Fallback to scanning page images (DOM heuristic) if both JSON heuristics failed
    if (!rawRunes) {
      console.log('[SCRAPER] JSON heuristics failed. Falling back to image/DOM scanning...');
      const runeIds = [];
      let primaryStyleId = null;
      let subStyleId = null;
      const summonerSpellIds = [];

      images.forEach(img => {
        const src = img.src || '';
        const alt = img.alt || '';

        // Check for Stat Shards (StatMod)
        const statShardMatch = src.match(/500[123578]/);
        if (statShardMatch) {
          const id = parseInt(statShardMatch[0]);
          if (!runeIds.includes(id)) {
            runeIds.push(id);
          }
          return;
        }

        // Check if URL has a 4-digit number matching a known rune
        const fourDigitMatch = src.match(/\b(8[0-4]\d{2}|9[12]\d{2})\b/);
        if (fourDigitMatch) {
          const id = parseInt(fourDigitMatch[1]);
          if (!runeIds.includes(id) && id !== 8000 && id !== 8100 && id !== 8200 && id !== 8300 && id !== 8400) {
            runeIds.push(id);
          }
          return;
        }

        // Try matching by image alt text or filename from URL
        const filename = path.basename(src, '.png');
        const normAlt = this.normalizeString(alt);
        const normFile = this.normalizeString(filename);

        // Match rune style trees
        Object.keys(this.stylesDict).forEach(styleName => {
          const normStyle = this.normalizeString(styleName);
          if (normAlt === normStyle || normFile.includes(normStyle)) {
            const styleId = this.stylesDict[styleName];
            if (!primaryStyleId) {
              primaryStyleId = styleId;
            } else if (subStyleId === null && styleId !== primaryStyleId) {
              subStyleId = styleId;
            }
          }
        });

        // Match runes
        const altRuneId = this.runesDict[normAlt] || this.runesDict[normFile];
        if (altRuneId && !runeIds.includes(altRuneId)) {
          runeIds.push(altRuneId);
        }

        // Match summoner spells
        const spellMatch = src.match(/summoner([a-zA-Z]+)/i);
        if (spellMatch) {
          const spellName = spellMatch[1];
          const spellId = this.summonersDict[this.normalizeString(spellName)];
          if (spellId && !summonerSpellIds.includes(spellId)) {
            summonerSpellIds.push(spellId);
          }
        } else {
          const spellNumMatch = src.match(/\/(\d+)\.png$/);
          if (spellNumMatch) {
            const id = parseInt(spellNumMatch[1]);
            if (id > 0 && id <= 21 && !summonerSpellIds.includes(id) && id !== 8) {
              summonerSpellIds.push(id);
            }
          }
        }

        // Match summoner spell names from alt text
        const altSpellId = this.summonersDict[normAlt];
        if (altSpellId && !summonerSpellIds.includes(altSpellId)) {
          summonerSpellIds.push(altSpellId);
        }
      });

      // Structure raw runes if we have enough matching IDs
      if (runeIds.length >= 6) {
        if (!primaryStyleId) primaryStyleId = 8000;
        if (!subStyleId) subStyleId = 8400;

        rawRunes = {
          name: championName,
          primaryStyleId: primaryStyleId,
          subStyleId: subStyleId,
          selectedPerkIds: runeIds.slice(0, 9)
        };

        // Pad stat shards if missing
        while (rawRunes.selectedPerkIds.length < 9) {
          const defaults = [5005, 5008, 5002];
          const nextDefault = defaults.find(d => !rawRunes.selectedPerkIds.includes(d));
          if (nextDefault) {
            rawRunes.selectedPerkIds.push(nextDefault);
          } else {
            rawRunes.selectedPerkIds.push(5002);
          }
        }
      }

      if (summonerSpellIds.length >= 2) {
        rawSummoners = {
          spell1Id: summonerSpellIds[0],
          spell2Id: summonerSpellIds[1]
        };
      }
    }

    // Role-based smart fallback for Summoner Spells if we still don't have them
    if (!rawSummoners) {
      const isJungle = role === 'jungle' || (role === 'default' && ['jungle'].includes((championName || '').toLowerCase()));
      if (isJungle) {
        console.log('[SCRAPER] Using smart fallback summoner spells for Jungle: Smite (11) and Flash (4)');
        rawSummoners = {
          spell1Id: 11, // Smite
          spell2Id: 4   // Flash
        };
      } else {
        console.log('[SCRAPER] Using smart fallback summoner spells for Lane: Ignite (14) and Flash (4)');
        rawSummoners = {
          spell1Id: 14, // Ignite
          spell2Id: 4   // Flash
        };
      }
    }

    return {
      champion: championName,
      role: scrapedRole,
      runes: rawRunes || this.getDefaultRunes(championName),
      rawRuneSets: rawRuneSets.length > 0 ? rawRuneSets : null,
      summoners: rawSummoners,
      items: rawItems || this.getDefaultItems(championName)
    };
  }

  // Recursive finder inside Next pageProps JSON to find rune setup automatically
  searchNextPropsForRunes(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Check if current object represents a rune list
    // Onetricks stats data might contain:
    // "primary": 8000, "secondary": 8400, "runes": [8010, 9111, 9104, 8299, 8446, 8473]
    if (obj.primaryStyleId && obj.subStyleId && Array.isArray(obj.selectedPerkIds)) {
      return {
        name: obj.name || 'Onetricks',
        primaryStyleId: parseInt(obj.primaryStyleId),
        subStyleId: parseInt(obj.subStyleId),
        selectedPerkIds: obj.selectedPerkIds.map(x => parseInt(x))
      };
    }

    // Recurse down children
    for (const key of Object.keys(obj)) {
      const res = this.searchNextPropsForRunes(obj[key]);
      if (res) return res;
    }
    return null;
  }

  // Generic fallback if scraping fails entirely
  getDefaultRunes(champ) {
    return {
      name: champ,
      primaryStyleId: 8000, // Precision
      subStyleId: 8400, // Resolve
      selectedPerkIds: [8010, 9111, 9104, 8299, 8446, 8473, 5005, 5008, 5002] // Conqueror setup
    };
  }

  getDefaultItems(champ) {
    return {
      startingBuild: [
        { id: '1055', name: 'Espada de Doran', gold: 450 },
        { id: '2003', name: 'Poción de vida', gold: 50 },
        { id: '3340', name: 'Tótem guardián', gold: 0 }
      ],
      popularBoots: [
        { id: '3047', name: 'Botas de acero revestidas', gold: 1100 }
      ],
      coreItems: [
        { id: '3071', name: 'Cuchilla negra', gold: 3000 },
        { id: '6610', name: 'Firmamento desgarrado', gold: 3100 }
      ]
    };
  }

  // Private helper: resolves one raw rune set object into a display-ready format
  _resolveRuneSet(rawRunes, styleMeta, shardMeta) {
    const primaryStyle = styleMeta[rawRunes.primaryStyleId] || { name: 'Primaria', icon: '' };
    const subStyle     = styleMeta[rawRunes.subStyleId]     || { name: 'Secundaria', icon: '' };

    const resolvedPerks = rawRunes.selectedPerkIds.map((id) => {
      if (shardMeta[id]) {
        return { id, name: shardMeta[id].name, icon: shardMeta[id].icon, desc: shardMeta[id].desc, isShard: true };
      }
      const perkInfo = this.perksMap[id];
      if (perkInfo) {
        return { id, name: perkInfo.name, icon: perkInfo.icon, desc: perkInfo.isKeystone ? 'Runa Clave' : 'Runa Mayor', isShard: false };
      }
      return { id, name: `Runa ${id}`, icon: '', desc: 'Desconocido', isShard: false };
    });

    const allRunes   = resolvedPerks.filter(p => !p.isShard);
    const shardsPerks = resolvedPerks.filter(p => p.isShard);

    let primaryPerks   = allRunes.filter(p => this.perksMap[p.id]?.styleId === rawRunes.primaryStyleId);
    let secondaryPerks = allRunes.filter(p => this.perksMap[p.id]?.styleId === rawRunes.subStyleId);

    if (primaryPerks.length !== 4 || secondaryPerks.length !== 2) {
      console.log(`[SCRAPER] Dynamic grouping incomplete (Primary: ${primaryPerks.length}, Secondary: ${secondaryPerks.length}). Using index-based fallback.`);
      primaryPerks   = allRunes.slice(0, 4);
      secondaryPerks = allRunes.slice(4, 6);
    } else {
      // Ensure keystone is always first in primary list
      primaryPerks.sort((a, b) => {
        const aKey = this.perksMap[a.id]?.isKeystone ? 1 : 0;
        const bKey = this.perksMap[b.id]?.isKeystone ? 1 : 0;
        return bKey - aKey;
      });
    }

    return {
      raw: rawRunes,
      primaryStyleId:   rawRunes.primaryStyleId,
      primaryStyleName: primaryStyle.name,
      primaryStyleIcon: primaryStyle.icon,
      subStyleId:       rawRunes.subStyleId,
      subStyleName:     subStyle.name,
      subStyleIcon:     subStyle.icon,
      primaryPerks,
      secondaryPerks,
      shardsPerks,
      playrate:         rawRunes._playrate
    };
  }

  // Resolve raw build IDs to rich objects (names, icons, descriptions) for easy drawing
  resolveBuildDetails(scraped) {
    if (!scraped) return null;

    const styleMeta = {
      8000: { name: 'Precisión',  icon: 'perk-images/Styles/7201_Precision.png' },
      8100: { name: 'Dominación', icon: 'perk-images/Styles/7200_Domination.png' },
      8200: { name: 'Brujería',   icon: 'perk-images/Styles/7202_Sorcery.png' },
      8300: { name: 'Inspiración',icon: 'perk-images/Styles/7204_Inspiration.png' },
      8400: { name: 'Valor',      icon: 'perk-images/Styles/7203_Resolve.png' }
    };

    const shardMeta = {
      5001: { name: 'Vida Escalar',           icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png', desc: 'Defensa' },
      5002: { name: 'Armadura',               icon: 'perk-images/StatMods/StatModsArmorIcon.png',         desc: 'Defensa' },
      5003: { name: 'Resistencia Mágica',     icon: 'perk-images/StatMods/StatModsMagicResIcon.png',      desc: 'Defensa' },
      5005: { name: 'Velocidad de Ataque',    icon: 'perk-images/StatMods/StatModsAttackSpeedIcon.png',   desc: 'Ataque' },
      5007: { name: 'Aceleración de Habilidad',icon: 'perk-images/StatMods/StatModsCDRIcon.png',          desc: 'Flexibilidad' },
      5008: { name: 'Fuerza Adaptable',       icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png', desc: 'Ataque/Flex' }
    };

    // Resolve every rune set (all popTree entries) in playrate order
    const rawSetsToResolve = (scraped.rawRuneSets && scraped.rawRuneSets.length > 0)
      ? scraped.rawRuneSets
      : [scraped.runes];
    const runeSets = rawSetsToResolve.map(r => this._resolveRuneSet(r, styleMeta, shardMeta));

    // Resolve Summoner Spells
    const summoners = scraped.summoners;
    const spell1 = this.spellsMap[summoners.spell1Id] || { name: 'Destello', icon: 'summonerFlash.png' };
    const spell2 = this.spellsMap[summoners.spell2Id] || { name: 'Prender',  icon: 'summonerIgnite.png' };

    return {
      champion: scraped.champion,
      role: scraped.role,
      runes: runeSets[0],   // backward-compat: first set = most popular
      runeSets,             // all sets ordered by playrate
      summoners: {
        raw: summoners,
        spell1: { id: summoners.spell1Id, name: spell1.name, icon: spell1.icon },
        spell2: { id: summoners.spell2Id, name: spell2.name, icon: spell2.icon }
      },
      items: scraped.items || { startingBuild: [], popularBoots: [], coreItems: [] }
    };
  }
}

module.exports = OnetricksScraper;
