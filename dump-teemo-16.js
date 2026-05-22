const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('c:/Users/crist/Documents/onetricks/onetricks-client/teemo_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;
const patchData = pp.firstItemStats['16'];

const styleNames = {
  8000: 'Precision',
  8100: 'Domination',
  8200: 'Sorcery',
  8300: 'Inspiration',
  8400: 'Resolve'
};

const keystoneNames = {
  8128: 'Dark Harvest',
  8005: 'PTA',
  8021: 'Fleet',
  8112: 'Electrocute'
};

for (const itemKey of Object.keys(patchData)) {
  const data = patchData[itemKey];
  if (!data.popRunes) continue;
  
  let totalGames = 0;
  for (const kId of Object.keys(data.popRunes)) {
    data.popRunes[kId].forEach(b => {
      totalGames += b[1] || 0;
    });
  }
  
  if (data.popTree) {
    data.popTree.forEach(tree => {
      const pStyle = tree[0];
      const sStyle = tree[1];
      const keystone = tree[2];
      
      let sumPlayrates = 0;
      if (data.popRunes[keystone]) {
        data.popRunes[keystone].forEach(b => {
          if (b[2] && b[2][0] === pStyle && b[2][1] === sStyle) {
            sumPlayrates += b[1] || 0;
          }
        });
      }
      
      const percentOfItem = totalGames > 0 ? (sumPlayrates / totalGames) * 100 : 0;
      const percentGlobal = sumPlayrates * 100;
      
      console.log(`Patch 16 | Item: ${itemKey} | ${keystoneNames[keystone] || keystone} | ${styleNames[pStyle]}+${styleNames[sStyle]} | %Item: ${percentOfItem.toFixed(1)}% | %Global: ${percentGlobal.toFixed(1)}%`);
    });
  }
}
