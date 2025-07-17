import { useEffect, useRef, useState, useCallback, memo, type FC } from "react";
import SbAccordionItem from "./SbAccordionItem";
import type { FolderWithObjects } from "~/types";

export interface AccordionProps {
  folders: FolderWithObjects[];
  allowMultiple?: boolean;
  endpoint: string;
  initialLoadComplete?: boolean;
}

const SbAccordion: FC<AccordionProps> = memo(
  ({ folders, allowMultiple = false, endpoint }) => {
    const [extraHeight, setExtraHeight] = useState(150);
    const [openIndexes, setOpenIndexes] = useState<number[]>([]);
    const [loadedIndexes, setLoadedIndexes] = useState<number[]>([]);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
      const updateHeight = () => {
        if (!itemRefs.current || !itemRefs.current.length) return;

        const totalHeight = itemRefs.current.reduce((sum, item) => {
          return sum + (item?.offsetHeight || 0);
        }, 0);

        const viewportHeight = window.innerHeight;
        const bufferSpace = 25;

        if (totalHeight < viewportHeight) {
          const fillHeight = (viewportHeight - totalHeight) * 0.05;
          setExtraHeight(fillHeight + bufferSpace);
        } else {
          setExtraHeight(100);
        }
      };

      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }, [folders?.length]); // Use optional chaining for safety

    const toggleItem = useCallback(
      (index: number) => {
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
      },
      [allowMultiple]
    );

    const passElementRef = useCallback((el: any, index: number) => {
      itemRefs.current[index] = el;
    }, []);

    return (
      <div className="w-full overflow-y-hidden">
        {folders && folders.length > 0 ? (
          folders.map((folder, index) => (
            <SbAccordionItem
              key={folder.id}
              index={index}
              folder={folder}
              isFolderOpen={openIndexes.includes(index)}
              onClick={() => toggleItem(index)}
              passRef={passElementRef}
              endpoint={endpoint}
              readyToLoad={loadedIndexes.includes(index)}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            No folders to display
          </div>
        )}
        <div style={{ height: `${extraHeight}px` }} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders - handle undefined values
    if (!prevProps.folders || !nextProps.folders) {
      return prevProps.folders === nextProps.folders;
    }

    return (
      prevProps.endpoint === nextProps.endpoint &&
      prevProps.allowMultiple === nextProps.allowMultiple &&
      prevProps.folders === nextProps.folders &&
      prevProps.folders.length === nextProps.folders.length
    );
  }
);

export default SbAccordion;
