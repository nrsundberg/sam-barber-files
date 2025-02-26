import { useState } from "react";
import { useNavigate, useRouteLoaderData, useSubmit } from "react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { RowLayout } from "./SbAccordionItem";
import type { Object } from "@prisma/client";
import SbContextMenu from "./SbContextMenu";

export default function ({ objectList }: { objectList: Object[] }) {
  let [objects, setObjects] = useState(objectList);
  let submit = useSubmit();

  const handleDragEnd = (event: { active: any; over: any }) => {
    let { active, over } = event;

    if (active.id !== over.id) {
      setObjects((prevObjects) => {
        let oldIndex = prevObjects.findIndex((o) => o.id === active.id);
        let newIndex = prevObjects.findIndex((o) => o.id === over.id);

        const updatedObjects = arrayMove(prevObjects, oldIndex, newIndex);

        // Send new folder order to Remix action
        submit(
          {
            reorderedObjects: updatedObjects.map((o, i) => ({
              id: o.id,
              position: i,
            })),
          },
          {
            action: "/data/reorder/object",
            method: "POST",
            navigate: false,
            encType: "application/json",
          }
        );

        return updatedObjects;
      });
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={objects.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        {objects.map((object: Object, index: number) => (
          <SortableSbObjectAccordionItem key={index} object={object} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function SortableSbObjectAccordionItem({ object }: { object: Object }) {
  let folders = useRouteLoaderData("routes/admin/admin");

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: object.id });

  let navigate = useNavigate();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onDoubleClick={() => {
        navigate(object.id, { preventScrollReset: true });
      }}
      className={`${object.hidden ? "opacity-60" : ""}`}
    >
      <SbContextMenu object={object} folders={folders}>
        <RowLayout
          object={object}
          isLast={false}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </SbContextMenu>
    </div>
  );
}
