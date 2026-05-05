import * as crypto from "crypto";
import * as http from "http";
import type { AuditLog, PolicyResult } from "../src";

const PORT = 8080;

type RequestBody = {
  agentId?: string;
  prompt?: string;
  content?: string;
  context?: { readonly [key: string]: unknown };
  subject?: "input" | "output";
  action?: string;
  status?: "allowed" | "blocked" | "audited";
  policyResults?: PolicyResult[];
};

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseBody(body: string): RequestBody {
  if (!body) return {};
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  return parsed as RequestBody;
}

function policyCheck(payload: RequestBody): PolicyResult[] {
  const prompt = payload.prompt ?? "";
  const content = typeof payload.content === "string" ? payload.content : "";
  const action = String(payload.context?.action ?? payload.action ?? "");
  const haystack = `${prompt} ${content} ${action}`.toLowerCase();

  if (haystack.includes("delete") || haystack.includes("credit card")) {
    return [
      {
        policyName: "destructive-action-control",
        passed: false,
        reason: "Request matched a destructive or sensitive-data policy.",
      },
    ];
  }

  return [{ policyName: "destructive-action-control", passed: true }];
}

function createAuditLog(payload: RequestBody, policyResults: PolicyResult[]): AuditLog {
  const blocked = policyResults.some((result) => !result.passed);
  return {
    agentId: payload.agentId ?? `agent_${crypto.randomBytes(4).toString("hex")}`,
    timestamp: new Date().toISOString(),
    action: payload.subject ? `model_${payload.subject}` : payload.action ?? "agent_execution",
    policyResults,
    status: blocked ? "blocked" : payload.status ?? "allowed",
    requestId: `req_${crypto.randomBytes(6).toString("hex")}`,
    signature: `sig_${crypto.randomBytes(32).toString("hex")}`,
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const body = parseBody(await readRequestBody(req));

    if (req.method === "POST" && req.url === "/v1/agents/register") {
      res.writeHead(200);
      res.end(JSON.stringify({ id: `agent_${crypto.randomBytes(6).toString("hex")}` }));
      return;
    }

    if (req.method === "POST" && req.url === "/v1/execute") {
      const policyResults = policyCheck(body);
      const auditLog = createAuditLog(body, policyResults);
      const blocked = auditLog.status === "blocked";
      res.writeHead(200);
      res.end(JSON.stringify({
        output: blocked
          ? "Execution blocked by Multinex policy."
          : `Simulated execution: ${body.prompt ?? "ok"}`,
        auditLog,
      }));
      return;
    }

    if (req.method === "POST" && req.url === "/v1/guardrails/evaluate") {
      const policyResults = policyCheck(body);
      const auditLog = createAuditLog(body, policyResults);
      const blocked = auditLog.status === "blocked";
      res.writeHead(200);
      res.end(JSON.stringify({
        status: auditLog.status,
        output: blocked ? "Blocked by Multinex policy." : "Allowed by Multinex policy.",
        redactedContent: blocked ? "[blocked]" : body.content,
        auditLog,
      }));
      return;
    }

    if (req.method === "POST" && req.url === "/v1/audit/events") {
      const auditLog = createAuditLog(body, body.policyResults ?? []);
      res.writeHead(200);
      res.end(JSON.stringify({ auditLog }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found" }));
  } catch (error: unknown) {
    res.writeHead(400);
    res.end(JSON.stringify({
      error: error instanceof Error ? error.message : "Invalid request",
    }));
  }
});

export function startMockGateway(callback: () => void): void {
  server.listen(PORT, callback);
}

export function stopMockGateway(): void {
  server.close();
}

if (require.main === module) {
  startMockGateway(() => {
    console.log(`[Mock Gateway] Listening on http://localhost:${PORT}`);
  });
}
