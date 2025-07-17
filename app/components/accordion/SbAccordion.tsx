import { useEffect, useRef, useState, type FC } from "react";
import SbAccordionItem from "./SbAccordionItem";
import type { FolderWithObjects } from "~/types";

export interface AccordionProps {
  folders: FolderWithObjects[];
  allowMultiple?: boolean;
  endpoint: string;
  initialLoadComplete?: boolean; // Added to control loading priority
}

const SbAccordion: FC<AccordionProps> = ({
  folders,
  allowMultiple = false,
  endpoint,
}) => {
  let [extraHeight, setExtraHeight] = useState(150); // Start with 1000px extra
  let [openIndexes, setOpenIndexes] = useState<number[]>([]);
  let [loadedIndexes, setLoadedIndexes] = useState<number[]>([]); // Track which items have been loaded
  let itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const updateHeight = () => {
      if (!itemRefs.current.length) return;

      // Calculate total height of all items
      const totalHeight = itemRefs.current.reduce((sum, item) => {
        return sum + (item?.offsetHeight || 0);
      }, 0);

      // Get viewport height
      const viewportHeight = window.innerHeight;
      const bufferSpace = 25; // Extra space to avoid premature cut-off

      if (totalHeight < viewportHeight) {
        const fillHeight = (viewportHeight - totalHeight) * 0.05; // Only fill 5% of empty space
        setExtraHeight(fillHeight + bufferSpace);
      } else {
        setExtraHeight(100);
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
        // Mark this item as loaded when it's opened for the first time
        setLoadedIndexes((prevLoaded) =>
          prevLoaded.includes(index) ? prevLoaded : [...prevLoaded, index]
        );

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
            readyToLoad={loadedIndexes.includes(index)} // Pass readyToLoad based on whether it's been opened
          />
        );
      })}
      {/* Dynamic Height Extender */}
      <div style={{ height: `${extraHeight}px` }} />
    </div>
  );
};

export default SbAccordion;
