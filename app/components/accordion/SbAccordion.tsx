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

  // Update readyToLoad when initialLoadComplete changes
  useEffect(() => {
    if (initialLoadComplete && !readyToLoad) {
      setReadyToLoad(true);
    }
  }, [initialLoadComplete, readyToLoad]);

  useEffect(() => {
    // If initialLoadComplete wasn't set, we'll set readyToLoad after a delay
    // to give priority to favorites and trending
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
            readyToLoad={readyToLoad} // Pass readyToLoad state to control loading
          />
        );
      })}
      {/* Dynamic Height Extender */}
      <div style={{ height: `${extraHeight}px` }} />
    </div>
  );
};

export default SbAccordion;
