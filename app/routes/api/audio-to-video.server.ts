import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { execSync } from "child_process";
import { createWriteStream, writeFileSync, unlinkSync } from "fs";
import { v4 as uuid } from "uuid";
import * as path from "path";
import * as os from "os";
import { pipeline } from "stream/promises";
import { data } from "react-router";
import prisma from "~/db.server";
import type { Route } from "./+types/audio-to-video.server";
import { getPresignedDownloadUrl, S3_BUCKET_NAME, s3Client } from "~/s3.server";
import { ConversionStatus } from "@prisma/client";

// Action function to handle the audio to video conversion
export async function action({ request }: Route.ActionArgs) {
  // Parse the form data
  const formData = await request.formData();
  const objectId = formData.get("objectId") as string;
  const s3fileKey = formData.get("s3fileKey") as string;
  const action = formData.get("action") as string;

  // Validate the request
  if (!objectId || !s3fileKey || action !== "convert-to-video") {
    return data({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Get the object from the database
    const object = await prisma.object.findUnique({
      where: { id: objectId },
    });

    if (!object) {
      return data({ error: "Object not found" }, { status: 404 });
    }

    // Check if it's an audio file
    if (
      object.kind !== "AUDIO" &&
      !object.fileName.toLowerCase().endsWith(".mp3") &&
      !object.fileName.toLowerCase().endsWith(".wav") &&
      !object.fileName.toLowerCase().endsWith(".ogg") &&
      !object.fileName.toLowerCase().endsWith(".m4a")
    ) {
      return data({ error: "Not an audio file" }, { status: 400 });
    }

    // Set up temporary file paths
    const tempDir = os.tmpdir();
    const audioFileId = uuid();
    const audioFilePath = path.join(
      tempDir,
      `${audioFileId}_audio${path.extname(object.fileName)}`
    );
    const videoFilePath = path.join(tempDir, `${audioFileId}_output.mp4`);

    // Download the audio file from S3
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3fileKey,
    });

    const { Body } = await s3Client.send(getCommand);

    if (!Body) {
      return data(
        { error: "Failed to download file from S3" },
        { status: 500 }
      );
    }

    // Save the audio file to a temporary location
    const writeStream = createWriteStream(audioFilePath);
    await pipeline(Body as any, writeStream);

    // Create a simple 1x1 transparent PNG
    const transparentPixelPath = path.join(
      tempDir,
      `${audioFileId}_transparent.png`
    );
    const transparentPixelData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEDQIHq4feCgAAAABJRU5ErkJggg==",
      "base64"
    );
    writeFileSync(transparentPixelPath, transparentPixelData);

    // Use FFmpeg to create a video with transparent background
    // Get the duration of the audio file
    const durationOutput = execSync(
      `ffprobe -i ${audioFilePath} -show_entries format=duration -v quiet -of csv="p=0"`,
      { encoding: "utf-8" }
    );
    const duration = parseFloat(durationOutput.trim());

    // Create the video with FFmpeg
    execSync(
      `ffmpeg -loop 1 -i ${transparentPixelPath} -i ${audioFilePath} -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -t ${duration} ${videoFilePath}`
    );

    // Generate a new S3 key for the video
    const videoS3Key = `${s3fileKey.substring(0, s3fileKey.lastIndexOf("."))}.mp4`;

    // Upload the converted video back to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: videoS3Key,
        Body: await require("fs/promises").readFile(videoFilePath),
        ContentType: "video/mp4",
      })
    );

    // Create a new object entry in the database for the video
    const videoObject = await prisma.tikTokVideo.create({
      data: {
        fileKey: videoS3Key,
        objectId: object.id,
        status: ConversionStatus.COMPLETED,
      },
    });

    const videoUrl = await getPresignedDownloadUrl(videoS3Key);

    // Clean up temporary files
    try {
      unlinkSync(audioFilePath);
      unlinkSync(transparentPixelPath);
      unlinkSync(videoFilePath);
    } catch (err) {
      console.error("Error cleaning up temp files:", err);
    }

    return data({
      success: true,
      videoObject,
      videoUrl,
    });
  } catch (error) {
    console.error("Error converting audio to video:", error);
    return data({ error: "Failed to convert audio to video" }, { status: 500 });
  }
}
