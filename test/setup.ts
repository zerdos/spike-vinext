import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@workos-inc/authkit-react", () => {
  return {
    useAuth: vi.fn(() => ({
      user: null,
      isLoading: false,
      role: null,
      roles: null,
      organizationId: null,
      permissions: [],
      featureFlags: [],
      impersonator: null,
      authenticationMethod: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      getUser: vi.fn(() => null),
      getAccessToken: vi.fn(async () => ""),
      switchToOrganization: vi.fn(),
      getSignInUrl: vi.fn(async () => ""),
      getSignUpUrl: vi.fn(async () => ""),
    })),
    AuthKitProvider: ({ children }: { children: unknown }) => children,
  };
});
