import { z } from "zod";
import {
  MultinexAPIError,
  MultinexConfigurationError,
  MultinexError,
  MultinexValidationError,
} from "./errors";
import {
  AgentConfig,
  AgentConfigSchema,
  AgentRegistrationResponse,
  AgentRegistrationResponseSchema,
  AuditEvent,
  AuditEventResponse,
  AuditEventResponseSchema,
  AuditEventSchema,
  ExecuteRequest,
  ExecuteRequestSchema,
  ExecuteResponse,
  ExecuteResponseSchema,
  GuardrailDecision,
  GuardrailDecisionSchema,
  GuardrailRequest,
  GuardrailRequestSchema,
  JsonValue,
  ModelRunInput,
  MultinexClientOptions,
} from "./types";

const DEFAULT_ENDPOINT = "https://api.multinex.ai/v1";
const SDK_VERSION = "multinex-node-sdk/1.1.0";

type HttpMethod = "GET" | "POST";

function trimToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function isJsonValue(value: unknown): value is JsonValue {
  const result = z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.unknown()),
      z.record(z.unknown()),
    ])
    .safeParse(value);
  return result.success;
}

async function readJson(response: Response): Promise<JsonValue | undefined> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    const parsed: unknown = JSON.parse(text);
    return isJsonValue(parsed) ? parsed : { error: "Non-JSON-compatible response" };
  } catch {
    return { error: text };
  }
}

/**
 * Public Multinex SDK client.
 *
 * The client is provider-agnostic: OpenAI, Anthropic, Gemini, local models,
 * hosted models, and custom inference calls can all be guarded through the
 * same input/output decision contract without exposing platform details.
 */
export class MultinexClient {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;
  private readonly clientName: string;
  public agentId?: string;
  public activePolicies: string[] = [];

  constructor(options: MultinexClientOptions = {}) {
    this.apiKey = trimToUndefined(options.apiKey)
      ?? trimToUndefined(process.env.MULTINEX_API_KEY)
      ?? "";
    this.endpoint = normalizeEndpoint(
      trimToUndefined(options.endpoint)
        ?? trimToUndefined(process.env.MULTINEX_API_ENDPOINT)
        ?? DEFAULT_ENDPOINT,
    );
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.fetcher = options.fetch ?? fetch;
    this.clientName = trimToUndefined(options.clientName) ?? SDK_VERSION;

    if (!this.apiKey) {
      throw new MultinexConfigurationError(
        "Multinex API key is required. Pass apiKey or set MULTINEX_API_KEY.",
      );
    }

    if (this.timeoutMs <= 0) {
      throw new MultinexConfigurationError("timeoutMs must be greater than 0.");
    }
  }

  /**
   * Registers an application, agent, worker, or model workflow and attaches
   * named policies configured in Multinex.
   */
  async registerAgent(config: AgentConfig): Promise<AgentRegistrationResponse> {
    const validated = AgentConfigSchema.parse(config);
    const response = await this.request(
      "/agents/register",
      "POST",
      validated,
      AgentRegistrationResponseSchema,
    );
    this.agentId = response.id;
    this.activePolicies = [...validated.policies];
    return response;
  }

  /**
   * Compatibility helper for existing agent-action integrations.
   */
  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    this.requireAgent();
    const validated = ExecuteRequestSchema.parse(request);
    return this.request(
      "/execute",
      "POST",
      { agentId: this.agentId, ...validated },
      ExecuteResponseSchema,
    );
  }

  /**
   * Evaluates model input or output against policy before the caller continues.
   */
  async guard(request: GuardrailRequest): Promise<GuardrailDecision> {
    this.requireAgent();
    const validated = GuardrailRequestSchema.parse(request);
    return this.request(
      "/guardrails/evaluate",
      "POST",
      { agentId: this.agentId, ...validated },
      GuardrailDecisionSchema,
    );
  }

  async evaluateModelInput(
    request: Omit<GuardrailRequest, "subject">,
  ): Promise<GuardrailDecision> {
    return this.guard({ ...request, subject: "input" });
  }

  async evaluateModelOutput(
    request: Omit<GuardrailRequest, "subject">,
  ): Promise<GuardrailDecision> {
    return this.guard({ ...request, subject: "output" });
  }

  /**
   * Runs a model call only after input policy passes, then evaluates the output.
   * The SDK never calls a specific model provider; it wraps your provider call.
   */
  async wrapModel<TInput extends JsonValue, TOutput>(
    input: ModelRunInput<TInput, TOutput>,
  ): Promise<{ output: TOutput; inputDecision: GuardrailDecision; outputDecision: GuardrailDecision }> {
    const inputDecision = await this.evaluateModelInput({
      content: typeof input.input === "string" ? input.input : JSON.stringify(input.input),
      policies: input.policies ? [...input.policies] : undefined,
      context: input.context ? { ...input.context } : undefined,
      metadata: input.metadata ? { ...input.metadata } : undefined,
      model: input.model,
    });

    if (inputDecision.status === "blocked") {
      throw new MultinexError(
        inputDecision.auditLog.policyResults[0]?.reason
          ?? "Model input blocked by Multinex policy.",
      );
    }

    const output = await input.run(input.input);
    const serializedOutput = input.serializeOutput
      ? input.serializeOutput(output)
      : typeof output === "string"
        ? output
        : JSON.stringify(output);

    const outputDecision = await this.evaluateModelOutput({
      content: serializedOutput,
      policies: input.policies ? [...input.policies] : undefined,
      context: input.context ? { ...input.context } : undefined,
      metadata: input.metadata ? { ...input.metadata } : undefined,
      model: input.model,
    });

    if (outputDecision.status === "blocked") {
      throw new MultinexError(
        outputDecision.auditLog.policyResults[0]?.reason
          ?? "Model output blocked by Multinex policy.",
      );
    }

    return { output, inputDecision, outputDecision };
  }

  /**
   * Records an auditable event that happened outside a direct model call.
   */
  async audit(event: AuditEvent): Promise<AuditEventResponse> {
    this.requireAgent();
    const validated = AuditEventSchema.parse(event);
    return this.request(
      "/audit/events",
      "POST",
      { agentId: this.agentId, ...validated },
      AuditEventResponseSchema,
    );
  }

  private requireAgent(): void {
    if (!this.agentId) {
      throw new MultinexConfigurationError(
        "Agent must be registered before this operation. Call registerAgent() first.",
      );
    }
  }

  private async request<T>(
    path: string,
    method: HttpMethod,
    body: unknown,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(`${this.endpoint}${path}`, {
        method,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Multinex-Client": this.clientName,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const json = await readJson(response);
      if (!response.ok) {
        throw new MultinexAPIError(
          `Multinex API error: ${response.status} ${response.statusText}`,
          response.status,
          json,
        );
      }

      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new MultinexValidationError(
          "Multinex API response did not match the SDK contract.",
          { cause: parsed.error },
        );
      }

      return parsed.data;
    } catch (error: unknown) {
      if (
        error instanceof MultinexAPIError ||
        error instanceof MultinexValidationError
      ) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new MultinexError("Multinex API request timed out.", { cause: error });
      }

      throw new MultinexError(`Multinex API request failed: ${errorMessage(error)}`, {
        cause: error instanceof Error ? error : undefined,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
