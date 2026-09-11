import { useEffect, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getCurrentFuelRate,
  getCurrentShift,
  updateCollections,
} from "../services/shiftApi";
import CashCollection from "../components/collections/CashCollection";
import UpiCollection from "../components/collections/UpiCollection";
import AtmCollection from "../components/collections/AtmCollection";
import UdhariCollection from "../components/collections/UdhariCollection";
import {
  readShiftWorkflowState,
  saveShiftWorkflowState,
} from "../utils/shiftWorkflow";

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
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : 0;
};

const sanitizeMoneyInput = (value) =>
  value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

const stageConfig = {
  cash: { title: "Cash Collection", previous: "/shift/nozzle", next: "/shift/upi", label: "Cash" },
  upi: { title: "UPI Collection", previous: "/shift/cash", next: "/shift/card", label: "UPI" },
  card: { title: "Card / ATM Collection", previous: "/shift/upi", next: "/shift/udhari", label: "Card" },
  udhari: { title: "Udhari Collection", previous: "/shift/card", next: "/shift/expense", label: "Udhari" },
};

const ShiftCollectionStage = ({ stage }) => {
  const config = stageConfig[stage];
  const location = useLocation();
  const navigate = useNavigate();
  const workflowState = readShiftWorkflowState(location.state);
  const [shift, setShift] = useState(null);
  const [cashCounts, setCashCounts] = useState(createEmptyCounts());
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState("");
  const [fuelRates, setFuelRates] = useState({ PETROL: 0, DIESEL: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const mpdId = shift?.mpdId?._id || shift?.mpdId;

  useEffect(() => {
    let mounted = true;

    const loadShift = async () => {
      try {
        const response = await getCurrentShift();
        const currentShift = response?.data;

        if (!currentShift) {
          navigate("/select-mpd", { replace: true });
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
        setUpi(currentShift.totalUpiPaise ? String(currentShift.totalUpiPaise / 100) : "");
        setCard(currentShift.totalCardPaise ? String(currentShift.totalCardPaise / 100) : "");

        try {
          const rateResponse = await getCurrentFuelRate(currentShift.businessDate);
          const rates = rateResponse?.data;
          if (rates && mounted) {
            setFuelRates({
              PETROL: Number(rates.petrolRatePaise || 0),
              DIESEL: Number(rates.dieselRatePaise || 0),
            });
          }
        } catch {
          // Collection screens can still load if rates are temporarily unavailable.
        }
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message || err?.message || "Unable to load collection.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadShift();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const buildPayload = () => ({
    cashBreakdown: DENOMINATIONS.map((denomination) => ({
      denomination,
      count: Number(cashCounts[denomination] || 0),
    })).filter((item) => item.count > 0),
    upiPaise: parseRupeesToPaise(upi),
    cardPaise: parseRupeesToPaise(card),
    udhariPaise: Number(shift?.totalUdhariPaise || 0),
  });

  const handleNext = async () => {
    if (!shift?._id || saving) return;

    try {
      setSaving(true);
      setError("");
      const response = await updateCollections(shift._id, buildPayload());
      if (response?.data) setShift(response.data);
      const nextState = { ...workflowState, collections: buildPayload() };
      saveShiftWorkflowState(nextState);
      navigate(config.next, { state: nextState });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to save collection.");
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
          <header className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(stage === "cash" ? `/shift/${mpdId}` : config.previous, { state: workflowState })}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow-sm"
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900">{config.title}</h1>
              <p className="text-[10px] text-slate-500">{shift?.mpdId?.mpdNumber || "MPD"}</p>
            </div>
          </header>

          <div className="mt-5 rounded-[18px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              {["Nozzle", "Cash", "UPI", "Card", "Udhari", "Expense", "Review"].map((label, index) => (
                <div key={label} className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${label === config.label ? "bg-[#047857] text-white" : index < ["Nozzle", "Cash", "UPI", "Card", "Udhari", "Expense", "Review"].indexOf(config.label) + 1 ? "bg-emerald-100 text-[#047857]" : "bg-slate-100 text-slate-400"}`}>
                  {index + 1}
                </div>
              ))}
            </div>
          </div>

          {stage === "cash" && <CashCollection cashCounts={cashCounts} onCashCountsChange={setCashCounts} onSavedMessage={setSavedMessage} />}
          {stage === "upi" && <UpiCollection upi={upi} onUpiChange={(value) => setUpi(sanitizeMoneyInput(value))} onSavedMessage={setSavedMessage} />}
          {stage === "card" && <AtmCollection card={card} onCardChange={(value) => setCard(sanitizeMoneyInput(value))} onSavedMessage={setSavedMessage} />}
          {stage === "udhari" && <UdhariCollection shift={shift} fuelRates={fuelRates} onShiftUpdate={setShift} onSavedMessage={setSavedMessage} />}

          {error && <div className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[11px] font-medium leading-4 text-red-700">{error}</div>}
          {savedMessage && <div className="mt-4 rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-[11px] font-medium leading-4 text-emerald-700">{savedMessage}</div>}

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <div className="mx-auto max-w-[480px]">
              <button type="button" onClick={handleNext} disabled={saving} className="flex min-h-[52px] w-full items-center justify-center rounded-[15px] bg-[#047857] text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(4,120,87,0.18)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? "Saving..." : `Next: ${stage === "cash" ? "UPI" : stage === "upi" ? "Card / ATM" : stage === "card" ? "Udhari" : "Expense"}`}
              </button>
            </div>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default ShiftCollectionStage;
