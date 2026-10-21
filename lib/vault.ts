/**
 * Spike Land Vault Secret Resolution Service
 * PRD Section 7.1: Zero-Plaintext Secret Policy (The vault: Protocol)
 */

import { RequestContext } from "./mcp-types";
import { findUserById } from "./auth/users-db";

const inMemoryVault = new Map<string, string>();

/**
 * Stores a secret in the edge in-memory vault store (encrypted/scoped at edge)
 */
export function setVaultSecret(secretName: string, secretValue: string): void {
  const cleanName = secretName.startsWith("vault:")
    ? secretName.slice(6).trim()
    : secretName.trim();
  inMemoryVault.set(cleanName, secretValue.trim());
}

/**
 * Clears a secret from the in-memory vault store
 */
export function removeVaultSecret(secretName: string): void {
  const cleanName = secretName.startsWith("vault:")
    ? secretName.slice(6).trim()
    : secretName.trim();
  inMemoryVault.delete(cleanName);
}

/**
 * Clears all secrets in the in-memory vault store (for testing)
 */
export function clearVaultStore(): void {
  inMemoryVault.clear();
}

/**
 * Resolves a vault reference (e.g. "vault:GITHUB_TOKEN") to its plaintext secret
 * at runtime immediately before an outbound request hop.
 */
export async function resolveVaultSecret(
  secretRef: string,
  ctx?: RequestContext
): Promise<string | null> {
  if (!secretRef || !secretRef.startsWith("vault:")) {
    return null;
  }

  const keyName = secretRef.slice(6).trim();
  if (!keyName) return null;

  // 1. Check in-memory vault store
  if (inMemoryVault.has(keyName)) {
    return inMemoryVault.get(keyName)!;
  }

  // 2. Check context browserEnv / userEnv
  if (ctx?.browserEnv && ctx.browserEnv[keyName]) {
    return ctx.browserEnv[keyName]!;
  }
  if (ctx?.browserEnv && ctx.browserEnv[keyName.toUpperCase()]) {
    return ctx.browserEnv[keyName.toUpperCase()]!;
  }

  // 3. Check user's stored provider tokens in D1 / DB if callerSubject is a user ID
  if (ctx?.callerSubject) {
    try {
      const user = await findUserById(ctx.callerSubject);
      if (user?.providerTokens) {
        if (user.providerTokens[keyName]) {
          return user.providerTokens[keyName];
        }
        if (user.providerTokens[keyName.toUpperCase()]) {
          return user.providerTokens[keyName.toUpperCase()];
        }
      }
    } catch {
      // Fallback
    }
  }

  // 4. Check system environment
  if (typeof process !== "undefined" && process.env) {
    if (process.env[keyName]) {
      return process.env[keyName]!;
    }
    if (process.env[keyName.toUpperCase()]) {
      return process.env[keyName.toUpperCase()]!;
    }
  }

  return null;
}
