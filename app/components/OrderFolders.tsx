import { format } from "date-fns";
import { ChevronLeft, EyeOffIcon, FolderIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSubmit } from "react-router";
import type { FolderWithObjects } from "~/types";
import { formatFileSize, getTotalFolderSize } from "~/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import SbFolderContextMenu from "./SbFolderContextMenu";

export default function ({
  folderList,
  selectedFolder,
}: {
  folderList: FolderWithObjects[];
  selectedFolder: string | undefined;
}) {
  let [folders, setFolders] = useState(folderList);
  let submit = useSubmit();

  const handleDragEnd = (event: { active: any; over: any }) => {
    let { active, over } = event;

    if (active.id !== over.id) {
      setFolders((prevFolders) => {
        let oldIndex = prevFolders.findIndex((f) => f.id === active.id);
        let newIndex = prevFolders.findIndex((f) => f.id === over.id);

        const updatedFolders = arrayMove(prevFolders, oldIndex, newIndex);

        // Send new folder order to Remix action
        submit(
          {
            reorderedFolders: updatedFolders.map((f, i) => ({
              id: f.id,
              position: i,
            })),
          },
          {
            action: "/data/reorder/folder",
            method: "POST",
            navigate: false,
            encType: "application/json",
          }
        );

        return updatedFolders;
      });
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={folders.map((f) => f.id)}
        strategy={verticalListSortingStrategy}
      >
        {folders.map((folder: FolderWithObjects) => (
          <SortableSbAccordionItem
            key={folder.id + folder.name + folder.createdDate.toISOString()}
            folder={folder}
            isSelected={folder.id === selectedFolder}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function SortableSbAccordionItem({
  folder,
  isSelected,
}: {
  folder: FolderWithObjects;
  isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: folder.id });

  let navigate = useNavigate();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onDoubleClick={() => {
        navigate(isSelected ? "./" : folder.id, { preventScrollReset: true });
      }}
      className={`${folder.hidden ? "opacity-60" : ""} ${isSelected ? "border border-red-400 text-red-400" : ""}`}
    >
      <SbFolderContextMenu folder={folder}>
        <FolderRowLayout
          name={folder.name}
          createdDate={format(folder.createdDate, "MM.dd.yyyy hh:mm a")}
          size={formatFileSize(getTotalFolderSize(folder.objects))}
          isHidden={folder.hidden}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </SbFolderContextMenu>
    </div>
  );
}

function FolderRowLayout({
  name,
  createdDate,
  isHidden,
  size,
  dragHandleProps,
}: {
  name: string;
  createdDate: string;
  isHidden: boolean;
  size: string;
  dragHandleProps?: any;
}) {
  return (
    <div className="w-full grid grid-cols-[1.5fr_1fr_.5fr_.5fr] transition p-4 hover:bg-sb-banner hover:text-sb-restless group">
      <div
        {...dragHandleProps}
        className="inline-flex items-center gap-x-2 text-lg font-semibold"
      >
        <ChevronLeft
          className={`transform transition-transform duration-300 hidden`}
        />
        <FolderIcon />
        {name}
      </div>
      <span className="text-gray-400 group-hover:text-sb-restless">
        {createdDate}
      </span>
      <span className="text-gray-400 group-hover:text-sb-restless">{size}</span>
      <div className="grid justify-center">
        <div className="bg-gray-700 px-3 py-1 text-xs rounded w-fit text-gray-400 group-hover:text-sb-restless">
          FOLDER
          {isHidden && <EyeOffIcon className="w-3 h-3" />}
        </div>
      </div>
    </div>
  );
}
