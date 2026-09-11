import { useTranslation } from "react-i18next";

import { formatReading } from "./nozzleUtils";

const NozzleReadingRow = ({
  nozzle,
  openingReading,
  finalReading,
  isInvalid,
  onFinalReadingChange,
}) => {
  const { t } = useTranslation();

  const fuelCode =
    nozzle.fuelType === "DIESEL" ? "D" : "P";

  const inputId = `closing-${nozzle.id}`;

  return (
    <div
      className="
        grid
        grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)]
        items-center
        gap-4
        border-t
        border-slate-100
        px-3
        py-3.5
        first:border-t-0
        sm:grid-cols-[76px_minmax(0,1fr)_minmax(0,1fr)]
        sm:gap-5
        sm:px-4
      "
    >
      {/* NOZZLE */}
      <div className="min-w-0">
        <p className="text-[13px] font-bold leading-none tracking-[-0.01em] text-slate-900">
          N{nozzle.number} ({fuelCode})
        </p>

        <span className="sr-only">
          {nozzle.fuelType === "DIESEL"
            ? t("nozzle.diesel")
            : t("nozzle.petrol")}
        </span>
      </div>

      {/* OPENING */}
      <div className="min-w-0 text-right">
        <span
          className="
            font-mono
            text-[14px]
            font-semibold
            leading-none
            tracking-[-0.02em]
            tabular-nums
            text-slate-800
            sm:text-[15px]
          "
        >
          {formatReading(openingReading)}
        </span>
      </div>

      {/* CLOSING */}
      <div className="min-w-0 pl-1 sm:pl-2">
        <label
          htmlFor={inputId}
          className="sr-only"
        >
          {t("nozzle.closingAriaLabel", {
            number: nozzle.number,
          })}
        </label>

        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={finalReading}
          onChange={(event) =>
            onFinalReadingChange(
              nozzle.id,
              event.target.value,
            )
          }
          aria-invalid={isInvalid}
          placeholder={t("nozzle.enter")}
          className={`
            block
            h-[36px]
            w-full
            min-w-0
            border-0
            border-b-[2px]
            bg-transparent
            px-1
            text-right
            font-mono
            text-[14px]
            font-semibold
            leading-none
            tracking-[-0.02em]
            tabular-nums
            text-slate-900
            outline-none
            transition
            placeholder:text-[10px]
            placeholder:font-sans
            placeholder:font-medium
            placeholder:text-slate-300
            sm:h-[38px]
            sm:text-[15px]
            ${
              isInvalid
                ? `
                  border-red-400
                  bg-red-50/50
                  text-red-700
                  focus:border-red-500
                `
                : `
                  border-slate-300
                  focus:border-[#047857]
                `
            }
          `}
        />

        {isInvalid && (
          <p className="mt-1 text-[8px] font-semibold leading-tight text-red-600">
            {t("nozzle.closingBelowOpening")}
          </p>
        )}
      </div>
    </div>
  );
};

export default NozzleReadingRow;