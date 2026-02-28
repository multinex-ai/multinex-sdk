"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMockGateway = startMockGateway;
exports.stopMockGateway = stopMockGateway;
const http = __importStar(require("http"));
const crypto = __importStar(require("crypto"));
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
            }
            else {
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
function startMockGateway(callback) {
    server.listen(PORT, callback);
}
function stopMockGateway() {
    server.close();
}
// If run directly (e.g. from docker-compose)
if (require.main === module) {
    startMockGateway(() => {
        console.log(`[Mock Gateway] Listening on http://localhost:${PORT}`);
    });
}
