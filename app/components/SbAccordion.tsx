import { useEffect, useRef, useState } from "react";
import type { Prisma } from "@prisma/client";
import SbAccordionItem from "./SbAccordionItem";

export interface AccordionProps {
  items: Prisma.FolderGetPayload<{
    include: { objects: true };
  }>[];
  allowMultiple?: boolean;
}

const SbAccordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
}) => {
  let [extraHeight, setExtraHeight] = useState(1000); // Start with 1000px extra

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
  }, [items]); // Run when items change

  let [openIndexes, setOpenIndexes] = useState<number[]>([]);
  let itemRefs = useRef<(HTMLDivElement | null)[]>([]);

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
            console.log(elementTop - 64);
            window.scrollTo({
              top: elementTop - 64,
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
      {items.map((folder, index) => {
        return (
          <SbAccordionItem
            key={folder.id}
            index={index}
            folder={folder}
            isOpen={openIndexes.includes(index)}
            onClick={() => toggleItem(index)}
            passRef={passElementRef}
          />
        );
      })}
      {/* Dynamic Height Extender */}
      <div style={{ height: `${extraHeight}px` }} />
    </div>
  );
};

export default SbAccordion;

{
  /* <VideoModal
                    objects={folder.objects}
                    isOpen={isOpen}
                    targetRef={targetRef}
                    onOpenChange={onOpenChange}
                    moveProps={moveProps}
                  /> */
}
