// frontend/src/pages/Collections.jsx

import { useEffect, useMemo, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getCurrentShift,
  updateCollections,
  getCurrentFuelRate,
  searchCustomers,
  addUdhariTransaction,
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
  return value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
};

const sanitizeNumberInput = (value) => {
  return value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
};

const formatOutstanding = (paise) => {
  return `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const Collections = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isEndShift = location.state?.mode === "end-shift";

  const [activeTab, setActiveTab] = useState("cash");

  const [shift, setShift] = useState(null);

  // ---------------------------
  // Cash / UPI / Card
  // ---------------------------

  const [cashCounts, setCashCounts] = useState(createEmptyCounts());

  const [upi, setUpi] = useState("");
  const [card, setCard] = useState("");
  const [udhari, setUdhari] = useState("");

  // ---------------------------
  // Fuel rates
  // ---------------------------

  const [fuelRates, setFuelRates] = useState({
    PETROL: 0,
    DIESEL: 0,
  });

  // ---------------------------
  // Udhari
  // ---------------------------

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerName, setCustomerName] = useState("");

  const [vehicleNumber, setVehicleNumber] = useState("");

  const [udhariFuelType, setUdhariFuelType] = useState("DIESEL");

  const [udhariMode, setUdhariMode] = useState("litres");

  const [udhariLitres, setUdhariLitres] = useState("");

  const [udhariAmount, setUdhariAmount] = useState("");

  const [addingUdhari, setAddingUdhari] = useState(false);

  const [udhariEntries, setUdhariEntries] = useState([]);

  const [udhariError, setUdhariError] = useState("");

  // ---------------------------
  // General state
  // ---------------------------

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  // ============================================================
  // LOAD CURRENT SHIFT
  // ============================================================

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

        // -------------------------
        // Existing cash collection
        // -------------------------

        const counts = createEmptyCounts();

        (currentShift.cashCollections || []).forEach((item) => {
          const denomination = Number(item.denomination);

          if (DENOMINATIONS.includes(denomination)) {
            counts[denomination] = Number(item.count) || 0;
          }
        });

        setCashCounts(counts);

        // -------------------------
        // Existing digital amounts
        // -------------------------

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

        setUdhari(
          currentShift.totalUdhariPaise
            ? String(currentShift.totalUdhariPaise / 100)
            : "",
        );

        // -------------------------
        // Load current applicable rates
        // -------------------------

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

        // -------------------------
        // Existing Udhari entries
        // -------------------------

        if (Array.isArray(currentShift.udhariEntries)) {
          setUdhariEntries(currentShift.udhariEntries);
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

  // ============================================================
  // CASH CALCULATION
  // ============================================================

  const totalCashPaise = useMemo(() => {
    return DENOMINATIONS.reduce((total, denomination) => {
      const count = Number(cashCounts[denomination] || 0);

      return total + denomination * count * 100;
    }, 0);
  }, [cashCounts]);

  // ============================================================
  // CASH HANDLERS
  // ============================================================

  const changeCashCount = (denomination, delta) => {
    setCashCounts((current) => ({
      ...current,
      [denomination]: Math.max(0, Number(current[denomination] || 0) + delta),
    }));

    setSavedMessage("");
  };

  const updateCashCount = (denomination, value) => {
    const cleaned = value.replace(/\D/g, "");

    setCashCounts((current) => ({
      ...current,
      [denomination]: cleaned ? Number(cleaned) : 0,
    }));

    setSavedMessage("");
  };

  // ============================================================
  // COLLECTION PAYLOAD
  // ============================================================

  const buildPayload = () => {
    const cashBreakdown = DENOMINATIONS.map((denomination) => ({
      denomination,
      count: Number(cashCounts[denomination] || 0),
    })).filter((item) => item.count > 0);

    return {
      cashBreakdown,

      upiPaise: parseRupeesToPaise(upi),

      cardPaise: parseRupeesToPaise(card),

      /*
       * IMPORTANT:
       *
       * Udhari transactions update
       * totalUdhariPaise themselves.
       *
       * We therefore preserve the current
       * shift total here instead of using a
       * temporary Udhari input.
       */
      udhariPaise: Number(shift?.totalUdhariPaise || 0),
    };
  };

  // ============================================================
  // SAVE CASH / UPI / CARD COLLECTION
  // ============================================================

  const handleSave = async () => {
    if (!shift?._id || saving) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      const response = await updateCollections(shift._id, buildPayload());

      const updatedShift = response?.data;

      if (updatedShift) {
        setShift(updatedShift);
      }

      /*
       * Normal Cash Collection:
       *
       * Save → Dashboard
       */
      if (!isEndShift) {
        navigate("/dashboard", {
          replace: true,
        });

        return;
      }

      /*
       * End Shift:
       * do NOT navigate here.
       *
       * Stage 2 uses handleReview().
       */
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
    if (!shift?._id || saving) {
      return;
    }

    /*
     * Stage 1 data passed from EndShift.jsx
     */
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

      /*
       * First save the current collection state.
       *
       * This ensures the active shift contains
       * the latest Cash / UPI / Card / Udhari values.
       */
      const collectionPayload = buildPayload();

      const saveResponse = await updateCollections(
        shift._id,
        collectionPayload,
      );

      const updatedShift = saveResponse?.data;

      if (updatedShift) {
        setShift(updatedShift);
      }

      /*
       * Move to Stage 3.
       *
       * We pass:
       * - shift
       * - final nozzle readings
       * - current collection payload
       *
       * Review page will call previewEndShift().
       */
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

  // ============================================================
  // UDHARI CUSTOMER SEARCH
  // ============================================================

  const handleCustomerSearch = async (value) => {
    setCustomerSearch(value);
    setCustomerName(value);
    setSelectedCustomer(null);
    setUdhariError("");

    const query = value.trim();

    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }

    try {
      setSearchingCustomers(true);

      const response = await searchCustomers(query);

      setCustomerResults(response?.data || []);
    } catch (err) {
      setCustomerResults([]);

      setUdhariError(
        err?.response?.data?.message || "Unable to search customers.",
      );
    } finally {
      setSearchingCustomers(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);

    setCustomerName(customer.name || "");

    setCustomerSearch(customer.name || "");

    /*
     * Vehicle number is only a suggestion.
     * Employee can change it for this transaction.
     */
    setVehicleNumber(customer.vehicleNumber || "");

    setCustomerResults([]);
    setUdhariError("");
  };

  // ============================================================
  // UDHARI RATE / CALCULATION
  // ============================================================

  const currentUdhariRatePaise = Number(fuelRates[udhariFuelType] || 0);

  const calculatedUdhariAmount =
    udhariLitres !== "" && currentUdhariRatePaise > 0
      ? Math.round(Number(udhariLitres) * currentUdhariRatePaise)
      : 0;

  const calculatedUdhariLitres =
    udhariAmount !== "" && currentUdhariRatePaise > 0
      ? Number(udhariAmount) / currentUdhariRatePaise
      : 0;

  // ============================================================
  // ADD UDHARI TRANSACTION
  // ============================================================

  const handleAddUdhari = async () => {
    if (addingUdhari || !shift?._id) {
      return;
    }

    setUdhariError("");

    const name = selectedCustomer?.name || customerName.trim();

    if (name.length < 2) {
      setUdhariError("Enter or select a customer name.");
      return;
    }

    if (currentUdhariRatePaise <= 0) {
      setUdhariError("Fuel rate is unavailable.");
      return;
    }

    let litres = 0;
    let amountPaise = 0;

    // -------------------------
    // Entered in litres
    // -------------------------

    if (udhariMode === "litres") {
      litres = Number(udhariLitres);

      if (!Number.isFinite(litres) || litres <= 0) {
        setUdhariError("Enter a valid litre amount.");
        return;
      }

      amountPaise = Math.round(litres * currentUdhariRatePaise);
    }

    // -------------------------
    // Entered in rupees
    // -------------------------
    else {
      amountPaise = parseRupeesToPaise(udhariAmount);

      if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
        setUdhariError("Enter a valid rupee amount.");
        return;
      }

      litres = amountPaise / currentUdhariRatePaise;
    }

    try {
      setAddingUdhari(true);

      const response = await addUdhariTransaction({
        shiftId: shift._id,

        customerId: selectedCustomer?._id,

        customerName: name,

        vehicleNumber: vehicleNumber.trim().toUpperCase() || undefined,

        fuelType: udhariFuelType,

        litres,

        amountPaise,
      });

      const result = response?.data;

      /*
       * Add the newly-created transaction
       * to the current screen.
       */
      const transaction = result?.transaction;

      const customer = result?.customer || selectedCustomer;

      setUdhariEntries((current) => [
        ...current,
        {
          id: transaction?._id || `${Date.now()}`,

          customerId: customer?._id || selectedCustomer?._id || null,

          customer: customer
            ? {
                _id: customer._id,
                name: customer.name,
                outstandingBalance: customer.outstandingBalance,
              }
            : {
                name,
              },

          vehicleNumber:
            transaction?.vehicleNumber ||
            vehicleNumber.trim().toUpperCase() ||
            null,

          fuelType: transaction?.fuelType || udhariFuelType,

          litres: transaction?.litres ?? litres,

          ratePaise: transaction?.ratePaise ?? currentUdhariRatePaise,

          amountPaise: transaction?.amountPaise ?? amountPaise,
        },
      ]);

      /*
       * Update the shift Udhari total.
       *
       * Backend should ideally return the
       * updated total. If not, add the new
       * amount locally.
       */
      const updatedUdhariTotal = Number(
        result?.shift?.totalUdhariPaise ?? shift.totalUdhariPaise ?? 0,
      );

      const finalUdhariTotal =
        result?.shift?.totalUdhariPaise != null
          ? updatedUdhariTotal
          : updatedUdhariTotal + amountPaise;

      setUdhari(String(finalUdhariTotal / 100));

      setShift((current) => ({
        ...current,
        totalUdhariPaise: finalUdhariTotal,
        totalCollectedPaise:
          Number(current?.totalCashPaise || 0) +
          Number(current?.totalUpiPaise || 0) +
          Number(current?.totalCardPaise || 0) +
          finalUdhariTotal,
      }));

      /*
       * Reset only the transaction-specific
       * fields.
       *
       * Keep selected customer so another
       * transaction can be entered for them.
       */
      setVehicleNumber("");
      setUdhariLitres("");
      setUdhariAmount("");
      setSavedMessage("Udhari added successfully.");
    } catch (err) {
      setUdhariError(
        err?.response?.data?.message || err?.message || "Unable to add Udhari.",
      );
    } finally {
      setAddingUdhari(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

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

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          "--background": "#F3F4F6",
        }}
      >
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-28 pt-[max(0.9rem,env(safe-area-inset-top))]">
          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigate("/dashboard");
                }}
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

          {/* ================================================= */}
          {/* TABS */}
          {/* ================================================= */}

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

              <div className="mt-4 flex items-center px-3">
                <div className="w-[72px]" />

                <div className="flex-1 text-center text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Count
                </div>

                <div className="w-[82px] text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Value
                </div>
              </div>

              <section className="mt-2 rounded-[18px] bg-white p-2 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                {DENOMINATIONS.map((denomination) => {
                  const count = Number(cashCounts[denomination] || 0);

                  const valuePaise = denomination * count * 100;

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
                      <div className="w-[72px] pl-2">
                        <span className="text-[12px] font-semibold text-slate-700">
                          ₹ {denomination}
                        </span>
                      </div>

                      <div className="flex flex-1 items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => changeCashCount(denomination, -1)}
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
                        >
                          −
                        </button>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={count}
                          onChange={(event) =>
                            updateCashCount(denomination, event.target.value)
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
                          onClick={() => changeCashCount(denomination, 1)}
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
                        >
                          +
                        </button>
                      </div>

                      <div className="w-[82px] pr-2 text-right">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {formatCurrency(valuePaise)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-2 flex items-center justify-between rounded-[12px] bg-emerald-50 px-3 py-3">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Total Cash
                  </span>

                  <span className="text-[17px] font-bold text-[#047857]">
                    {formatCurrency(totalCashPaise)}
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
              <p className="text-[16px] font-bold text-slate-900">
                UPI Collection
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Enter the total UPI amount received so far.
              </p>

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
                      setUpi(sanitizeMoneyInput(event.target.value));

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
              <p className="text-[16px] font-bold text-slate-900">
                Card / ATM Collection
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Enter the total card / ATM amount received so far.
              </p>

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
                      setCard(sanitizeMoneyInput(event.target.value));

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
            <div className="mt-4 space-y-4">
              {/* Main Udhari form */}
              <section className="rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <div>
                  <p className="text-[16px] font-bold text-slate-900">
                    Udhari Collection
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Add fuel given on credit to a customer.
                  </p>
                </div>

                {/* Customer */}
                <div className="mt-5">
                  <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                    Customer Name
                  </label>

                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(event) =>
                        handleCustomerSearch(event.target.value)
                      }
                      placeholder="Search customer..."
                      className="
                        h-[48px]
                        w-full
                        rounded-[12px]
                        border
                        border-slate-200
                        bg-slate-50
                        px-3
                        pr-10
                        text-[13px]
                        font-semibold
                        text-slate-900
                        outline-none
                        focus:border-[#047857]
                        focus:bg-white
                      "
                    />

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-4-4" />
                    </svg>

                    {/* Search results */}
                    {customerResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-[54px] z-30 overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
                        {customerResults.map((customer) => (
                          <button
                            key={customer._id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="
                                flex
                                w-full
                                items-center
                                justify-between
                                border-b
                                border-slate-50
                                px-4
                                py-3
                                text-left
                                last:border-b-0
                                hover:bg-slate-50
                              "
                          >
                            <div>
                              <p className="text-[12px] font-semibold text-slate-900">
                                {customer.name}
                              </p>

                              {customer.vehicleNumber && (
                                <p className="mt-0.5 text-[9px] text-slate-400">
                                  {customer.vehicleNumber}
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="text-[8px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                                Owes
                              </p>

                              <p className="mt-0.5 text-[10px] font-bold text-slate-700">
                                {formatOutstanding(customer.outstandingBalance)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchingCustomers && (
                      <p className="mt-1 text-[9px] text-slate-400">
                        Searching...
                      </p>
                    )}
                  </div>
                </div>

                {/* Selected customer */}
                {selectedCustomer && (
                  <div className="mt-3 rounded-[13px] bg-emerald-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-bold text-slate-900">
                          {selectedCustomer.name}
                        </p>

                        <p className="mt-0.5 text-[9px] text-emerald-700">
                          Existing customer
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[8px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                          Outstanding
                        </p>

                        <p className="mt-0.5 text-[12px] font-bold text-[#047857]">
                          {formatOutstanding(
                            selectedCustomer.outstandingBalance,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vehicle number */}
                <div className="mt-4">
                  <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                    Vehicle Number
                    <span className="ml-1 font-normal normal-case">
                      (optional)
                    </span>
                  </label>

                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(event) => setVehicleNumber(event.target.value)}
                    placeholder="MH16AB1234"
                    className="
                      mt-2
                      h-[46px]
                      w-full
                      rounded-[11px]
                      border
                      border-slate-200
                      bg-slate-50
                      px-3
                      text-[13px]
                      font-semibold
                      uppercase
                      text-slate-900
                      outline-none
                      focus:border-[#047857]
                      focus:bg-white
                    "
                  />
                </div>

                {/* Fuel type */}
                <div className="mt-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                    Fuel Type
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUdhariFuelType("PETROL")}
                      className={`
                        min-h-[42px]
                        rounded-[11px]
                        text-[11px]
                        font-semibold
                        ${
                          udhariFuelType === "PETROL"
                            ? "bg-[#047857] text-white"
                            : "border border-emerald-100 bg-emerald-50 text-emerald-700"
                        }
                      `}
                    >
                      Petrol
                    </button>

                    <button
                      type="button"
                      onClick={() => setUdhariFuelType("DIESEL")}
                      className={`
                        min-h-[42px]
                        rounded-[11px]
                        text-[11px]
                        font-semibold
                        ${
                          udhariFuelType === "DIESEL"
                            ? "bg-blue-600 text-white"
                            : "border border-blue-100 bg-blue-50 text-blue-700"
                        }
                      `}
                    >
                      Diesel
                    </button>
                  </div>
                </div>

                {/* Enter litres / rupees */}
                <div className="mt-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                    Enter
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-[12px] bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setUdhariMode("litres")}
                      className={`
                        min-h-[36px]
                        rounded-[9px]
                        text-[10px]
                        font-semibold
                        ${
                          udhariMode === "litres"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                        }
                      `}
                    >
                      Litres
                    </button>

                    <button
                      type="button"
                      onClick={() => setUdhariMode("amount")}
                      className={`
                        min-h-[36px]
                        rounded-[9px]
                        text-[10px]
                        font-semibold
                        ${
                          udhariMode === "amount"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                        }
                      `}
                    >
                      Rupees
                    </button>
                  </div>
                </div>

                {/* Litres input */}
                {udhariMode === "litres" && (
                  <div className="mt-3">
                    <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                      Litres
                    </label>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={udhariLitres}
                      onChange={(event) =>
                        setUdhariLitres(sanitizeNumberInput(event.target.value))
                      }
                      placeholder="30.00"
                      className="
                        mt-2
                        h-[50px]
                        w-full
                        rounded-[12px]
                        border
                        border-slate-200
                        bg-slate-50
                        px-3
                        text-[18px]
                        font-bold
                        text-slate-900
                        outline-none
                        focus:border-[#047857]
                        focus:bg-white
                      "
                    />

                    <div className="mt-2 flex items-center justify-between rounded-[11px] bg-slate-50 px-3 py-2">
                      <span className="text-[9px] text-slate-500">Rate</span>

                      <span className="text-[11px] font-semibold text-slate-700">
                        {currentUdhariRatePaise > 0
                          ? `₹${(currentUdhariRatePaise / 100).toFixed(2)} / L`
                          : "—"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-[11px] bg-amber-50 px-3 py-2.5">
                      <span className="text-[9px] font-semibold text-slate-600">
                        Amount
                      </span>

                      <span className="text-[15px] font-bold text-slate-900">
                        {udhariLitres
                          ? formatCurrency(calculatedUdhariAmount)
                          : "₹0.00"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Amount input */}
                {udhariMode === "amount" && (
                  <div className="mt-3">
                    <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                      Amount
                    </label>

                    <div className="mt-2 flex h-[50px] items-center rounded-[12px] border border-slate-200 bg-slate-50 px-3">
                      <span className="mr-2 text-[18px] font-bold text-slate-400">
                        ₹
                      </span>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={udhariAmount}
                        onChange={(event) =>
                          setUdhariAmount(
                            sanitizeMoneyInput(event.target.value),
                          )
                        }
                        placeholder="2963.10"
                        className="
                          min-w-0
                          flex-1
                          bg-transparent
                          text-[18px]
                          font-bold
                          text-slate-900
                          outline-none
                        "
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-[11px] bg-slate-50 px-3 py-2">
                      <span className="text-[9px] text-slate-500">Rate</span>

                      <span className="text-[11px] font-semibold text-slate-700">
                        {currentUdhariRatePaise > 0
                          ? `₹${(currentUdhariRatePaise / 100).toFixed(2)} / L`
                          : "—"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-[11px] bg-emerald-50 px-3 py-2.5">
                      <span className="text-[9px] font-semibold text-slate-600">
                        Litres
                      </span>

                      <span className="text-[15px] font-bold text-[#047857]">
                        {udhariAmount
                          ? `${calculatedUdhariLitres.toFixed(2)} L`
                          : "0.00 L"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {udhariError && (
                  <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2.5 text-[10px] font-medium leading-4 text-red-700">
                    {udhariError}
                  </div>
                )}

                {/* Add Udhari */}
                <button
                  type="button"
                  onClick={handleAddUdhari}
                  disabled={addingUdhari}
                  className="
                    mt-5
                    flex
                    min-h-[50px]
                    w-full
                    items-center
                    justify-center
                    rounded-[14px]
                    bg-[#047857]
                    text-[13px]
                    font-semibold
                    text-white
                    shadow-[0_8px_18px_rgba(4,120,87,0.16)]
                    transition
                    active:scale-[0.985]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {addingUdhari ? "Adding..." : "+ Add Udhari"}
                </button>
              </section>

              {/* ================================================= */}
              {/* THIS SHIFT UDHARI */}
              {/* ================================================= */}

              {udhariEntries.length > 0 && (
                <section className="rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">
                        This Shift
                      </p>

                      <p className="mt-0.5 text-[9px] text-slate-400">
                        Udhari added during this shift
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-700">
                      {udhariEntries.length} entries
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {udhariEntries.map((entry, index) => (
                      <div
                        key={entry.id || `${entry.customerId}-${index}`}
                        className="rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-bold text-slate-900">
                              {entry.customer?.name ||
                                entry.customerName ||
                                "Customer"}
                            </p>

                            <p className="mt-1 text-[9px] font-medium text-slate-500">
                              {entry.fuelType === "DIESEL"
                                ? "Diesel"
                                : "Petrol"}
                              {" · "}
                              {Number(entry.litres || 0).toFixed(2)}
                              {" L"}
                            </p>

                            {entry.vehicleNumber && (
                              <p className="mt-0.5 text-[9px] text-slate-400">
                                {entry.vehicleNumber}
                              </p>
                            )}
                          </div>

                          <p className="shrink-0 text-[13px] font-bold text-slate-900">
                            {formatCurrency(entry.amountPaise)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shift Udhari Total */}
                  <div className="mt-3 flex items-center justify-between rounded-[12px] bg-amber-50 px-3 py-3">
                    <span className="text-[10px] font-semibold text-slate-600">
                      Shift Udhari
                    </span>

                    <span className="text-[15px] font-bold text-amber-700">
                      {formatCurrency(shift?.totalUdhariPaise || 0)}
                    </span>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ================================================= */}
          {/* GENERAL MESSAGES */}
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
                onClick={isEndShift ? handleReview : handleSave}
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
