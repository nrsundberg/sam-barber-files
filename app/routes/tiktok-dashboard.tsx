import type { Route } from "./+types/tiktok-dashboard";
import { getTikTokTokens } from "~/routes/tiktok-auth";
import TikTokLoginButton from "~/components/TikTokLoginButton";

export async function loader({ request }: Route.LoaderArgs) {
  // Get TikTok tokens from session
  const { accessToken, openId, isValid } = await getTikTokTokens(request);

  // If no valid token, user needs to authenticate
  if (!isValid) {
    return {
      isAuthenticated: false,
      userData: null,
    };
  }

  // User is authenticated
  return {
    isAuthenticated: true,
    openId,
    accessToken,
  };
}

export default function TikTokDashboard({ loaderData }: Route.ComponentProps) {
  const { isAuthenticated, openId, accessToken } = loaderData;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">TikTok Integration Dashboard</h1>

      {isAuthenticated ? (
        <div>
          <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
            <h2 className="text-xl font-semibold text-green-800">
              Connected to TikTok
            </h2>
            <p className="text-green-700">
              Your app is authorized to post to TikTok
            </p>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">Account Information:</h3>
            <p>TikTok Open ID: {openId}</p>
          </div>

          <a
            href="/tiktok-auth/logout"
            className="inline-block bg-red-500 text-white p-2 rounded hover:bg-red-600"
          >
            Disconnect from TikTok
          </a>
        </div>
      ) : (
        <div>
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
            <h2 className="text-xl font-semibold text-yellow-800">
              Not Connected to TikTok
            </h2>
            <p className="text-yellow-700">
              Connect your TikTok account to enable sharing videos directly to
              TikTok.
            </p>
          </div>

          <TikTokLoginButton />
        </div>
      )}
    </div>
  );
}
