import type { Route } from "./+types/positioning";
import { getUserAndProtectRouteToAdminOrDeveloper } from "~/utils.server";
import prisma from "~/db.server";
import { dataWithError, dataWithSuccess } from "remix-toast";
import { useState, useEffect } from "react";
import { useSubmit } from "react-router";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { closestCenter, DndContext } from "@dnd-kit/core";
import type { Object } from "@prisma/client";
import { getUser } from "~/domain/utils/global-context";

export function meta() {
  return [{ title: "Positioning - Admin Panel" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  let user = getUser();
  await getUserAndProtectRouteToAdminOrDeveloper(user);

  // Fetch trending and favorites objects
  const [trending, favorites] = await Promise.all([
    prisma.object.findMany({
      where: { isTrending: true },
      orderBy: { trendingPosition: "asc" },
    }),
    prisma.object.findMany({
      where: { isFavorite: true },
      orderBy: { favoritePosition: "asc" },
    }),
  ]);

  return { trending, favorites };
}

export async function action({ request }: Route.ActionArgs) {
  let user = getUser();
  await getUserAndProtectRouteToAdminOrDeveloper(user);

  const formData = await request.json();

  const { type, reorderedObjects } = formData;

  try {
    // Update positions based on type
    if (type === "trending") {
      await Promise.all(
        reorderedObjects.map(
          ({ id, position }: { id: string; position: number }) =>
            prisma.object.update({
              where: { id },
              data: { trendingPosition: position },
            })
        )
      );
    } else if (type === "favorites") {
      await Promise.all(
        reorderedObjects.map(
          ({ id, position }: { id: string; position: number }) =>
            prisma.object.update({
              where: { id },
              data: { favoritePosition: position },
            })
        )
      );
    }

    return {
      message: `${type === "trending" ? "Trending" : "Favorites"} order updated successfully`,
      type: "success",
    };
  } catch (error) {
    return dataWithError(null, {
      message: "Failed to update order",
      type: "error",
    });
  }
}

export default function ({ loaderData }: Route.ComponentProps) {
  const [activeTab, setActiveTab] = useState<"favorites" | "trending">(
    "favorites"
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Positioning Management</h1>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("favorites")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "favorites"
                ? "border-indigo-500 text-indigo-300 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Favorites ({loaderData.favorites.length})
          </button>
          <button
            onClick={() => setActiveTab("trending")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "trending"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Trending ({loaderData.trending.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === "trending" ? (
          <SortableObjectList
            objects={loaderData.trending}
            type="trending"
            emptyMessage="No trending items found"
          />
        ) : (
          <SortableObjectList
            objects={loaderData.favorites}
            type="favorites"
            emptyMessage="No favorite items found"
          />
        )}
      </div>
    </div>
  );
}

function SortableObjectList({
  objects: initialObjects,
  type,
  emptyMessage,
}: {
  objects: Object[];
  type: "trending" | "favorites";
  emptyMessage: string;
}) {
  const [objects, setObjects] = useState(initialObjects);
  const submit = useSubmit();

  useEffect(() => {
    setObjects(initialObjects);
  }, [initialObjects]);

  const handleDragEnd = (event: { active: any; over: any }) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setObjects((prevObjects) => {
        const oldIndex = prevObjects.findIndex((o) => o.id === active.id);
        const newIndex = prevObjects.findIndex((o) => o.id === over.id);

        const updatedObjects = arrayMove(prevObjects, oldIndex, newIndex);

        // Submit new order
        submit(
          {
            type,
            reorderedObjects: updatedObjects.map((o, i) => ({
              id: o.id,
              position: i,
            })),
          },
          {
            method: "POST",
            navigate: false,
            encType: "application/json",
          }
        );

        return updatedObjects;
      });
    }
  };

  if (objects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">{emptyMessage}</div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={objects.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {objects.map((object, index) => (
            <SortableObjectItem key={object.id} object={object} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableObjectItem({
  object,
  index,
}: {
  object: Object;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: object.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </div>

        {/* Position Number */}
        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
          {index + 1}
        </div>

        {/* Object Info */}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{object.fileName}</h3>
        </div>

        {/* Additional Info */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {object.kind && (
            <span className="px-2 py-1 bg-gray-100 rounded">{object.kind}</span>
          )}
        </div>
      </div>
    </div>
  );
}
