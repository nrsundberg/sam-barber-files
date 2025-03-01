import type { Object } from "@prisma/client";

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
};

export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const getTotalFolderSize = (objects: Object[]): number => {
  return objects.reduce((total, obj) => total + obj.size, 0);
};

/**
 * Converts a string datetime to a UTC Date object for PostgreSQL storage.
 *
 * @param {string} dateTimeString - The input datetime string (ISO 8601 format).
 * @returns {Date} - A UTC Date object.
 */
export function convertToUTCDateTime(dateTimeString: string): Date {
  try {
    // Ensure the input string is valid and remove any unwanted timezone annotations
    const cleanedDateTimeString = dateTimeString.replace(/\[.*?\]/g, ""); // Remove [UTC] if present

    // Convert to a JavaScript Date object
    const date = new Date(cleanedDateTimeString);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }

    return date;
  } catch (error) {
    console.error("Error converting date string to UTC:", error);
    throw new Error("Invalid date format");
  }
}
