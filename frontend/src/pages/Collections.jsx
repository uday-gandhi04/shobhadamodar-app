import { useEffect, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getCurrentShift,
  updateCollections,
  getCurrentFuelRate,
} from "../services/shiftApi";
import CashCollection from "../components/collections/CashCollection";
import UpiCollection from "../components/collections/UpiCollection";
import AtmCollection from "../components/collections/AtmCollection";
import UdhariCollection from "../components/collections/UdhariCollection";

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

const parseRupeesToPaise = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.round(number * 100);
};

const sanitizeMoneyInput = (value) => {
  return value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
};

const Collections = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isEndShift = location.state?.mode === "end-shift";

  const [activeTab, setActiveTab] = useState("cash");
  const [shift, setShift] = useState(null);
  const [cashCounts, setCashCounts] = useState(createEmptyCounts());
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState("");
  const [fuelRates, setFuelRates] = useState({ PETROL: 0, DIESEL: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadShift = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCurrentShift();
        const currentShift = response?.data;

        if (!currentShift) {
          navigate("/dashboard", { replace: true });
          return;
        }

        if (!mounted) return;

        setShift(currentShift);

        const counts = createEmptyCounts();
        (currentShift.cashCollections || []).forEach((item) => {
          const denomination = Number(item.denomination);

          if (DENOMINATIONS.includes(denomination)) {
            counts[denomination] = Number(item.count) || 0;
          }
        });
        setCashCounts(counts);

        setUpi(
          currentShift.totalUpiPaise
            ? String(currentShift.totalUpiPaise / 100)
            : "",
        );
        setCard(
          currentShift.totalCardPaise
            ? String(currentShift.totalCardPaise / 100)
            : "",
        );

        try {
          const rateResponse = await getCurrentFuelRate(
            currentShift.businessDate,
          );
          const rates = rateResponse?.data;

          if (rates && mounted) {
            setFuelRates({
              PETROL: Number(rates.petrolRatePaise || 0),
              DIESEL: Number(rates.dieselRatePaise || 0),
            });
          }
        } catch (rateError) {
          console.error("Unable to load fuel rates:", rateError);
        }
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

  const buildPayload = () => {
    const cashBreakdown = DENOMINATIONS.map((denomination) => ({
      denomination,
      count: Number(cashCounts[denomination] || 0),
    })).filter((item) => item.count > 0);

    return {
      cashBreakdown,
      coinsPaise: Number(shift?.coinsPaise || 0),
      upiPaise: parseRupeesToPaise(upi),
      cardPaise: parseRupeesToPaise(card),
      udhariPaise: Number(shift?.totalUdhariPaise || 0),
    };
  };

  const handleSave = async () => {
    if (!shift?._id || saving) return;

    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      const response = await updateCollections(shift._id, buildPayload());
      const updatedShift = response?.data;

      if (updatedShift) setShift(updatedShift);

      if (!isEndShift) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setSavedMessage("Collection saved successfully.");
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

  const handleReview = async () => {
    if (!shift?._id || saving) return;

    const finalReadings = location.state?.finalReadings || [];

    if (finalReadings.length === 0) {
      setError(
        "Final nozzle readings are missing. Please go back and enter them.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      const collectionPayload = buildPayload();
      const saveResponse = await updateCollections(
        shift._id,
        collectionPayload,
      );
      const updatedShift = saveResponse?.data;

      if (updatedShift) setShift(updatedShift);

      navigate("/end-shift-review", {
        state: {
          shiftId: shift._id,
          finalReadings,
          collections: collectionPayload,
          shift: updatedShift || shift,
          mode: "end-shift",
        },
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to prepare final review.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen style={{ "--background": "#F3F4F6" }}>
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
      <IonContent fullscreen style={{ "--background": "#F3F4F6" }}>
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-28 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(isEndShift ? "/end-shift" : "/dashboard", {
                    state: isEndShift
                      ? { finalReadings: location.state?.finalReadings }
                      : undefined,
                  })
                }
                className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow-sm"
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
                  {isEndShift ? "Final Money Count" : "Cash Collection"}
                </h1>
                <p className="text-[10px] text-slate-500">
                  {isEndShift
                    ? "Verify final collection"
                    : shift?.mpdId?.mpdNumber || "MPD"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500"
              aria-label="More options"
            >
              ⋮
            </button>
          </header>

          {isEndShift && (
            <div className="mt-5 rounded-[18px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
              <div className="flex items-center">
                <div className="flex flex-1 items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-[#047857] text-[11px] font-bold text-white">
                    1
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-900">
                      Nozzle
                    </p>

                    <p className="text-[9px] text-slate-400">Completed</p>
                  </div>
                </div>

                <div className="h-px w-8 bg-slate-200" />

                <div className="flex items-center gap-2 px-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-[#047857] text-[11px] font-bold text-white">
                    2
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-900">
                      Money
                    </p>

                    <p className="text-[9px] text-[#047857]">Current step</p>
                  </div>
                </div>

                <div className="h-px w-8 bg-slate-200" />

                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-400">
                    3
                  </div>

                  <p className="hidden text-[11px] font-medium text-slate-400 sm:block">
                    Review
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-4 gap-1 rounded-[14px] bg-white p-1 shadow-[0_3px_12px_rgba(15,23,42,0.04)]">
            {[
              ["cash", "Cash"],
              ["upi", "UPI"],
              ["card", "Card"],
              ["udhari", "Udhari"],
            ].map(([value, label]) => {
              const active = activeTab === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setActiveTab(value);
                    setSavedMessage("");
                  }}
                  className={`min-h-[38px] rounded-[10px] text-[11px] font-semibold transition ${
                    active
                      ? "bg-[#047857] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {activeTab === "cash" && (
            <CashCollection
              cashCounts={cashCounts}
              onCashCountsChange={setCashCounts}
              onSavedMessage={setSavedMessage}
            />
          )}
          {activeTab === "upi" && (
            <UpiCollection
              upi={upi}
              onUpiChange={(value) => setUpi(sanitizeMoneyInput(value))}
              onSavedMessage={setSavedMessage}
            />
          )}
          {activeTab === "card" && (
            <AtmCollection
              card={card}
              onCardChange={(value) => setCard(sanitizeMoneyInput(value))}
              onSavedMessage={setSavedMessage}
            />
          )}
          {activeTab === "udhari" && (
            <UdhariCollection
              shift={shift}
              fuelRates={fuelRates}
              onShiftUpdate={setShift}
              onSavedMessage={setSavedMessage}
            />
          )}

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

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <div className="mx-auto max-w-[480px]">
              <button
                type="button"
                onClick={isEndShift ? handleReview : handleSave}
                disabled={saving}
                className="flex min-h-[52px] w-full items-center justify-center rounded-[15px] bg-[#047857] text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(4,120,87,0.18)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : isEndShift
                    ? "Save & Continue →"
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
