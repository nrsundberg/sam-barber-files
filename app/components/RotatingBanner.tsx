const RotatingBanner = () => {
  const words = [
    "demos",
    "-",
    "interviews",
    "-",
    "exclusive merch",
    "-",
    "unreleased music",
    "-",
    "bts footage",
    "-",
    "raw clips",
    "-",
    "projects",
    "-",
  ];

  const repeatedWords = [
    ...words,
    ...words,
    ...words,
    ...words,
    ...words,
    ...words,
  ];

  return (
    <div className="w-full bg-white overflow-hidden py-1">
      <div className="flex animate-marquee space-x-4">
        {repeatedWords.map((word, index) => (
          <p
            className="uppercase whitespace-nowrap font-extrabold text-sm text-black"
            key={`first-${index}`}
          >
            {word}
          </p>
        ))}
      </div>
    </div>
  );
};

export default RotatingBanner;
