import * as http from 'http';
import * as crypto from 'crypto';

/**
 * Local Mock Gateway for Multinex SDK Examples
 * 
 * This server simulates the behavior of the real Multinex platform.
 * It intercepts /agents/register and /execute to return valid JSON
 * formatted exactly like the actual Sovereign Node Gateway would.
 */

const PORT = 8080;

const server = http.createServer((req, res) => {
  // CORS & JSON setup
  res.setHeader('Content-Type', 'application/json');

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    if (req.method === 'POST' && req.url === '/v1/agents/register') {
      // Simulate Agent Registration
      const agentId = `mnxs_${crypto.randomBytes(6).toString('hex')}`;
      res.writeHead(200);
      res.end(JSON.stringify({ id: agentId }));
      return;
    }

    if (req.method === 'POST' && req.url === '/v1/execute') {
      // Simulate Policy Execution Engine
      const payload = JSON.parse(body || '{}');
      const action = payload.context?.action || 'prompt_execution';
      const prompt = payload.prompt || '';
      
      const policyResults = [];
      let isBlocked = false;

      // Simulate Salesforce Data Protection Policy
      if (prompt.toLowerCase().includes('delete') || action === 'DELETE') {
        policyResults.push({
          policyName: 'salesforce-data-protection',
          passed: false,
          reason: 'Unauthorized attempt to delete CRM record. Immutable enforcement applied.'
        });
        isBlocked = true;
      } else {
        policyResults.push({
          policyName: 'salesforce-data-protection',
          passed: true
        });
      }

      const status = isBlocked ? 'blocked' : 'allowed';
      const output = isBlocked 
        ? 'Execution blocked by Multinex policy layer.'
        : `Simulated successful execution of: "${prompt}"`;

      const auditLog = {
        agentId: payload.agentId,
        timestamp: new Date().toISOString(),
        action,
        policyResults,
        status,
        signature: 'sig_' + crypto.randomBytes(32).toString('hex')
      };

      res.writeHead(200);
      res.end(JSON.stringify({ output, auditLog }));
      return;
    }

    // Default 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
});

export function startMockGateway(callback: () => void) {
  server.listen(PORT, callback);
}

export function stopMockGateway() {
  server.close();
}

// If run directly (e.g. from docker-compose)
if (require.main === module) {
  startMockGateway(() => {
    console.log(`[Mock Gateway] Listening on http://localhost:${PORT}`);
  });
}
