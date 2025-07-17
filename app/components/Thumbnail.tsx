import { memo, useRef, useEffect, useState } from "react";
import type { Object } from "@prisma/client";
import { AudioLines, Lock } from "lucide-react";

export const Thumbnail = memo(function Thumbnail({
  object,
  endpoint,
  onClick,
  isRow,
  height,
  width,
  isAdmin = false,
}: {
  object: Object;
  endpoint: string;
  onClick?: () => void;
  isRow?: boolean;
  height?: number;
  width?: number;
  isAdmin?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const thumbnailKey = object.posterKey || object.s3fileKey;
  const mediaUrl = endpoint + thumbnailKey;
  const posterUrl = object.posterKey
    ? endpoint + object.posterKey
    : object.kind === "VIDEO"
      ? undefined // prevent fallback to .mov
      : endpoint + object.s3fileKey;

  const containerClasses = isRow
    ? `${isAdmin ? "w-16 h-16" : "w-24 h-24"} flex-shrink-0 relative`
    : "w-full h-full flex items-center justify-center relative";

  const mediaContainerClasses = isRow
    ? "w-full h-full flex items-center justify-center overflow-hidden relative"
    : "aspect-video w-full h-full flex items-center justify-center overflow-hidden relative";

  const handleLoad = () => {
    setIsLoaded(true);
  };

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        handleLoad();
      }
    }
  }, [posterUrl, mediaUrl]);

  const renderImg = (src: string, alt: string, blurOpacity: string) => (
    <img
      ref={imgRef}
      src={src}
      height={height}
      width={width}
      alt={alt}
      // loading="lazy"
      onLoad={handleLoad}
      className={`
        object-contain max-h-full max-w-full
        ${object.isLocked ? blurOpacity : ""}
        ${isLoaded ? "opacity-100" : "opacity-100"}
        transition-opacity duration-300
      `}
    />
  );

  return (
    <div className={containerClasses} onClick={onClick}>
      <div className={mediaContainerClasses}>
        {object.posterKey ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            {renderImg(
              posterUrl!,
              object.fileName || "thumbnail",
              "blur-sm opacity-70"
            )}
            {object.isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                <Lock className="text-white w-8 h-8 drop-shadow-md" />
              </div>
            )}
          </div>
        ) : object.kind === "AUDIO" ? (
          <div className="w-full h-full flex items-center justify-center">
            <AudioLines className="text-gray-400 w-12 h-12" />
            {object.isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                <Lock className="text-white w-8 h-8 drop-shadow-md" />
              </div>
            )}
          </div>
        ) : object.kind === "PHOTO" ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            {renderImg(
              mediaUrl,
              object.fileName || "photo",
              "blur-sm opacity-40"
            )}
            {object.isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                <Lock className="text-white w-8 h-8 drop-shadow-md" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            {object.posterKey ? (
              <>
                {renderImg(
                  posterUrl!,
                  object.fileName || "video thumbnail",
                  "blur-sm opacity-40"
                )}
              </>
            ) : (
              <video
                preload="metadata"
                className={`
                  object-contain max-h-full max-w-full
                  ${object.isLocked ? "blur-sm opacity-40" : ""}
                  opacity-100 transition-opacity duration-300
                `}
                muted
                disablePictureInPicture
                disableRemotePlayback
              >
                <source src={mediaUrl} />
              </video>
            )}
            {object.isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-opacity-20">
                <Lock className="text-white w-8 h-8 drop-shadow-md" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optional: you could show a spinner or fallback for not-yet-loaded images */}
    </div>
  );
});
