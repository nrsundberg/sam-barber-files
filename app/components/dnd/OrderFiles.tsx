import { useEffect, useState } from "react";
import { useRouteLoaderData, useSubmit } from "react-router";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { closestCenter, DndContext } from "@dnd-kit/core";
import type { Object } from "@prisma/client";
import SbContextMenu from "../contextMenu/SbContextMenu";
import ObjectRowLayout from "../accordion/ObjectRowLayout";

export default function ({
  objectList,
  endpoint,
  readyToLoad = true, // Set default to true to ensure content displays
}: {
  objectList: Object[];
  endpoint: string;
  readyToLoad?: boolean;
}) {
  let [objects, setObjects] = useState(objectList);
  let submit = useSubmit();

  // No need for the contentLoaded state since we're defaulting readyToLoad to true

  useEffect(() => setObjects(objectList), [objectList]);

  const handleDragEnd = (event: { active: any; over: any }) => {
    let { active, over } = event;

    if (active.id !== over.id) {
      setObjects((prevObjects) => {
        let oldIndex = prevObjects.findIndex((o) => o.id === active.id);
        let newIndex = prevObjects.findIndex((o) => o.id === over.id);

        const updatedObjects = arrayMove(prevObjects, oldIndex, newIndex);

        // Send new folder order to action
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

  // Always render the content, regardless of readyToLoad
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={objects.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        {objects.map((object: Object, index: number) => (
          <SortableSbObjectAccordionItem
            key={index}
            object={object}
            endpoint={endpoint}
            shouldLoad={readyToLoad} // Pass readyToLoad directly
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function SortableSbObjectAccordionItem({
  object,
  endpoint,
  shouldLoad = true, // Default to true to ensure content displays
}: {
  object: Object;
  endpoint: string;
  shouldLoad?: boolean;
}) {
  let folders = useRouteLoaderData("routes/admin/admin");

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: object.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <SbContextMenu object={object} folders={folders}>
        <ObjectRowLayout
          object={object}
          inAdmin={true}
          isLast={false}
          dragHandleProps={{ ...attributes, ...listeners }}
          endpoint={endpoint}
          shouldLoad={shouldLoad}
        />
      </SbContextMenu>
    </div>
  );
}
