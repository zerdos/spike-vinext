/**
 * Security and SSRF Guardrails for Cloudflare Agent Harness + Spike Land Meta-MCP (MVP)
 * PRD Section 6.1 & 7
 */

export const NAMESPACE_REGEX = /^[a-z0-9_]{2,16}$/;

export function isValidNamespace(namespace: string): boolean {
  return NAMESPACE_REGEX.test(namespace);
}

const PLAINTEXT_SECRET_PATTERNS = [
  /\bsk_[a-zA-Z0-9_-]{10,}\b/,
  /\bsk_live_[a-zA-Z0-9_-]+\b/,
  /\bsk_test_[a-zA-Z0-9_-]+\b/,
  /\bghp_[a-zA-Z0-9]{15,}\b/,
  /\bgithub_pat_[a-zA-Z0-9_]{15,}\b/,
  /\bxoxb-[a-zA-Z0-9-]+\b/,
  /\bxoxp-[a-zA-Z0-9-]+\b/,
  /\bBearer\s+[a-zA-Z0-9_.-]{10,}\b/i,
  /^sk_[a-zA-Z0-9_-]+$/,
  /^ghp_[a-zA-Z0-9]+$/,
  /^Bearer\s+/i,
];

/**
 * Detects if a string or object contains plaintext secrets (e.g., raw API keys or tokens).
 */
export function detectPlaintextSecret(input: unknown): boolean {
  if (input === null || input === undefined) return false;

  if (typeof input === "string") {
    const trimmed = input.trim();
    // Allow legitimate env: or vault: reference names, e.g. "env:GITHUB_TOKEN" or "GITHUB_TOKEN"
    if (/^(env|vault):[A-Z0-9_]{2,64}$/.test(trimmed)) {
      return false;
    }
    return PLAINTEXT_SECRET_PATTERNS.some((pattern) => pattern.test(trimmed));
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

// IP Range Checking Helpers
function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const num = ipToInt(ip);
  // 10.0.0.0/8: 10.0.0.0 - 10.255.255.255
  if ((num & 0xff000000) >>> 0 === 0x0a000000) return true;
  // 172.16.0.0/12: 172.16.0.0 - 172.31.255.255
  if ((num & 0xfff00000) >>> 0 === 0xac100000) return true;
  // 192.168.0.0/16: 192.168.0.0 - 192.168.255.255
  if ((num & 0xffff0000) >>> 0 === 0xc0a80000) return true;
  // 127.0.0.0/8 (Loopback): 127.0.0.0 - 127.255.255.255
  if ((num & 0xff000000) >>> 0 === 0x7f000000) return true;
  // 169.254.0.0/16 (Link Local / Cloud Metadata): 169.254.0.0 - 169.254.255.255
  if ((num & 0xffff0000) >>> 0 === 0xa9fe0000) return true;
  // 0.0.0.0/8
  if ((num & 0xff000000) >>> 0 === 0x00000000) return true;

  return false;
}

/**
 * Validates an upstream MCP endpoint URL against SSRF, private IPs, loopback,
 * and recursive self-mounting attacks (PRD Section 6.1).
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

  const isLocalhostHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  // Protocol enforcement: HTTPS required
  if (protocol === "http:") {
    if (!options.allowLocalhost || !isLocalhostHost) {
      return {
        valid: false,
        error: "Security Error: Upstream MCP servers must use HTTPS.",
      };
    }
  } else if (protocol !== "https:") {
    return {
      valid: false,
      error: `Security Error: Unsupported protocol '${protocol}'. Only HTTPS is permitted.`,
    };
  }

  // Loopback and Localhost checks
  if (isLocalhostHost && !options.allowLocalhost) {
    return {
      valid: false,
      error: "SSRF Protection: Access to localhost/loopback addresses is forbidden.",
    };
  }

  // IPv4 Private Range Check
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    if (isPrivateIPv4(hostname) && (!options.allowLocalhost || !isLocalhostHost)) {
      return {
        valid: false,
        error: `SSRF Protection: Access to private IPv4 address '${hostname}' is forbidden.`,
      };
    }
  }

  // IPv6 Private & Local Check
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    const rawIpv6 = hostname.slice(1, -1).toLowerCase();
    if (
      rawIpv6 === "::1" ||
      rawIpv6.startsWith("fc00:") ||
      rawIpv6.startsWith("fd") ||
      rawIpv6.startsWith("fe80:")
    ) {
      if (!options.allowLocalhost || rawIpv6 !== "::1") {
        return {
          valid: false,
          error: `SSRF Protection: Access to private IPv6 address '${hostname}' is forbidden.`,
        };
      }
    }
  }

  // Metadata / Internal domain patterns
  if (
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".lan")
  ) {
    return {
      valid: false,
      error: `SSRF Protection: Access to internal domain '${hostname}' is forbidden.`,
    };
  }

  // Recursive self-mounting prevention: general /api/mcp endpoint recursion
  // (Virtual scoped gateways like /api/mcp/g/:gatewaySlug are permitted)
  if (
    (hostname === "spike.land" || hostname.endsWith(".spike.land")) &&
    (parsed.pathname === "/api/mcp" || parsed.pathname === "/api/mcp/")
  ) {
    return {
      valid: false,
      error: "Recursion Protection: Self-mounting internal Spike Land MCP gateway endpoint is forbidden.",
    };
  }

  return { valid: true };
}
