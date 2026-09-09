import petrolNozzleImage from "../../../assets/fuel/petrol-nozzle.webp";
import dieselNozzleImage from "../../../assets/fuel/diesel-nozzle.webp";

import { formatReading } from "./nozzleUtils";

const NozzleReadingCard = ({
  variant,
  nozzle,
  currentReading,
  openingReading,
  finalReading,
  litresDispensed,
  isInvalid,
  onFinalReadingChange,
}) => {
  const isDiesel = nozzle.fuelType === "DIESEL";
  const image = isDiesel ? dieselNozzleImage : petrolNozzleImage;
  const nozzleLabel = nozzle.number || nozzle.nozzleNumber;

  return (
    <div
      className={`
          overflow-hidden
          rounded-[18px]
          border
          bg-white
          shadow-[0_3px_12px_rgba(15,23,42,0.04)]
          ${isDiesel ? "border-blue-100" : "border-emerald-100"}
        `}
    >
      <div className="flex min-h-[148px]">
        <div
          className={`
              flex
              w-[72px]
              shrink-0
              items-center
              justify-center
              px-1
              ${isDiesel ? "bg-blue-50" : "bg-emerald-50"}
            `}
        >
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="h-[140px] w-[64px] object-contain object-center"
          />
        </div>

        <div className="min-w-0 flex-1 px-3 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold leading-none tracking-[-0.01em] text-slate-900">
              N{nozzleLabel} - {isDiesel ? "Diesel" : "Petrol"}
            </h3>

            <span className="text-[9px] font-semibold text-slate-500">
              Litres
            </span>
          </div>

          {variant === "current" ? (
            <div className="mt-3">
              <p className="text-[7px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                Cumulative Reading
              </p>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-[18px] font-bold leading-none text-slate-800">
                  {formatReading(currentReading)}
                </p>

                <span className="text-[10px] font-semibold text-slate-400">
                  L
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-2">
                <p className="text-[7px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Opening Reading
                </p>

                <div className="mt-0.5 flex items-center justify-between">
                  <p className="text-[13px] font-bold leading-none text-slate-800">
                    {formatReading(openingReading)}
                  </p>

                  <span className="text-[10px] font-semibold text-slate-400">
                    L
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <label
                  htmlFor={`final-${nozzle.id}`}
                  className="text-[7px] font-semibold uppercase tracking-[0.05em] text-slate-400"
                >
                  Final Reading
                </label>

                <div className="mt-0.5 flex items-center gap-2">
                  <input
                    id={`final-${nozzle.id}`}
                    type="text"
                    inputMode="decimal"
                    value={finalReading}
                    onChange={(event) =>
                      onFinalReadingChange(nozzle.id, event.target.value)
                    }
                    className={`
                    h-[31px]
                    min-w-0
                    flex-1
                    rounded-[8px]
                    border
                    bg-white
                    px-2
                    text-[13px]
                    font-bold
                    tracking-tight
                    text-slate-900
                    outline-none
                    transition
                    ${
                      isInvalid
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-slate-200 focus:border-[#047857] focus:ring-2 focus:ring-emerald-100"
                    }
                  `}
                  />

                  <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                    L
                  </span>
                </div>
              </div>

              <div className="mt-2 rounded-[10px] bg-yellow-50 px-2.5 py-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[7px] font-semibold text-slate-500">
                      Litres Dispensed
                    </p>

                    <p
                      className={`
                      mt-0.5
                      text-[15px]
                      font-bold
                      leading-none
                      ${
                        litresDispensed !== null
                          ? isDiesel
                            ? "text-blue-700"
                            : "text-[#047857]"
                          : "text-slate-400"
                      }
                    `}
                    >
                      {litresDispensed !== null
                        ? litresDispensed.toFixed(2)
                        : "\u2014"}
                    </p>
                  </div>

                  <span className="self-end text-[10px] font-semibold text-slate-400">
                    L
                  </span>
                </div>
              </div>

              {isInvalid && (
                <p className="mt-1 text-[8px] font-semibold leading-tight text-red-600">
                  Final reading cannot be below opening.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NozzleReadingCard;