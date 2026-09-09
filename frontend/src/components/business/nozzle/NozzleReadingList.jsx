import NozzleReadingCard from "./NozzleReadingCard";

const NozzleReadingList = ({ variant, readings, onFinalReadingChange }) => (
  <div className="space-y-3">
    {readings.map((reading) => (
      <NozzleReadingCard
        key={reading.nozzle.id}
        variant={variant}
        onFinalReadingChange={onFinalReadingChange}
        {...reading}
      />
    ))}
  </div>
);

export default NozzleReadingList;