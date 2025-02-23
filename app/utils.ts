import type { Object } from "@prisma/client";

export const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024 / 1024).toFixed(1)}GB`;
  } else if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  } else if (size >= 1024) {
    return `${(size / 1024).toFixed(1)}KB`;
  } else {
    return `${size}B`;
  }
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
