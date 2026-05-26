const { spawn } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');

console.log('=== OVERLAY DEBUGGER ===');

const exePath = path.join(__dirname, 'tab_listener.exe');
console.log(`Checking C# listener at: ${exePath}`);
if (!fs.existsSync(exePath)) {
  console.error('ERROR: tab_listener.exe does not exist in scratch/ directory! Did it compile?');
  process.exit(1);
}

console.log('Spawning tab_listener.exe...');
const child = spawn(exePath);

child.stdout.on('data', (data) => {
  console.log(`[C# OUT] ${data.toString().trim()}`);
});

child.stderr.on('data', (data) => {
  console.error(`[C# ERR] ${data.toString()}`);
});

child.on('error', (err) => {
  console.error('Failed to start child process:', err);
});

console.log('--- Checking LoL Live Client Data API ---');
function checkLiveAPI() {
  const options = {
    hostname: '127.0.0.1',
    port: 2999,
    path: '/liveclientdata/allgamedata',
    method: 'GET',
    rejectUnauthorized: false,
    timeout: 2000
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`SUCCESS: Live Client API responded with status ${res.statusCode}`);
      try {
        const data = JSON.parse(body);
        console.log(`Active player name: ${data.activePlayer.summonerName}`);
        console.log(`Total players detected: ${data.allPlayers.length}`);
      } catch (e) {
        console.log('Failed to parse response body as JSON');
      }
    });
  });

  req.on('error', (err) => {
    console.log(`FAIL: Live Client API not reachable (Error: ${err.message})`);
    console.log('Note: This is expected if you are not currently inside an active League of Legends match.');
  });

  req.end();
}

checkLiveAPI();

console.log('Keep this script running. Open League of Legends, enter a game or practice tool, make sure the window is in the foreground, and hold down the TAB key to see if key events register...');

// Keep process alive
setInterval(() => {}, 5000);
