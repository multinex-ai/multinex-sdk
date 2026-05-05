<div align="center">
  <h1>Multinex Node.js SDK</h1>
  <p><strong>Provider-agnostic guardrails, policy decisions, and audit trails for AI model workflows.</strong></p>

  [![npm version](https://img.shields.io/npm/v/@multinex/node-sdk.svg?style=flat-square&color=eab308)](https://www.npmjs.com/package/@multinex/node-sdk)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
  [![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178c6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
</div>

## What This SDK Does

`@multinex/node-sdk` lets applications place Multinex policy checks around AI model calls, tool calls, and autonomous workflows. It does not require a specific model provider. Use it with hosted LLMs, local models, agent frameworks, background jobs, or custom inference services.

Core capabilities:

- Register an application, agent, or model workflow with named policies.
- Evaluate model inputs before a provider call.
- Evaluate model outputs before they reach users or downstream systems.
- Wrap any model call with a single `wrapModel` helper.
- Preserve signed audit events for allow, block, and audit-only outcomes.
- Keep application code provider-agnostic and free of Multinex implementation details.

## Installation

```bash
npm install @multinex/node-sdk
```

```bash
export MULTINEX_API_KEY="mnx_sk_live_..."
```

For local evaluation, clone this repository and run the mock gateway examples.

```bash
npm install
npm test
npm start
npm run start:model
```

## Quick Start

```ts
import { MultinexClient } from "@multinex/node-sdk";

const multinex = new MultinexClient({
  apiKey: process.env.MULTINEX_API_KEY,
});

await multinex.registerAgent({
  name: "customer-support-workflow",
  policies: ["sensitive-data-control", "destructive-action-control"],
  environment: "production",
});

const result = await multinex.wrapModel({
  input: "Draft a concise customer update.",
  model: {
    provider: "generic-provider",
    model: "customer-support-model",
    operation: "chat",
  },
  run: async (prompt) => {
    // Call OpenAI, Anthropic, Gemini, a local model, or any custom provider here.
    return `Model response for: ${prompt}`;
  },
});

console.log(result.output);
console.log(result.inputDecision.auditLog.status);
console.log(result.outputDecision.auditLog.status);
```

## Public API

### `new MultinexClient(options)`

```ts
const client = new MultinexClient({
  apiKey: process.env.MULTINEX_API_KEY,
  endpoint: "https://api.multinex.ai/v1",
  timeoutMs: 15000,
});
```

Options:

| Option | Description |
| --- | --- |
| `apiKey` | Multinex API key. Defaults to `MULTINEX_API_KEY`. |
| `endpoint` | Public API base URL. Defaults to `https://api.multinex.ai/v1` or `MULTINEX_API_ENDPOINT`. |
| `timeoutMs` | Request timeout. Defaults to `15000`. |
| `fetch` | Optional custom fetch implementation for tests, serverless, or worker runtimes. |
| `clientName` | Optional request client label. |

### `registerAgent(config)`

Registers the application, agent, or model workflow and attaches configured policies.

```ts
await client.registerAgent({
  name: "research-workflow",
  policies: ["pii-redaction", "source-control"],
  environment: "production",
});
```

### `evaluateModelInput(request)`

Checks a prompt or message array before a model call.

```ts
const decision = await client.evaluateModelInput({
  content: [
    { role: "system", content: "You are a support assistant." },
    { role: "user", content: "Summarize this ticket." },
  ],
  model: { provider: "generic", model: "support-model", operation: "chat" },
});

if (decision.status === "blocked") {
  throw new Error(decision.auditLog.policyResults[0]?.reason ?? "Blocked");
}
```

### `evaluateModelOutput(request)`

Checks model output before returning it to a user, tool, queue, or database.

```ts
const outputDecision = await client.evaluateModelOutput({
  content: modelOutput,
  model: { provider: "generic", model: "support-model", operation: "chat" },
});
```

### `wrapModel(input)`

Runs both input and output checks around any provider call.

```ts
const guarded = await client.wrapModel({
  input: "Write a release note.",
  run: async (prompt) => callYourModel(prompt),
});
```

### `execute(request)`

Compatibility helper for agent-action flows that already route actions through Multinex.

```ts
const response = await client.execute({
  prompt: "Update the lead status to Contacted.",
  context: { action: "UPDATE", target: "Lead" },
});
```

### `audit(event)`

Records an auditable event that happened outside a direct model call.

```ts
await client.audit({
  action: "tool_call_completed",
  status: "audited",
  policyResults: [{ policyName: "tool-use-policy", passed: true }],
});
```

## Model Compatibility

The SDK is intentionally model-neutral. It wraps your model call instead of embedding a provider client. That means the same policy contract can be used with:

- Chat completion APIs.
- Tool-calling agents.
- Retrieval and classification workflows.
- Local or hosted model runtimes.
- Custom gateways, queues, and background workers.

Public request metadata may include `provider`, `model`, `operation`, and `modality` so audit logs stay useful without exposing private platform details.

## Local Examples

The repository includes a mock public API server for SDK development and demonstrations.

```bash
npm start
npm run start:model
```

The mock server only demonstrates the SDK contract. It is not a copy of the production service.

## Security Notes

- Never commit API keys or provider credentials.
- Evaluate input before model execution when a workflow can mutate data, call tools, or retrieve sensitive context.
- Evaluate output before returning it to users or storing it.
- Store only policy evidence and operational metadata needed for audit.
- Keep provider secrets in your application or secret manager; this SDK does not need them.

## Development

```bash
npm install
npm run build
npm test
```

The TypeScript compiler runs in strict mode, and API responses are validated at runtime before the SDK returns them.

## Demo

[Inquire about a Multinex demo](mailto:sales@multinex.ai?subject=Multinex%20SDK%20Demo%20Request)
