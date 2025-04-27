import {
  getTikTokAuthUrl,
  exchangeCodeForToken,
  getUserInfo,
} from "~/services/tiktok.server";
import { redirect } from "react-router";
import { createCookieSessionStorage } from "@remix-run/node";
import type { Route } from "./+types/tiktok-auth";

// Session storage for managing TikTok auth state
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "tiktok_auth_session",
    secrets: [process.env.SESSION_SECRET || "default-secret-change-me"],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
});

// Get session from request
async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

// Save TikTok tokens to user session
async function saveTokensToSession({
  request,
  accessToken,
  refreshToken,
  openId,
  expiresIn,
}: {
  request: Request;
  accessToken: string;
  refreshToken: string;
  openId: string;
  expiresIn: number;
}) {
  const session = await getSession(request);

  // Calculate expiration date
  const expiryDate = new Date();
  expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);

  session.set("tiktokAccessToken", accessToken);
  session.set("tiktokRefreshToken", refreshToken);
  session.set("tiktokOpenId", openId);
  session.set("tiktokTokenExpiry", expiryDate.toISOString());

  return redirect("/tiktok-dashboard", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

// Get TikTok tokens from session
export async function getTikTokTokens(request: Request) {
  const session = await getSession(request);

  const accessToken = session.get("tiktokAccessToken");
  const refreshToken = session.get("tiktokRefreshToken");
  const openId = session.get("tiktokOpenId");
  const tokenExpiry = session.get("tiktokTokenExpiry");

  // Check if token exists and is not expired
  if (accessToken && tokenExpiry) {
    const expiryDate = new Date(tokenExpiry);
    if (expiryDate > new Date()) {
      return { accessToken, refreshToken, openId, isValid: true };
    }
  }

  return { accessToken: null, refreshToken, openId, isValid: false };
}

// Handle different route actions
export async function loader({ request, params }: Route.LoaderArgs) {
  const action = params.action;

  switch (action) {
    case "login":
      // Generate auth URL and redirect user to TikTok login
      try {
        const { url, state } = getTikTokAuthUrl();

        // Store state in session for CSRF protection
        const session = await getSession(request);
        session.set("tiktokAuthState", state);

        return redirect(url, {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        });
      } catch (error) {
        console.error("Error generating TikTok auth URL:", error);
        return redirect("/error?message=Failed to initialize TikTok login");
      }

    case "callback":
      // Handle callback from TikTok with authorization code
      const url = new URL(request.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      // Check for error from TikTok
      if (error) {
        return redirect(`/error?message=TikTok authentication error: ${error}`);
      }

      if (!code) {
        return redirect(
          "/error?message=No authorization code received from TikTok"
        );
      }

      // Verify state to prevent CSRF attacks
      const session = await getSession(request);
      const savedState = session.get("tiktokAuthState");

      if (state !== savedState) {
        return redirect(
          "/error?message=Invalid state parameter, possible CSRF attack"
        );
      }

      try {
        // Exchange code for token
        const tokenResponse = await exchangeCodeForToken(code);

        // Extract token data
        const {
          access_token: accessToken,
          refresh_token: refreshToken,
          open_id: openId,
          expires_in: expiresIn,
        } = tokenResponse;

        // Get user info
        const userInfo = await getUserInfo(accessToken, openId);

        // Store tokens in session
        return saveTokensToSession({
          request,
          accessToken,
          refreshToken,
          openId,
          expiresIn,
        });
      } catch (error) {
        console.error("Error exchanging code for token:", error);
        return redirect(
          "/error?message=Failed to complete TikTok authentication"
        );
      }

    case "logout":
      // Clear TikTok auth data from session
      const logoutSession = await getSession(request);

      return redirect("/", {
        headers: {
          "Set-Cookie": await sessionStorage.destroySession(logoutSession),
        },
      });

    default:
      return redirect("/");
  }
}

// A simple error page component
export default function TikTokAuthError() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p>There was a problem authenticating with TikTok. Please try again.</p>
      <a
        href="/tiktok-auth/login"
        className="mt-4 inline-block bg-black text-white p-2 rounded"
      >
        Try Again
      </a>
    </div>
  );
}
