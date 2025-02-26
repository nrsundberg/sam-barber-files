import { Button, DatePicker } from "@heroui/react";
import { parseAbsolute } from "@internationalized/date";
import type { Folder, Object } from "@prisma/client";
import React, { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import type { FolderWithObjects } from "~/types";

// Context Menu Component
const ContextMenu = ({
  x,
  y,
  onClose,
  folder,
}: {
  x: number;
  y: number;
  onClose: () => void;
  folder: FolderWithObjects;
}) => {
  let [isRenaming, setIsRenaming] = useState(false);
  let [newFolderName, setNewFolderName] = useState(folder.name);
  let [isMoving, setIsMoving] = useState(false);
  let [isChangingDate, setIsChangingDate] = useState(false);

  let fetcher = useFetcher();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      className="absolute border border-gray-200 bg-gray-600 shadow-lg rounded-md p-2 z-50"
      style={{ left: x, top: y }}
      ref={menuRef}
    >
      <ul className="w-60">
        {isRenaming ? (
          <li className="p-2">
            <fetcher.Form
              method="POST"
              action={`/data/edit/folder/${folder.id}/rename`}
              className="flex flex-col gap-2"
            >
              <input
                type="text"
                name="name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  color="warning"
                  onPress={() => {
                    setIsRenaming(false);
                    setNewFolderName(folder.name);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="success"
                  size="sm"
                  isLoading={fetcher.state !== "idle"}
                >
                  Save
                </Button>
              </div>
            </fetcher.Form>
          </li>
        ) : (
          <li
            className="p-2 hover:bg-gray-700 cursor-pointer rounded"
            onClick={() => setIsRenaming(true)}
          >
            Rename
          </li>
        )}

        {isChangingDate ? (
          <li className="p-2">
            <fetcher.Form
              method="POST"
              action={`/data/edit/folder/${folder.id}/changeDate`}
              className="flex flex-col gap-2"
            >
              <DatePicker
                name="createdDate"
                hideTimeZone
                showMonthAndYearPickers
                defaultValue={parseAbsolute(
                  folder.createdDate.toISOString(),
                  "UTC"
                )}
                label="Folder Created Date"
              />

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  color="warning"
                  onPress={() => setIsChangingDate(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="sm"
                  isLoading={fetcher.state !== "idle"}
                >
                  Save
                </Button>
              </div>
            </fetcher.Form>
          </li>
        ) : (
          <li
            className="p-2 hover:bg-gray-700 cursor-pointer rounded"
            onClick={() => setIsChangingDate(true)}
          >
            Change date
          </li>
        )}

        <li className="p-2 hover:bg-gray-700 cursor-pointer rounded">
          <fetcher.Form method="POST" action={"/data/edit"}>
            <input type="hidden" name="actionType" value="toggleHidden" />
            <input type="hidden" name="folderId" value={folder.id} />
            <input
              type="hidden"
              name="hidden"
              value={(!folder.hidden).toString()}
            />
            <button type="submit" className="w-full text-left">
              {folder.hidden ? "Unhide" : "Hide"}
            </button>
          </fetcher.Form>
        </li>

        <li className="p-2 hover:bg-gray-700 cursor-pointer rounded">
          {/* // TODO any use in deleting from s3 and video provider? */}
          <fetcher.Form method="POST" action={"/data/edit"}>
            <input type="hidden" name="actionType" value="delete" />
            <input type="hidden" name="folderId" value={folder.id} />
            <button type="submit" className="w-full text-left text-red-600">
              Delete
            </button>
          </fetcher.Form>
        </li>
      </ul>
    </div>
  );
};

// Context Menu Provider that wraps your content
export const ContextMenuProvider = ({
  children,
  folder,
}: {
  folder: FolderWithObjects;
  children: React.ReactNode;
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = (e: any) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div onContextMenu={handleContextMenu}>
      {children}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          folder={folder}
        />
      )}
    </div>
  );
};

// A component that uses the context menu provider
const SbFolderContextMenu = ({
  folder,
  children,
}: {
  folder: FolderWithObjects;
  children: React.ReactNode;
}) => {
  return <ContextMenuProvider folder={folder}>{children}</ContextMenuProvider>;
};

export default SbFolderContextMenu;
