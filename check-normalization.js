const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const pData = pp.firstItemStats['16.10'].all;

if (pData) {
  const tree = pData.popTree;
  const runes = pData.popRunes;
  const popKeystone = pData.popKeystone;
  
  // Calculate total playrates from popKeystone
  let totalKeystonePlayrate = 0;
  popKeystone.forEach(k => totalKeystonePlayrate += k[1]);
  
  console.log('Total popKeystone Playrate:', totalKeystonePlayrate);

  // Sum of all build playrates in popRunes
  let totalBuildPlayrate = 0;
  Object.keys(runes).forEach(k => {
    runes[k].forEach(b => {
      totalBuildPlayrate += b[1];
    });
  });
  console.log('Total popRunes Playrate:', totalBuildPlayrate);
  
  // Calculate playrates for each tree entry by summing builds and normalizing by totalBuildPlayrate
  console.log('\n--- Normalized against totalBuildPlayrate ---');
  tree.forEach((entry, idx) => {
    const primary = entry[0];
    const sub = entry[1];
    const keystone = entry[2];
    
    let sum = 0;
    (runes[keystone] || []).forEach(b => {
      if (b[2] && b[2][0] === primary && b[2][1] === sub) {
        sum += b[1];
      }
    });
    
    const percent = (sum / totalBuildPlayrate) * 100;
    console.log(`Set ${idx + 1}: ${primary} + ${sub} -> ${percent.toFixed(1)}%`);
  });
  
  // Calculate playrates by normalizing by totalKeystonePlayrate (which is 1.0)
  console.log('\n--- Normalized against totalKeystonePlayrate (1.0) ---');
  tree.forEach((entry, idx) => {
    const primary = entry[0];
    const sub = entry[1];
    const keystone = entry[2];
    
    let sum = 0;
    (runes[keystone] || []).forEach(b => {
      if (b[2] && b[2][0] === primary && b[2][1] === sub) {
        sum += b[1];
      }
    });
    
    const percent = (sum / totalKeystonePlayrate) * 100;
    console.log(`Set ${idx + 1}: ${primary} + ${sub} -> ${percent.toFixed(1)}%`);
  });
}
