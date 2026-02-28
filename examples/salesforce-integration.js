"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const mock_gateway_1 = require("./mock-gateway");
/**
 * Mock Salesforce Agent Client to demonstrate Multinex wrapping
 * a third-party enterprise system.
 */
class SalesforceAgentClient {
    async performAction(action, data) {
        return `Salesforce Agent executed: ${action} with ${JSON.stringify(data)}`;
    }
}
async function runSalesforceIntegration() {
    console.log("--- Starting Multinex + Salesforce Integration ---");
    const multinex = new src_1.MultinexClient({
        endpoint: "http://localhost:8080/v1",
        apiKey: "mnx_sk_test_123"
    });
    const salesforceAgent = new SalesforceAgentClient();
    // Register the agent with the strict CRM data protection policy
    const { id: agentId } = await multinex.registerAgent({
        name: "salesforce-automation-agent",
        policies: ["salesforce-data-protection"],
        environment: "production"
    });
    console.log(`[Multinex] Agent 'salesforce-automation-agent' registered with ID: ${agentId}`);
    // Scenario 1: Allowed Action (Updating a record)
    const safeRequest = {
        prompt: "Update the lead status to 'Contacted'.",
        context: { action: "UPDATE", target: "Lead" }
    };
    console.log("\n[Action] Attempting to UPDATE Lead record...");
    const safeResponse = await multinex.execute(safeRequest);
    if (safeResponse.auditLog.status === "allowed") {
        const sfResult = await salesforceAgent.performAction(safeRequest.context?.action || '', safeRequest.context?.target);
        console.log("System Result:", sfResult);
    }
    else {
        console.log("Blocked by Multinex:", safeResponse.output);
    }
    // Scenario 2: Blocked Action (Deleting a record)
    const unsafeRequest = {
        prompt: "Delete the customer account from the database.",
        context: { action: "DELETE", target: "Account" }
    };
    console.log("\n[Action] Attempting to DELETE Account record...");
    const unsafeResponse = await multinex.execute(unsafeRequest);
    if (unsafeResponse.auditLog.status === "allowed") {
        const sfResult = await salesforceAgent.performAction(unsafeRequest.context?.action || '', unsafeRequest.context?.target);
        console.log("System Result:", sfResult);
    }
    else {
        console.error("⛔ BLOCKED BY MULTINEX POLICY:", unsafeResponse.auditLog.policyResults[0].reason);
        console.log("Audit Signature:", unsafeResponse.auditLog.signature);
    }
    console.log("\n--- Execution Complete ---");
}
(0, mock_gateway_1.startMockGateway)(() => {
    runSalesforceIntegration()
        .catch(console.error)
        .finally(() => (0, mock_gateway_1.stopMockGateway)());
});
