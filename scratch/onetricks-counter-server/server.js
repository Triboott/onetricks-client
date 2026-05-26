const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// In-memory active presence tracker
const activeClients = new Map();
const CLIENT_EXPIRY_MS = 60000; // 60 seconds of inactivity before removal

// Helper to clean up expired clients
function cleanupClients() {
  const now = Date.now();
  let deletedCount = 0;
  for (const [clientId, lastPing] of activeClients.entries()) {
    if (now - lastPing > CLIENT_EXPIRY_MS) {
      activeClients.delete(clientId);
      deletedCount++;
    }
  }
  if (deletedCount > 0) {
    console.log(`[CLEANUP] Pruned ${deletedCount} inactive clients. Active total: ${activeClients.size}`);
  }
}

// 1. Ping endpoint: Clients trigger this every 30 seconds
app.get('/ping', (req, res) => {
  const clientId = req.query.id;
  
  if (clientId && clientId.trim() !== '') {
    activeClients.set(clientId.trim(), Date.now());
  }

  // Periodic cleanup
  cleanupClients();

  res.json({
    success: true,
    activeUsers: activeClients.size
  });
});

// 2. Stats endpoint: Website fetches this to show live active users without registering a ping
app.get('/stats', (req, res) => {
  cleanupClients();
  res.json({
    activeUsers: activeClients.size
  });
});

// Root friendly check
app.get('/', (req, res) => {
  res.send('Onetricks Active User Ping Server is online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SERVER] Onetricks Counter Server listening on port ${PORT}`);
});
