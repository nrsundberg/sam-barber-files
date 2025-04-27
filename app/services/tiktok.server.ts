// This file handles TikTok authentication logic on the server side

// TikTok API configuration - you'll need to add these to your environment variables
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI; // e.g., https://your-domain.com/tiktok-auth/callback

// Scopes required for content posting
const REQUIRED_SCOPES = ["user.info.basic", "video.upload", "video.publish"];

/**
 * Generates the TikTok authorization URL
 * @returns URL for redirecting users to TikTok login
 */
export function getTikTokAuthUrl() {
  if (!TIKTOK_CLIENT_KEY || !TIKTOK_REDIRECT_URI) {
    throw new Error("TikTok API credentials not properly configured");
  }

  // Generate a random state value for security
  const state = Math.random().toString(36).substring(2);

  // Construct the authorization URL
  let url = "https://www.tiktok.com/v2/auth/authorize/";
  url += `?client_key=${TIKTOK_CLIENT_KEY}`;
  url += `&scope=${REQUIRED_SCOPES.join(",")}`;
  url += "&response_type=code";
  url += `&redirect_uri=${encodeURIComponent(TIKTOK_REDIRECT_URI)}`;
  url += `&state=${state}`;

  return { url, state };
}

/**
 * Exchanges an authorization code for an access token
 * @param code Authorization code received from TikTok
 * @returns Access token response
 */
export async function exchangeCodeForToken(code: string) {
  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET || !TIKTOK_REDIRECT_URI) {
    throw new Error("TikTok API credentials not properly configured");
  }

  const tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: TIKTOK_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for token: ${errorText}`);
  }

  return response.json();
}

/**
 * Fetches user information using the access token
 * @param accessToken TikTok access token
 * @param openId User's open ID
 * @returns User information
 */
export async function getUserInfo(accessToken: string, openId: string) {
  const userInfoUrl = "https://open.tiktokapis.com/v2/user/info/";

  const response = await fetch(userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      fields: [
        "open_id",
        "union_id",
        "avatar_url",
        "display_name",
        "bio_description",
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch user info: ${errorText}`);
  }

  return response.json();
}
