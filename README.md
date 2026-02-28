<div align="center">
  <h1>🛡️ Multinex Node.js SDK</h1>
  <p><strong>The official security and governance SDK for Enterprise AI Agents.</strong></p>

  [![npm version](https://img.shields.io/npm/v/@multinex/node-sdk.svg?style=flat-square&color=eab308)](https://www.npmjs.com/package/@multinex/node-sdk)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
  [![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178c6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Security: SOC2 Ready](https://img.shields.io/badge/Security-SOC2_Ready-10b981.svg?style=flat-square)](https://multinex.ai/security)
</div>

<br/>

The official **Multinex Node.js SDK** provides the foundation for integrating Multinex as a secure governance layer around your autonomous AI agents. 

This repository serves as both the functional SDK and a demonstration of how to wrap autonomous agents—whether built internally or via third-party systems like Salesforce Agents—to ensure they operate strictly within defined policy boundaries, leaving a cryptographically secure audit trail for all actions.

## What is Multinex?

Multinex is the security and governance layer for enterprise AI. By routing your agent's execution intents through the Multinex Gateway or local Sovereign Node, you can enforce immutable policies (e.g., preventing CRM data deletion, redacting PII) and generate verifiable SOC2/EU AI Act-compliant audit logs before the action reaches your data layer.

## Installation

```bash
npm install @multinex/node-sdk
```

*(Note: During evaluation/beta, you can clone this repository and build from source.)*

## Architecture

*(An architecture diagram is available in `architecture.svg` / `architecture.png`)*

**High-Level Flow:**
`Enterprise Agent / Application` ➔ `Multinex SDK` ➔ `Multinex Runtime (Gateway / Sovereign Node)` ➔ `Audit Log System`

The SDK serves as an interceptor. If a payload violates the configured governance policy, the action is blocked before execution.

## Quick Start Examples

This repository includes functional examples that execute against a local mock gateway to demonstrate policy enforcement without needing a live Multinex API key.

1. **Install Dependencies & Build the SDK**
   ```bash
   npm install
   npm run build
   ```

2. **Run the Standard Agent Example**
   ```bash
   npm start
   ```
   *This executes a benign prompt and an unauthorized prompt to demonstrate basic policy checks.*

3. **Run the Salesforce Integration Example**
   ```bash
   npm run start:salesforce
   ```
   *This simulates an autonomous agent attempting to update and delete CRM records, showcasing Multinex blocking the destructive action based on the `salesforce-data-protection` policy.*

## SDK Usage

```typescript
import { MultinexClient } from '@multinex/node-sdk';

const client = new MultinexClient({
  endpoint: 'https://gateway.multinex.ai/v1',
  apiKey: process.env.MULTINEX_API_KEY
});

// 1. Register the Agent and apply governance policies
const { id: agentId } = await client.registerAgent({
  name: 'customer-support-bot',
  policies: ['pii-redaction', 'financial-data-firewall'],
  environment: 'production'
});

// 2. Execute agent actions through the security layer
const response = await client.execute({
  prompt: 'Delete the customer account from the database.',
  context: { action: 'DELETE' }
});

if (response.auditLog.status === 'blocked') {
  console.log('Action denied by policy:', response.auditLog.policyResults[0].reason);
}
```

## Security Model Overview

- **Policy Enforcement:** Rules are defined declaratively by enterprise administrators and evaluated securely on the Multinex Gateway. 
- **Audit Logging:** Every autonomous action generates a signed `Handshake Sigil`. Real deployments anchor this to an Ed25519 keypair for offline verification by compliance teams.

## Enterprise Demo

Ready to see the full platform in action? 

[Inquire About a Demo](mailto:sales@multinex.ai?subject=Enterprise%20Demo%20Request)
