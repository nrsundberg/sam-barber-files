import { useState, useEffect, useMemo } from "react";
import type { S3Object } from "~/types";
import type { Object as DbObject, ObjectKind } from "@prisma/client";
import { Form, useActionData, useSubmit } from "react-router";
import { formatBytes, formatDate } from "~/utils";

interface S3AssetManagerProps {
  files: S3Object[];
  dbObjects: DbObject[];
  folders: { id: string; name: string }[];
}

const S3AssetManager = ({ files, dbObjects, folders }: S3AssetManagerProps) => {
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [selectedObjectKind, setSelectedObjectKind] =
    useState<ObjectKind>("PHOTO");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyUnlinked, setShowOnlyUnlinked] = useState(false);

  const actionData = useActionData();
  const submit = useSubmit();

  // Reset form when a new file is selected
  useEffect(() => {
    if (selectedFile) {
      const linkedObject = dbObjects.find(
        (obj) => obj.s3fileKey === selectedFile.key
      );
      if (linkedObject) {
        setSelectedFolderId(linkedObject.folderId);
        setSelectedObjectKind(linkedObject.kind);
      } else {
        setSelectedFolderId("");
        setSelectedObjectKind("PHOTO");
      }
    }
  }, [selectedFile, dbObjects]);

  // Filter files based on search term and linked status
  const filteredFiles = files.filter((file) => {
    // Apply search filter
    const matchesSearch = file.key
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // Apply linked status filter if needed
    if (showOnlyUnlinked) {
      const isLinked = dbObjects.some(
        (obj) => obj.s3fileKey === file.key || obj.posterKey === file.key
      );
      return matchesSearch && !isLinked;
    }

    return matchesSearch;
  });

  // Check if a file is already linked to a database object
  const getFileStatus = (fileKey: string) => {
    const linkedAsMain = dbObjects.find((obj) => obj.s3fileKey === fileKey);
    const linkedAsPoster = dbObjects.find((obj) => obj.posterKey === fileKey);

    if (linkedAsMain)
      return { linked: true, type: "main", object: linkedAsMain };
    if (linkedAsPoster)
      return { linked: true, type: "poster", object: linkedAsPoster };
    return { linked: false };
  };

  let photoObjects = useMemo(
    () => dbObjects.filter((obj) => obj.kind === "PHOTO"),
    [dbObjects]
  );

  return (
    <div className="w-full mx-auto p-4 flex flex-col lg:grid lg:grid-cols-2 lg:gap-4">
      <div>
        <h1 className="text-2xl font-bold mb-6">S3 Asset Manager</h1>

        {/* Search and filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search files..."
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="unlinked-only"
              checked={showOnlyUnlinked}
              onChange={() => setShowOnlyUnlinked(!showOnlyUnlinked)}
              className="mr-2"
            />
            <label htmlFor="unlinked-only">Show only unlinked files</label>
          </div>
        </div>

        {/* File browser */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-300">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Size
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Last Modified
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFiles.map((item) => {
                const fileStatus = getFileStatus(item.key);
                return (
                  <tr
                    key={item.etag}
                    className={`hover:bg-gray-400 text-sm ${selectedFile?.key === item.key ? "bg-blue-700" : ""}`}
                    onClick={() => setSelectedFile(item)}
                  >
                    <td className="py-2 px-4">{item.key}</td>
                    <td className="py-2 px-4 text-center">
                      {formatBytes(item.size)}
                    </td>
                    <td className="py-2 px-4">
                      {formatDate(item.lastModified)}
                    </td>
                    <td className="py-2 px-4">
                      {fileStatus.linked ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800">
                          {fileStatus.type === "main"
                            ? "Main File"
                            : "Poster Image"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Unlinked
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <button
                        type="button"
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(item);
                        }}
                      >
                        {fileStatus.linked ? "Edit" : "Select"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredFiles.length} of {files.length} items
        </div>
      </div>

      <div>
        {/* Selected file details and actions */}
        {selectedFile && (
          <div className="border rounded-md p-4 mb-6 bg-gray-700">
            <h2 className="text-lg font-semibold mb-2">Selected File</h2>
            <p className="mb-2">
              <strong>Key:</strong> {selectedFile.key}
            </p>
            <p className="mb-2">
              <strong>Size:</strong> {formatBytes(selectedFile.size)}
            </p>
            <p className="mb-4">
              <strong>Last Modified:</strong>{" "}
              {formatDate(selectedFile.lastModified)}
            </p>

            <div className="flex flex-col gap-4">
              {/* Object form (Create or Modify) */}
              <div className="border-t pt-4">
                {(() => {
                  const fileStatus = getFileStatus(selectedFile.key);
                  const linkedObject =
                    fileStatus.linked && fileStatus.type === "main"
                      ? fileStatus.object
                      : null;

                  return (
                    <>
                      <h3 className="font-medium mb-2">
                        {linkedObject ? "Modify Object" : "Create New Object"}
                      </h3>
                      <Form
                        method="POST"
                        encType="multipart/form-data"
                        className="space-y-3"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            File Name
                          </label>
                          <input
                            type="text"
                            name="fileName"
                            defaultValue={
                              linkedObject?.fileName ||
                              selectedFile.key.split("/").pop() ||
                              ""
                            }
                            className="w-full p-2 border rounded"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Folder
                          </label>
                          <select
                            name="folderId"
                            value={selectedFolderId}
                            onChange={(e) =>
                              setSelectedFolderId(e.target.value)
                            }
                            className="w-full p-2 border rounded"
                          >
                            <option value="">-- Select a Folder --</option>
                            {folders.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Type
                          </label>
                          <select
                            name="kind"
                            value={selectedObjectKind}
                            onChange={(e) =>
                              setSelectedObjectKind(
                                e.target.value as ObjectKind
                              )
                            }
                            className="w-full p-2 border rounded"
                            required
                          >
                            <option value="PHOTO">Photo</option>
                            <option value="VIDEO">Video</option>
                            <option value="AUDIO">Audio</option>
                          </select>
                        </div>

                        {linkedObject && (
                          <input
                            type="hidden"
                            name="objectId"
                            value={linkedObject.id}
                          />
                        )}
                        <input
                          type="hidden"
                          name="s3fileKey"
                          value={selectedFile.key}
                        />
                        <input
                          type="hidden"
                          name="size"
                          value={selectedFile.size}
                        />
                        <input
                          type="hidden"
                          name="action"
                          value={linkedObject ? "modifyObject" : "createObject"}
                        />

                        <button
                          type="submit"
                          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                          disabled={!selectedFolderId}
                        >
                          {linkedObject ? "Update Object" : "Create Object"}
                        </button>

                        {linkedObject && (
                          <div className="text-xs text-yellow-300 mt-1">
                            This file is already linked to an object in the
                            database.
                          </div>
                        )}
                      </Form>
                    </>
                  );
                })()}
              </div>

              {/* Poster image section */}
              {(selectedObjectKind === "VIDEO" ||
                selectedObjectKind === "AUDIO") && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Set as Poster Image</h3>

                  {/* Filter objects that can have a poster (audio/video) */}
                  {photoObjects.length > 0 ? (
                    <>
                      <p className="text-sm mb-2">
                        You can use this file as a poster image for existing
                        video or audio objects.
                      </p>

                      <Form method="POST" encType="multipart/form-data">
                        <select
                          name="posterId"
                          className="w-full p-2 border rounded mb-2"
                          required
                          defaultValue={
                            dbObjects.find(
                              (it) => it.posterKey === selectedFile.key
                            )?.id ?? ""
                          }
                        >
                          <option value="">-- Select Object --</option>
                          {photoObjects.map((obj) => (
                            <option key={obj.id} value={obj.id}>
                              {obj.fileName} ({obj.kind.toLowerCase()})
                              {obj.posterKey === selectedFile.key
                                ? " (Current poster)"
                                : ""}
                            </option>
                          ))}
                        </select>

                        <input
                          type="hidden"
                          name="s3Key"
                          value={selectedFile.key}
                        />
                        <input type="hidden" name="action" value="setPoster" />

                        <button
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                        >
                          Set as Poster
                        </button>
                      </Form>
                    </>
                  ) : (
                    <p className="text-sm">
                      No audio or video objects available to set a poster for.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status messages */}
        {actionData?.success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {actionData.message}
          </div>
        )}

        {actionData?.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {actionData.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default S3AssetManager;
