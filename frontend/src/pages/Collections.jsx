// frontend/src/pages/Collections.jsx

import { useEffect, useMemo, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getCurrentShift,
  updateCollections,
} from "../services/shiftApi";

import { getBusinessDate } from "../utils/businessDate";

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const createEmptyCounts = () => ({
  500: 0,
  200: 0,
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  2: 0,
  1: 0,
});

const formatCurrency = (paise) => {
  return `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const parseRupeesToPaise = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.round(number * 100);
};

const sanitizeMoneyInput = (value) => {
  return value
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");
};

const Collections = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /*
   * Normal entry:
   * Dashboard → Cash Collection
   *
   * End-shift entry:
   * End Shift → Stage 2: Final Money Count
   */
  const isEndShift =
    location.state?.mode === "end-shift";

  const [activeTab, setActiveTab] = useState("cash");

  const [shift, setShift] = useState(null);

  const [cashCounts, setCashCounts] = useState(
    createEmptyCounts(),
  );

  const [upi, setUpi] = useState("");
  const [card, setCard] = useState("");
  const [udhari, setUdhari] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  /*
   * Load active shift and previously saved
   * collection values.
   */
  useEffect(() => {
    let mounted = true;

    const loadShift = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCurrentShift();

        const currentShift = response?.data;

        if (!currentShift) {
          navigate("/dashboard", {
            replace: true,
          });
          return;
        }

        if (!mounted) return;

        setShift(currentShift);

        /*
         * Convert backend cashCollections:
         *
         * [
         *   {
         *     denomination: 500,
         *     count: 20,
         *     totalPaise: 100000
         *   }
         * ]
         *
         * into local count object.
         */
        const counts = createEmptyCounts();

        (
          currentShift.cashCollections || []
        ).forEach((item) => {
          const denomination = Number(
            item.denomination,
          );

          if (
            DENOMINATIONS.includes(
              denomination,
            )
          ) {
            counts[denomination] =
              Number(item.count) || 0;
          }
        });

        setCashCounts(counts);

        /*
         * Backend stores financial values in paise.
         * UI works in rupees.
         */
        setUpi(
          currentShift.totalUpiPaise
            ? String(
                currentShift.totalUpiPaise / 100,
              )
            : "",
        );

        setCard(
          currentShift.totalCardPaise
            ? String(
                currentShift.totalCardPaise / 100,
              )
            : "",
        );

        setUdhari(
          currentShift.totalUdhariPaise
            ? String(
                currentShift.totalUdhariPaise / 100,
              )
            : "",
        );
      } catch (err) {
        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load collection.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadShift();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  /*
   * Calculate total cash locally.
   *
   * Example:
   * ₹500 × 10 = ₹5,000
   */
  const totalCashPaise = useMemo(() => {
    return DENOMINATIONS.reduce(
      (total, denomination) => {
        const count = Number(
          cashCounts[denomination] || 0,
        );

        return (
          total +
          denomination * count * 100
        );
      },
      0,
    );
  }, [cashCounts]);

  /*
   * Update a cash denomination by +1 / -1.
   */
  const changeCashCount = (
    denomination,
    delta,
  ) => {
    setCashCounts((current) => ({
      ...current,
      [denomination]: Math.max(
        0,
        Number(
          current[denomination] || 0,
        ) + delta,
      ),
    }));

    setSavedMessage("");
  };

  /*
   * Allow direct count entry.
   */
  const updateCashCount = (
    denomination,
    value,
  ) => {
    const cleaned = value.replace(
      /\D/g,
      "",
    );

    setCashCounts((current) => ({
      ...current,
      [denomination]: cleaned
        ? Number(cleaned)
        : 0,
    }));

    setSavedMessage("");
  };

  /*
   * Build the exact payload expected
   * by the current backend.
   *
   * {
   *   cashBreakdown: [
   *     { denomination: 500, count: 20 },
   *     ...
   *   ],
   *   upiPaise: 250000,
   *   cardPaise: 500000,
   *   udhariPaise: 100000
   * }
   */
  const buildPayload = () => {
    const cashBreakdown =
      DENOMINATIONS
        .map((denomination) => ({
          denomination,
          count: Number(
            cashCounts[denomination] || 0,
          ),
        }))
        .filter(
          (item) => item.count > 0,
        );

    return {
      cashBreakdown,
      upiPaise:
        parseRupeesToPaise(upi),
      cardPaise:
        parseRupeesToPaise(card),
      udhariPaise:
        parseRupeesToPaise(udhari),
    };
  };

  /*
   * Save complete current collection state.
   */
  const handleSave = async () => {
    if (!shift?._id || saving) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      const response =
        await updateCollections(
          shift._id,
          buildPayload(),
        );

      /*
       * Backend returns updated shift.
       * Keep local state synchronized.
       */
      const updatedShift =
        response?.data;

      if (updatedShift) {
        setShift(updatedShift);
      }

      setSavedMessage(
        "Collection saved successfully.",
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save collection.",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <IonPage>
        <IonContent
          fullscreen
          style={{
            "--background": "#F3F4F6",
          }}
        >
          <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pt-6">
            <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />

            <div className="mt-5 h-12 animate-pulse rounded-[16px] bg-white" />

            <div className="mt-4 h-[520px] animate-pulse rounded-[20px] bg-white" />
          </main>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          "--background": "#F3F4F6",
        }}
      >
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-28 pt-[max(0.9rem,env(safe-area-inset-top))]">

          {/* HEADER */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate("/dashboard")
                }
                className="
                  grid
                  h-9
                  w-9
                  place-items-center
                  rounded-full
                  bg-white
                  text-slate-700
                  shadow-sm
                "
                aria-label="Back"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <div>
                <h1 className="text-[18px] font-bold text-slate-900">
                  {isEndShift
                    ? "Final Money Count"
                    : "Cash Collection"}
                </h1>

                <p className="text-[10px] text-slate-500">
                  {isEndShift
                    ? "Verify final collection"
                    : shift?.mpdId?.mpdNumber ||
                      "MPD"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="
                grid
                h-9
                w-9
                place-items-center
                rounded-full
                bg-white
                text-slate-500
              "
              aria-label="More options"
            >
              ⋮
            </button>
          </header>

          {/* TABS */}
          <div className="mt-5 grid grid-cols-4 gap-1 rounded-[14px] bg-white p-1 shadow-[0_3px_12px_rgba(15,23,42,0.04)]">
            {[
              ["cash", "Cash"],
              ["upi", "UPI"],
              ["card", "Card"],
              ["udhari", "Udhari"],
            ].map(([value, label]) => {
              const active =
                activeTab === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setActiveTab(value);
                    setSavedMessage("");
                  }}
                  className={`
                    min-h-[38px]
                    rounded-[10px]
                    text-[11px]
                    font-semibold
                    transition
                    ${
                      active
                        ? "bg-[#047857] text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50"
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ================================================= */}
          {/* CASH TAB */}
          {/* ================================================= */}

          {activeTab === "cash" && (
            <>
              {/* Cash visual */}
              <div className="mt-4 overflow-hidden rounded-[18px] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <div className="flex h-[116px] items-center justify-center bg-gradient-to-b from-amber-50 to-emerald-50">
                  <div className="text-center">
                    <div className="text-[36px] font-bold text-[#047857]">
                      ₹
                    </div>

                    <p className="mt-1 text-[10px] font-medium text-slate-500">
                      Cash collected so far
                    </p>
                  </div>
                </div>
              </div>

              {/* Column headings */}
              <div className="mt-4 flex items-center px-3">
                <div className="w-[72px]" />

                <div className="flex-1 text-center text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Count
                </div>

                <div className="w-[82px] text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Value
                </div>
              </div>

              {/* Denominations */}
              <section className="mt-2 rounded-[18px] bg-white p-2 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

                {DENOMINATIONS.map(
                  (denomination) => {
                    const count =
                      Number(
                        cashCounts[
                          denomination
                        ] || 0,
                      );

                    const valuePaise =
                      denomination *
                      count *
                      100;

                    return (
                      <div
                        key={denomination}
                        className="
                          flex
                          min-h-[43px]
                          items-center
                          border-b
                          border-slate-50
                          last:border-b-0
                        "
                      >
                        {/* Denomination */}
                        <div className="w-[72px] pl-2">
                          <span className="text-[12px] font-semibold text-slate-700">
                            ₹ {denomination}
                          </span>
                        </div>

                        {/* Counter */}
                        <div className="flex flex-1 items-center justify-center gap-1.5">

                          <button
                            type="button"
                            onClick={() =>
                              changeCashCount(
                                denomination,
                                -1,
                              )
                            }
                            className="
                              grid
                              h-7
                              w-7
                              place-items-center
                              rounded-[8px]
                              border
                              border-slate-200
                              bg-slate-50
                              text-[14px]
                              font-semibold
                              text-slate-500
                            "
                            aria-label={`Decrease ₹${denomination}`}
                          >
                            −
                          </button>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={count}
                            onChange={(event) =>
                              updateCashCount(
                                denomination,
                                event.target.value,
                              )
                            }
                            className="
                              h-7
                              w-[38px]
                              rounded-[7px]
                              border
                              border-slate-200
                              bg-white
                              text-center
                              text-[11px]
                              font-semibold
                              text-slate-800
                              outline-none
                              focus:border-[#047857]
                            "
                          />

                          <button
                            type="button"
                            onClick={() =>
                              changeCashCount(
                                denomination,
                                1,
                              )
                            }
                            className="
                              grid
                              h-7
                              w-7
                              place-items-center
                              rounded-[8px]
                              border
                              border-slate-200
                              bg-slate-50
                              text-[14px]
                              font-semibold
                              text-slate-500
                            "
                            aria-label={`Increase ₹${denomination}`}
                          >
                            +
                          </button>

                        </div>

                        {/* Value */}
                        <div className="w-[82px] pr-2 text-right">
                          <span className="text-[11px] font-semibold text-slate-700">
                            {formatCurrency(
                              valuePaise,
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  },
                )}

                {/* Total */}
                <div className="mt-2 flex items-center justify-between rounded-[12px] bg-emerald-50 px-3 py-3">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Total Cash
                  </span>

                  <span className="text-[17px] font-bold text-[#047857]">
                    {formatCurrency(
                      totalCashPaise,
                    )}
                  </span>
                </div>
              </section>
            </>
          )}

          {/* ================================================= */}
          {/* UPI TAB */}
          {/* ================================================= */}

          {activeTab === "upi" && (
            <section className="mt-4 rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

              <div>
                <p className="text-[16px] font-bold text-slate-900">
                  UPI Collection
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Enter the total UPI amount received so far.
                </p>
              </div>

              <div className="mt-5 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">

                <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Total UPI
                </p>

                <div className="mt-1 flex items-center">
                  <span className="mr-2 text-[20px] font-bold text-slate-400">
                    ₹
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={upi}
                    onChange={(event) => {
                      setUpi(
                        sanitizeMoneyInput(
                          event.target.value,
                        ),
                      );

                      setSavedMessage("");
                    }}
                    placeholder="0.00"
                    className="
                      min-w-0
                      flex-1
                      bg-transparent
                      text-[22px]
                      font-bold
                      text-slate-900
                      outline-none
                    "
                  />
                </div>
              </div>
            </section>
          )}

          {/* ================================================= */}
          {/* CARD TAB */}
          {/* ================================================= */}

          {activeTab === "card" && (
            <section className="mt-4 rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

              <div>
                <p className="text-[16px] font-bold text-slate-900">
                  Card / ATM Collection
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Enter the total card / ATM amount received so far.
                </p>
              </div>

              <div className="mt-5 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">

                <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Total Card / ATM
                </p>

                <div className="mt-1 flex items-center">
                  <span className="mr-2 text-[20px] font-bold text-slate-400">
                    ₹
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={card}
                    onChange={(event) => {
                      setCard(
                        sanitizeMoneyInput(
                          event.target.value,
                        ),
                      );

                      setSavedMessage("");
                    }}
                    placeholder="0.00"
                    className="
                      min-w-0
                      flex-1
                      bg-transparent
                      text-[22px]
                      font-bold
                      text-slate-900
                      outline-none
                    "
                  />
                </div>
              </div>
            </section>
          )}

          {/* ================================================= */}
          {/* UDHARI TAB */}
          {/* ================================================= */}

          {activeTab === "udhari" && (
            <section className="mt-4 rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

              <div>
                <p className="text-[16px] font-bold text-slate-900">
                  Udhari Collection
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Enter the total credit amount for this shift.
                </p>
              </div>

              <div className="mt-5 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">

                <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Total Udhari
                </p>

                <div className="mt-1 flex items-center">
                  <span className="mr-2 text-[20px] font-bold text-slate-400">
                    ₹
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={udhari}
                    onChange={(event) => {
                      setUdhari(
                        sanitizeMoneyInput(
                          event.target.value,
                        ),
                      );

                      setSavedMessage("");
                    }}
                    placeholder="0.00"
                    className="
                      min-w-0
                      flex-1
                      bg-transparent
                      text-[22px]
                      font-bold
                      text-slate-900
                      outline-none
                    "
                  />
                </div>
              </div>
            </section>
          )}

          {/* ================================================= */}
          {/* MESSAGES */}
          {/* ================================================= */}

          {error && (
            <div className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[11px] font-medium leading-4 text-red-700">
              {error}
            </div>
          )}

          {savedMessage && (
            <div className="mt-4 rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-[11px] font-medium leading-4 text-emerald-700">
              {savedMessage}
            </div>
          )}

          {/* ================================================= */}
          {/* BOTTOM ACTION */}
          {/* ================================================= */}

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <div className="mx-auto max-w-[480px]">

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="
                  flex
                  min-h-[52px]
                  w-full
                  items-center
                  justify-center
                  rounded-[15px]
                  bg-[#047857]
                  text-[14px]
                  font-semibold
                  text-white
                  shadow-[0_8px_20px_rgba(4,120,87,0.18)]
                  transition
                  active:scale-[0.985]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {saving
                  ? "Saving..."
                  : isEndShift
                    ? "Next: Review →"
                    : "Save Collection →"}
              </button>

            </div>
          </div>

        </main>
      </IonContent>
    </IonPage>
  );
};

export default Collections;