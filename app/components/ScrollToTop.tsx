import { useEffect, useState } from "react";

export default function () {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window !== undefined) {
      const handleScroll = () => {
        setIsVisible(window.scrollY > 0);
      };

      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`text-white font-semibold text-md transition-opacity ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      BACK TO TOP
    </button>
  );
}
