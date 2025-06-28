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
import { useMediaCache } from "~/contexts/MediaCacheContext";

export default function ({
  objectList,
  endpoint,
  readyToLoad = true,
}: {
  objectList: Object[];
  endpoint: string;
  readyToLoad?: boolean;
}) {
  let [objects, setObjects] = useState(objectList);
  let submit = useSubmit();
  const mediaCache = useMediaCache();

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

  // Always render the content
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
            shouldLoad={readyToLoad}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function SortableSbObjectAccordionItem({
  object,
  endpoint,
  shouldLoad = true,
}: {
  object: Object;
  endpoint: string;
  shouldLoad?: boolean;
}) {
  let folders = useRouteLoaderData("routes/admin/admin");
  const mediaCache = useMediaCache();

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: object.id });

  // Handle error callback - simplified since global cache handles retries
  const handleError = () => {
    // The error is already tracked in the global cache by the Thumbnail component
    // No additional action needed here as the MediaCache handles retry logic
  };

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
          onError={handleError}
        />
      </SbContextMenu>
    </div>
  );
}
