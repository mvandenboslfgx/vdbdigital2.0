import "server-only";

export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "MFA_REQUIRED"
  | "MFA_SETUP_REQUIRED"
  | "ACCOUNT_DISABLED"
  | "NOT_FOUND";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message = "Toegang geweigerd") {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function authErrorToStatus(code: AuthErrorCode): number {
  switch (code) {
    case "UNAUTHENTICATED":
    case "MFA_REQUIRED":
    case "MFA_SETUP_REQUIRED":
      return 401;
    case "FORBIDDEN":
    case "ACCOUNT_DISABLED":
      return 403;
    case "NOT_FOUND":
      return 404;
    default:
      return 403;
  }
}
