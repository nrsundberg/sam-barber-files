import { getPresignedDownloadUrl } from "~/s3.server";
import type { Route } from "../+types/root";

export async function loader({ request }: Route.LoaderArgs) {
  // const url = new URL(request.url);
  // const fileKey = url.searchParams.get("fileKey");

  // if (!fileKey) {
  //   throw new Response("Missing file key", { status: 400 });
  // }

  const presignedUrl = await getPresignedDownloadUrl(
    "4_Stunt Language 15sec 100713 4.mp4"
  );

  console.log(presignedUrl);
  return { presignedUrl };
}

export default function DownloadFile({ loaderData }: Route.ComponentProps) {
  const { presignedUrl } = loaderData;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = presignedUrl;
    a.download = "downloaded-file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div>
      <button onClick={handleDownload}>Download File</button>
    </div>
  );
}
