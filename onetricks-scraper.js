const { BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

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
    this.perksMap = {}; // id -> { name, icon, description } mapping
    this.summonersDict = {}; // name -> id mapping
    this.spellsMap = {}; // id -> { name, icon } mapping
    this.itemsMap = {}; // id -> { name, description } mapping
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

  // Purge HTML tags from strings (<b>, <font>, <br>, etc.)
  cleanDescription(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ') // Clean consecutive whitespaces
      .trim();
  }

  // Load Data Dragon assets & cache them locally
  async initDDragon() {
    try {
      // 1. Get latest version
      const versionOk = await this.fetchLatestVersion();
      if (versionOk) {
        console.log(`DDragon initialized on version ${this.ddragonVersion}`);
      }

      // 2. Fetch Champion list, Runes, Spells, and Items to populate dictionaries
      await Promise.all([
        this.loadChampions(),
        this.loadRunes(),
        this.loadSummoners(),
        this.loadItems()
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
              // Populate meta dictionary mapping with style and slot properties
              this.perksMap[rune.id] = {
                name: rune.name,
                icon: rune.icon,
                description: this.cleanDescription(rune.description),
                styleId: style.id,
                slotIndex: slotIndex,
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

      // Check if local rune.json exists in workspace directory to override/extend descriptions
      const localRunePath = path.join(__dirname, 'rune.json');
      if (fs.existsSync(localRunePath)) {
        try {
          const rawRunes = JSON.parse(fs.readFileSync(localRunePath, 'utf8'));
          if (Array.isArray(rawRunes)) {
            rawRunes.forEach(style => {
              style.slots.forEach((slot, slotIndex) => {
                slot.runes.forEach(rune => {
                  this.perksMap[rune.id] = {
                    name: rune.name,
                    icon: rune.icon || (this.perksMap[rune.id] ? this.perksMap[rune.id].icon : ''),
                    description: this.cleanDescription(rune.description || rune.desc),
                    styleId: style.id,
                    slotIndex: slotIndex,
                    isKeystone: slotIndex === 0
                  };
                });
              });
            });
          } else {
            // Direct mapping format: { "8128": { "name": "Cosecha Oscura", "description": "..." } }
            Object.keys(rawRunes).forEach(id => {
              const rune = rawRunes[id];
              const existing = this.perksMap[parseInt(id)] || {};
              this.perksMap[parseInt(id)] = {
                name: rune.name,
                icon: rune.icon || existing.icon || '',
                description: this.cleanDescription(rune.description || rune.desc),
                styleId: existing.styleId || null,
                slotIndex: existing.slotIndex !== undefined ? existing.slotIndex : 9,
                isKeystone: existing.isKeystone || false
              };
            });
          }
          console.log('[SCRAPER] rune.json local cargado y procesado con éxito.');
        } catch (e) {
          console.error('Error al cargar rune.json local:', e);
        }
      }
    } catch (e) {
      console.error('Error loading runes dict:', e);
    }
  }

  async loadItems() {
    try {
      this.itemsMap = {};

      // 1. Try to load local item.json from the workspace
      const localItemPath = path.join(__dirname, 'item.json');
      if (fs.existsSync(localItemPath)) {
        try {
          const rawItems = JSON.parse(fs.readFileSync(localItemPath, 'utf8'));
          const itemsData = rawItems.data || rawItems;
          Object.keys(itemsData).forEach(id => {
            const item = itemsData[id];
            this.itemsMap[parseInt(id)] = {
              name: item.name,
              description: this.cleanDescription(item.description || item.desc)
            };
          });
          console.log('[SCRAPER] item.json local cargado y procesado con éxito.');
          return;
        } catch (e) {
          console.error('Error al cargar item.json local:', e);
        }
      }

      // 2. Fallback: Download/fetch item.json from Data Dragon
      const data = await this.getDDragonJson(`cdn/${this.ddragonVersion}/data/es_ES/item.json`, 'item.json');
      if (data && data.data) {
        Object.keys(data.data).forEach(id => {
          const item = data.data[id];
          this.itemsMap[parseInt(id)] = {
            name: item.name,
            description: this.cleanDescription(item.description)
          };
        });
        console.log('[SCRAPER] item.json cargado y cacheado desde Data Dragon.');
      }
    } catch (e) {
      console.error('Error loading items dict:', e);
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

  getOnetricksUrlName(name) {
    if (!name) return 'Teemo';
    
    // Para Teemo devolvemos Teemo con T mayúscula
    if (name.toLowerCase() === 'teemo') {
      return 'Teemo';
    }
    
    // Para otros campeones usamos el nombre tal cual viene de Data Dragon (e.g. MissFortune, Wukong)
    return name;
  }

  // Load Champion page in offscreen browser window to easily pass Cloudflare
  scrapeRunesAndSummoners(championName, role = '') {
    return new Promise((resolve, reject) => {
      const getUrl = (r) => {
        const urlChampName = this.getOnetricksUrlName(championName);
        // URL base = rol más popular (sin parámetro)
        // URL con rol específico = ?role=top / ?role=jungle / ?role=mid / ?role=bot / ?role=support
        let u = `https://www.onetricks.gg/es/champions/builds/${urlChampName}`;
        if (r && r !== 'default') {
          u += `?role=${r.toLowerCase()}`;
        }
        return u;
      };

      const doScrape = (url, isFallback = false) => {
        console.log(`[SCRAPER] Cargando URL: ${url} (Fallback: ${isFallback})`);
        const tempWindow = new BrowserWindow({
          width: 1200,
          height: 800,
          show: true, // Hacemos el navegador visible para que el usuario pueda ver qué pasa
          webPreferences: {
            offscreen: false, // Desactivamos el modo offscreen
            images: true, // Activamos la carga de imágenes
            webSecurity: false
          }
        });

        // Abrimos las herramientas de desarrollo para poder inspeccionar errores
        tempWindow.webContents.openDevTools();

        // Clear cookies/cache to avoid state bugs
        tempWindow.webContents.session.clearStorageData();

        // Enforce chrome user agent to avoid any bots detections
        tempWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        let isDone = false;
        // Set timeout in case loading takes too long
        const timeout = setTimeout(() => {
          if (isDone) return;
          isDone = true;
          tempWindow.destroy();
          if (role && role !== 'default' && !isFallback) {
            console.log(`[SCRAPER] Timeout en rol. Reintentando con base...`);
            doScrape(getUrl(''), true);
          } else {
            reject(new Error('Timeout waiting for Onetricks.gg to load'));
          }
        }, 15000);

        tempWindow.webContents.on('did-finish-load', async () => {
          if (isDone) return;

          const currentUrl = tempWindow.webContents.getURL();
          const currentTitle = tempWindow.webContents.getTitle();
          console.log(`[SCRAPER] did-finish-load en URL: "${currentUrl}", Título: "${currentTitle}"`);

          // Inyectar CSS para ocultar el banner de cookies y que no moleste visualmente
          try {
            await tempWindow.webContents.insertCSS(`
              .fc-consent-root, 
              .fc-ab-root, 
              #google-fc-consent, 
              .cmp-container, 
              #onetrust-consent-sdk, 
              .qc-cmp2-container, 
              .sn-consent-tool,
              .cookie-consent,
              .cookie-notice,
              #cookie-law-info-bar,
              .didomi-popup,
              #didomi-host,
              .sp_consent,
              [class*="consent" i],
              [id*="consent" i] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
              }
            `);
            console.log('[SCRAPER] CSS anti-cookies inyectado correctamente.');
          } catch (e) {
            console.error('[SCRAPER] Error al inyectar CSS anti-cookies:', e);
          }

          const titleLower = currentTitle.toLowerCase();
          const urlLower = currentUrl.toLowerCase();

          // Check if it's the Vercel/Cloudflare/anti-bot verification page
          if (titleLower.includes('checkpoint') || titleLower.includes('security') || titleLower.includes('just a moment') || urlLower.includes('checkpoint')) {
            console.log(`[SCRAPER] Detectada pantalla de verificación anti-bot/Vercel ("${currentTitle}"). Esperando redirección automática a la página real...`);
            return; // Return early, do NOT set isDone, wait for next did-finish-load
          }

          // Give client-side JS a few milliseconds to fully render / hydrate
          await new Promise(r => setTimeout(r, 2500));
          if (isDone) return;

          try {
            // Extract Next JSON props, raw HTML structures, and elements with data-tooltip-html
            const scrapingResult = await tempWindow.webContents.executeJavaScript(`
              (function() {
                // 1. Try to dismiss cookie banner if present
                try {
                  function clickConsentButton(doc) {
                    if (!doc) return false;
                    
                    // A. Search for common consent button classes/selectors first
                    const selectors = [
                      '.fc-cta-consent', // Google Funding Choices primary accept button
                      '.fc-primary-button',
                      'button[class*="accept"]',
                      'button[class*="consent"]',
                      'button[class*="cookie"]',
                      'button[class*="agree"]',
                      '.consent-btn',
                      '.cookie-btn',
                      '#accept-choices',
                      '#onetrust-accept-btn-handler' // OneTrust
                    ];
                    
                    for (const sel of selectors) {
                      const el = doc.querySelector(sel);
                      if (el && typeof el.click === 'function') {
                        el.click();
                        console.log('[SCRAPER INJECTED] Dismissed cookie banner via selector: ' + sel);
                        return true;
                      }
                    }
                    
                    // B. Scan all clickable elements by text content
                    const tags = ['button', 'a', 'div', 'span', 'p'];
                    for (const tag of tags) {
                      const elements = Array.from(doc.querySelectorAll(tag));
                      const btn = elements.find(el => {
                        const txt = (el.textContent || '').trim().toLowerCase();
                        // Check exact or close matches to avoid clicking random buttons
                        return txt === 'aceptar' || 
                               txt === 'aceptar todo' || 
                               txt === 'aceptar y cerrar' ||
                               txt === 'permitir todo' || 
                               txt === 'permitir cookies' || 
                               txt === 'accept' || 
                               txt === 'accept all' || 
                               txt === 'agree' || 
                               txt === 'agree & close' ||
                               txt.includes('aceptar todas las cookies') ||
                               txt.includes('accept all cookies') ||
                               (tag === 'button' && (txt.includes('aceptar') || txt.includes('accept') || txt.includes('agree') || txt.includes('consent')));
                      });
                      
                      if (btn && typeof btn.click === 'function') {
                        btn.click();
                        console.log('[SCRAPER INJECTED] Dismissed cookie banner via tag: ' + tag + ' with text: ' + btn.textContent.trim());
                        return true;
                      }
                    }
                    return false;
                  }

                  function scanAndClickBanners() {
                    let dismissed = clickConsentButton(document);
                    
                    const iframes = Array.from(document.querySelectorAll('iframe'));
                    iframes.forEach(iframe => {
                      try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc) {
                          const ok = clickConsentButton(iframeDoc);
                          if (ok) dismissed = true;
                        }
                      } catch (e) {
                        // cross-origin iframe check error, safe to ignore
                      }
                    });
                    
                    if (dismissed) {
                      console.log('[SCRAPER INJECTED] Cookie consent dismissed successfully.');
                      return true;
                    }
                    return false;
                  }

                  // Scan and click immediately
                  let done = scanAndClickBanners();
                  
                  // Keep scanning every 300ms for up to 6 seconds in case it loads late
                  if (!done) {
                    let attempts = 0;
                    const interval = setInterval(() => {
                      attempts++;
                      const ok = scanAndClickBanners();
                      if (ok || attempts > 20) {
                        clearInterval(interval);
                      }
                    }, 300);
                  }
                } catch (e) {
                  console.error('[SCRAPER INJECTED] Error clicking cookie banner:', e);
                }

                // 2. Try to find __NEXT_DATA__ JSON tag first
                let nextData = null;
                const nextEl = document.getElementById('__NEXT_DATA__');
                if (nextEl) {
                  try {
                    nextData = JSON.parse(nextEl.textContent);
                  } catch(e) {}
                }

                // 3. Extract DOM details (alt texts and image sources)
                const images = Array.from(document.querySelectorAll('img')).map(img => ({
                  src: img.src || '',
                  alt: img.alt || '',
                  className: img.className || ''
                }));

                // 4. Extract elements with data-tooltip-html (active/inactive runes)
                const tooltips = Array.from(document.querySelectorAll('[data-tooltip-html]')).map(el => ({
                  tagName: el.tagName.toLowerCase(),
                  className: el.className || '',
                  tooltip: el.getAttribute('data-tooltip-html') || '',
                  src: el.src || '',
                  alt: el.alt || ''
                }));

                const title = document.title;
                const html = document.documentElement.outerHTML;

                return { nextData, images, tooltips, title, html };
              })()
            `);

            if (isDone) return;

            // Log page info for debugging
            console.log(`[DEBUG SCRAPER] Title: "${scrapingResult.title}". Length: ${scrapingResult.html ? scrapingResult.html.length : 0}`);
            fs.writeFileSync(path.join(__dirname, 'scraped_debug.html'), scrapingResult.html || '', 'utf8');

            const hasNextData = !!(scrapingResult.nextData && scrapingResult.nextData.props);
            const hasImages = scrapingResult.images && scrapingResult.images.length > 3;
            const hasTooltips = scrapingResult.tooltips && scrapingResult.tooltips.length > 0;

            if ((!hasNextData && !hasImages && !hasTooltips) && role && role !== 'default' && !isFallback) {
              isDone = true;
              tempWindow.destroy();
              clearTimeout(timeout);
              console.log(`[SCRAPER] Página vacía o bloqueada detectada para el rol. Reintentando con base...`);
              doScrape(getUrl(''), true);
              return;
            }

            // Parse scraped results using our resilient heuristics (NextJS stats + DOM Tooltips fallback)
            const data = this.parseScrapedData(championName, scrapingResult, role);

            // Check if we got fallbacked to default runes because both heuristics failed
            const isUsingDefaultFallbackRunes = data.runes && data.runes.primaryStyleId === 8000 && data.runes.subStyleId === 8400 && data.runes.selectedPerkIds[0] === 8010;
            const hadNoPerksOnPage = !scrapingResult.tooltips.some(t => {
              const text = t.tooltip || '';
              return text.includes('<b>') && !t.className.includes('nonActive');
            });

            if (isUsingDefaultFallbackRunes && hadNoPerksOnPage && role && role !== 'default' && !isFallback) {
              isDone = true;
              tempWindow.destroy();
              clearTimeout(timeout);
              console.log(`[SCRAPER] No se encontraron runas activas en la página del rol. Reintentando con base...`);
              doScrape(getUrl(''), true);
              return;
            }

            isDone = true;
            tempWindow.destroy();
            clearTimeout(timeout);
            resolve(this.resolveBuildDetails(data));
          } catch (err) {
            if (isDone) return;
            isDone = true;
            tempWindow.destroy();
            clearTimeout(timeout);
            if (role && role !== 'default' && !isFallback) {
              console.log(`[SCRAPER] Error al procesar rol. Reintentando con base...`, err);
              doScrape(getUrl(''), true);
            } else {
              reject(err);
            }
          }
        });

        tempWindow.webContents.on('did-fail-load', (e, code, desc) => {
          if (isDone) return;
          // If error is just small resource issue, ignore, but if main load fails, reject
          if (desc !== 'ERR_ABORTED') {
            isDone = true;
            tempWindow.destroy();
            clearTimeout(timeout);
            if (role && role !== 'default' && !isFallback) {
              console.log(`[SCRAPER] did-fail-load en rol. Reintentando con base... (desc: ${desc})`);
              doScrape(getUrl(''), true);
            } else {
              reject(new Error(`Failed to load: ${desc} (code ${code})`));
            }
          }
        });

        tempWindow.loadURL(url);
      };

      const initialUrl = getUrl(role);
      doScrape(initialUrl, false);
    });
  }

  // Parse scraped details
  parseScrapedData(championName, { nextData, images, tooltips }, role = '') {
    let rawRunes = null;
    let rawSummoners = null;

    console.log(`[SCRAPER] Analizando datos de onetricks para ${championName} (Rol: ${role || 'por defecto'})...`);

    // HEURISTIC 1: Check Next.js state data (extremely reliable and precise)
    if (nextData && nextData.props && nextData.props.pageProps) {
      const pageProps = nextData.props.pageProps;
      if (pageProps.firstItemStats) {
        // Find stats block for the current patch (defaults to 'all' patch)
        const patchStats = pageProps.firstItemStats['all'] || pageProps.firstItemStats[Object.keys(pageProps.firstItemStats)[0]];
        
        if (patchStats) {
          // Find stats for the requested role under the patch stats
          const roleKey = (role && role !== 'default') ? role.toLowerCase() : 'all';
          let allStats = patchStats[roleKey] || patchStats['all'];

          // On onetricks.gg, role statistics are stored under their most popular first item ID
          // patchStats[roleKey] contains the ID of that first item as a string (e.g. "3087" for top Teemo).
          // We must look up that item ID in patchStats to get the actual stats block!
          if (typeof allStats === 'string' && patchStats[allStats]) {
            console.log(`[SCRAPER] [HEURÍSTICA NEXTJS] Mapeando rol ${roleKey} a través de su item más popular: ${allStats}`);
            allStats = patchStats[allStats];
          }

          if (allStats && typeof allStats === 'object') {
            const popKeystone = allStats.popKeystone;
          const popStat = allStats.popStat; // Stat Shards, e.g. [5005, 5008, 5011]
          const sSpells = allStats.sSpells;

          let keystoneId = null;
          if (popKeystone && popKeystone.length > 0) {
            keystoneId = popKeystone[0][0]; // Most popular keystone ID (string)
          }

          if (keystoneId && allStats.popRunes && allStats.popRunes[keystoneId]) {
            const runePaths = allStats.popRunes[keystoneId];
            if (runePaths && runePaths.length > 0) {
              const bestPath = runePaths[0]; // [ [runes], winrate, [trees] ]
              const perks = bestPath[0]; // array of standard 6 perk IDs
              const trees = bestPath[2]; // [primaryTree, subTree, keystone]

              const primaryStyleId = parseInt(trees[0]);
              const subStyleId = parseInt(trees[1]);

              // Separate and sort perks based on DDragon slotIndex to guarantee standard order
              const primaryPerks = [];
              const secondaryPerks = [];

              perks.forEach(id => {
                const pId = parseInt(id);
                const meta = this.perksMap[pId];
                if (meta) {
                  if (meta.styleId === primaryStyleId) {
                    primaryPerks.push({ id: pId, slotIndex: meta.slotIndex });
                  } else if (meta.styleId === subStyleId) {
                    secondaryPerks.push({ id: pId, slotIndex: meta.slotIndex });
                  }
                } else {
                  primaryPerks.push({ id: pId, slotIndex: 9 });
                }
              });

              primaryPerks.sort((a, b) => a.slotIndex - b.slotIndex);
              secondaryPerks.sort((a, b) => a.slotIndex - b.slotIndex);

              const sortedStandardPerks = [
                ...primaryPerks.map(p => p.id),
                ...secondaryPerks.map(p => p.id)
              ];

              let shards = [5005, 5008, 5011]; // AS, Adaptive, Scaling HP default
              if (Array.isArray(popStat) && popStat.length >= 3) {
                shards = popStat.map(x => parseInt(x));
              }

              rawRunes = {
                name: championName,
                primaryStyleId,
                subStyleId,
                selectedPerkIds: [...sortedStandardPerks, ...shards]
              };

              console.log(`[SCRAPER] [HEURÍSTICA NEXTJS] Éxito. Runas obtenidas:`, rawRunes.selectedPerkIds);
            }
          }

          // Summoner spells
          if (sSpells && sSpells.length > 0 && sSpells[0][0]) {
            const firstPair = sSpells[0][0]; // ["14", "4"]
            rawSummoners = {
              spell1Id: parseInt(firstPair[0]),
              spell2Id: parseInt(firstPair[1])
            };
            console.log(`[SCRAPER] [HEURÍSTICA NEXTJS] Hechizos obtenidos:`, rawSummoners.spell1Id, rawSummoners.spell2Id);
          }
        }
      }
    }
  }

    // HEURISTIC 2: Fallback to DOM tooltips parsing (resilient direct scraping)
    if (!rawRunes && tooltips && tooltips.length > 0) {
      console.log('[SCRAPER] [FALLBACK DOM] Intentando resolver runas y hechizos desde el DOM de tooltips...');
      const activeRunes = [];
      const activeSummoners = [];

      tooltips.forEach(t => {
        // Ignorar runas no activas / grises
        if (t.className.includes('nonActive')) return;

        // Extraer nombre del tooltip o del alt
        let name = '';
        const tooltipHtml = t.tooltip || '';
        const bMatch = tooltipHtml.match(/<b>([^<]+)<\/b>/i);
        if (bMatch) {
          name = bMatch[1].trim();
        } else if (t.alt) {
          name = t.alt.trim();
        }

        if (!name) return;
        const normName = this.normalizeString(name);

        // Validar si es runa
        const runeId = this.runesDict[normName];
        if (runeId) {
          if (!activeRunes.some(r => r.id === runeId)) {
            const meta = this.perksMap[runeId];
            activeRunes.push({
              id: runeId,
              styleId: meta ? meta.styleId : null,
              slotIndex: meta ? meta.slotIndex : 9,
              isKeystone: meta ? meta.isKeystone : false
            });
          }
        }

        // Validar si es hechizo de invocador
        const spellId = this.summonersDict[normName];
        if (spellId) {
          if (!activeSummoners.includes(spellId)) {
            activeSummoners.push(spellId);
          }
        }
      });

      console.log(`[SCRAPER] [FALLBACK DOM] Runas activas encontradas en DOM:`, activeRunes.map(r => r.id));
      console.log(`[SCRAPER] [FALLBACK DOM] Hechizos activos encontrados en DOM:`, activeSummoners);

      if (activeRunes.length >= 4) {
        const keystone = activeRunes.find(r => r.isKeystone);
        let primaryStyleId = keystone ? keystone.styleId : null;

        if (!primaryStyleId && activeRunes.length > 0) {
          primaryStyleId = activeRunes[0].styleId;
        }

        let subStyleId = null;
        const otherRunes = activeRunes.filter(r => r.styleId !== primaryStyleId);
        if (otherRunes.length > 0) {
          subStyleId = otherRunes[0].styleId;
        }

        if (!primaryStyleId) primaryStyleId = 8000;
        if (!subStyleId) subStyleId = 8400;

        const primaryPerks = activeRunes.filter(r => r.styleId === primaryStyleId).sort((a,b) => a.slotIndex - b.slotIndex);
        const secondaryPerks = activeRunes.filter(r => r.styleId === subStyleId).sort((a,b) => a.slotIndex - b.slotIndex);

        const sortedPerkIds = [
          ...primaryPerks.map(r => r.id),
          ...secondaryPerks.map(r => r.id)
        ];

        // Shards por defecto: AS (5005), Fuerza Adaptable (5008), Scaling HP (5011)
        const shards = [5005, 5008, 5011];

        rawRunes = {
          name: championName,
          primaryStyleId,
          subStyleId,
          selectedPerkIds: [...sortedPerkIds.slice(0, 6), ...shards]
        };

        console.log('[SCRAPER] [FALLBACK DOM] Runas resueltas correctamente:', rawRunes.selectedPerkIds);
      }

      if (activeSummoners.length >= 2) {
        rawSummoners = {
          spell1Id: activeSummoners[0],
          spell2Id: activeSummoners[1]
        };
        console.log('[SCRAPER] [FALLBACK DOM] Hechizos resueltos correctamente:', rawSummoners);
      }
    }

    // HEURISTIC 3: Legacy images fallback (scanning standard image tags)
    if (!rawRunes && images && images.length > 0) {
      console.log('[SCRAPER] [LEGACY FALLBACK] Usando escaneo heredado de imágenes...');
      const runeIds = [];
      let primaryStyleId = null;
      let subStyleId = null;
      const summonerSpellIds = [];

      images.forEach(img => {
        const src = img.src || '';
        const alt = img.alt || '';

        const statShardMatch = src.match(/500[123578]/);
        if (statShardMatch) {
          const id = parseInt(statShardMatch[0]);
          if (!runeIds.includes(id)) runeIds.push(id);
          return;
        }

        const fourDigitMatch = src.match(/\b(8[0-4]\d{2}|9[12]\d{2})\b/);
        if (fourDigitMatch) {
          const id = parseInt(fourDigitMatch[1]);
          if (!runeIds.includes(id) && id !== 8000 && id !== 8100 && id !== 8200 && id !== 8300 && id !== 8400) {
            runeIds.push(id);
          }
          return;
        }

        const filename = path.basename(src, '.png');
        const normAlt = this.normalizeString(alt);
        const normFile = this.normalizeString(filename);

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

        const altRuneId = this.runesDict[normAlt] || this.runesDict[normFile];
        if (altRuneId && !runeIds.includes(altRuneId)) {
          runeIds.push(altRuneId);
        }

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

        const altSpellId = this.summonersDict[normAlt];
        if (altSpellId && !summonerSpellIds.includes(altSpellId)) {
          summonerSpellIds.push(altSpellId);
        }
      });

      if (runeIds.length >= 6) {
        if (!primaryStyleId) primaryStyleId = 8000;
        if (!subStyleId) subStyleId = 8400;

        rawRunes = {
          name: championName,
          primaryStyleId: primaryStyleId,
          subStyleId: subStyleId,
          selectedPerkIds: runeIds.slice(0, 9)
        };

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

    // HEURISTIC 4: Fallbacks
    if (!rawRunes) {
      console.log('[SCRAPER] [FALLBACK GLOBAL] Cargando runas por defecto...');
      rawRunes = this.getDefaultRunes(championName);
    }
    if (!rawSummoners) {
      console.log('[SCRAPER] [FALLBACK GLOBAL] Cargando hechizos por defecto...');
      rawSummoners = {
        spell1Id: 4,  // Destello
        spell2Id: 14  // Prender
      };
    }

    return {
      champion: championName,
      runes: rawRunes,
      summoners: rawSummoners
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

  // Resolve raw build IDs to rich objects (names, icons, descriptions) for easy drawing
  resolveBuildDetails(scraped) {
    if (!scraped) return null;

    const runes = scraped.runes;
    const summoners = scraped.summoners;

    // Resolve Style Paths
    const styleMeta = {
      8000: { name: 'Precisión', icon: 'perk-images/Styles/7201_Precision.png' },
      8100: { name: 'Dominación', icon: 'perk-images/Styles/7200_Domination.png' },
      8200: { name: 'Brujería', icon: 'perk-images/Styles/7202_Sorcery.png' },
      8300: { name: 'Inspiración', icon: 'perk-images/Styles/7204_Inspiration.png' },
      8400: { name: 'Valor', icon: 'perk-images/Styles/7203_Resolve.png' }
    };

    const primaryStyle = styleMeta[runes.primaryStyleId] || { name: 'Primaria', icon: '' };
    const subStyle = styleMeta[runes.subStyleId] || { name: 'Secundaria', icon: '' };

    // Resolve Perks (Runes + Shards)
    const resolvedPerks = runes.selectedPerkIds.map((id, index) => {
      // Check for Stat Shards (StatMods)
      const shardMeta = {
        5001: { name: 'Vida Escalar', icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png', desc: 'Defensa' },
        5002: { name: 'Armadura', icon: 'perk-images/StatMods/StatModsArmorIcon.png', desc: 'Defensa' },
        5003: { name: 'Resistencia Mágica', icon: 'perk-images/StatMods/StatModsMagicResIcon.png', desc: 'Defensa' },
        5005: { name: 'Velocidad de Ataque', icon: 'perk-images/StatMods/StatModsAttackSpeedIcon.png', desc: 'Ataque' },
        5007: { name: 'Aceleración de Habilidad', icon: 'perk-images/StatMods/StatModsCDRIcon.png', desc: 'Flexibilidad' },
        5008: { name: 'Fuerza Adaptable', icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png', desc: 'Ataque/Flex' }
      };

      if (shardMeta[id]) {
        return {
          id,
          name: shardMeta[id].name,
          icon: shardMeta[id].icon,
          desc: shardMeta[id].desc,
          isShard: true
        };
      }

      // Check perk in runesReforged dictionary map
      const perkInfo = this.perksMap[id];
      if (perkInfo) {
        return {
          id,
          name: perkInfo.name,
          icon: perkInfo.icon,
          desc: perkInfo.description || (index === 0 ? 'Runa Clave' : 'Runa Mayor'),
          isShard: false
        };
      }

      // Safe Generic Fallback
      return {
        id,
        name: `Runa ${id}`,
        icon: '',
        desc: 'Desconocido',
        isShard: false
      };
    });

    // Separate Primary, Secondary and Shards for clean rendering
    // Indexes 0-3 are Primary (Keystone + 3 standard)
    // Indexes 4-5 are Secondary (2 standard)
    // Indexes 6-8 are Stat Shards (3 shards)
    const primaryPerks = resolvedPerks.slice(0, 4);
    const secondaryPerks = resolvedPerks.slice(4, 6);
    const shardsPerks = resolvedPerks.slice(6, 9);

    // Resolve Summoner Spells
    const spell1 = this.spellsMap[summoners.spell1Id] || { name: 'Destello', icon: 'summonerFlash.png' };
    const spell2 = this.spellsMap[summoners.spell2Id] || { name: 'Prender', icon: 'summonerIgnite.png' };

    return {
      champion: scraped.champion,
      runes: {
        raw: runes,
        primaryStyleId: runes.primaryStyleId,
        primaryStyleName: primaryStyle.name,
        primaryStyleIcon: primaryStyle.icon,
        subStyleId: runes.subStyleId,
        subStyleName: subStyle.name,
        subStyleIcon: subStyle.icon,
        primaryPerks,
        secondaryPerks,
        shardsPerks
      },
      summoners: {
        raw: summoners,
        spell1: { id: summoners.spell1Id, name: spell1.name, icon: spell1.icon },
        spell2: { id: summoners.spell2Id, name: spell2.name, icon: spell2.icon }
      }
    };
  }
}

module.exports = OnetricksScraper;
