import { useState } from "react";

import {
  addUdhariTransaction,
  searchCustomers,
} from "../../services/shiftApi";

const formatCurrency = (paise) => {
  return `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatOutstanding = (paise) => {
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

const UdhariCollection = ({ shift, fuelRates, onShiftUpdate, onSavedMessage }) => {
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
  const [udhariEntries, setUdhariEntries] = useState(
    () => shift?.udhariEntries || [],
  );
  const [udhariError, setUdhariError] = useState("");

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
    setVehicleNumber(customer.vehicleNumber || "");
    setCustomerResults([]);
    setUdhariError("");
  };

  const currentUdhariRatePaise = Number(fuelRates[udhariFuelType] || 0);

  const calculatedUdhariAmount =
    udhariLitres !== "" && currentUdhariRatePaise > 0
      ? Math.round(Number(udhariLitres) * currentUdhariRatePaise)
      : 0;

  const calculatedUdhariLitres =
    udhariAmount !== "" && currentUdhariRatePaise > 0
      ? Number(udhariAmount) / currentUdhariRatePaise
      : 0;

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

    if (udhariMode === "litres") {
      litres = Number(udhariLitres);

      if (!Number.isFinite(litres) || litres <= 0) {
        setUdhariError("Enter a valid litre amount.");
        return;
      }

      amountPaise = Math.round(litres * currentUdhariRatePaise);
    } else {
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

      const updatedUdhariTotal = Number(
        result?.shift?.totalUdhariPaise ?? shift.totalUdhariPaise ?? 0,
      );

      const finalUdhariTotal =
        result?.shift?.totalUdhariPaise != null
          ? updatedUdhariTotal
          : updatedUdhariTotal + amountPaise;

      onShiftUpdate((current) => ({
        ...current,
        totalUdhariPaise: finalUdhariTotal,
        totalCollectedPaise:
          Number(current?.totalCashPaise || 0) +
          Number(current?.totalUpiPaise || 0) +
          Number(current?.totalCardPaise || 0) +
          finalUdhariTotal,
      }));

      setVehicleNumber("");
      setUdhariLitres("");
      setUdhariAmount("");
      onSavedMessage("Udhari added successfully.");
    } catch (err) {
      setUdhariError(
        err?.response?.data?.message || err?.message || "Unable to add Udhari.",
      );
    } finally {
      setAddingUdhari(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div>
          <p className="text-[16px] font-bold text-slate-900">Udhari Collection</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Add fuel given on credit to a customer.
          </p>
        </div>

        <div className="mt-5">
          <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            Customer Name
          </label>

          <div className="relative mt-2">
            <input
              type="text"
              value={customerSearch}
              onChange={(event) => handleCustomerSearch(event.target.value)}
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
              <p className="mt-1 text-[9px] text-slate-400">Searching...</p>
            )}
          </div>
        </div>

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
                  {formatOutstanding(selectedCustomer.outstandingBalance)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            Vehicle Number
            <span className="ml-1 font-normal normal-case">(optional)</span>
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

        {udhariMode === "amount" && (
          <div className="mt-3">
            <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              Amount
            </label>
            <div className="mt-2 flex h-[50px] items-center rounded-[12px] border border-slate-200 bg-slate-50 px-3">
              <span className="mr-2 text-[18px] font-bold text-slate-400">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={udhariAmount}
                onChange={(event) =>
                  setUdhariAmount(sanitizeMoneyInput(event.target.value))
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

        {udhariError && (
          <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2.5 text-[10px] font-medium leading-4 text-red-700">
            {udhariError}
          </div>
        )}

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

      {udhariEntries.length > 0 && (
        <section className="rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-slate-900">This Shift</p>
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
                      {entry.customer?.name || entry.customerName || "Customer"}
                    </p>
                    <p className="mt-1 text-[9px] font-medium text-slate-500">
                      {entry.fuelType === "DIESEL" ? "Diesel" : "Petrol"}
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
  );
};

export default UdhariCollection;
