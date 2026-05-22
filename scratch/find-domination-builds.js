const fs = require('fs');
const nextData = JSON.parse(fs.readFileSync('ambessa_nextData.json', 'utf8'));
const pp = nextData.props.pageProps;

let found = [];

Object.keys(pp.firstItemStats || {}).forEach(pk => {
  const patchData = pp.firstItemStats[pk];
  Object.keys(patchData || {}).forEach(ik => {
    const pData = patchData[ik];
    if (pData && pData.popRunes) {
      Object.keys(pData.popRunes).forEach(keystoneId => {
        pData.popRunes[keystoneId].forEach((build, idx) => {
          if (build[2] && build[2][1] === 8100) {
            found.push({
              patch: pk,
              item: ik,
              keystoneId,
              buildIndex: idx,
              styles: build[2],
              runes: build[0]
            });
          }
        });
      });
    }
  });
});

console.log('Found builds with Domination secondary:', found.length);
found.forEach(f => {
  console.log(f);
});
