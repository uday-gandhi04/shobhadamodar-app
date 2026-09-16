import { useEffect, useState } from "react";

const parseTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return {
      hour: "",
      minute: "",
      period: "AM",
    };
  }

  const [h, m] = value
    .split(":")
    .map(Number);

  return {
    hour: String(h % 12 || 12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period: h >= 12 ? "PM" : "AM",
  };
};

const makeTime = (
  hour,
  minute,
  period,
) => {
  const h = Number(hour);
  const m = Number(minute);

  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 1 ||
    h > 12 ||
    m < 0 ||
    m > 59
  ) {
    return "";
  }

  let hour24 = h;

  if (period === "AM" && h === 12) {
    hour24 = 0;
  }

  if (period === "PM" && h !== 12) {
    hour24 = h + 12;
  }

  return `${String(hour24).padStart(
    2,
    "0",
  )}:${String(m).padStart(2, "0")}`;
};

const TimeField = ({
  value,
  onChange,
}) => {
  const initial = parseTime(value);

  const [hour, setHour] = useState(
    initial.hour,
  );

  const [minute, setMinute] =
    useState(initial.minute);

  const [period, setPeriod] =
    useState(initial.period);

  useEffect(() => {
    const next = parseTime(value);

    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [value]);

  const update = (
    nextHour,
    nextMinute,
    nextPeriod = period,
  ) => {
    setHour(nextHour);
    setMinute(nextMinute);

    onChange(
      makeTime(
        nextHour,
        nextMinute,
        nextPeriod,
      ),
    );
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className="
          flex
          h-[42px]
          w-[78px]
          shrink-0
          items-center
          justify-center
          rounded-[10px]
          border
          border-slate-200
          bg-slate-50
          px-1
          focus-within:border-[#047857]
          focus-within:bg-white
        "
      >
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={hour}
          onChange={(event) => {
            let next =
              event.target.value
                .replace(/\D/g, "")
                .slice(0, 2);

            if (next.length === 2) {
              const n = Number(next);

              if (n < 1) next = "01";
              if (n > 12) next = "12";
            }

            update(
              next,
              minute,
            );
          }}
          onFocus={(event) =>
            event.target.select()
          }
          placeholder="HH"
          className="
            h-full
            w-[24px]
            bg-transparent
            p-0
            text-center
            text-[12px]
            font-semibold
            tabular-nums
            outline-none
            placeholder:text-slate-300
          "
        />

        <span className="mx-0.5 text-[12px] font-bold text-slate-400">
          :
        </span>

        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={minute}
          onChange={(event) => {
            let next =
              event.target.value
                .replace(/\D/g, "")
                .slice(0, 2);

            if (
              next.length === 2 &&
              Number(next) > 59
            ) {
              next = "59";
            }

            update(
              hour,
              next,
            );
          }}
          onFocus={(event) =>
            event.target.select()
          }
          placeholder="MM"
          className="
            h-full
            w-[24px]
            bg-transparent
            p-0
            text-center
            text-[12px]
            font-semibold
            tabular-nums
            outline-none
            placeholder:text-slate-300
          "
        />
      </div>

      <div
        className="
          flex
          h-[42px]
          shrink-0
          items-center
          rounded-[10px]
          border
          border-slate-200
          bg-slate-50
          p-1
        "
      >
        {["AM", "PM"].map(
          (item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setPeriod(item);

                onChange(
                  makeTime(
                    hour,
                    minute,
                    item,
                  ),
                );
              }}
              className={`
                h-[32px]
                min-w-[31px]
                rounded-[7px]
                px-1
                text-[9px]
                font-bold
                ${
                  period === item
                    ? "bg-[#047857] text-white"
                    : "text-slate-500"
                }
              `}
            >
              {item}
            </button>
          ),
        )}
      </div>
    </div>
  );
};

export default TimeField;