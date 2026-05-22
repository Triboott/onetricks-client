const fs = require('fs');
const pp = JSON.parse(fs.readFileSync('teemo_nextData.json', 'utf8')).props.pageProps;

const patchKeys = Object.keys(pp.firstItemStats).sort((a, b) => {
  if (a === 'all') return 1;
  if (b === 'all') return -1;
  return b.localeCompare(a, undefined, { numeric: true });
});
const latestKey = patchKeys[0];
const pData = pp.firstItemStats[latestKey];

// Find defaultItemKey (most popular item)
let defaultItemKey = null, maxPlayrate = -1;
for (const k of Object.keys(pData)) {
  const d = pData[k];
  if (k !== 'all' && k !== 'top' && d?.popTree && d?.popRunes && typeof d.playrate === 'number') {
    if (d.playrate > maxPlayrate) { maxPlayrate = d.playrate; defaultItemKey = k; }
  }
}
if (!defaultItemKey) defaultItemKey = 'all';

const bestPatchData = pData[defaultItemKey];
const allPatchData  = pData['all'] || bestPatchData;

const computeComboPlayrate = (p, s, ks) => {
  const builds = allPatchData.popRunes?.[ks];
  if (!builds) return 0;
  return builds.reduce((sum, b) => (b[2] && b[2][0] === p && b[2][1] === s) ? sum + (b[1]||0) : sum, 0);
};

let treeEntries = [...(bestPatchData.popTree || [])];
const originalIndex = new Map(treeEntries.map((e, i) => [e, i]));
const keystoneOrder = (allPatchData.popKeystone || []).map(k => parseInt(k[0]));

treeEntries.sort((a, b) => {
  const idxA = keystoneOrder.indexOf(a[2]);
  const idxB = keystoneOrder.indexOf(b[2]);
  if (idxA !== -1 && idxB !== -1) {
    if (idxA !== idxB) return idxA - idxB;
    return (originalIndex.get(a)||0) - (originalIndex.get(b)||0); // preserve item order
  }
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return (originalIndex.get(a)||0) - (originalIndex.get(b)||0);
});
treeEntries = treeEntries.slice(0, 4);

const names = { 8000:'Precisión', 8100:'Dominación', 8200:'Brujería', 8300:'Inspiración', 8400:'Valor' };
const ksNames = { 8128:'Cosecha oscura', 8005:'Ataque intensificado', 8021:'Triunfador', 8112:'Electrocutar' };

console.log(`Most popular item: ${defaultItemKey} (${(maxPlayrate*100).toFixed(1)}%)`);
console.log(`Item popTree: ${JSON.stringify(bestPatchData.popTree)}`);
console.log('\n=== RESULT (should match onetricks.gg) ===');
treeEntries.forEach((e, i) => {
  const rate = computeComboPlayrate(e[0], e[1], e[2]);
  console.log(`Set ${i+1}: ${names[e[0]]||e[0]} + ${names[e[1]]||e[1]} | ${ksNames[e[2]]||e[2]} | ${(rate*100).toFixed(1)}%`);
});
