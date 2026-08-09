export function buildSessionCookieSettings(environment: string) {
  const isProduction = environment === "production";
  const sameSite: "none" | "lax" = isProduction ? "none" : "lax";

  return {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite,
  };
}
