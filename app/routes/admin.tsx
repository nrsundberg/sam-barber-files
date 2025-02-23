import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { Upload, FolderPlus } from "lucide-react";
import type { Route } from "./+types/admin";
import prisma from "~/db.server";
import type { ObjectKind } from "@prisma/client";
import { data, Form, redirect } from "react-router";

// Don't need SEO or dynamic header for admin route
export function meta() {
  return [{ title: "Admin Panel" }];
}

// TODO Add auth to this route and app in general
// This loader should be locked down
// Loader to bring in existing folders
// NOTE: this does not includes nested objects and will want to bring them in
export async function loader({ request }: Route.LoaderArgs) {
  return await prisma.folder.findMany();
}

// TODO Add auth to this route and app in general
// This action should be locked down
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "createFolder") {
    // This should be a schema we can parse off
    const name = formData.get("name")?.toString();

    const folderNumber = parseInt(
      formData.get("folderNumber")?.toString() || "0",
      10
    );

    await prisma.folder.create({
      data: { name: name ?? "", folderNumber },
    });
  }

  if (actionType === "uploadObject") {
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId")?.toString();
    const kind = formData.get("kind") as ObjectKind;

    if (!file || !folderId)
      return data(
        { error: "File and folder selection are required" },
        { status: 400 }
      );

    // Mock S3 Upload (Replace with real S3 logic)
    const s3fileKey = `uploads/${file.name}`;

    await prisma.object.create({
      data: {
        fileName: file.name,
        // TODO this should be in the form we take on create
        // This is not an actual date
        createdDate: new Date(),
        size: BigInt(file.size),
        kind,
        s3fileKey,
        folderId,
      },
    });

    return redirect("/admin");
  }

  return data({ error: "Invalid action" }, { status: 400 });
}

export default function ({ loaderData, actionData }: Route.ComponentProps) {
  let folders = loaderData;

  // File state to take
  // TODO this should be a form that triggers an upload and returns the file key through actionData
  let [file, setFile] = useState<File | null>(null);

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold">Admin Panel</h1>

      {/* Folder Creation Form */}
      <Card className="bg-gray-900 mt-6 p-4">
        <CardBody>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-yellow-400" /> Create New Folder
          </h2>
          <Form method="post" className="mt-4">
            <input type="hidden" name="actionType" value="createFolder" />
            <Input
              name="name"
              label="Folder Name"
              placeholder="Enter folder name"
              className="mb-3"
              required
            />
            <Input
              name="folderNumber"
              type="number"
              label="Folder Number"
              placeholder="Enter folder number"
              className="mb-3"
              required
            />
            <Button type="submit" color="primary">
              Create Folder
            </Button>
          </Form>
        </CardBody>
      </Card>

      {/* Upload Form */}
      <Card className="bg-gray-900 mt-6 p-4">
        <CardBody>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-400" /> Upload File
          </h2>
          {actionData?.error && (
            <p className="text-red-500">{actionData.error}</p>
          )}
          <Form method="post" encType="multipart/form-data" className="mt-4">
            <input type="hidden" name="actionType" value="uploadObject" />

            <Select
              name="folderId"
              label="Select Folder"
              placeholder="Choose a folder"
              className="mb-3"
              required
            >
              {folders.map((folder) => (
                <SelectItem key={folder.id}>{folder.name}</SelectItem>
              ))}
            </Select>

            <Select name="kind" label="File Type" className="mb-3" required>
              <SelectItem key="AUDIO">Audio</SelectItem>
              <SelectItem key="VIDEO">Video</SelectItem>
            </Select>

            <Input
              type="file"
              name="file"
              className="mb-3"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {file && (
              <Textarea
                disabled
                value={`Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`}
                className="mb-3"
              />
            )}

            <Button type="submit" color="success">
              Upload File
            </Button>
          </Form>
        </CardBody>
      </Card>
    </div>
  );
}
