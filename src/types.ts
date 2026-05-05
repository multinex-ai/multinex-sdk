import { z } from "zod";

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ])
);

export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonArray = readonly JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export const MetadataSchema = z.record(z.string());
export type Metadata = z.infer<typeof MetadataSchema>;

export const AgentConfigSchema = z.object({
  name: z.string().min(1),
  policies: z.array(z.string().min(1)).min(1),
  environment: z.string().min(1).default("production"),
  metadata: MetadataSchema.optional(),
});

export type AgentConfig = z.input<typeof AgentConfigSchema>;

export const AgentRegistrationResponseSchema = z.object({
  id: z.string().min(1),
});

export type AgentRegistrationResponse = z.infer<
  typeof AgentRegistrationResponseSchema
>;

export const ModelRoleSchema = z.enum([
  "system",
  "user",
  "assistant",
  "tool",
]);

export const ModelMessageSchema = z.object({
  role: ModelRoleSchema,
  content: z.union([z.string(), z.array(JsonValueSchema)]),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
});

export type ModelMessage = z.infer<typeof ModelMessageSchema>;

export const ModelContextSchema = z.object({
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  modality: z
    .enum(["text", "vision", "audio", "multimodal", "embedding", "tool"])
    .default("text"),
  operation: z
    .enum([
      "completion",
      "chat",
      "tool_call",
      "embedding",
      "classification",
      "retrieval",
      "other",
    ])
    .default("chat"),
  temperature: z.number().min(0).max(2).optional(),
});

export type ModelContext = z.input<typeof ModelContextSchema>;

export const ExecuteRequestSchema = z.object({
  prompt: z.string().min(1),
  context: z.record(JsonValueSchema).optional(),
  metadata: MetadataSchema.optional(),
  messages: z.array(ModelMessageSchema).optional(),
  model: ModelContextSchema.optional(),
});

export type ExecuteRequest = z.input<typeof ExecuteRequestSchema>;

export const GuardrailSubjectSchema = z.enum(["input", "output"]);
export type GuardrailSubject = z.infer<typeof GuardrailSubjectSchema>;

export const GuardrailRequestSchema = z.object({
  subject: GuardrailSubjectSchema,
  content: z.union([z.string(), z.array(ModelMessageSchema)]),
  policies: z.array(z.string().min(1)).optional(),
  context: z.record(JsonValueSchema).optional(),
  metadata: MetadataSchema.optional(),
  model: ModelContextSchema.optional(),
});

export type GuardrailRequest = z.input<typeof GuardrailRequestSchema>;

export const PolicyResultSchema = z.object({
  policyName: z.string().min(1),
  passed: z.boolean(),
  reason: z.string().optional(),
});

export type PolicyResult = z.infer<typeof PolicyResultSchema>;

export const RedactionSchema = z.object({
  path: z.string().min(1),
  label: z.string().min(1),
  replacement: z.string().min(1),
});

export type Redaction = z.infer<typeof RedactionSchema>;

export const AuditLogSchema = z.object({
  agentId: z.string().min(1),
  timestamp: z.string().min(1),
  action: z.string().min(1),
  policyResults: z.array(PolicyResultSchema),
  status: z.enum(["allowed", "blocked", "audited"]),
  requestId: z.string().optional(),
  redactions: z.array(RedactionSchema).optional(),
  signature: z.string().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const ExecuteResponseSchema = z.object({
  output: z.string(),
  auditLog: AuditLogSchema,
});

export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>;

export const GuardrailDecisionSchema = z.object({
  status: z.enum(["allowed", "blocked", "audited"]),
  output: z.string().optional(),
  redactedContent: z.union([z.string(), z.array(ModelMessageSchema)]).optional(),
  auditLog: AuditLogSchema,
});

export type GuardrailDecision = z.infer<typeof GuardrailDecisionSchema>;

export const AuditEventSchema = z.object({
  action: z.string().min(1),
  status: z.enum(["allowed", "blocked", "audited"]),
  policyResults: z.array(PolicyResultSchema).default([]),
  metadata: MetadataSchema.optional(),
});

export type AuditEvent = z.input<typeof AuditEventSchema>;

export const AuditEventResponseSchema = z.object({
  auditLog: AuditLogSchema,
});

export type AuditEventResponse = z.infer<typeof AuditEventResponseSchema>;

export interface MultinexClientOptions {
  /**
   * Multinex API key. Can also be set with MULTINEX_API_KEY.
   */
  readonly apiKey?: string;

  /**
   * Public Multinex API base URL. Can also be set with MULTINEX_API_ENDPOINT.
   */
  readonly endpoint?: string;

  /**
   * Request timeout in milliseconds.
   */
  readonly timeoutMs?: number;

  /**
   * Custom fetch implementation for tests, serverless, or worker runtimes.
   */
  readonly fetch?: typeof fetch;

  /**
   * Optional client label used in request headers.
   */
  readonly clientName?: string;
}

export interface ModelRunInput<TInput extends JsonValue, TOutput> {
  readonly input: TInput;
  readonly model?: ModelContext;
  readonly context?: JsonObject;
  readonly metadata?: Metadata;
  readonly policies?: readonly string[];
  readonly run: (input: TInput) => Promise<TOutput>;
  readonly serializeOutput?: (output: TOutput) => string;
}
