import assert from "node:assert/strict";
import test from "node:test";
import { MultinexAPIError, MultinexClient, MultinexValidationError } from "../src";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    statusText: init?.statusText,
    headers: { "Content-Type": "application/json" },
  });
}

test("registers an agent and evaluates model input", async () => {
  const calls: string[] = [];
  const client = new MultinexClient({
    apiKey: "mnx_test",
    endpoint: "https://api.example.test/v1",
    fetch: async (url, init) => {
      calls.push(String(url));
      const body = JSON.parse(String(init?.body ?? "{}")) as { subject?: string };
      if (String(url).endsWith("/agents/register")) {
        return jsonResponse({ id: "agent_test" });
      }
      if (String(url).endsWith("/guardrails/evaluate")) {
        return jsonResponse({
          status: "allowed",
          output: "Allowed",
          redactedContent: "hello",
          auditLog: {
            agentId: "agent_test",
            timestamp: "2026-05-05T00:00:00.000Z",
            action: `model_${body.subject ?? "input"}`,
            policyResults: [{ policyName: "test-policy", passed: true }],
            status: "allowed",
          },
        });
      }
      return jsonResponse({ error: "not found" }, { status: 404 });
    },
  });

  const registered = await client.registerAgent({
    name: "test-agent",
    policies: ["test-policy"],
    environment: "test",
  });
  assert.equal(registered.id, "agent_test");

  const decision = await client.evaluateModelInput({
    content: "hello",
    model: { provider: "generic", model: "test-model" },
  });
  assert.equal(decision.status, "allowed");
  assert.deepEqual(calls, [
    "https://api.example.test/v1/agents/register",
    "https://api.example.test/v1/guardrails/evaluate",
  ]);
});

test("wrapModel blocks before provider call when input is denied", async () => {
  let providerCalled = false;
  const client = new MultinexClient({
    apiKey: "mnx_test",
    endpoint: "https://api.example.test/v1",
    fetch: async (url) => {
      if (String(url).endsWith("/agents/register")) {
        return jsonResponse({ id: "agent_test" });
      }
      return jsonResponse({
        status: "blocked",
        output: "Blocked",
        auditLog: {
          agentId: "agent_test",
          timestamp: "2026-05-05T00:00:00.000Z",
          action: "model_input",
          policyResults: [{ policyName: "test-policy", passed: false, reason: "Denied" }],
          status: "blocked",
        },
      });
    },
  });

  await client.registerAgent({
    name: "test-agent",
    policies: ["test-policy"],
    environment: "test",
  });

  await assert.rejects(
    () =>
      client.wrapModel({
        input: "delete everything",
        run: async () => {
          providerCalled = true;
          return "should not run";
        },
      }),
    /Denied/,
  );
  assert.equal(providerCalled, false);
});

test("wrapModel evaluates output after provider call", async () => {
  let guardCalls = 0;
  const client = new MultinexClient({
    apiKey: "mnx_test",
    endpoint: "https://api.example.test/v1",
    fetch: async (url) => {
      if (String(url).endsWith("/agents/register")) {
        return jsonResponse({ id: "agent_test" });
      }
      guardCalls += 1;
      return jsonResponse({
        status: "allowed",
        output: "Allowed",
        auditLog: {
          agentId: "agent_test",
          timestamp: "2026-05-05T00:00:00.000Z",
          action: guardCalls === 1 ? "model_input" : "model_output",
          policyResults: [{ policyName: "test-policy", passed: true }],
          status: "allowed",
        },
      });
    },
  });

  await client.registerAgent({
    name: "test-agent",
    policies: ["test-policy"],
    environment: "test",
  });

  const result = await client.wrapModel({
    input: "summarize",
    run: async (input) => `provider saw ${input}`,
  });

  assert.equal(result.output, "provider saw summarize");
  assert.equal(result.inputDecision.status, "allowed");
  assert.equal(result.outputDecision.status, "allowed");
  assert.equal(guardCalls, 2);
});

test("throws typed errors for API and validation failures", async () => {
  const apiClient = new MultinexClient({
    apiKey: "mnx_test",
    endpoint: "https://api.example.test/v1",
    fetch: async () => jsonResponse({ error: "nope" }, { status: 403, statusText: "Forbidden" }),
  });

  await assert.rejects(
    () => apiClient.registerAgent({ name: "a", policies: ["p"], environment: "test" }),
    MultinexAPIError,
  );

  const validationClient = new MultinexClient({
    apiKey: "mnx_test",
    endpoint: "https://api.example.test/v1",
    fetch: async () => jsonResponse({ wrong: true }),
  });

  await assert.rejects(
    () => validationClient.registerAgent({ name: "a", policies: ["p"], environment: "test" }),
    MultinexValidationError,
  );
});
