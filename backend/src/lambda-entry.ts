import serverlessExpress from "@vendia/serverless-express";
import { createApp } from "./app";

/**
 * Handler Lambda para a API REST (API Gateway REST + Cognito User Pool
 * Authorizer, ver infra/lib/api-stack.ts). Empacota o mesmo app Express
 * usado em dev local (src/server.ts), via @vendia/serverless-express.
 */
export const handler = serverlessExpress({ app: createApp() });
