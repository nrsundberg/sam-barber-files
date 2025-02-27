import type { S3Object } from "~/types";

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const S3FileBrowser = ({ files }: { files: S3Object[] }) => {
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">S3 File Browser</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full  border-collapse border border-gray-300 p-1">
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
                Storage Class
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                ETag
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {files.map((item) => {
              return (
                <tr key={item.etag} className="hover:bg-gray-700 text-sm">
                  <td>{item.key}</td>
                  <td className="text-center">{formatBytes(item.size)}</td>
                  <td>{formatDate(item.lastModified)}</td>
                  <td className="text-center">{item.storageClass}</td>
                  <td>
                    <span className="text-xs font-mono">
                      {item.etag.substring(0, 8)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-sm text-gray-500">
        Showing {files.length} items
      </div>
    </div>
  );
};

export default S3FileBrowser;
