export interface AgentConfig {
  name: string;
  policies: string[];
  environment: string;
}

export interface AgentRegistrationResponse {
  id: string;
}

export interface ExecuteRequest {
  prompt: string;
  context?: Record<string, any>;
  metadata?: Record<string, string>;
}

export interface PolicyResult {
  policyName: string;
  passed: boolean;
  reason?: string;
}

export interface AuditLog {
  agentId: string;
  timestamp: string;
  action: string;
  policyResults: PolicyResult[];
  status: "allowed" | "blocked" | "audited";
  signature?: string;
}

export interface ExecuteResponse {
  output: string;
  auditLog: AuditLog;
}

export interface MultinexClientOptions {
  /**
   * The Multinex API key. Can also be set via the MULTINEX_API_KEY environment variable.
   */
  apiKey?: string;
  
  /**
   * The base URL of the Multinex Sovereign Node or Gateway.
   * Defaults to https://gateway.multinex.ai/v1 or the MULTINEX_API_ENDPOINT environment variable.
   */
  endpoint?: string;
}
