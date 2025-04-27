import React, { createContext, useContext, useState, useEffect } from "react";
import { useFetcher } from "react-router";

interface ShareContextType {
  convertingObjects: Set<string>;
  videoUrlMap: Map<string, string>;
  sharingToTikTok: Set<string>;
  shareStatus: Map<string, "success" | "error">;
  convertAudioToVideo: (objectId: string, s3fileKey: string) => void;
  shareToTikTok: (objectId: string, videoUrl: string, caption: string) => void;
  getConversionStatus: (
    objectId: string
  ) => "idle" | "converting" | "ready" | "error";
  getShareStatus: (
    objectId: string
  ) => "idle" | "sharing" | "success" | "error";
  getVideoUrl: (objectId: string) => string | null;
}

const ShareContext = createContext<ShareContextType | null>(null);

export const useShare = () => {
  const context = useContext(ShareContext);
  if (!context) {
    throw new Error("useShare must be used within a ShareProvider");
  }
  return context;
};

export const ShareProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [convertingObjects, setConvertingObjects] = useState<Set<string>>(
    new Set()
  );
  const [videoUrlMap, setVideoUrlMap] = useState<Map<string, string>>(
    new Map()
  );
  const [sharingToTikTok, setSharingToTikTok] = useState<Set<string>>(
    new Set()
  );
  const [shareStatus, setShareStatus] = useState<
    Map<string, "success" | "error">
  >(new Map());

  const convertFetcher = useFetcher();
  const shareFetcher = useFetcher();

  // Handle conversion response
  useEffect(() => {
    if (convertFetcher.data && convertFetcher.state === "idle") {
      const { success, error, videoObject, videoUrl } = convertFetcher.data;

      if (success && videoObject) {
        setConvertingObjects((prev) => {
          const updated = new Set(prev);
          updated.delete(videoObject.originalId);
          return updated;
        });

        setVideoUrlMap((prev) => {
          const updated = new Map(prev);
          updated.set(videoObject.originalId, videoUrl);
          return updated;
        });
      } else if (error) {
        // Handle error by removing object from converting set
        convertFetcher.data.objectId &&
          setConvertingObjects((prev) => {
            const updated = new Set(prev);
            updated.delete(convertFetcher.data.objectId);
            return updated;
          });
      }
    }
  }, [convertFetcher.data, convertFetcher.state]);

  // Handle share response
  useEffect(() => {
    if (shareFetcher.data && shareFetcher.state === "idle") {
      const { success, error, objectId } = shareFetcher.data;

      if (objectId) {
        setSharingToTikTok((prev) => {
          const updated = new Set(prev);
          updated.delete(objectId);
          return updated;
        });

        setShareStatus((prev) => {
          const updated = new Map(prev);
          updated.set(objectId, success ? "success" : "error");
          return updated;
        });
      }
    }
  }, [shareFetcher.data, shareFetcher.state]);

  const convertAudioToVideo = (objectId: string, s3fileKey: string) => {
    setConvertingObjects((prev) => {
      const updated = new Set(prev);
      updated.add(objectId);
      return updated;
    });

    const formData = new FormData();
    formData.append("objectId", objectId);
    formData.append("s3fileKey", s3fileKey);
    formData.append("action", "convert-to-video");

    convertFetcher.submit(formData, {
      method: "POST",
      action: "/api/audio-to-video",
      encType: "multipart/form-data",
    });
  };

  const shareToTikTok = (
    objectId: string,
    videoUrl: string,
    caption: string
  ) => {
    setSharingToTikTok((prev) => {
      const updated = new Set(prev);
      updated.add(objectId);
      return updated;
    });

    const formData = new FormData();
    formData.append("objectId", objectId);
    formData.append("videoUrl", videoUrl);
    formData.append("caption", caption);
    formData.append("action", "share-to-tiktok");

    shareFetcher.submit(formData, {
      method: "POST",
      action: "/api/share-to-tiktok",
      encType: "multipart/form-data",
    });
  };

  const getConversionStatus = (
    objectId: string
  ): "idle" | "converting" | "ready" | "error" => {
    if (convertingObjects.has(objectId)) {
      return "converting";
    } else if (videoUrlMap.has(objectId)) {
      return "ready";
    } else {
      return "idle";
    }
  };

  const getShareStatus = (
    objectId: string
  ): "idle" | "sharing" | "success" | "error" => {
    if (sharingToTikTok.has(objectId)) {
      return "sharing";
    } else if (shareStatus.has(objectId)) {
      return shareStatus.get(objectId) as "success" | "error";
    } else {
      return "idle";
    }
  };

  const getVideoUrl = (objectId: string): string | null => {
    return videoUrlMap.get(objectId) || null;
  };

  const value = {
    convertingObjects,
    videoUrlMap,
    sharingToTikTok,
    shareStatus,
    convertAudioToVideo,
    shareToTikTok,
    getConversionStatus,
    getShareStatus,
    getVideoUrl,
  };

  return (
    <ShareContext.Provider value={value}>{children}</ShareContext.Provider>
  );
};
