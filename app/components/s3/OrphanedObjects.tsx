import { useState, useMemo } from "react";
import type { Object as DbObject } from "@prisma/client";
import type { S3Object } from "~/types";
import { formatBytes, formatDate } from "~/utils";
import { Form, useActionData, useSubmit } from "react-router";

interface OrphanedDbObjectsProps {
  dbObjects: DbObject[];
  s3Files: S3Object[];
  folders: { id: string; name: string }[];
}

const OrphanedDbObjects = ({
  dbObjects,
  s3Files,
  folders,
}: OrphanedDbObjectsProps) => {
  const [selectedObject, setSelectedObject] = useState<DbObject | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "MAIN" | "POSTER">(
    "ALL"
  );

  const actionData = useActionData();
  const submit = useSubmit();

  // Map of folder IDs to names for easy lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((folder) => map.set(folder.id, folder.name));
    return map;
  }, [folders]);

  // Get all S3 keys for quick lookup
  const s3KeysSet = useMemo(() => {
    return new Set(s3Files.map((file) => file.key));
  }, [s3Files]);

  // Find orphaned objects - those with s3fileKey or posterKey that doesn't exist in S3
  const orphanedObjects = useMemo(() => {
    return dbObjects.filter((obj) => {
      const mainFileOrphaned = !s3KeysSet.has(obj.s3fileKey);
      const posterOrphaned = obj.posterKey
        ? !s3KeysSet.has(obj.posterKey)
        : false;

      if (filterType === "MAIN") return mainFileOrphaned;
      if (filterType === "POSTER") return posterOrphaned;
      return mainFileOrphaned || posterOrphaned;
    });
  }, [dbObjects, s3KeysSet, filterType]);

  // Apply search filter
  const filteredObjects = useMemo(() => {
    if (!searchTerm) return orphanedObjects;

    return orphanedObjects.filter(
      (obj) =>
        obj.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obj.s3fileKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (obj.posterKey &&
          obj.posterKey.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orphanedObjects, searchTerm]);

  // Check what type of orphaned link we have
  const getOrphanType = (obj: DbObject) => {
    const mainFileOrphaned = !s3KeysSet.has(obj.s3fileKey);
    const posterOrphaned = obj.posterKey
      ? !s3KeysSet.has(obj.posterKey)
      : false;

    if (mainFileOrphaned && posterOrphaned) return "both";
    if (mainFileOrphaned) return "main";
    if (posterOrphaned) return "poster";
    return "none";
  };

  return (
    <div className="w-full mx-auto p-4 flex flex-col lg:grid lg:grid-cols-2 lg:gap-4">
      <div>
        <h1 className="text-2xl font-bold mb-6">Orphaned Database Objects</h1>
        <p className="mb-4 text-gray-600">
          This view shows database objects that reference S3 files which no
          longer exist.
        </p>

        {/* Search and filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search objects..."
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as "ALL" | "MAIN" | "POSTER")
              }
              className="p-2 border rounded"
            >
              <option value="ALL">All orphaned objects</option>
              <option value="MAIN">Main file orphaned</option>
              <option value="POSTER">Poster file orphaned</option>
            </select>
          </div>
        </div>

        {/* Object browser */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-300">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Folder
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Issue
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredObjects.length > 0 ? (
                filteredObjects.map((obj) => {
                  const orphanType = getOrphanType(obj);
                  return (
                    <tr
                      key={obj.id}
                      className={`hover:bg-gray-400 text-sm ${selectedObject?.id === obj.id ? "bg-blue-700" : ""}`}
                      onClick={() => setSelectedObject(obj)}
                    >
                      <td className="py-2 px-4">{obj.fileName}</td>
                      <td className="py-2 px-4">{obj.kind}</td>
                      <td className="py-2 px-4">
                        {folderMap.get(obj.folderId) || "Unknown"}
                      </td>
                      <td className="py-2 px-4">
                        {orphanType === "both" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">
                            Both Files Missing
                          </span>
                        )}
                        {orphanType === "main" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                            Main File Missing
                          </span>
                        )}
                        {orphanType === "poster" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                            Poster File Missing
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <button
                          type="button"
                          className="text-xs bg-blue-500 md:hover:bg-blue-600 text-white font-bold py-1 px-2 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedObject(obj);
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 px-4 text-center text-gray-500"
                  >
                    No orphaned objects found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredObjects.length} of {orphanedObjects.length} orphaned
          objects
        </div>
      </div>

      <div>
        {/* Selected object details and actions */}
        {selectedObject && (
          <div className="border rounded-md p-4 mb-6 bg-gray-700">
            <h2 className="text-lg font-semibold mb-2">Selected Object</h2>
            <p className="mb-2">
              <strong>ID:</strong> {selectedObject.id}
            </p>
            <p className="mb-2">
              <strong>File Name:</strong> {selectedObject.fileName}
            </p>
            <p className="mb-2">
              <strong>Type:</strong> {selectedObject.kind}
            </p>
            <p className="mb-2">
              <strong>Size:</strong> {formatBytes(selectedObject.size)}
            </p>
            <p className="mb-2">
              <strong>Created:</strong> {formatDate(selectedObject.createdDate)}
            </p>
            <p className="mb-2">
              <strong>Folder:</strong>{" "}
              {folderMap.get(selectedObject.folderId) || "Unknown"}
            </p>
            <p className="mb-2 text-yellow-300">
              <strong>S3 File Key:</strong> {selectedObject.s3fileKey}
              {!s3KeysSet.has(selectedObject.s3fileKey) &&
                " (File not found in S3)"}
            </p>
            {selectedObject.posterKey && (
              <p className="mb-4 text-yellow-300">
                <strong>Poster Key:</strong> {selectedObject.posterKey}
                {!s3KeysSet.has(selectedObject.posterKey) &&
                  " (File not found in S3)"}
              </p>
            )}

            <div className="flex flex-col gap-4 mt-6">
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Fix Object</h3>
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
                      defaultValue={selectedObject.fileName}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Link to existing S3 file
                    </label>
                    <select
                      name="newS3fileKey"
                      className="w-full p-2 border rounded"
                    >
                      <option value="">
                        -- Select a replacement S3 file --
                      </option>
                      {s3Files.map((file) => (
                        <option key={file.etag} value={file.key}>
                          {file.key} ({formatBytes(file.size)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedObject.posterKey &&
                    !s3KeysSet.has(selectedObject.posterKey) && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Link to existing poster image
                        </label>
                        <select
                          name="newPosterKey"
                          className="w-full p-2 border rounded"
                        >
                          <option value="">
                            -- Select a replacement poster --
                          </option>
                          <option value="remove">
                            -- Remove poster reference --
                          </option>
                          {s3Files.map((file) => (
                            <option key={file.etag} value={file.key}>
                              {file.key} ({formatBytes(file.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                  <input
                    type="hidden"
                    name="objectId"
                    value={selectedObject.id}
                  />
                  <input
                    type="hidden"
                    name="action"
                    value="fixOrphanedObject"
                  />

                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-green-500 md:hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                    >
                      Fix References
                    </button>

                    <button
                      type="submit"
                      name="action"
                      value="deleteObject"
                      className="bg-red-500 md:hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                      onClick={(e) => {
                        if (
                          !confirm(
                            "Are you sure you want to delete this object?"
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                    >
                      Delete Object
                    </button>
                  </div>
                </Form>
              </div>
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

export default OrphanedDbObjects;
