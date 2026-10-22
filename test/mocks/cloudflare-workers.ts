// Mock for cloudflare:workers in unit test environment
export const env: {
  DB?: any;
  BROWSER?: any;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  LOADER?: any;
  SESSION_KV?: any;
  CODEMODE_AGENT?: any;
} = {};

export class WorkerEntrypoint<Env = unknown, Props = unknown> {
  ctx: any;
  env: Env;
  constructor(ctx: any, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

export class DurableObject<Env = unknown> {
  ctx: any;
  env: Env;
  constructor(ctx: any, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

export class RpcTarget {}


