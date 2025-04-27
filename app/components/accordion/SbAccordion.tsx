import { useEffect, useRef, useState } from "react";
import SbAccordionItem from "./SbAccordionItem";
import type { FolderWithObjects } from "~/types";

export interface AccordionProps {
  folders: FolderWithObjects[];
  allowMultiple?: boolean;
  endpoint: string;
  initialLoadComplete?: boolean; // Added to control loading priority
}

const SbAccordion: React.FC<AccordionProps> = ({
  folders,
  allowMultiple = false,
  endpoint,
  initialLoadComplete = false, // Default to false
}) => {
  let [extraHeight, setExtraHeight] = useState(1000); // Start with 1000px extra
  let [openIndexes, setOpenIndexes] = useState<number[]>([]);
  let itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  let [readyToLoad, setReadyToLoad] = useState(initialLoadComplete);

  // Track which folders are actually visible in the viewport
  const [foldersInViewport, setFoldersInViewport] = useState<Set<number>>(
    new Set()
  );
  const viewportObserverRef = useRef<IntersectionObserver | null>(null);

  // Update readyToLoad when initialLoadComplete changes
  useEffect(() => {
    if (initialLoadComplete && !readyToLoad) {
      setReadyToLoad(true);
    }
  }, [initialLoadComplete, readyToLoad]);

  // Set up viewport observer to prioritize loading visible folders
  useEffect(() => {
    // Clean up previous observer
    if (viewportObserverRef.current) {
      viewportObserverRef.current.disconnect();
    }

    // Create new observer for viewport tracking
    viewportObserverRef.current = new IntersectionObserver(
      (entries) => {
        const newInViewport = new Set<number>(foldersInViewport);

        entries.forEach((entry) => {
          const index = parseInt(
            entry.target.getAttribute("data-folder-index") || "-1",
            10
          );

          if (index >= 0) {
            if (entry.isIntersecting) {
              newInViewport.add(index);
            } else {
              newInViewport.delete(index);
            }
          }
        });

        setFoldersInViewport(newInViewport);
      },
      {
        rootMargin: "200px", // Load items that are 200px away from viewport
        threshold: 0.1, // When at least 10% is visible
      }
    );

    // Add observed items
    if (itemRefs.current.length > 0) {
      itemRefs.current.forEach((el, index) => {
        if (el) {
          el.setAttribute("data-folder-index", index.toString());
          viewportObserverRef.current?.observe(el);
        }
      });
    }

    return () => {
      viewportObserverRef.current?.disconnect();
    };
  }, [folders]);

  // If initialLoadComplete wasn't set, we'll set readyToLoad after a delay
  // to give priority to favorites and trending
  useEffect(() => {
    if (!initialLoadComplete && !readyToLoad) {
      const timer = setTimeout(() => {
        setReadyToLoad(true);
      }, 1000); // Delay loading accordion content by 1 second

      return () => clearTimeout(timer);
    }
  }, [initialLoadComplete, readyToLoad]);

  useEffect(() => {
    const updateHeight = () => {
      if (!itemRefs.current.length) return;

      // Calculate total height of all items
      const totalHeight = itemRefs.current.reduce((sum, item) => {
        return sum + (item?.offsetHeight || 0);
      }, 0);

      // Get viewport height
      const viewportHeight = window.innerHeight;
      const bufferSpace = 200; // Extra space to avoid premature cut-off

      // Adjust extra height dynamically
      if (totalHeight < viewportHeight) {
        setExtraHeight(viewportHeight - totalHeight + bufferSpace); // Just enough to fill screen
      } else {
        setExtraHeight(100); // Minimal extra space when content is already long
      }
    };

    updateHeight(); // Run on mount
    window.addEventListener("resize", updateHeight); // Update on resize
    return () => window.removeEventListener("resize", updateHeight);
  }, [folders]); // Run when items change

  const toggleItem = (index: number) => {
    setOpenIndexes((prev) => {
      const isAlreadyOpen = prev.includes(index);
      const newOpenIndexes = allowMultiple
        ? isAlreadyOpen
          ? prev.filter((i) => i !== index)
          : [...prev, index]
        : isAlreadyOpen
          ? []
          : [index];

      if (!isAlreadyOpen) {
        requestAnimationFrame(() => {
          if (itemRefs.current[index]) {
            const item = itemRefs.current[index];
            const elementTop =
              item.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
              top: elementTop - 96,
              behavior: "smooth",
            });
          }
        });
      }
      return newOpenIndexes;
    });
  };

  let passElementRef = (el: any, index: number) => {
    itemRefs.current[index] = el;
  };

  // Determine if a folder should be ready to load based on priority
  const shouldFolderLoad = (index: number) => {
    // Always allow loading for open folders
    if (openIndexes.includes(index)) return true;

    // Higher priority: folders that are currently in viewport
    if (foldersInViewport.has(index)) return true;

    // Base readiness on general readyToLoad state
    return readyToLoad;
  };

  return (
    <div className="w-full overflow-y-hidden">
      {folders.map((folder, index) => {
        return (
          <SbAccordionItem
            key={folder.id}
            index={index}
            folder={folder}
            isFolderOpen={openIndexes.includes(index)}
            onClick={() => toggleItem(index)}
            passRef={passElementRef}
            endpoint={endpoint}
            readyToLoad={shouldFolderLoad(index)} // Prioritize loading by folder
          />
        );
      })}
      {/* Dynamic Height Extender */}
      <div style={{ height: `${extraHeight}px` }} />
    </div>
  );
};

export default SbAccordion;
