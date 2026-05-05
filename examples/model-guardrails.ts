import { MultinexClient } from "../src";
import { startMockGateway, stopMockGateway } from "./mock-gateway";

async function runModel(prompt: string): Promise<string> {
  return `Model response for: ${prompt}`;
}

async function main(): Promise<void> {
  const multinex = new MultinexClient({
    endpoint: "http://localhost:8080/v1",
    apiKey: "mnx_sk_test_123",
  });

  await multinex.registerAgent({
    name: "model-router",
    policies: ["destructive-action-control", "sensitive-data-control"],
    environment: "development",
  });

  const result = await multinex.wrapModel({
    input: "Draft a concise customer update.",
    model: {
      provider: "generic-provider",
      model: "customer-support-model",
      operation: "chat",
    },
    run: runModel,
  });

  console.log("Input decision:", result.inputDecision.status);
  console.log("Output decision:", result.outputDecision.status);
  console.log("Model output:", result.output);
}

startMockGateway(() => {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => stopMockGateway());
});
