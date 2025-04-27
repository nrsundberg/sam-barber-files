import { data } from "react-router";
import type { Route } from "./+types/check-tiktok-auth";
import { getTikTokTokens } from "~/routes/tiktok-auth";

export async function loader({ request }: Route.LoaderArgs) {
  // Get TikTok tokens from session
  const { isValid, openId } = await getTikTokTokens(request);

  // Return authentication status
  return data({
    isAuthenticated: isValid,
    openId: isValid ? openId : null,
  });
}
