// Mock for cloudflare:workers in unit test environment
export const env: {
  DB?: any;
  BROWSER?: any;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
} = {};

