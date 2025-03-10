import { format } from "date-fns";
import { ChevronLeft, EyeOffIcon, FolderIcon, Grid, List } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSubmit } from "react-router";
import type { FolderWithObjects } from "~/types";
import { formatBytes, getTotalFolderSize } from "~/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import SbFolderContextMenu from "../contextMenu/SbFolderContextMenu";

export default function ({
  folderList,
  selectedFolder,
}: {
  folderList: FolderWithObjects[];
  selectedFolder: string | undefined;
}) {
  let [folders, setFolders] = useState(folderList);

  useEffect(() => setFolders(folderList), [folderList]);

  let submit = useSubmit();

  const handleDragEnd = (event: { active: any; over: any }) => {
    let { active, over } = event;

    if (active.id !== over.id) {
      setFolders((prevFolders) => {
        let oldIndex = prevFolders.findIndex((f) => f.id === active.id);
        let newIndex = prevFolders.findIndex((f) => f.id === over.id);

        const updatedFolders = arrayMove(prevFolders, oldIndex, newIndex);

        // Send new folder order to action
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
        {folders.map((folder: FolderWithObjects, index: number) => (
          <SortableSbAccordionItem
            key={index}
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
        navigate(isSelected ? "./" : `/admin/${folder.id}`, {
          preventScrollReset: true,
        });
      }}
      className={`${isSelected ? "border border-red-400 text-red-400" : ""}`}
    >
      <SbFolderContextMenu folder={folder}>
        <FolderRowLayout
          name={folder.name}
          createdDate={format(folder.createdDate, "MM.dd.yyyy hh:mm a")}
          size={formatBytes(getTotalFolderSize(folder.objects))}
          isHidden={folder.hidden}
          isGrid={folder.defaultStyle === "GRID"}
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
  isGrid,
}: {
  name: string;
  createdDate: string;
  isHidden: boolean;
  size: string;
  dragHandleProps?: any;
  isGrid: boolean;
}) {
  return (
    <div
      className={`${isHidden ? "opacity-60" : ""} w-full grid grid-cols-[1.5fr_1fr_.5fr_.5fr] transition p-4 hover:bg-sb-banner hover:text-sb-restless group`}
    >
      <div
        {...dragHandleProps}
        className="inline-flex items-center gap-x-2 text-lg font-semibold"
      >
        <ChevronLeft
          className={`transform text-xs md:text-large transition-transform duration-300 hidden`}
        />
        <FolderIcon />
        {name}
      </div>
      <span className="text-gray-400 text-xs md:text-medium group-hover:text-sb-restless">
        {createdDate}
      </span>
      <span className="text-gray-400 text-xs md:text-medium group-hover:text-sb-restless">
        {size}
      </span>
      <div className="grid justify-center">
        <div className="inline-flex gap-2 bg-gray-700 px-1 md:px-3 md:py-1 text-xs rounded w-fit text-gray-400 group-hover:text-sb-restless">
          FOLDER
          {isGrid ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          {isHidden && <EyeOffIcon className="w-3 h-3 self-center" />}
        </div>
      </div>
    </div>
  );
}
