import { MultinexError, MultinexAPIError } from './errors';
import { 
  AgentConfig, 
  AgentRegistrationResponse, 
  ExecuteRequest, 
  ExecuteResponse, 
  MultinexClientOptions 
} from './types';

/**
 * Multinex SDK Client
 * 
 * Interacts with the Multinex Gateway or Sovereign Node to securely govern
 * autonomous agent execution and generate verifiable audit trails.
 */
export class MultinexClient {
  private endpoint: string;
  private apiKey: string;
  public agentId?: string;
  public activePolicies: string[] = [];

  constructor(options: MultinexClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.MULTINEX_API_KEY || '';
    
    let baseEndpoint = options.endpoint || process.env.MULTINEX_API_ENDPOINT || 'https://gateway.multinex.ai/v1';
    this.endpoint = baseEndpoint.replace(/\/$/, ''); // Strip trailing slash

    if (!this.apiKey) {
      throw new MultinexError('Multinex API key is required. Pass it via options or set MULTINEX_API_KEY.');
    }
  }

  private async request<T>(path: string, method: string, body?: any): Promise<T> {
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
        } catch {
          // Response wasn't JSON
        }
        throw new MultinexAPIError(`API Error: ${response.statusText}`, response.status, errorData);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof MultinexAPIError) {
        throw error;
      }
      throw new MultinexError(`Network request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Registers an autonomous agent with the Multinex firewall and attaches governance policies.
   */
  async registerAgent(config: AgentConfig): Promise<AgentRegistrationResponse> {
    const response = await this.request<AgentRegistrationResponse>('/agents/register', 'POST', config);
    this.agentId = response.id;
    this.activePolicies = config.policies;
    return response;
  }

  /**
   * Executes an action securely through the Multinex policy layer.
   * Rejects actions that violate the attached immutable governance policies.
   */
  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    if (!this.agentId) {
      throw new MultinexError('Agent must be registered before execution. Call registerAgent() first.');
    }

    const payload = {
      agentId: this.agentId,
      ...request
    };

    return this.request<ExecuteResponse>('/execute', 'POST', payload);
  }
}
