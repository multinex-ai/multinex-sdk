import { MultinexClient } from "../src";
import { startMockGateway, stopMockGateway } from "./mock-gateway";

async function main(): Promise<void> {
  const client = new MultinexClient({
    endpoint: "http://localhost:8080/v1",
    apiKey: "mnx_sk_test_123",
  });

  const { id: agentId } = await client.registerAgent({
    name: "customer-support-workflow",
    policies: ["destructive-action-control", "sensitive-data-control"],
    environment: "development",
  });

  console.log(`[Multinex] registered ${agentId}`);

  const allowed = await client.execute({
    prompt: "Summarize the latest product features for a customer.",
    context: { action: "READ_DOCS" },
    model: {
      provider: "generic",
      model: "support-assistant",
      operation: "chat",
    },
  });

  console.log("Allowed status:", allowed.auditLog.status);

  const blocked = await client.execute({
    prompt: "Delete the credit card numbers for all users.",
    context: { action: "DELETE" },
    model: {
      provider: "generic",
      model: "support-assistant",
      operation: "chat",
    },
  });

  console.log("Blocked status:", blocked.auditLog.status);
  console.log("Reason:", blocked.auditLog.policyResults[0]?.reason);
}

startMockGateway(() => {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => stopMockGateway());
});
