const fs = require('fs');
const path = require('path');

try {
  const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    console.log('__NEXT_DATA__ tag not found in scraped_debug.html!');
    process.exit(1);
  }

  const nextData = JSON.parse(match[1]);
  console.log('Successfully parsed __NEXT_DATA__!');
  
  // Save it for inspection
  fs.writeFileSync(path.join(__dirname, 'next_data_debug.json'), JSON.stringify(nextData, null, 2), 'utf8');
  console.log('Saved __NEXT_DATA__ structure to next_data_debug.json');

  // Let's search inside nextData recursively for runes (e.g. keys like 'primaryStyleId', 'runes', 'selectedPerkIds', 'perks', etc.)
  function searchRunes(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => searchRunes(item, `${path}[${index}]`));
      return;
    }

    // Print keys that look like runes
    const keys = Object.keys(obj);
    if (keys.includes('primaryStyleId') || keys.includes('selectedPerkIds') || keys.includes('runes') || keys.includes('perks')) {
      console.log(`\nFound potential rune structure at path: ${path}`);
      console.log('Keys:', keys);
      console.log('primaryStyleId:', obj.primaryStyleId);
      console.log('subStyleId:', obj.subStyleId);
      console.log('selectedPerkIds:', obj.selectedPerkIds);
      console.log('runes:', obj.runes);
      console.log('perks:', obj.perks);
    }

    for (const key of keys) {
      searchRunes(obj[key], `${path}.${key}`);
    }
  }

  searchRunes(nextData.props);

} catch (err) {
  console.error('Error:', err);
}
