import { getPresignedDownloadUrl } from "~/s3.server";
import type { Route } from "./+types/download";
import prisma from "~/db.server";
import { redirect } from "react-router";

export async function loader({ params }: Route.LoaderArgs) {
  let { fileId } = params;
  try {
    let presignedUrl = await getPresignedDownloadUrl(
      decodeURIComponent(fileId),
      1800 // 30 minutes expiration
    );

    let object = await prisma.object.findUnique({
      where: { s3fileKey: fileId },
    });
    // Fetch the file from S3 using the signed URL
    let response = await fetch(presignedUrl);

    if (!response.ok) {
      return new Response("Failed to fetch file from S3", { status: 500 });
    }

    let contentType =
      response.headers.get("content-type") || "application/octet-stream";
    let contentLength = response.headers.get("content-length");

    // Use fallback filename if missing
    let filename = object?.fileName || fileId.split("/").pop() || "file";

    // Extract extension to guess media type if needed
    const extension = filename.split(".").pop()?.toLowerCase();

    let forceInline = ["mp4", "mov", "webm", "mp3", "m4a", "wav"].includes(
      extension ?? ""
    );
    let contentDisposition = forceInline
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength ?? "0",
        "Content-Disposition": contentDisposition,
        "Cache-Control": "public, max-age=1800",
        Expires: new Date(Date.now() + 1800000).toUTCString(),
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return redirect("/");
  }
}
