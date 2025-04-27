import { Music, Share, Check, AlertCircle, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import type { ObjectWithTikTok } from "~/types";

export interface AudioToVideoProps {
  object: ObjectWithTikTok;
  endpoint: string;
}

export default function AudioToVideoConverter({
  object,
  endpoint,
}: AudioToVideoProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [tikTokAuthStatus, setTikTokAuthStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");

  const convertFetcher = useFetcher();
  const shareFetcher = useFetcher();
  const authFetcher = useFetcher();
  const navigate = useNavigate();

  // Fetch TikTok auth status on mount
  useEffect(() => {
    authFetcher.load("/api/check-tiktok-auth");
  }, []);

  // Update auth status when data is available
  useEffect(() => {
    if (authFetcher.data) {
      setTikTokAuthStatus(
        authFetcher.data.isAuthenticated ? "authenticated" : "unauthenticated"
      );
    }
  }, [authFetcher.data]);

  // Function to check if the file is an audio file
  const isAudioFile = () => {
    return (
      object.kind === "AUDIO" ||
      object.fileName.toLowerCase().endsWith(".mp3") ||
      object.fileName.toLowerCase().endsWith(".wav") ||
      object.fileName.toLowerCase().endsWith(".ogg") ||
      object.fileName.toLowerCase().endsWith(".m4a")
    );
  };

  // Get the conversion status based on the TikTokVideo relation
  const conversionStatus = object.tikTokVideo
    ? object.tikTokVideo.status
    : convertFetcher.state === "submitting"
      ? "PROCESSING"
      : "QUEUED";

  // Get the share status
  const shareStatus = isSharing
    ? "sharing"
    : shareSuccess
      ? "success"
      : shareError
        ? "error"
        : "idle";

  // Handle convert button click
  const handleConvert = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent onClick handlers from firing

    if (!isAudioFile() || convertFetcher.state === "submitting") {
      return;
    }

    const formData = new FormData();
    formData.append("objectId", object.id);
    formData.append("s3fileKey", object.s3fileKey);
    formData.append("action", "convert-to-video");

    convertFetcher.submit(formData, {
      method: "POST",
      action: "/api/audio-to-video",
      encType: "multipart/form-data",
    });
  };

  // Handle share button click
  const handleShareToTikTok = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent onClick handlers from firing

    // If not authenticated, redirect to TikTok auth
    if (tikTokAuthStatus !== "authenticated") {
      navigate("/tiktok-auth/login");
      return;
    }

    if (conversionStatus !== "COMPLETED" || !object.tikTokVideo || isSharing) {
      return;
    }

    setIsSharing(true);
    setShareSuccess(false);
    setShareError(false);

    // Get a pre-signed URL for the converted video
    const getVideoUrl = async () => {
      try {
        const response = await fetch(
          `/api/get-presigned-url?key=${encodeURIComponent(object.tikTokVideo?.fileKey ?? "")}`
        );
        const data = await response.json();
        return data.url;
      } catch (error) {
        console.error("Error getting presigned URL:", error);
        setIsSharing(false);
        setShareError(true);
        return null;
      }
    };

    // Share to TikTok after getting the URL
    getVideoUrl().then((videoUrl) => {
      if (!videoUrl) return;

      const formData = new FormData();
      formData.append("videoUrl", videoUrl);
      formData.append("caption", object.fileName);
      formData.append("action", "share-to-tiktok");

      shareFetcher
        .submit(formData, {
          method: "POST",
          action: "/api/share-to-tiktok",
          encType: "multipart/form-data",
        })
        .then(() => {
          setIsSharing(false);
          setShareSuccess(true);
        })
        .catch(() => {
          setIsSharing(false);
          setShareError(true);
        });
    });
  };

  // Only render this component for audio files
  if (!isAudioFile()) {
    return null;
  }

  return (
    <div
      className="flex gap-1 items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Convert button */}
      {conversionStatus !== "COMPLETED" && (
        <button
          className={`inline-flex items-center gap-1 bg-gray-700 px-2 py-1 text-xs rounded h-fit w-fit 
                  ${conversionStatus === "PROCESSING" ? "text-gray-400" : "text-sb-restless"} 
                  transition-colors duration-300 hover:bg-gray-600`}
          onClick={handleConvert}
          disabled={conversionStatus === "PROCESSING"}
          title="Convert to video for TikTok"
        >
          {conversionStatus === "PROCESSING" ? (
            <>
              <Loader className="w-3 h-3 animate-spin" />
              Converting...
            </>
          ) : conversionStatus === "FAILED" ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              Retry
            </>
          ) : (
            <>
              <Music className="w-3 h-3" />
              To Video
            </>
          )}
        </button>
      )}

      {/* Share to TikTok button - only show when video is ready */}
      {conversionStatus === "COMPLETED" && (
        <button
          className={`inline-flex items-center gap-1 bg-black px-2 py-1 text-xs rounded h-fit w-fit 
                     ${shareStatus === "sharing" ? "text-gray-400" : "text-sb-restless"}
                     transition-colors duration-300 hover:bg-gray-900`}
          onClick={handleShareToTikTok}
          disabled={shareStatus === "sharing"}
          title={
            tikTokAuthStatus === "authenticated"
              ? "Share to TikTok"
              : "Connect your TikTok account first"
          }
        >
          {shareStatus === "sharing" ? (
            <>
              <Loader className="w-3 h-3 animate-spin" />
              Sharing...
            </>
          ) : shareStatus === "success" ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              Shared
            </>
          ) : shareStatus === "error" ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              Retry
            </>
          ) : (
            <>
              <Share className="w-3 h-3" />
              TikTok
            </>
          )}
        </button>
      )}
    </div>
  );
}
