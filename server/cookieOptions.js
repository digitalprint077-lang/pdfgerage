/** Split deploy: frontend (Vercel) + API (Railway) needs SameSite=None cookies. */
export function isCrossSiteDeploy() {
  return Boolean(process.env.API_URL?.trim());
}

export function sessionCookieOptions(overrides = {}) {
  const crossSite = isCrossSiteDeploy();
  return {
    httpOnly: true,
    secure: crossSite || process.env.NODE_ENV === "production",
    sameSite: crossSite ? "none" : "lax",
    path: "/",
    ...overrides,
  };
}
