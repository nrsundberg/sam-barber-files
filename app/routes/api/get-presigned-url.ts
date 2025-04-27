import { getPresignedDownloadUrl } from "~/s3.server";
import { data } from "react-router";
import type { Route } from "./+types/get-presigned-url.server";

export async function loader({ request }: Route.LoaderArgs) {
  // Get the key from the URL
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return data({ error: "No key provided" }, { status: 400 });
  }

  try {
    // Generate a presigned URL for the key
    const presignedUrl = await getPresignedDownloadUrl(key);

    return data({
      success: true,
      url: presignedUrl,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return data(
      {
        error: "Failed to generate presigned URL",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
