import { getPresignedDownloadUrl } from "~/s3.server";
import type { Route } from "./+types/download";
import prisma from "~/db.server";
import { redirect } from "react-router";

export async function loader({ params }: Route.LoaderArgs) {
  let { fileId } = params;
  try {
    let presignedUrl = await getPresignedDownloadUrl(fileId);

    let object = await prisma.object.findUnique({ where: { id: fileId } });
    // Fetch the file from S3 using the signed URL
    let response = await fetch(presignedUrl);

    if (!response.ok) {
      return new Response("Failed to fetch file from S3", { status: 500 });
    }

    // Get Content-Type and other headers from S3 response
    let contentType =
      response.headers.get("content-type") || "application/octet-stream";
    let contentLength = response.headers.get("content-length");

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength ?? "0",
        "Content-Disposition": `attachment; filename="${object?.fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return redirect("/");
  }
}

// TODO delete this component
// // This is only a temporary placeholder
// export default function DownloadFile({ loaderData }: Route.ComponentProps) {
//   const { presignedUrl } = loaderData;

//   const handleDownload = () => {
//     const a = document.createElement("a");
//     a.href = presignedUrl;
//     a.download = "downloaded-file";
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//   };

//   return (
//     <div>
//       <button onClick={handleDownload}>Download File</button>
//     </div>
//   );
// }
