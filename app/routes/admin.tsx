import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  DatePicker,
  Divider,
  Input,
  Select,
  SelectItem,
  Switch,
} from "@heroui/react";
import { ChevronLeft, FolderIcon, FolderPlus, Upload } from "lucide-react";
import type { Route } from "./+types/admin";
import prisma from "~/db.server";
import { ObjectKind, type Folder } from "@prisma/client";
import { data, Outlet, useFetcher, useNavigate, useOutlet } from "react-router";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { getPresignedDownloadUrl, uploadToS3 } from "~/s3.server";
import {
  convertToUTCDateTime,
  formatFileSize,
  getTotalFolderSize,
} from "~/utils";
import { now } from "@internationalized/date";
import { accountId, client } from "~/client.server";
import { getKindeSession } from "@kinde-oss/kinde-remix-sdk";
import { dataWithError, dataWithSuccess, redirectWithError } from "remix-toast";
import { format } from "date-fns";
import type { FolderWithObjects } from "~/types";
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
  return prisma.folder.findMany({
    orderBy: { folderPosition: "asc" },
    include: {
      objects: { orderBy: { filePosition: "asc" } },
    },
  });
}

const folderCreateSchema = zfd.formData({
  name: z.string(),
  hidden: z.coerce.boolean(),
  // NOT NEEDED ATM
  // folderNumber: z.coerce.number(),
  date: z.string(),
});

const uploadFileSchema = zfd.formData({
  file: z.instanceof(File),
  hide: z.coerce.boolean(),
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
      let { name, hidden, date } = folderCreateSchema.parse(formData);
      let numberFolders = await prisma.folder.count();
      await prisma.folder.create({
        data: {
          name: name ?? "",
          folderPosition: numberFolders,
          hidden,
          createdDate: convertToUTCDateTime(date).toISOString(),
        },
      });
      // TODO this can be the data to update client
      return dataWithSuccess({ ok: true }, "Created Folder");

    // Upload file -- this could be multiple files?
    case "PATCH":
      try {
        let { file, folderId, kind, hide, createdDate } =
          uploadFileSchema.parse(formData);
        if (!file || !folderId) {
          return dataWithError(
            { error: "File and folder selection are required" },
            "File and folder are required"
          );
        }

        let numFiles = await prisma.object.count({
          where: { folderId: folderId },
        });

        let newObject = await prisma.object.create({
          data: {
            fileName: file.name,
            createdDate: convertToUTCDateTime(createdDate).toISOString(),
            size: file.size,
            hidden: hide,
            filePosition: numFiles,
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
      } catch (e) {
        console.error(`Could not upload file with error: ${e}`);
        return data({ error: "Could not load file" }, { status: 400 });
      }
  }
  return data({ error: "Invalid action" }, { status: 400 });
}

export default function ({ loaderData }: Route.ComponentProps) {
  let folders = loaderData;
  let fileFetcher = useFetcher({ key: "file-fetcher" });
  let fileRef = useRef<HTMLFormElement>(null);
  let folderFetcher = useFetcher({ key: "folder-fetcher" });
  let folderRef = useRef<HTMLFormElement>(null);

  let outlet = useOutlet();
  let navigate = useNavigate();

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
      <h1 className="text-3xl font-bold">ADMIN PANEL</h1>

      <Divider className={"h-1"} />
      <h2 className={"my-3 text-xl font-semibold"}>UPLOAD & CREATE</h2>
      <div className="flex flex-col md:grid md:grid-cols-2 md:gap-2">
        {/* Folder Creation Form */}
        <Card className="bg-gray-600 p-4">
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
              <Switch name={"hidden"}>
                <p className={"font-bold"}>{"HIDDEN"}</p>
              </Switch>
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
        <Card className="bg-gray-600 p-4">
          <CardBody>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-400" /> Upload File
            </h2>
            <fileFetcher.Form
              ref={fileRef}
              method="PATCH"
              encType="multipart/form-data"
              className="flex flex-col mt-4 gap-3"
            >
              <Select
                name="folderId"
                placeholder="Choose a folder"
                className="max-w-[400px]"
                aria-label="Folder Selector"
                isRequired
              >
                {folders.map((folder) => (
                  <SelectItem key={folder.id} textValue={folder.name}>
                    <div className="w-full flex justify-between">
                      <p>
                        {folder.name}: {folder.folderPosition}
                      </p>
                      <p># Objects: {folder.objects.length}</p>
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

              <Switch name={"hide"}>
                <p className={"font-bold"}>{"HIDDEN"}</p>
              </Switch>

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

      <Divider className={"mt-2 h-1"} />
      <h2 className={"my-3 text-xl font-semibold"}>ORDER</h2>
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-5">
        <div className={"border-1 border-gray-400 rounded p-2"}>
          <h2 className={"my-1 text-lg font-semibold"}>FOLDERS</h2>
          <Divider />
          {folders.length === 0 ? (
            <p>NO FOLDERS...</p>
          ) : (
            folders.map((folder: FolderWithObjects) => (
              <div
                // ref={(el) => passRef(el, index)}
                className="w-full grid grid-cols-[1.5fr_1fr_.5fr_.5fr] transition p-4 hover:bg-sb-banner hover:text-sb-restless group"
                onClick={() =>
                  navigate(folder.id, { preventScrollReset: true })
                }
              >
                <div className="inline-flex items-center gap-x-2 text-lg font-semibold">
                  <ChevronLeft
                    className={`transform transition-transform duration-300 hidden`}
                  />
                  <FolderIcon />
                  {folder.name}
                </div>
                <span className="text-gray-400 group-hover:text-sb-restless">
                  {format(new Date(folder.createdDate), "MM.dd.yyyy hh:mm a")}
                </span>
                <span className="text-gray-400 group-hover:text-sb-restless">
                  {formatFileSize(getTotalFolderSize(folder.objects))}
                </span>
                <div className="grid justify-center">
                  <div className="bg-gray-700 px-3 py-1 text-xs rounded w-fit text-gray-400 group-hover:text-sb-restless">
                    FOLDER
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className={"border-1 border-gray-400 rounded p-2"}>
          <h2 className={"my-1 text-lg font-semibold"}>FILES</h2>
          <Divider />
          {outlet ? <Outlet /> : <p>SELECT FOLDER...</p>}
        </div>
      </div>
    </div>
  );
}
