// app/routes/api/share-to-tiktok.server.ts
import fetch from "node-fetch";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { v4 as uuid } from "uuid";
import type { Route } from "./+types/share-to-tiktok.server";
import { getTikTokTokens } from "~/routes/tiktok-auth";
import prisma from "~/db.server";
import { data } from "react-router";

// Action function to handle sharing to TikTok
export async function action({ request }: Route.ActionArgs) {
  // Get TikTok auth info from session
  const { accessToken, openId, isValid } = await getTikTokTokens(request);

  // Check if user is authenticated
  if (!isValid || !accessToken || !openId) {
    return data(
      {
        error: "Not authenticated with TikTok",
        requiresAuth: true,
      },
      { status: 401 }
    );
  }

  // Parse the form data
  const formData = await request.formData();
  const videoUrl = formData.get("videoUrl") as string;
  const caption = formData.get("caption") as string;
  const action = formData.get("action") as string;
  const objectId = formData.get("objectId") as string;

  // Validate the request
  if (!videoUrl || !caption || action !== "share-to-tiktok") {
    return data({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Download the video file to a temporary location
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return data({ error: "Failed to download video file" }, { status: 500 });
    }

    const tempDir = os.tmpdir();
    const videoFileId = uuid();
    const videoFilePath = path.join(tempDir, `${videoFileId}.mp4`);

    const videoBuffer = await videoResponse.arrayBuffer();
    await fs.writeFile(videoFilePath, Buffer.from(videoBuffer));

    // Step 1: Initiate a video upload
    const initUploadResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          source_info: {
            source: "PULL_FROM_URL",
            video_url: videoUrl,
          },
        }),
      }
    );

    if (!initUploadResponse.ok) {
      const errorData = await initUploadResponse.json();
      console.error("TikTok init upload error:", errorData);
      return data(
        { error: "Failed to initialize TikTok upload" },
        { status: 500 }
      );
    }

    const { data: initData } = await initUploadResponse.json();
    const { publish_id } = initData;

    // Step 2: Create the post with the video
    const createPostResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/inbox/video/publish/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          publish_id: publish_id,
          post_info: {
            title: caption,
            privacy_level: "SELF_ONLY", // Options: SELF_ONLY, MUTUAL_FOLLOW_FRIENDS, PUBLIC
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 0,
          },
        }),
      }
    );

    if (!createPostResponse.ok) {
      const errorData = await createPostResponse.json();
      console.error("TikTok create post error:", errorData);
      return data({ error: "Failed to create TikTok post" }, { status: 500 });
    }

    const { data: postData } = await createPostResponse.json();

    // Clean up temporary files
    try {
      await fs.unlink(videoFilePath);
    } catch (err) {
      console.error("Error cleaning up temp video file:", err);
    }

    // Log the share activity in database if needed
    if (objectId) {
      try {
        // You could store TikTok share activity in your database here
        await prisma.tikTokVideo.update({
          where: { objectId },
          data: {
            // Add any fields you want to track for TikTok shares
            // For example a lastShared timestamp or shareCount
          },
        });
      } catch (dbError) {
        console.error("Failed to update TikTok share status:", dbError);
      }
    }

    return data({
      success: true,
      postData,
      objectId,
    });
  } catch (error) {
    console.error("Error sharing to TikTok:", error);
    return data(
      {
        error: "Failed to share to TikTok",
        details: String(error),
        objectId,
      },
      { status: 500 }
    );
  }
}
