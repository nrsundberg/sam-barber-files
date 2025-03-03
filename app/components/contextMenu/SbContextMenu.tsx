import { Button, DatePicker } from "@heroui/react";
import { parseAbsolute } from "@internationalized/date";
import type { Object } from "@prisma/client";
import React, { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import type { FolderWithObjects } from "~/types";

// Context Menu Component
const ContextMenu = ({
  x,
  y,
  onClose,
  object,
  folders,
}: {
  x: number;
  y: number;
  onClose: () => void;
  object: Object;
  folders: FolderWithObjects[];
}) => {
  let [isRenaming, setIsRenaming] = useState(false);
  let [newFileName, setNewFileName] = useState(object.fileName);
  let [isMoving, setIsMoving] = useState(false);
  let [selectedFolder, setSelectedFolder] = useState(object.folderId);
  let [isChangingDate, setIsChangingDate] = useState(false);
  let [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  let fetcher = useFetcher();
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to ensure menu stays within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // Check if menu extends beyond right edge of screen
      if (x + menuRect.width > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width - 30;
      }

      // Check if menu extends beyond bottom edge of screen
      if (y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - 10;
      }

      // Ensure we don't position off the left or top edge
      adjustedX = Math.max(10, adjustedX);
      adjustedY = Math.max(10, adjustedY);

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  const handleItemClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation(); // Stop event propagation
    callback();
  };

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
      className="absolute border border-gray-200 bg-gray-600 shadow-lg rounded-md p-1 md:p-2 z-50 text-xs md:text-medium"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      ref={menuRef}
    >
      <ul className="w-60">
        {isRenaming ? (
          <li className="p-2">
            <fetcher.Form
              method="POST"
              action={`/data/edit/object/${object.id}/rename`}
              className="flex flex-col gap-2"
              onSubmit={onClose}
            >
              <input
                type="text"
                name="fileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  color="warning"
                  onPress={() => {
                    setIsRenaming(false);
                    setNewFileName(object.fileName);
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
            onClick={(e) => handleItemClick(e, () => setIsRenaming(true))}
          >
            Rename
          </li>
        )}

        {isMoving ? (
          <li className="p-2">
            <fetcher.Form
              method="POST"
              action={`/data/edit/object/${object.id}/move`}
              className="flex flex-col gap-2"
              onSubmit={onClose}
            >
              <select
                name="folderId"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  color="warning"
                  onPress={() => setIsMoving(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="sm"
                  isLoading={fetcher.state !== "idle"}
                >
                  Move
                </Button>
              </div>
            </fetcher.Form>
          </li>
        ) : (
          <li
            className="p-2 hover:bg-gray-700 cursor-pointer rounded"
            onClick={(e) => handleItemClick(e, () => setIsMoving(true))}
          >
            Move to folder
          </li>
        )}

        {isChangingDate ? (
          <li className="p-2">
            <fetcher.Form
              method="POST"
              action={`/data/edit/object/${object.id}/changeDate`}
              className="flex flex-col gap-2"
              onSubmit={onClose}
            >
              <DatePicker
                name="createdDate"
                hideTimeZone
                showMonthAndYearPickers
                defaultValue={parseAbsolute(
                  object.createdDate.toISOString(),
                  "UTC"
                )}
                label="File Created Date"
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
            onClick={(e) => handleItemClick(e, () => setIsChangingDate(true))}
          >
            Change date
          </li>
        )}

        <li className="p-2 hover:bg-gray-700 cursor-pointer rounded">
          <fetcher.Form
            method="POST"
            action={`/data/edit/object/${object.id}/toggleHidden`}
            onSubmit={onClose}
          >
            <input
              type="hidden"
              name="hidden"
              value={(!object.hidden).toString()}
            />
            <button type="submit" className="w-full text-left">
              {object.hidden ? "Unhide" : "Hide"}
            </button>
          </fetcher.Form>
        </li>

        <li className="p-2 hover:bg-gray-700 cursor-pointer rounded">
          {/* // TODO any use in deleting from s3 and video provider? */}
          <fetcher.Form
            method="POST"
            action={`/data/edit/object/${object.id}/delete`}
            onSubmit={onClose}
          >
            <input type="hidden" name="actionType" value="delete" />
            <input type="hidden" name="objectId" value={object.id} />
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
  object,
  folders,
}: {
  object: Object;
  folders: FolderWithObjects[];
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
          object={object}
          folders={folders}
        />
      )}
    </div>
  );
};

// A component that uses the context menu provider
const SbContextMenu = ({
  object,
  folders,
  children,
}: {
  object: Object;
  folders: FolderWithObjects[];
  children: React.ReactNode;
}) => {
  return (
    <ContextMenuProvider
      key={`context-menu-${object.id}`}
      object={object}
      folders={folders}
    >
      {children}
    </ContextMenuProvider>
  );
};

export default SbContextMenu;
