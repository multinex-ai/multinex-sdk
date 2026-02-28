"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultinexClient = void 0;
const errors_1 = require("./errors");
/**
 * Multinex SDK Client
 *
 * Interacts with the Multinex Gateway or Sovereign Node to securely govern
 * autonomous agent execution and generate verifiable audit trails.
 */
class MultinexClient {
    endpoint;
    apiKey;
    agentId;
    activePolicies = [];
    constructor(options = {}) {
        this.apiKey = options.apiKey || process.env.MULTINEX_API_KEY || '';
        let baseEndpoint = options.endpoint || process.env.MULTINEX_API_ENDPOINT || 'https://gateway.multinex.ai/v1';
        this.endpoint = baseEndpoint.replace(/\/$/, ''); // Strip trailing slash
        if (!this.apiKey) {
            throw new errors_1.MultinexError('Multinex API key is required. Pass it via options or set MULTINEX_API_KEY.');
        }
    }
    async request(path, method, body) {
        const url = `${this.endpoint}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Multinex-Client': 'multinex-node-sdk/1.0.0'
        };
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                }
                catch {
                    // Response wasn't JSON
                }
                throw new errors_1.MultinexAPIError(`API Error: ${response.statusText}`, response.status, errorData);
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof errors_1.MultinexAPIError) {
                throw error;
            }
            throw new errors_1.MultinexError(`Network request failed: ${error.message}`);
        }
    }
    /**
     * Registers an autonomous agent with the Multinex firewall and attaches governance policies.
     */
    async registerAgent(config) {
        const response = await this.request('/agents/register', 'POST', config);
        this.agentId = response.id;
        this.activePolicies = config.policies;
        return response;
    }
    /**
     * Executes an action securely through the Multinex policy layer.
     * Rejects actions that violate the attached immutable governance policies.
     */
    async execute(request) {
        if (!this.agentId) {
            throw new errors_1.MultinexError('Agent must be registered before execution. Call registerAgent() first.');
        }
        const payload = {
            agentId: this.agentId,
            ...request
        };
        return this.request('/execute', 'POST', payload);
    }
}
exports.MultinexClient = MultinexClient;
