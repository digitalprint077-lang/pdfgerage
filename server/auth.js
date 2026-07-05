import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createUser, findUserByEmail, findUserById, findOrCreateGoogleUser, updateUserName, updateUserPassword } from "./db.js";
import { getUserDashboard } from "./userActivity.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-change-me-in-production";
const COOKIE_NAME = "auth_token";
const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_RETURN_COOKIE = "oauth_return";
const OAUTH_AUTH_PAGE_COOKIE = "oauth_auth_page";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
}

export function getGoogleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}

export function getAppUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    const port = process.env.PORT || 3001;
    return `http://localhost:${port}`;
  }
  return "http://localhost:5173";
}

/** Public URL of the Express API (Railway). Used for OAuth callback when frontend is on Vercel. */
export function getApiUrl() {
  if (process.env.API_URL) {
    return process.env.API_URL.replace(/\/$/, "");
  }
  return getAppUrl();
}

export function getGoogleRedirectUri() {
  return `${getApiUrl()}/api/auth/google/callback`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicUser(row) {
  if (!row) return null;
  const authProvider = row.google_id ? "google" : "email";
  return {
    id: row.id,
    email: row.email,
    name: row.name || "",
    createdAt: row.created_at,
    authProvider,
  };
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

function setAuthCookie(res, token) {
  const crossSite = Boolean(process.env.API_URL && process.env.FRONTEND_URL);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: crossSite ? "none" : "lax",
    maxAge: TOKEN_MAX_AGE_MS,
    path: "/",
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(Number(payload.sub));
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Not authenticated" });
    }
    req.user = publicUser(user);
    req.userRow = user;
    next();
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ error: "Not authenticated" });
  }
}

export async function profileUpdateHandler(req, res) {
  try {
    const name = String(req.body?.name ?? "").trim();
    if (name.length > 80) {
      return res.status(400).json({ error: "Name must be 80 characters or less" });
    }
    const updated = updateUserName(req.userRow.id, name);
    res.json({ user: publicUser(updated) });
  } catch (err) {
    console.error("profile update error:", err);
    res.status(500).json({ error: "Could not update profile" });
  }
}

export async function changePasswordHandler(req, res) {
  try {
    if (!req.userRow.password_hash) {
      return res.status(400).json({ error: "This account uses Google sign-in. Password cannot be changed here." });
    }

    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const ok = await bcrypt.compare(currentPassword, req.userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    updateUserPassword(req.userRow.id, passwordHash);
    res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("change password error:", err);
    res.status(500).json({ error: "Could not change password" });
  }
}

export function dashboardHandler(req, res) {
  try {
    const dashboard = getUserDashboard(req.userRow.id, req.userRow.email, req.userRow);
    res.json(dashboard);
  } catch (err) {
    console.error("dashboard error:", err);
    res.status(500).json({ error: "Could not load dashboard" });
  }
}
export function optionalAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(Number(payload.sub));
    req.user = publicUser(user);
  } catch {
    req.user = null;
  }
  next();
}

export async function registerHandler(req, res) {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    const name = String(req.body?.name || "").trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (findUserByEmail(email)) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = createUser(email, passwordHash, name);
    const token = signToken(user.id);
    setAuthCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
}

export async function loginHandler(req, res) {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const row = findUserByEmail(email);
    if (!row) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!row.password_hash) {
      return res.status(401).json({ error: "This account uses Google sign-in. Please continue with Google." });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(row.id);
    setAuthCookie(res, token);
    res.json({ user: publicUser(row) });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}

export function authConfigHandler(_req, res) {
  const googleClientId = getGoogleClientId();
  const googleSecret = getGoogleClientSecret();
  res.json({
    google: Boolean(googleClientId && googleSecret),
    googleClientId: googleClientId || null,
  });
}

export function googleStartHandler(req, res) {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const authPage = req.query.authPage === "signup" ? "signup" : "login";

  if (!clientId || !clientSecret) {
    console.warn("Google Sign-In: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
    return res.redirect(`${getAppUrl()}/${authPage}?error=google_not_configured`);
  }

  const returnTo = String(req.query.returnTo || "/").startsWith("/")
    ? String(req.query.returnTo || "/")
    : "/";

  const state = crypto.randomBytes(24).toString("hex");
  const oauthCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.API_URL && process.env.FRONTEND_URL ? "none" : "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  };

  res.cookie(OAUTH_STATE_COOKIE, state, oauthCookie);
  res.cookie(OAUTH_RETURN_COOKIE, returnTo, oauthCookie);
  res.cookie(OAUTH_AUTH_PAGE_COOKIE, authPage, oauthCookie);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function googleCallbackHandler(req, res) {
  const frontendUrl = getAppUrl();
  const authPage = req.cookies?.[OAUTH_AUTH_PAGE_COOKIE] === "signup" ? "signup" : "login";

  const redirectAuthError = (code) => {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
    res.clearCookie(OAUTH_RETURN_COOKIE, { path: "/" });
    res.clearCookie(OAUTH_AUTH_PAGE_COOKIE, { path: "/" });
    return res.redirect(`${frontendUrl}/${authPage}?error=${code}`);
  };

  try {
    const oauthError = req.query.error;
    if (oauthError) {
      return redirectAuthError("google_denied");
    }

    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const savedState = req.cookies?.[OAUTH_STATE_COOKIE];
    const returnTo = req.cookies?.[OAUTH_RETURN_COOKIE] || "/";

    if (!code || !state || !savedState || state !== savedState) {
      return redirectAuthError("invalid_state");
    }

    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
    res.clearCookie(OAUTH_RETURN_COOKIE, { path: "/" });
    res.clearCookie(OAUTH_AUTH_PAGE_COOKIE, { path: "/" });

    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/${authPage}?error=google_not_configured`);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleRedirectUri(),
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error("google token error:", tokens);
      return res.redirect(`${frontendUrl}/${authPage}?error=google_token_failed`);
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) {
      return res.redirect(`${frontendUrl}/${authPage}?error=google_profile_failed`);
    }

    const profile = await profileRes.json();
    if (!profile.email) {
      return res.redirect(`${frontendUrl}/${authPage}?error=google_no_email`);
    }

    const user = findOrCreateGoogleUser(
      String(profile.email).toLowerCase(),
      String(profile.name || profile.given_name || "").trim(),
      String(profile.sub || "")
    );

    setAuthCookie(res, signToken(user.id));
    res.redirect(`${frontendUrl}${returnTo.startsWith("/") ? returnTo : "/"}`);
  } catch (err) {
    console.error("google callback error:", err);
    res.redirect(`${frontendUrl}/${authPage}?error=google_failed`);
  }
}

export function logoutHandler(_req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export async function googleHandler(req, res) {
  try {
    const credential = String(req.body?.credential || "");
    const clientId = getGoogleClientId();

    if (!clientId) {
      return res.status(503).json({ error: "Google Sign-In is not configured on the server" });
    }
    if (!credential) {
      return res.status(400).json({ error: "Google credential is required" });
    }

    const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!tokenRes.ok) {
      return res.status(401).json({ error: "Invalid Google sign-in" });
    }

    const payload = await tokenRes.json();
    if (payload.aud !== clientId) {
      return res.status(401).json({ error: "Invalid Google client" });
    }
    if (payload.email_verified !== "true" && payload.email_verified !== true) {
      return res.status(401).json({ error: "Google email is not verified" });
    }

    const email = String(payload.email || "").toLowerCase();
    const name = String(payload.name || payload.given_name || "").trim();
    const googleId = String(payload.sub || "");

    const user = findOrCreateGoogleUser(email, name, googleId);
    const token = signToken(user.id);
    setAuthCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("google auth error:", err);
    res.status(500).json({ error: "Google sign-in failed" });
  }
}

export function meHandler(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.json({ user: null });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(Number(payload.sub));
    if (!user) {
      clearAuthCookie(res);
      return res.json({ user: null });
    }
    res.json({ user: publicUser(user) });
  } catch {
    clearAuthCookie(res);
    res.json({ user: null });
  }
}

export function mountAuthRoutes(app) {
  app.post("/api/auth/register", registerHandler);
  app.post("/api/auth/login", loginHandler);
  app.post("/api/auth/google", googleHandler);
  app.get("/api/auth/google/start", googleStartHandler);
  app.get("/api/auth/google/callback", googleCallbackHandler);
  app.post("/api/auth/logout", logoutHandler);
  app.get("/api/auth/config", authConfigHandler);
  app.get("/api/auth/me", meHandler);
  app.get("/api/auth/dashboard", requireAuth, dashboardHandler);
  app.patch("/api/auth/profile", requireAuth, profileUpdateHandler);
  app.post("/api/auth/change-password", requireAuth, changePasswordHandler);
}
