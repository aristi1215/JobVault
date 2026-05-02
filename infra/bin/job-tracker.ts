#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack.js";
import { CoreStack } from "../lib/core-stack.js";
import { MailStack } from "../lib/mail-stack.js";

const app = new App();
const stage = app.node.tryGetContext("stage") ?? "dev";
const stackPrefix = `JobTracker-${stage}`;

const auth = new AuthStack(app, `${stackPrefix}-Auth`, {
  description: "Auth stack with Cognito and identity controls",
});

const core = new CoreStack(app, `${stackPrefix}-Core`, {
  description: "Core API, storage, queues, and observability resources",
});

new MailStack(app, `${stackPrefix}-Mail`, {
  description: "Inbound alias and outbound transactional email resources",
  ingestionBucket: core.ingestionBucket,
  ingestionQueue: core.parseQueue,
});

auth.addDependency(core);
