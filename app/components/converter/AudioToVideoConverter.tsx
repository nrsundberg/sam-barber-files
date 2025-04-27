import { Music, Share, Check, AlertCircle, Loader } from "lucide-react";
import type { Object } from "@prisma/client";
import { useShare } from "./ShareContext";

export interface AudioToVideoProps {
  object: Object;
  endpoint: string;
}

export default function AudioToVideoConverter({
  object,
  endpoint,
}: AudioToVideoProps) {
  const {
    convertAudioToVideo,
    shareToTikTok,
    getConversionStatus,
    getShareStatus,
    getVideoUrl,
  } = useShare();

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

  // Get the current statuses
  const conversionStatus = getConversionStatus(object.id);
  const shareStatus = getShareStatus(object.id);
  const videoUrl = getVideoUrl(object.id);

  // Handle convert button click
  const handleConvert = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent onClick handlers from firing

    if (!isAudioFile() || conversionStatus === "converting") {
      return;
    }

    convertAudioToVideo(object.id, object.s3fileKey);
  };

  // Handle share button click
  const handleShareToTikTok = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent onClick handlers from firing

    if (
      conversionStatus !== "ready" ||
      !videoUrl ||
      shareStatus === "sharing"
    ) {
      return;
    }

    shareToTikTok(object.id, videoUrl, object.fileName);
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
      <button
        className={`inline-flex items-center gap-1 bg-gray-700 px-2 py-1 text-xs rounded h-fit w-fit 
                  ${conversionStatus === "converting" ? "text-gray-400" : "text-sb-restless"} 
                  transition-colors duration-300 hover:bg-gray-600`}
        onClick={handleConvert}
        disabled={conversionStatus === "converting"}
        title="Convert to video for TikTok"
      >
        {conversionStatus === "converting" ? (
          <>
            <Loader className="w-3 h-3 animate-spin" />
            Converting...
          </>
        ) : conversionStatus === "ready" ? (
          <>
            <Check className="w-3 h-3 text-green-500" />
            Ready
          </>
        ) : conversionStatus === "error" ? (
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

      {/* Share to TikTok button - only show when video is ready */}
      {conversionStatus === "ready" && (
        <button
          className={`inline-flex items-center gap-1 bg-black px-2 py-1 text-xs rounded h-fit w-fit 
                     ${shareStatus === "sharing" ? "text-gray-400" : "text-sb-restless"}
                     transition-colors duration-300 hover:bg-gray-900`}
          onClick={handleShareToTikTok}
          disabled={shareStatus === "sharing"}
          title="Share to TikTok"
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
