import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_BUCKET_NAME) {
  throw new Error("Missing S3 environment variables");
}

export const s3Client = new S3Client({
  region: "us-east-1", // Modify as needed
  endpoint: S3_ENDPOINT,
  // TODO these will be off in prod and connect through domain?
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

/**
 * Generate a pre-signed URL for downloading a file from S3.
 * The URL will be valid for 10 minutes.
 *
 * @param {string} fileKey - The key (path) of the file in the bucket.
 * @returns {Promise<string>} - The pre-signed URL.
 */
export async function getPresignedDownloadUrl(
  fileKey: string
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 }); // 10 minutes
    return url;
  } catch (error) {
    console.error("Error generating pre-signed URL", error);
    throw new Error("Failed to generate pre-signed URL");
  }
}

/**
 * Function to upload to s3
 * @param file
 * @param fileId
 * @returns true if file uploaded
 */
export async function uploadToS3(file: File, fileId: string): Promise<boolean> {
  // NOTE: this is not accounting for really large files that need to but uploaded in multipart requests
  // Probably won't have those considering users will want to download but something to take note of
  try {
    let fileBuffer = await file.arrayBuffer();
    let uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: fileId,
      Body: Buffer.from(fileBuffer),
      ContentType: file.type,
    };

    let s3Response = await s3Client.send(new PutObjectCommand(uploadParams));
    if (s3Response.$metadata.httpStatusCode !== 200) {
      // If this fails will want to return error to user
      return false;
    }
    return true;
  } catch (e) {
    console.error(`Could not upload file with error: ${e}`);
    return false;
  }
}
