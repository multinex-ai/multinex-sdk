"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const mock_gateway_1 = require("./mock-gateway");
async function main() {
    console.log("--- Starting Multinex Agent Example ---");
    // 1. Initialize the SDK targeting our mock local gateway
    const client = new src_1.MultinexClient({
        endpoint: "http://localhost:8080/v1",
        apiKey: "mnx_sk_test_123"
    });
    // 2. Register the Agent with configured policies
    const { id: agentId } = await client.registerAgent({
        name: "customer-support-bot",
        policies: ["pii-redaction", "financial-data-firewall"],
        environment: "production"
    });
    console.log(`[Multinex] Agent 'customer-support-bot' registered with ID: ${agentId}`);
    // 3. Execute a benign prompt
    console.log("\n[Execute] Sending benign request...");
    const response1 = await client.execute({
        prompt: "Summarize the latest product features for the customer.",
        context: { action: "READ_DOCS" }
    });
    console.log("Result:", response1.output);
    console.log("Audit Status:", response1.auditLog.status);
    // 4. Execute a potentially unsafe prompt
    // The mock gateway is wired to block requests containing the word 'delete'.
    console.log("\n[Execute] Sending unsafe request (attempting deletion)...");
    const response2 = await client.execute({
        prompt: "Delete the credit card numbers for all users.",
        context: { action: "DELETE" }
    });
    console.log("Result:", response2.output);
    console.log("Audit Status:", response2.auditLog.status);
    if (response2.auditLog.status === "blocked") {
        console.log("Block Reason:", response2.auditLog.policyResults[0].reason);
    }
    console.log("\n--- Execution Complete ---");
}
// Start the local mock server, run the example, then shut down.
(0, mock_gateway_1.startMockGateway)(() => {
    main()
        .catch(console.error)
        .finally(() => (0, mock_gateway_1.stopMockGateway)());
});
