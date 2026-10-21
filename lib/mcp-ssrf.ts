/**
 * SSRF and Security Guardrails for Runtime MCP Server Mounting
 * PRD Section 7: Security, SSRF Protection & Credential Isolation
 */

// Pattern for high-entropy secrets (API keys, tokens, Bearer headers, JWTs)
const PLAINTEXT_SECRET_PATTERNS = [
  /\bsk_[a-zA-Z0-9_-]{16,}\b/,
  /\bsk_live_[a-zA-Z0-9_-]+\b/,
  /\bsk_test_[a-zA-Z0-9_-]+\b/,
  /\bghp_[a-zA-Z0-9]{20,}\b/,
  /\bgithub_pat_[a-zA-Z0-9_]{20,}\b/,
  /\bxoxb-[a-zA-Z0-9-]+\b/,
  /\bxoxp-[a-zA-Z0-9-]+\b/,
  /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/, // JWT
  /\bBearer\s+[a-zA-Z0-9_.-]{16,}\b/i,
];

export const NAMESPACE_REGEX = /^[a-z0-9_]{2,16}$/;

/**
 * Validates a namespace identifier according to PRD specification: ^[a-z0-9_]{2,16}$
 */
export function isValidNamespace(namespace: string): boolean {
  return NAMESPACE_REGEX.test(namespace);
}

/**
 * Detects if a string or object contains plaintext secrets
 */
export function detectPlaintextSecret(input: unknown): boolean {
  if (!input) return false;

  if (typeof input === "string") {
    // If it's a valid vault reference like "vault:GITHUB_TOKEN", it's safe!
    if (/^vault:[A-Z0-9_]{2,64}$/.test(input.trim())) {
      return false;
    }
    return PLAINTEXT_SECRET_PATTERNS.some((pattern) => pattern.test(input));
  }

  if (typeof input === "object") {
    for (const val of Object.values(input as Record<string, unknown>)) {
      if (detectPlaintextSecret(val)) return true;
    }
  }

  return false;
}

export interface SSRFValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an upstream MCP endpoint URL against SSRF, private IPs, loopback,
 * and recursive self-mounting attacks.
 */
export function validateUpstreamUrl(
  urlStr: string,
  options: { allowLocalhost?: boolean } = {}
): SSRFValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return {
      valid: false,
      error: `Invalid URL format: '${urlStr}'`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol.toLowerCase();

  // 1. Protocol enforcement: https required, http permitted only for localhost in dev/test
  const isLocalDevHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  const allowLocal =
    options.allowLocalhost ??
    (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development");

  if (protocol === "http:") {
    if (!allowLocal || !isLocalDevHost) {
      return {
        valid: false,
        error: "Security Error: Upstream MCP servers must use HTTPS in production.",
      };
    }
  } else if (protocol !== "https:") {
    return {
      valid: false,
      error: `Security Error: Unsupported protocol '${protocol}'. Only HTTPS is permitted.`,
    };
  }

  // 2. Loopback and Localhost checks when not explicitly allowed
  if (!allowLocal) {
    if (isLocalDevHost) {
      return {
        valid: false,
        error: "Security Error: Outbound connections to localhost are forbidden in production.",
      };
    }
  }

  // 3. Private IPv4 address ranges
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return {
      valid: false,
      error: "Security Error: Outbound connections to private IP range 10.0.0.0/8 are blocked.",
    };
  }

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return {
      valid: false,
      error: "Security Error: Outbound connections to private IP range 172.16.0.0/12 are blocked.",
    };
  }

  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return {
      valid: false,
      error: "Security Error: Outbound connections to private IP range 192.168.0.0/16 are blocked.",
    };
  }

  // 169.254.169.254 (Cloud metadata service) & 169.254.0.0/16 link-local
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return {
      valid: false,
      error: "Security Error: Outbound connections to link-local/cloud metadata service are blocked.",
    };
  }

  // 0.0.0.0
  if (hostname === "0.0.0.0") {
    return {
      valid: false,
      error: "Security Error: Outbound connections to 0.0.0.0 are blocked.",
    };
  }

  // IPv6 private & loopback ranges
  if (
    hostname.startsWith("fc00:") ||
    hostname.startsWith("fd00:") ||
    hostname.startsWith("fe80:")
  ) {
    return {
      valid: false,
      error: "Security Error: Outbound connections to private IPv6 addresses are blocked.",
    };
  }

  // 4. Recursive self-mounting loop check (*.spike.land/api/mcp*)
  if (
    (hostname.endsWith("spike.land") || hostname === "spike.land") &&
    parsed.pathname.startsWith("/api/mcp")
  ) {
    return {
      valid: false,
      error:
        "Security Error: Recursive self-mounting detected. The Spike Land MCP gateway cannot mount itself.",
    };
  }

  return { valid: true };
}
