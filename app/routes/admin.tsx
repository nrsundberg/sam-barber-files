import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  DatePicker,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { Upload, FolderPlus } from "lucide-react";
import type { Route } from "./+types/admin";
import prisma from "~/db.server";
import { ObjectKind } from "@prisma/client";
import { data, useFetcher } from "react-router";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { getPresignedDownloadUrl, uploadToS3 } from "~/s3.server";
import { convertToUTCDateTime, formatFileSize } from "~/utils";
import { now } from "@internationalized/date";
import { accountId, client } from "~/client.server";
import { getKindeSession } from "@kinde-oss/kinde-remix-sdk";
import { dataWithError, dataWithSuccess, redirectWithError } from "remix-toast";
// import { fetchCloudflare } from "~/client.server";

// Don't need SEO or dynamic header for admin route
export function meta() {
  return [{ title: "Admin Panel" }];
}

// TODO Add auth to this route and app in general
// This loader should be locked down
// Loader to bring in existing folders
// NOTE: this does not includes nested objects and will want to bring them in
export async function loader({ request }: Route.LoaderArgs) {
  // await fetchCloudflare("", "");

  const { getUser } = await getKindeSession(request);
  const user = await getUser();
  if (user === null) {
    return redirectWithError("/", "You are not authorized to view this page.");
  }

  // console.log(video);
  // // uid from cloudflare
  // console.log(video.uid);
  return await prisma.folder.findMany({ include: { objects: true } });
}

const folderCreateSchema = zfd.formData({
  name: z.string(),
  // NOT NEEDED ATM
  // folderNumber: z.coerce.number(),
  date: z.string(),
});

const uploadFileSchema = zfd.formData({
  file: z.instanceof(File),
  folderId: z.string(),
  kind: z.custom<ObjectKind>(),
  createdDate: z.string(),
});

// TODO Add auth to this route and app in general
// This action should be locked down
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  switch (request.method) {
    case "POST":
      // NOTE: schema requires both name and folderNumber
      // on update we won't need the whole object
      let { name, date } = folderCreateSchema.parse(formData);
      await prisma.folder.create({
        data: {
          name: name ?? "",
          // Placeholder is number was ever wanted
          folderNumber: 1,
          createdDate: convertToUTCDateTime(date).toISOString(),
        },
      });
      // TODO this can be the data to update client
      return dataWithSuccess({ ok: true }, "Created Folder");

    // Upload file -- this could be multiple files?
    case "PATCH":
      let { file, folderId, kind, createdDate } =
        uploadFileSchema.parse(formData);
      if (!file || !folderId) {
        return dataWithError(
          { error: "File and folder selection are required" },
          "File and folder are required"
        );
      }

      let newObject = await prisma.object.create({
        data: {
          fileName: file.name,
          createdDate: convertToUTCDateTime(createdDate).toISOString(),
          size: file.size,
          kind,
          s3fileKey: "",
          cloudFlareId: "",
          folderId,
        },
      });

      let uploadedS3 = await uploadToS3(file, newObject.id);
      if (uploadedS3) {
        if (process.env.NODE_ENV === "production") {
          let presignedUrl = await getPresignedDownloadUrl(newObject.id);
          const video = await client.stream.copy.create({
            account_id: accountId ?? "",
            url: presignedUrl,
            meta: { name: file.name },
          });
          await prisma.object.update({
            where: { id: newObject.id },
            // NOTE for not the sefileKey is the same as Id
            data: { s3fileKey: newObject.id, cloudFlareId: video.uid },
          });
        } else {
          await prisma.object.update({
            where: { id: newObject.id },
            // NOTE for not the sefileKey is the same as Id
            data: { s3fileKey: newObject.id },
          });
        }
      } else {
        return dataWithError(
          { error: "Couldn't upload" },
          "File could not be uploaded"
        );
      }
      return dataWithSuccess({ ok: true }, "Uploaded File");
  }
  return data({ error: "Invalid action" }, { status: 400 });
}

export default function ({ loaderData, actionData }: Route.ComponentProps) {
  let folders = loaderData;
  let fileFetcher = useFetcher({ key: "file-fetcher" });
  let fileRef = useRef<HTMLFormElement>(null);
  let folderFetcher = useFetcher({ key: "folder-fetcher" });
  let folderRef = useRef<HTMLFormElement>(null);

  // This does not seem like the best way to handle form clear on submission...
  useEffect(() => {
    if (fileFetcher.state === "idle" && fileFetcher.data?.ok) {
      fileRef.current?.reset();
      setFile(null);
    }
  }, [fileFetcher.state, fileFetcher.data]);

  useEffect(() => {
    if (folderFetcher.state === "idle" && folderFetcher.data?.ok) {
      folderRef.current?.reset();
    }
  }, [folderFetcher.state, folderFetcher.data]);

  // File state to take
  // TODO this should be a form that triggers an upload and returns the file key through actionData
  let [file, setFile] = useState<File | null>(null);

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold">Admin Panel</h1>

      <div className="flex flex-col md:grid md:grid-cols-2 md:gap-2">
        {/* Folder Creation Form */}
        <Card className="bg-gray-700 mt-6 p-4">
          <CardBody>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-yellow-400" /> Create New
              Folder
            </h2>
            <folderFetcher.Form
              ref={folderRef}
              method="POST"
              className="flex flex-col mt-4 gap-3"
            >
              <Input
                name="name"
                label="Folder Name"
                className="max-w-[284px]"
                isRequired
              />
              {/*NOT NEEDED FOR NOW*/}
              {/*<Input*/}
              {/*  name="folderNumber"*/}
              {/*  type="number"*/}
              {/*  label="Folder Number"*/}
              {/*  className="max-w-[284px]"*/}
              {/*  isRequired*/}
              {/*/>*/}
              <DatePicker
                name="date"
                hideTimeZone
                showMonthAndYearPickers
                defaultValue={now("UTC")}
                className="max-w-[284px]"
                label="Folder Created Date"
              />
              <Button
                isLoading={folderFetcher.state !== "idle"}
                type="submit"
                className="max-w-[284px]"
                color="primary"
              >
                Create Folder
              </Button>
            </folderFetcher.Form>
          </CardBody>
        </Card>

        {/* Upload Form */}
        <Card className="bg-gray-700 mt-6 p-4">
          <CardBody>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-400" /> Upload File
            </h2>
            {/* {actionData?.error && ( */}
            {/* <p className="text-red-500">{actionData?.error}</p> */}
            {/* )} */}
            <fileFetcher.Form
              ref={fileRef}
              method="PATCH"
              encType="multipart/form-data"
              className="flex flex-col mt-4 gap-3"
            >
              <Select
                name="folderId"
                placeholder="Choose a folder"
                className="max-w-[350px]"
                aria-label="Folder Selector"
                isRequired
              >
                {folders.map((folder) => (
                  <SelectItem key={folder.id} textValue={folder.name}>
                    <div className="w-full flex justify-between">
                      <p>
                        {folder.name}: {folder.folderNumber}
                      </p>
                      <p># Objects in folder: {folder.objects.length}</p>
                    </div>
                  </SelectItem>
                ))}
              </Select>

              <Select
                name="kind"
                className="max-w-[284px]"
                label="File Type"
                isRequired
              >
                <SelectItem key="AUDIO">Audio</SelectItem>
                <SelectItem key="VIDEO">Video</SelectItem>
                <SelectItem key="PHOTO">Photo</SelectItem>
              </Select>

              <DatePicker
                name="createdDate"
                hideTimeZone
                showMonthAndYearPickers
                defaultValue={now("UTC")}
                className="max-w-[284px]"
                label="File Created Date"
              />

              <Input
                type="file"
                name="file"
                aria-label="File Selector"
                isRequired
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              {file && (
                <Input
                  label={"File Name"}
                  defaultValue={file.name}
                  className="h-fit"
                  endContent={formatFileSize(file.size)}
                />
              )}
              <Button
                isLoading={fileFetcher.state !== "idle"}
                className="max-w-[284px]"
                type="submit"
                color="success"
              >
                Upload File
              </Button>
            </fileFetcher.Form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
