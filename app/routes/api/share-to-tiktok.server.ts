import fetch from "node-fetch";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { v4 as uuid } from "uuid";
import { data } from "react-router";
import type { Route } from "./+types/share-to-tiktok.server";

// TikTok API configuration
const TIKTOK_API_KEY = process.env.TIKTOK_API_KEY;
const TIKTOK_API_SECRET = process.env.TIKTOK_API_SECRET;

// Action function to handle sharing to TikTok
export async function action({ request }: Route.ActionArgs) {
  // Parse the form data
  const formData = await request.formData();
  const videoUrl = formData.get("videoUrl") as string;
  const caption = formData.get("caption") as string;
  const action = formData.get("action") as string;

  // Validate the request
  if (!videoUrl || !caption || action !== "share-to-tiktok") {
    return data({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Check if TikTok API credentials are configured
    if (!TIKTOK_API_KEY || !TIKTOK_API_SECRET) {
      return data(
        { error: "TikTok API credentials not configured" },
        { status: 500 }
      );
    }

    // Download the video file to a temporary location
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return data({ error: "Failed to download video file" }, { status: 500 });
    }

    const tempDir = os.tmpdir();
    const videoFileId = uuid();
    const videoFilePath = path.join(tempDir, `${videoFileId}.mp4`);

    const videoBuffer = await videoResponse.buffer();
    await fs.writeFile(videoFilePath, videoBuffer);

    // Step 1: Initiate a video upload
    const initUploadResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TIKTOK_API_KEY}`,
        },
        body: JSON.stringify({
          source_info: {
            source: "PULL_FROM_URL",
            video_url: videoUrl,
            // Alternative method: use source: "UPLOAD" for direct uploads
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
          Authorization: `Bearer ${TIKTOK_API_KEY}`,
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

    // // Log the share activity
    // await prisma.shareActivity.create({
    //   data: {
    //     userId: user.id,
    //     platform: "TIKTOK",
    //     contentUrl: videoUrl,
    //     caption: caption,
    //     response: JSON.stringify(postData),
    //     status: "SUCCESS",
    //   },
    // });

    return data({
      success: true,
      postData,
    });
  } catch (error) {
    console.error("Error sharing to TikTok:", error);

    // // Log the failed share attempt
    // try {
    //   await db.shareActivity.create({
    //     data: {
    //       userId: user.id,
    //       platform: "TIKTOK",
    //       contentUrl: videoUrl,
    //       caption: caption,
    //       response: JSON.stringify({ error: String(error) }),
    //       status: "FAILED",
    //     },
    //   });
    // } catch (dbError) {
    //   console.error("Failed to log share activity:", dbError);
    // }

    return data({ error: "Failed to share to TikTok" }, { status: 500 });
  }
}
