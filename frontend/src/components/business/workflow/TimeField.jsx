import { useEffect, useState, useRef } from "react";

const parseTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return {
      hour: "",
      minute: "",
      period: "AM",
    };
  }

  const [h, m] = value.split(":").map(Number);

  return {
    hour: String(h % 12 || 12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period: h >= 12 ? "PM" : "AM",
  };
};

const makeTime = (hour, minute, period) => {
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

  return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const cleanDigits = (value) => value.replace(/\D/g, "").slice(0, 2);

const TimeField = ({ value, onChange }) => {
  const initial = parseTime(value);

  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);

  const minuteRef = useRef(null);

  // Only sync from the parent when the parent actually has a valid saved time.
  // This is important while the employee is typing a partial value such as "5".
  useEffect(() => {
    if (!/^\d{2}:\d{2}$/.test(value || "")) {
      if (!value) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHour("");
        setMinute("");
        setPeriod("AM");
      }
      return;
    }

    const next = parseTime(value);
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [value]);

  const emitIfComplete = (nextHour, nextMinute, nextPeriod = period) => {
    if (nextHour.length === 2 && nextMinute.length === 2) {
      onChange(makeTime(nextHour, nextMinute, nextPeriod));
    }
  };

  const handleHourChange = (event) => {
    const next = cleanDigits(event.target.value);

    setHour(next);

    if (next.length === 2) {
      const number = Number(next);

      if (number < 1 || number > 12) {
        setHour("");
        return;
      }

      // Move naturally to minutes after the two hour digits are entered.
      window.requestAnimationFrame(() => {
        minuteRef.current?.focus();
        minuteRef.current?.select();
      });

      emitIfComplete(next, minute);
    }
  };

  const handleMinuteChange = (event) => {
    const next = cleanDigits(event.target.value);

    setMinute(next);

    if (next.length === 2) {
      const number = Number(next);

      if (number > 59) {
        setMinute("");
        return;
      }

      emitIfComplete(hour, next);
    }
  };

  const normalizeOnBlur = () => {
    let nextHour = hour;
    let nextMinute = minute;

    if (nextHour.length === 1) {
      nextHour = nextHour.padStart(2, "0");
      setHour(nextHour);
    }

    if (nextMinute.length === 1) {
      nextMinute = nextMinute.padStart(2, "0");
      setMinute(nextMinute);
    }

    if (!nextHour && !nextMinute) {
      onChange("");
      return;
    }

    if (nextHour.length === 2 && nextMinute.length === 2) {
      const nextTime = makeTime(nextHour, nextMinute, period);
      if (nextTime) {
        onChange(nextTime);
      }
    }
  };

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod);

    if (hour.length === 2 && minute.length === 2) {
      onChange(makeTime(hour, minute, nextPeriod));
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* HH : MM — two independent text fields */}
      <div className="flex h-[42px] items-end gap-1">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={hour}
          onChange={handleHourChange}
          onFocus={(event) => event.target.select()}
          onBlur={() => normalizeOnBlur("hour")}
          placeholder="HH"
          aria-label="Hour"
          className="
            h-[32px]
            w-[28px]
            border-0
            border-b-2
            border-slate-300
            bg-transparent
            p-0
            text-center
            text-[12px]
            font-semibold
            tabular-nums
            text-slate-800
            outline-none
            transition
            focus:border-[#047857]
            placeholder:text-slate-300
          "
        />

        <span className="pb-[6px] text-[13px] font-bold text-slate-400">:</span>

        <input
          ref={minuteRef}
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={minute}
          onChange={handleMinuteChange}
          onFocus={(event) => event.target.select()}
          onBlur={() => normalizeOnBlur("minute")}
          placeholder="MM"
          aria-label="Minute"
          className="
            h-[32px]
            w-[28px]
            border-0
            border-b-2
            border-slate-300
            bg-transparent
            p-0
            text-center
            text-[12px]
            font-semibold
            tabular-nums
            text-slate-800
            outline-none
            transition
            focus:border-[#047857]
            placeholder:text-slate-300
          "
        />
      </div>

      {/* AM / PM */}
      <div className="flex h-[42px] shrink-0 items-center border-b-2 border-slate-300 px-1">
        {["AM", "PM"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handlePeriodChange(item)}
            className={`
              min-w-[25px]
              px-1
              py-1
              text-[9px]
              font-bold
              transition
              ${
                period === item
                  ? "text-[#047857]"
                  : "text-slate-400"
              }
            `}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeField;
