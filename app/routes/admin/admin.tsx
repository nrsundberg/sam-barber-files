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
import { FolderPlus, Upload } from "lucide-react";
import type { Route } from "./+types/admin";
import prisma from "~/db.server";
import { ObjectKind } from "@prisma/client";
import { data, Link, Outlet, useFetcher, useOutlet } from "react-router";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { uploadToS3 } from "~/s3.server";
import { convertToUTCDateTime, formatBytes } from "~/utils";
import { now } from "@internationalized/date";
import { dataWithError, dataWithSuccess } from "remix-toast";
import OrderFolders from "~/components/dnd/OrderFolders";
import { getUserAndProtectRoute } from "~/utils.server";

// Don't need SEO or dynamic header for admin route
export function meta() {
  return [{ title: "Admin Panel" }];
}

// This loader should be locked down
// Loader to bring in existing folders
// NOTE: this does not includes nested objects and will want to bring them in
export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUserAndProtectRoute(request);

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
  date: z.string(),
});

const uploadFileSchema = zfd.formData({
  file: z.instanceof(File),
  hide: z.coerce.boolean(),
  folderId: z.string(),
  kind: z.custom<ObjectKind>(),
  createdDate: z.string(),
});

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
            folderId,
          },
        });

        let uploadedS3 = await uploadToS3(file, newObject.id);
        if (uploadedS3) {
          await prisma.object.update({
            where: { id: newObject.id },
            // NOTE for not the sefileKey is the same as Id
            data: { s3fileKey: newObject.id },
          });
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

export default function ({ loaderData, params }: Route.ComponentProps) {
  let fileFetcher = useFetcher({ key: "file-fetcher" });
  let fileRef = useRef<HTMLFormElement>(null);
  let folderFetcher = useFetcher({ key: "folder-create-fetcher" });
  let folderRef = useRef<HTMLFormElement>(null);
  let folders = loaderData;
  // HeroUI is dead for this. Switch components don't pass their value through Form
  let [isFolderHidden, setIsFolderHidden] = useState(false);
  let [isFileHidden, setIsFileHidden] = useState(false);

  let outlet = useOutlet();

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
      <div className="inline-flex gap-2">
        <h1 className="text-3xl font-bold">ADMIN PANEL</h1>
        <Link className="border-1 border-gray-400 p-1" to={"/admin/fileCheck"}>
          Check AWS Links
        </Link>
        <Link
          className="border-1 border-gray-400 p-1"
          to={"/admin/fileBrowser"}
        >
          Show AWS Files
        </Link>
      </div>

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
              <Switch
                name={"hidden"}
                isSelected={isFolderHidden}
                onValueChange={setIsFolderHidden}
                value={isFolderHidden.toString()}
              >
                <p className={"font-bold"}>
                  {isFolderHidden ? "HIDDEN" : "VISIBLE"}
                </p>
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

              <Switch
                name={"hide"}
                isSelected={isFileHidden}
                onValueChange={setIsFileHidden}
                value={isFileHidden.toString()}
              >
                <p className={"font-bold"}>
                  {isFileHidden ? "HIDDEN" : "VISIBLE"}
                </p>
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
                  endContent={formatBytes(file.size)}
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
            <OrderFolders
              folderList={folders}
              selectedFolder={params.folderId}
            />
          )}
        </div>
        <div className={"border-1 border-gray-400 rounded p-2"}>
          <h2 className={"my-1 text-lg font-semibold"}>FILES</h2>
          <Divider />
          {outlet ? <Outlet /> : <p>DOUBLE CLICK FOLDER...</p>}
        </div>
      </div>
    </div>
  );
}
