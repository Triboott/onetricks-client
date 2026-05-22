const gameData = {
  blueTeam: [
    { puuid: 'puuid-blue-1', gameName: 'Faker OTP', tagLine: 'T1', displayName: 'Faker OTP#T1', wins: 290, losses: 210, winrate: 58, lp: 1250, tier: 'CHALLENGER', division: 'I' },
    { puuid: 'puuid-blue-2', gameName: 'Hide on bush', tagLine: 'KR1', displayName: 'Hide on bush#KR1', wins: 180, losses: 140, winrate: 56, lp: 850, tier: 'GRANDMASTER', division: 'I' },
    { puuid: 'puuid-blue-3', gameName: 'ShowMaker', tagLine: 'DK', displayName: 'ShowMaker#DK', wins: 130, losses: 110, winrate: 54, lp: 320, tier: 'MASTER', division: 'I' },
    { puuid: 'puuid-blue-4', gameName: 'Canyon SoloQ', tagLine: 'GEN', displayName: 'Canyon SoloQ#GEN', wins: 95, losses: 85, winrate: 53, lp: 45, tier: 'DIAMOND', division: 'I' },
    { puuid: 'puuid-blue-5', gameName: 'Teemo OTP', tagLine: 'OTP', displayName: 'Teemo OTP#OTP', wins: 58, losses: 42, winrate: 58, lp: 75, tier: 'EMERALD', division: 'II' }
  ],
  redTeam: [
    { puuid: 'puuid-red-1', gameName: 'Caps Mid', tagLine: 'G2', displayName: 'Caps Mid#G2', wins: 48, losses: 52, winrate: 48, lp: 20, tier: 'PLATINUM', division: 'III' },
    { puuid: 'puuid-red-2', gameName: 'Rekkles ADC', tagLine: 'T1D', displayName: 'Rekkles ADC#T1D', wins: 70, losses: 73, winrate: 49, lp: 15, tier: 'GOLD', division: 'I' },
    { puuid: 'puuid-red-3', gameName: 'Mikyx Support', tagLine: 'G2', displayName: 'Mikyx Support#G2', wins: 51, losses: 49, winrate: 51, lp: 90, tier: 'SILVER', division: 'IV' },
    { puuid: 'puuid-red-4', gameName: 'Jankos Sejuani', tagLine: 'WIT', displayName: 'Jankos Sejuani#WIT', wins: 36, losses: 44, winrate: 45, lp: 50, tier: 'BRONZE', division: 'II' },
    { puuid: 'puuid-red-5', gameName: 'Wunder Gragas', tagLine: 'KC', displayName: 'Wunder Gragas#KC', wins: 12, losses: 18, winrate: 40, lp: 10, tier: 'IRON', division: 'I' }
  ]
};

// Simulation of OP.GG url compilation
const allPlayers = [...(gameData.blueTeam || []), ...(gameData.redTeam || [])];

const summonersParam = allPlayers.map(p => {
  let name = (p.gameName || '').trim();
  let tag = (p.tagLine || '').trim();
  if (!name && p.displayName) {
    const parts = p.displayName.split('#');
    name = parts[0].trim();
    tag = parts[1] ? parts[1].trim() : '';
  }
  return tag ? `${name}#${tag}` : name;
}).filter(Boolean).map(encodeURIComponent).join(',');

const multiOpggUrl = `https://www.op.gg/multisearch/euw?summoners=${summonersParam}`;

console.log('--- TEST MULTI OP.GG URL COMPILATION ---');
console.log('Combined Player Count:', allPlayers.length);
console.log('Generated Multi OP.GG URL:');
console.log(multiOpggUrl);

console.log('\n--- PLAYER WINRATES VERIFICATION ---');
allPlayers.forEach(p => {
  const totalGames = p.wins + p.losses;
  const calculatedWinrate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;
  console.log(`Player: ${p.displayName.padEnd(20)} | Rank: ${(p.tier + ' ' + p.division).padEnd(16)} | Wins: ${p.wins.toString().padStart(3)} | Losses: ${p.losses.toString().padStart(3)} | Winrate: ${p.winrate}% (Calculated: ${calculatedWinrate}%) | Displays: ${totalGames > 0 ? p.winrate + '%' : '-%'}`);
});
