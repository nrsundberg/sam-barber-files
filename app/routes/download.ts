// NOTE this is a test file for now
// This will be where we can link our downloads to and receive the file key in the url param
// NOTE: Encode the file key

import { getPresignedDownloadUrl } from "~/s3.server";
import type { Route } from "../+types/root";

export async function loader({ request }: Route.LoaderArgs) {
  return fetch(
    await getPresignedDownloadUrl("4_Stunt Language 15sec 100713 4.mp4")
  );
}
