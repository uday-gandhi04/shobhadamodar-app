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

  const accentText = isDiesel ? "text-blue-700" : "text-[#047857]";
  const accentBorder = isDiesel
    ? "border-blue-100"
    : "border-emerald-100";
  const imageBackground = isDiesel ? "bg-blue-50" : "bg-emerald-50";

  return (
    <div
      className={`
        overflow-hidden
        rounded-[18px]
        border
        bg-white
        shadow-[0_3px_14px_rgba(15,23,42,0.05)]
        ${accentBorder}
      `}
    >
      <div className="grid min-h-[132px] grid-cols-[76px_minmax(0,1fr)]">
        {/* LEFT — NOZZLE IMAGE */}
        <div
          className={`
            flex
            items-center
            justify-center
            ${imageBackground}
          `}
        >
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="h-[128px] w-[60px] object-contain object-center"
          />
        </div>

        {/* RIGHT — DETAILS */}
        <div className="min-w-0 px-3.5 py-3">
          {/* HEADER */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="truncate text-[16px] font-semibold leading-none tracking-[-0.02em] text-slate-900">
              N{nozzleLabel} - {isDiesel ? "Diesel" : "Petrol"}
            </h3>

            <span className="shrink-0 text-[9px] font-semibold text-slate-400">
              Litres
            </span>
          </div>

          {/* CURRENT / READ-ONLY VARIANT */}
          {variant === "current" ? (
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-3">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                  Cumulative Reading
                </p>

                <p
                  className={`
                    mt-1
                    text-[18px]
                    font-bold
                    leading-none
                    tracking-[-0.02em]
                    ${accentText}
                  `}
                >
                  {formatReading(currentReading)}
                </p>
              </div>

              <span className="self-end pb-0.5 text-[10px] font-semibold text-slate-400">
                L
              </span>
            </div>
          ) : (
            /* END SHIFT VARIANT */
            <div className="space-y-2">
              {/* OPENING */}
              <div className="grid grid-cols-[108px_minmax(0,1fr)] items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">
                  Opening Reading
                </span>

                <div className="flex min-w-0 items-center justify-end gap-1">
                  <span className="truncate text-[14px] font-semibold leading-none text-slate-800">
                    {formatReading(openingReading)}
                  </span>

                  <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                    L
                  </span>
                </div>
              </div>

              {/* FINAL */}
              <div className="grid grid-cols-[108px_minmax(0,1fr)] items-center gap-2">
                <label
                  htmlFor={`final-${nozzle.id}`}
                  className="text-[10px] font-bold text-slate-500"
                >
                  Final Reading
                </label>

                <div className="flex min-w-0 items-center justify-end gap-1">
                  <input
                    id={`final-${nozzle.id}`}
                    type="text"
                    inputMode="decimal"
                    value={finalReading}
                    onChange={(event) =>
                      onFinalReadingChange(
                        nozzle.id,
                        event.target.value,
                      )
                    }
                    className={`
                      h-[30px]
                      min-w-0
                      w-full
                      rounded-[8px]
                      border
                      bg-white
                      px-2
                      text-right
                      text-[14px]
                      font-semibold
                      leading-none
                      tracking-tight
                      text-slate-900
                      outline-none
                      transition
                      ${
                        isInvalid
                          ? "border-red-300 bg-red-50 text-red-700 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                          : "border-slate-200 bg-slate-50 focus:border-[#047857] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      }
                    `}
                  />

                  <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                    L
                  </span>
                </div>
              </div>

              {/* LITRES DISPENSED */}
              <div
                className={`
                  mt-1
                  grid
                  grid-cols-[108px_minmax(0,1fr)]
                  items-center
                  gap-2
                  rounded-[9px]
                  bg-slate-50
                  py-1.5
                `}
              >
                <span className="text-[10px] font-semibold text-slate-500">
                  Litres Dispensed
                </span>

                <div className="flex min-w-0 items-center justify-end gap-1">
                  <span
                    className={`
                      text-[14px]
                      font-bold
                      leading-none
                      ${
                        litresDispensed !== null
                          ? accentText
                          : "text-slate-400"
                      }
                    `}
                  >
                    {litresDispensed !== null
                      ? litresDispensed.toFixed(2)
                      : "—"}
                  </span>

                  <span className="text-[10px] font-semibold text-slate-400">
                    L
                  </span>
                </div>
              </div>

              {/* VALIDATION */}
              {isInvalid && (
                <p className="pt-0.5 text-[8px] font-semibold leading-tight text-red-600">
                  Final reading cannot be below opening.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NozzleReadingCard;