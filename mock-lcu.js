const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
const WebSocket = require('ws');

const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('[MOCK LCU] Error: No se encontraron los archivos key.pem y cert.pem en el directorio.');
  console.error('Generando archivos temporales mediante OpenSSL o saliendo...');
  process.exit(1);
}

const PRIVATE_KEY_PEM = fs.readFileSync(keyPath, 'utf8');
const CERTIFICATE_PEM = fs.readFileSync(certPath, 'utf8');

const PORT = 55123;
const PASSWORD = 'mockpassword123';
const PID = 99999;
const PROTOCOL = 'https';

const workspaceDir = __dirname;
const lockfilePath = path.join(workspaceDir, 'lockfile');

// Simulated Game State
let isChampSelect = false;
let selectedChampionId = 0; // 0 = none, 266 = Aatrox, 81 = Ezreal
let mockEditableRunePage = {
  id: 4567,
  name: 'Runas Preestablecidas',
  primaryStyleId: 8100,
  subStyleId: 8200,
  selectedPerkIds: [8112, 8139, 8138, 8105, 8226, 8233, 5008, 5008, 5002],
  isEditable: true
};

// Create a lockfile inside the workspace
fs.writeFileSync(lockfilePath, `LeagueClient:${PID}:${PORT}:${PASSWORD}:${PROTOCOL}`, 'utf8');
console.log(`[MOCK LCU] Lockfile creado en: ${lockfilePath}`);

// HTTPS server setup
const httpsOptions = {
  key: PRIVATE_KEY_PEM,
  cert: CERTIFICATE_PEM
};

const server = https.createServer(httpsOptions, (req, res) => {
  // Check authorization
  const authHeader = req.headers.authorization || '';
  const expectedAuth = 'Basic ' + Buffer.from(`riot:${PASSWORD}`).toString('base64');
  
  if (authHeader !== expectedAuth) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  console.log(`[MOCK LCU] HTTP Request: ${req.method} ${url.pathname}`);

  if (req.method === 'GET' && url.pathname === '/lol-login/v1/session') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ state: 'connected', summonerId: 12345678 }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/lol-summoner/v1/current-summoner') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ summonerId: 12345678, accountId: 87654321 }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/lol-item-sets/v1/item-sets/12345678/sets') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ itemSets: [] }));
    return;
  }

  if (req.method === 'PUT' && url.pathname === '/lol-item-sets/v1/item-sets/12345678/sets') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log(`[MOCK LCU] 🛍️ Item Sets Guardados:`, JSON.stringify(payload, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      } catch(e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/lol-champ-select/v1/session') {
    if (!isChampSelect) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not in champion select' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getChampSelectSessionPayload()));
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/lol-perks/v1/pages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([
      { id: 111, name: 'Páginas Fijas', isEditable: false },
      mockEditableRunePage
    ]));
    return;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/lol-perks/v1/pages/')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        mockEditableRunePage = { ...mockEditableRunePage, ...payload };
        console.log(`[MOCK LCU] 🎯 Runas Guardadas: "${payload.name}"`, payload.selectedPerkIds);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockEditableRunePage));
      } catch(e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/lol-perks/v1/pages/')) {
    console.log(`[MOCK LCU] 🗑️ Página de Runas Eliminada: ID ${url.pathname.split('/').pop()}`);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/lol-perks/v1/pages') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        mockEditableRunePage = {
          id: Math.floor(Math.random() * 10000000) + 1000,
          isEditable: true,
          ...payload
        };
        console.log(`[MOCK LCU] 🎯 Página de Runas Creada: "${payload.name}"`, payload.selectedPerkIds);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockEditableRunePage));
      } catch(e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'PUT' && url.pathname === '/lol-perks/v1/activepage') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log(`[MOCK LCU] 💡 Página de Runas Activa cambiada a ID: ${body}`);
      res.writeHead(204);
      res.end();
    });
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/lol-champ-select/v1/session/my-selection') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log(`[MOCK LCU] ⚡ Hechizos de Invocador Cambiados: Hechizo1=${payload.spell1Id}, Hechizo2=${payload.spell2Id}`);
        res.writeHead(204);
        res.end();
      } catch(e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  console.log(`[MOCK LCU] ⚠️ Fallthrough to 444 for: ${req.method} "${url.pathname}"`);
  res.writeHead(444);
  res.end();
});

// WebSocket server setup
const wss = new WebSocket.Server({ server });
let wsClients = [];

wss.on('connection', (ws) => {
  console.log('[MOCK LCU] Conexión WebSocket establecida por el cliente.');
  wsClients.push(ws);

  ws.on('message', (msg) => {
    // Check for subscriptions
    try {
      const [id, event] = JSON.parse(msg);
      if (id === 5 && event === 'OnJsonApiEvent') {
        console.log('[MOCK LCU] Cliente suscrito a eventos del API LCU.');
      }
    } catch(e) {}
  });

  ws.on('close', () => {
    wsClients = wsClients.filter(c => c !== ws);
    console.log('[MOCK LCU] Conexión WebSocket cerrada por el cliente.');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[MOCK LCU] Servidor HTTPS & WS corriendo en https://127.0.0.1:${PORT}`);
  showCLI();
});

// Build standard Champion Select payload
function getChampSelectSessionPayload() {
  return {
    localPlayerCellId: 4,
    myTeam: [
      { cellId: 0, championId: 0, hoveredChampionId: 0, summonerId: 101 },
      { cellId: 1, championId: 0, hoveredChampionId: 0, summonerId: 102 },
      { cellId: 2, championId: 0, hoveredChampionId: 0, summonerId: 103 },
      { cellId: 3, championId: 0, hoveredChampionId: 0, summonerId: 104 },
      { cellId: 4, championId: selectedChampionId, hoveredChampionId: selectedChampionId, summonerId: 12345678, assignedPosition: selectedChampionId === 81 ? 'bottom' : 'top' }
    ],
    actions: [
      [
        {
          actorCellId: 4,
          championId: selectedChampionId,
          id: 1,
          isInProgress: true,
          type: 'pick'
        }
      ]
    ]
  };
}

// Broadcast event to WebSocket subscribers
function broadcastEvent(uri, type, data) {
  const payload = JSON.stringify([
    8,
    'OnJsonApiEvent',
    {
      uri,
      eventType: type,
      data
    }
  ]);
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

// Terminal CLI interface to trigger mock actions
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showCLI() {
  console.log('\n=======================================');
  console.log('CONTROLES DEL SIMULADOR DE LEAGUE (LCU)');
  console.log('=======================================');
  console.log('[1] Entrar a Champ Select (Ninguno seleccionado)');
  console.log('[2] Hover Aatrox (ID 266) - Generará scraping de Onetricks');
  console.log('[3] Hover Ezreal (ID 81) - Generará scraping de Onetricks');
  console.log('[4] Salir de Champ Select / Partida iniciada');
  console.log('[q] Apagar simulador y borrar lockfile');
  console.log('Elija una opción: ');

  rl.question('> ', (opt) => {
    const option = opt.trim();
    if (option === '1') {
      isChampSelect = true;
      selectedChampionId = 0;
      console.log('\n[MOCK LCU] Entrando a Champ Select...');
      broadcastEvent('/lol-champ-select/v1/session', 'Create', getChampSelectSessionPayload());
    } else if (option === '2') {
      if (!isChampSelect) isChampSelect = true;
      selectedChampionId = 266;
      console.log('\n[MOCK LCU] Jugador seleccionando/hovereando: Aatrox (266)');
      broadcastEvent('/lol-champ-select/v1/session', 'Update', getChampSelectSessionPayload());
    } else if (option === '3') {
      if (!isChampSelect) isChampSelect = true;
      selectedChampionId = 81;
      console.log('\n[MOCK LCU] Jugador seleccionando/hovereando: Ezreal (81)');
      broadcastEvent('/lol-champ-select/v1/session', 'Update', getChampSelectSessionPayload());
    } else if (option === '4') {
      isChampSelect = false;
      selectedChampionId = 0;
      console.log('\n[MOCK LCU] Champ Select cerrado.');
      broadcastEvent('/lol-champ-select/v1/session', 'Delete', null);
    } else if (option === 'q') {
      cleanup();
      process.exit(0);
      return;
    } else {
      console.log('\nOpción no válida.');
    }
    setTimeout(showCLI, 1000);
  });
}

function cleanup() {
  if (fs.existsSync(lockfilePath)) {
    fs.unlinkSync(lockfilePath);
    console.log('[MOCK LCU] Lockfile eliminado.');
  }
}

// Ensure cleanup on process exit
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('exit', () => {
  cleanup();
});
