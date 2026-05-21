const fs = require('fs');
const path = require('path');

const scraperFile = fs.readFileSync(path.join(__dirname, '../onetricks-scraper.js'), 'utf8');

// Mock OnetricksScraper class enough to test its parser
const mockScraper = {
  perksMap: {},
  normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');
  },
  cleanDescription(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }
};

// Load runesReforged.json to populate perksMap
const cacheDir = path.join(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.config'), 'onetricks-client/ddragon_cache');
let runesPath = path.join(cacheDir, 'runesReforged.json');
if (!fs.existsSync(runesPath)) {
  // Let's try inside workspace
  runesPath = path.join(__dirname, '../runesReforged.json');
}

if (fs.existsSync(runesPath)) {
  const data = JSON.parse(fs.readFileSync(runesPath, 'utf8'));
  data.forEach(style => {
    style.slots.forEach((slot, slotIndex) => {
      slot.runes.forEach(rune => {
        mockScraper.perksMap[rune.id] = {
          name: rune.name,
          icon: rune.icon,
          description: mockScraper.cleanDescription(rune.description),
          styleId: style.id,
          slotIndex: slotIndex,
          isKeystone: slotIndex === 0
        };
      });
    });
  });
} else {
  console.log('runesReforged.json not found in cache. Using local fallback.');
  // We can load from DDragon or mock it
}

// Read next_data_debug.json
const nextData = JSON.parse(fs.readFileSync(path.join(__dirname, '../next_data_debug.json'), 'utf8'));

// Test parsing
const pageProps = nextData.props.pageProps;
const role = 'default';
const roleKey = (role && role !== 'default') ? role.toLowerCase() : 'all';
const statsObj = pageProps.firstItemStats[roleKey] || pageProps.firstItemStats['all'];

console.log('statsObj exists:', !!statsObj);
if (statsObj) {
  console.log('statsObj.all exists:', !!statsObj.all);
  if (statsObj.all) {
    const allStats = statsObj.all;
    const popKeystone = allStats.popKeystone;
    const popStat = allStats.popStat;
    const sSpells = allStats.sSpells;

    console.log('popKeystone:', popKeystone);
    console.log('popStat:', popStat);
    console.log('sSpells:', sSpells);

    let keystoneId = null;
    if (popKeystone && popKeystone.length > 0) {
      keystoneId = popKeystone[0][0]; // Most popular keystone ID (string)
    }
    console.log('keystoneId:', keystoneId);

    if (keystoneId && allStats.popRunes && allStats.popRunes[keystoneId]) {
      const runePaths = allStats.popRunes[keystoneId];
      console.log('runePaths length:', runePaths.length);
      if (runePaths && runePaths.length > 0) {
        const bestPath = runePaths[0];
        console.log('bestPath:', bestPath);
        const perks = bestPath[0];
        const trees = bestPath[2];

        const primaryStyleId = parseInt(trees[0]);
        const subStyleId = parseInt(trees[1]);

        console.log('primaryStyleId:', primaryStyleId);
        console.log('subStyleId:', subStyleId);
        console.log('perks:', perks);

        const primaryPerks = [];
        const secondaryPerks = [];

        perks.forEach(id => {
          const pId = parseInt(id);
          const meta = mockScraper.perksMap[pId];
          if (meta) {
            if (meta.styleId === primaryStyleId) {
              primaryPerks.push({ id: pId, slotIndex: meta.slotIndex });
            } else if (meta.styleId === subStyleId) {
              secondaryPerks.push({ id: pId, slotIndex: meta.slotIndex });
            }
          } else {
            console.log(`Meta not found for perk ID: ${pId}`);
            primaryPerks.push({ id: pId, slotIndex: 9 });
          }
        });

        console.log('Unsorted primaryPerks:', primaryPerks);
        console.log('Unsorted secondaryPerks:', secondaryPerks);

        primaryPerks.sort((a, b) => a.slotIndex - b.slotIndex);
        secondaryPerks.sort((a, b) => a.slotIndex - b.slotIndex);

        const sortedStandardPerks = [
          ...primaryPerks.map(p => p.id),
          ...secondaryPerks.map(p => p.id)
        ];

        let shards = [5005, 5008, 5011];
        if (Array.isArray(popStat) && popStat.length >= 3) {
          shards = popStat.map(x => parseInt(x));
        }

        const rawRunes = {
          name: 'Teemo',
          primaryStyleId,
          subStyleId,
          selectedPerkIds: [...sortedStandardPerks, ...shards]
        };

        console.log('Parsed Runes Result perk IDs:', rawRunes.selectedPerkIds);
      }
    }
  }
}
