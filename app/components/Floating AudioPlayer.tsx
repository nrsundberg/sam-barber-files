import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Pause, Play, AlertCircle } from "lucide-react";

export const AudioWavePlayer = ({ audioSrc = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeTimeoutRef = useRef(null);

  useEffect(() => {
    if (!audioSrc) {
      console.warn("AudioWavePlayer: No audio source provided");
      return;
    }

    // Create audio element
    const audio = new Audio();
    audio.volume = volume;
    audio.loop = true;

    // Handle errors
    audio.addEventListener("error", (e) => {
      console.error("Audio loading error:", e);
      setHasError(true);
      setIsPlaying(false);
    });

    // Handle successful loading
    audio.addEventListener("canplay", () => {
      setHasError(false);
    });

    audio.src = audioSrc;
    audioRef.current = audio;

    // Expose pause method globally for document lookup
    window.pauseAudioPlayer = () => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      delete window.pauseAudioPlayer;
    };
  }, [audioSrc]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayPause = (e) => {
    e.stopPropagation();
    if (audioRef.current && !hasError) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.error("Playback failed:", err);
          setHasError(true);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handleContainerClick = () => {
    if (!audioSrc || hasError) return;

    setShowVolumeControl(!showVolumeControl);

    // Auto-hide volume control after 3 seconds
    if (!showVolumeControl) {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
      volumeTimeoutRef.current = setTimeout(() => {
        setShowVolumeControl(false);
      }, 3000);
    }
  };

  const WaveAnimation = () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className="absolute inset-0 m-auto"
    >
      <rect
        x="4"
        y="8"
        width="3"
        height="8"
        rx="1"
        className={`fill-white ${isPlaying ? "animate-pulse" : ""}`}
      />
      <rect
        x="9"
        y="4"
        width="3"
        height="16"
        rx="1"
        className={`fill-white ${isPlaying ? "animate-pulse" : ""}`}
        style={{ animationDelay: "0.2s" }}
      />
      <rect
        x="14"
        y="6"
        width="3"
        height="12"
        rx="1"
        className={`fill-white ${isPlaying ? "animate-pulse" : ""}`}
        style={{ animationDelay: "0.4s" }}
      />
      <rect
        x="19"
        y="9"
        width="3"
        height="6"
        rx="1"
        className={`fill-white ${isPlaying ? "animate-pulse" : ""}`}
        style={{ animationDelay: "0.6s" }}
      />
    </svg>
  );

  return (
    <div id="audio-wave-player" className="fixed top-4 right-4 z-50">
      <div className="relative">
        {/* Main button */}
        <div
          onClick={handleContainerClick}
          className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            hasError
              ? "Audio failed to load"
              : !audioSrc
                ? "No audio source provided"
                : "Click to show volume control"
          }
        >
          {hasError ? (
            <AlertCircle
              className="absolute inset-0 m-auto text-white"
              size={24}
            />
          ) : (
            <WaveAnimation />
          )}

          {/* Play/Pause overlay */}
          <button
            onClick={togglePlayPause}
            className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!audioSrc || hasError}
          >
            {isPlaying ? (
              <Pause size={12} className="text-purple-600" />
            ) : (
              <Play size={12} className="text-purple-600 ml-0.5" />
            )}
          </button>
        </div>

        {/* Volume control panel */}
        {showVolumeControl && (
          <div className="absolute top-16 right-0 bg-white rounded-lg shadow-xl p-4 min-w-[200px] animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleMute}
                className="text-gray-600 hover:text-purple-600 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-purple-600 [&::-webkit-slider-thumb]:transition-colors"
              />
              <span className="text-sm text-gray-600 w-10 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
