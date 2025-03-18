import { useState, useRef, useEffect } from "react";
import type { Object } from "@prisma/client";
import { AudioLines } from "lucide-react";

export function Thumbnail({
  object,
  endpoint,
  onClick,
  isRow,
  height,
  width,
  shouldLoad = false, // New prop to control lazy loading
}: {
  object: Object;
  endpoint: string;
  onClick?: () => void;
  isRow?: boolean;
  height?: number;
  width?: number;
  shouldLoad?: boolean; // Default is false to prevent loading until needed
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer for visibility detection
  useEffect(() => {
    if (!elementRef.current || !shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          setHasAttemptedLoad(true);
          observer.disconnect(); // Once visible, stop observing
        }
      },
      { threshold: 0.1 } // Start loading when 10% visible
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

  // Set hasAttemptedLoad directly if shouldLoad is true
  useEffect(() => {
    if (shouldLoad && !hasAttemptedLoad) {
      setHasAttemptedLoad(true);
    }
  }, [shouldLoad, hasAttemptedLoad]);

  // Render actual content when shouldLoad is true and element has attempted to load at least once
  const shouldRenderContent = shouldLoad && hasAttemptedLoad;
  console.log("shouldRenderContent", shouldRenderContent);
  return (
    <div
      ref={elementRef}
      className={"align-middle w-full h-full items-center"}
      onClick={onClick && onClick}
    >
      {
        object.posterKey && shouldRenderContent ? (
          <img
            src={endpoint + object.posterKey}
            height={height}
            width={width}
            className="max-w-[100px] sm:max-w-full"
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            alt={object.fileName || "thumbnail"}
          />
        ) : (
          shouldRenderContent && (
            <div className="items-center flex h-full justify-center">
              {object.kind === "AUDIO" ? (
                <AudioLines className="text-gray-400 w-[75px] h-[75px]" />
              ) : object.kind === "PHOTO" ? (
                <img
                  src={endpoint + object.s3fileKey}
                  loading="lazy"
                  width={width}
                  className="w-full h-full object-contain"
                  onLoad={() => setIsLoaded(true)}
                  alt={object.fileName || "photo"}
                />
              ) : (
                <video
                  preload="metadata"
                  src={endpoint + object.s3fileKey + "#t=0.1"} // Add timestamp to only load metadata
                  className="w-full h-full object-contain"
                  poster={
                    object.posterKey ? endpoint + object.posterKey : undefined
                  }
                />
              )}
            </div>
          )
        )
        // ) : (
        // // Placeholder when not loaded
        // <div className="flex items-center justify-center bg-gray-900 w-full h-full min-h-[100px]">
        //   <div className="w-12 h-12 rounded-full border-4 border-gray-600 border-t-gray-400 animate-spin"></div>
        // </div>
        // )
      }
      {!isRow ? null : <p className="self-center">{object.fileName}</p>}
    </div>
  );
}
