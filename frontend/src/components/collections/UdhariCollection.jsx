import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addUdhariTransaction,
  deleteUdhariTransaction,
  searchCustomers,
} from "../../services/shiftApi";

const formatCurrency = (paise) => {
  return `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatOutstanding = (paise) => {
  return `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
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

const sanitizeNumberInput = (value) => {
  return value
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");
};

const UdhariCollection = ({
  shift,
  fuelRates,
  onShiftUpdate,
  onSavedMessage,
}) => {
  const { t } = useTranslation();

  const [customerSearch, setCustomerSearch] =
    useState("");

  const [customerResults, setCustomerResults] =
    useState([]);

  const [searchingCustomers, setSearchingCustomers] =
    useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [slipNumber, setSlipNumber] =
    useState("");

  const [vehicleNumber, setVehicleNumber] =
    useState("");

  const [udhariFuelType, setUdhariFuelType] =
    useState("DIESEL");

  const [udhariMode, setUdhariMode] =
    useState("litres");

  const [udhariLitres, setUdhariLitres] =
    useState("");

  const [udhariAmount, setUdhariAmount] =
    useState("");

  const [addingUdhari, setAddingUdhari] =
    useState(false);

  const [removingUdhariId, setRemovingUdhariId] =
    useState(null);

  const [udhariEntries, setUdhariEntries] =
    useState(() =>
      (shift?.udhariEntries || []).map(
        (entry) => ({
          ...entry,
          id:
            entry.id ||
            entry.transactionId,
        }),
      ),
    );

  const [udhariError, setUdhariError] =
    useState("");

  const handleCustomerSearch = async (
    value,
  ) => {
    setCustomerSearch(value);
    setSelectedCustomer(null);
    setCustomerResults([]);
    setUdhariError("");

    const query = value.trim();

    if (query.length < 1) {
      setSearchingCustomers(false);
      return;
    }

    try {
      setSearchingCustomers(true);

      const response =
        await searchCustomers(query);

      setCustomerResults(
        response?.data || [],
      );
    } catch (err) {
      setCustomerResults([]);

      setUdhariError(
        err?.response?.data?.message ||
          err?.message ||
          t(
            "udhari.error.searchCustomers",
          ),
      );
    } finally {
      setSearchingCustomers(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);

    setCustomerSearch(
      customer?.name || "",
    );

    setVehicleNumber(
      customer?.vehicleNumber || "",
    );

    setCustomerResults([]);
    setUdhariError("");
  };

  const currentUdhariRatePaise = Number(
    fuelRates?.[udhariFuelType] || 0,
  );

  const calculatedUdhariAmount =
    udhariLitres !== "" &&
    currentUdhariRatePaise > 0 &&
    Number.isFinite(
      Number(udhariLitres),
    )
      ? Math.round(
          Number(udhariLitres) *
            currentUdhariRatePaise,
        )
      : 0;

  const enteredAmountPaise =
    parseRupeesToPaise(
      udhariAmount,
    );

  const calculatedUdhariLitres =
    enteredAmountPaise > 0 &&
    currentUdhariRatePaise > 0
      ? enteredAmountPaise /
        currentUdhariRatePaise
      : 0;

  const handleAddUdhari = async () => {
    if (
      addingUdhari ||
      !shift?._id
    ) {
      return;
    }

    setUdhariError("");

    /*
     * Employee MUST select an existing customer.
     * Typing a name alone is not enough.
     */
    if (!selectedCustomer?._id) {
      setUdhariError(
        t("udhari.error.customerName"),
      );
      return;
    }

    if (currentUdhariRatePaise <= 0) {
      setUdhariError(
        t("udhari.error.rateUnavailable"),
      );
      return;
    }

    let litres;
    let amountPaise;

    if (udhariMode === "litres") {
      litres = Number(udhariLitres);

      if (
        !Number.isFinite(litres) ||
        litres <= 0
      ) {
        setUdhariError(
          t(
            "udhari.error.invalidLitres",
          ),
        );
        return;
      }

      amountPaise = Math.round(
        litres *
          currentUdhariRatePaise,
      );
    } else {
      amountPaise =
        enteredAmountPaise;

      if (
        !Number.isFinite(
          amountPaise,
        ) ||
        amountPaise <= 0
      ) {
        setUdhariError(
          t(
            "udhari.error.invalidAmount",
          ),
        );
        return;
      }

      litres =
        amountPaise /
        currentUdhariRatePaise;
    }

    try {
      setAddingUdhari(true);

      const response =
        await addUdhariTransaction({
          shiftId: shift._id,

          customerId:
            selectedCustomer._id,

          customerName:
            selectedCustomer.name,

          slipNumber:
            slipNumber.trim() ||
            undefined,

          vehicleNumber:
            vehicleNumber
              .trim()
              .toUpperCase() ||
            undefined,

          fuelType:
            udhariFuelType,

          ...(udhariMode ===
          "litres"
            ? { litres }
            : {}),

          ratePaise:
            currentUdhariRatePaise,

          amountPaise,
        });

      const result =
        response?.data;

      const transaction =
        result?.transaction;

      const customer =
        result?.customer ||
        selectedCustomer;

      if (!transaction?._id) {
        throw new Error(
          t(
            "udhari.error.missingTransactionId",
          ),
        );
      }

      const newEntry = {
        id: transaction._id,

        transactionId:
          transaction._id,

        customerId:
          customer?._id ||
          selectedCustomer._id,

        slipNumber:
          transaction?.slipNumber ||
          slipNumber.trim() ||
          null,

        customer: {
          _id:
            customer?._id ||
            selectedCustomer._id,

          name:
            customer?.name ||
            selectedCustomer.name,

          outstandingBalance:
            customer?.outstandingBalance ??
            selectedCustomer.outstandingBalance ??
            0,
        },

        vehicleNumber:
          transaction?.vehicleNumber ||
          vehicleNumber
            .trim()
            .toUpperCase() ||
          null,

        fuelType:
          transaction?.fuelType ||
          udhariFuelType,

        litres:
          transaction?.litres ??
          litres,

        ratePaise:
          transaction?.ratePaise ??
          currentUdhariRatePaise,

        amountPaise:
          transaction?.amountPaise ??
          amountPaise,
      };

      setUdhariEntries(
        (current) => [
          newEntry,
          ...current,
        ],
      );

      const updatedUdhariTotal =
        Number(
          result?.shift
            ?.totalUdhariPaise ??
            shift.totalUdhariPaise ??
            0,
        );

      const finalUdhariTotal =
        result?.shift
          ?.totalUdhariPaise !=
        null
          ? updatedUdhariTotal
          : updatedUdhariTotal +
            amountPaise;

      onShiftUpdate(
        (current) => ({
          ...current,

          totalUdhariPaise:
            finalUdhariTotal,

          totalCollectedPaise:
            Number(
              current?.totalCashPaise ||
                0,
            ) +
            Number(
              current?.totalUpiPaise ||
                0,
            ) +
            Number(
              current?.totalCardPaise ||
                0,
            ) +
            finalUdhariTotal,
        }),
      );

      setSlipNumber("");
      setVehicleNumber("");
      setUdhariLitres("");
      setUdhariAmount("");

      onSavedMessage(
        t("udhari.success.added"),
      );
    } catch (err) {
      setUdhariError(
        err?.response?.data
          ?.message ||
          err?.message ||
          t(
            "udhari.error.addFailed",
          ),
      );
    } finally {
      setAddingUdhari(false);
    }
  };

  const handleRemoveUdhari = async (
    entry,
  ) => {
    if (
      !entry?.id ||
      removingUdhariId ||
      !shift?._id
    ) {
      return;
    }

    const amountPaise =
      Number(
        entry.amountPaise || 0,
      );

    const customerNameForConfirm =
      entry.customer?.name ||
      entry.customerName ||
      t(
        "udhari.customerFallback",
      );

    const confirmed =
      window.confirm(
        `${t(
          "udhari.confirmRemove.title",
        )}\n\n` +
          `${customerNameForConfirm}\n` +
          `${formatCurrency(
            amountPaise,
          )}\n\n` +
          `${t(
            "udhari.confirmRemove.body",
          )}`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingUdhariId(
        entry.id,
      );

      setUdhariError("");

      const response =
        await deleteUdhariTransaction(
          entry.id,
        );

      const result =
        response?.data;

      setUdhariEntries(
        (current) =>
          current.filter(
            (item) =>
              item.id !== entry.id,
          ),
      );

      const backendUdhariTotal =
        result?.shift
          ?.totalUdhariPaise;

      const newUdhariTotal =
        backendUdhariTotal !=
        null
          ? Number(
              backendUdhariTotal,
            )
          : Math.max(
              0,
              Number(
                shift?.totalUdhariPaise ||
                  0,
              ) - amountPaise,
            );

      if (
        result?.customer &&
        selectedCustomer?._id ===
          result.customer._id
      ) {
        setSelectedCustomer(
          result.customer,
        );
      }

      onShiftUpdate(
        (current) => ({
          ...current,

          totalUdhariPaise:
            newUdhariTotal,

          totalCollectedPaise:
            Number(
              current?.totalCashPaise ||
                0,
            ) +
            Number(
              current?.totalUpiPaise ||
                0,
            ) +
            Number(
              current?.totalCardPaise ||
                0,
            ) +
            newUdhariTotal,
        }),
      );

      onSavedMessage(
        t("udhari.success.removed"),
      );
    } catch (err) {
      setUdhariError(
        err?.response?.data
          ?.message ||
          err?.message ||
          t(
            "udhari.error.removeFailed",
          ),
      );
    } finally {
      setRemovingUdhariId(
        null,
      );
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {/* MAIN CARD */}
      <section className="rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <p className="text-[16px] font-bold text-slate-900">
          {t("udhari.title")}
        </p>

        {/* CUSTOMER */}
        <div className="mt-5">
          <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            {t(
              "udhari.customerName",
            )}
          </label>

          <div className="relative mt-2">
            {/* SEARCH BOX */}
            <div
              className="
                flex
                h-[46px]
                items-center
                rounded-[12px]
                border
                border-slate-200
                bg-slate-50
                px-3
                transition
                focus-within:border-[#047857]
                focus-within:bg-white
              "
            >
              <input
                type="text"
                value={customerSearch}
                onChange={(event) =>
                  handleCustomerSearch(
                    event.target.value,
                  )
                }
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  text-[12px]
                  font-semibold
                  text-slate-900
                  outline-none
                "
              />

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="ml-2 h-4 w-4 shrink-0 text-slate-400"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                />

                <path d="m16 16 4 4" />
              </svg>
            </div>

            {/* SEARCHING */}
            {searchingCustomers && (
              <div className="absolute left-0 right-0 top-[52px] z-40 rounded-[14px] border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-[#047857]" />

                  <p className="text-[10px] font-medium text-slate-500">
                    {t(
                      "udhari.searching",
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* RESULTS */}
            {!searchingCustomers &&
              !selectedCustomer &&
              customerResults.length >
                0 && (
                <div className="absolute left-0 right-0 top-[52px] z-40 overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
                  <div className="max-h-[220px] overflow-y-auto">
                    {customerResults.map(
                      (customer) => (
                        <button
                          key={
                            customer._id
                          }
                          type="button"
                          onClick={() =>
                            selectCustomer(
                              customer,
                            )
                          }
                          className="
                            flex
                            w-full
                            items-center
                            gap-3
                            border-b
                            border-slate-100
                            px-3
                            py-3
                            text-left
                            transition
                            last:border-b-0
                            active:bg-slate-50
                            hover:bg-slate-50
                          "
                        >
                          {/* ICON */}
                          <div
                            className="
                              grid
                              h-9
                              w-9
                              shrink-0
                              place-items-center
                              rounded-full
                              bg-emerald-50
                              text-[#047857]
                            "
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <circle
                                cx="12"
                                cy="8"
                                r="3"
                              />

                              <path d="M5.5 19c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" />
                            </svg>
                          </div>

                          {/* NAME / VEHICLE */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-bold text-slate-900">
                              {customer.name}
                            </p>

                            <p className="mt-0.5 truncate text-[9px] text-slate-400">
                              {customer.vehicleNumber ||
                                t(
                                  "udhari.existingCustomer",
                                )}
                            </p>
                          </div>

                          {/* BALANCE */}
                          <div className="shrink-0 text-right">
                            <p className="text-[8px] font-semibold uppercase tracking-[0.03em] text-slate-400">
                              {t(
                                "udhari.owes",
                              )}
                            </p>

                            <p className="mt-0.5 text-[10px] font-bold text-slate-800">
                              {formatOutstanding(
                                customer.outstandingBalance,
                              )}
                            </p>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

            {/* NO RESULTS */}
            {!searchingCustomers &&
              !selectedCustomer &&
              customerSearch.trim().length >=
                2 &&
              customerResults.length ===
                0 && (
                <div className="absolute left-0 right-0 top-[52px] z-40 rounded-[14px] border border-slate-200 bg-white px-4 py-4 text-center shadow-[0_12px_30px_rgba(15,23,42,0.10)]">
                  <p className="text-[10px] font-medium text-slate-400">
                    {t(
                      "udhari.noCustomerFound",
                    )}
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* SELECTED CUSTOMER */}
        {selectedCustomer && (
          <div className="mt-3 rounded-[13px] border border-emerald-100 bg-emerald-50 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#047857] text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <path d="m6 12 4 4 8-8" />
                    </svg>
                  </span>

                  <p className="truncate text-[12px] font-bold text-slate-900">
                    {selectedCustomer.name}
                  </p>
                </div>

                <div className="mt-1 pl-7">
                  {selectedCustomer.vehicleNumber ? (
                    <p className="text-[9px] text-slate-500">
                      {
                        selectedCustomer.vehicleNumber
                      }
                    </p>
                  ) : (
                    <p className="text-[9px] text-emerald-700">
                      {t(
                        "udhari.existingCustomer",
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[8px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                  {t(
                    "udhari.outstanding",
                  )}
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

        {/* SLIP + VEHICLE */}
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                {t(
                  "udhari.slipNumber",
                )}
              </label>

              <input
                type="text"
                value={slipNumber}
                onChange={(event) =>
                  setSlipNumber(
                    event.target.value,
                  )
                }
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
                  text-slate-900
                  outline-none
                  focus:border-[#047857]
                  focus:bg-white
                "
              />
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                {t(
                  "udhari.vehicleNumber",
                )}

                <span className="ml-1 font-normal normal-case">
                  {t(
                    "udhari.optional",
                  )}
                </span>
              </label>

              <input
                type="text"
                value={vehicleNumber}
                onChange={(event) =>
                  setVehicleNumber(
                    event.target.value,
                  )
                }
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
          </div>
        </div>

        {/* FUEL TYPE */}
        <div className="mt-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            {t(
              "udhari.fuelType",
            )}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setUdhariFuelType(
                  "PETROL",
                )
              }
              className={`
                min-h-[42px]
                rounded-[11px]
                text-[11px]
                font-semibold
                ${
                  udhariFuelType ===
                  "PETROL"
                    ? "bg-[#047857] text-white"
                    : "border border-emerald-100 bg-emerald-50 text-emerald-700"
                }
              `}
            >
              {t(
                "udhari.petrol",
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setUdhariFuelType(
                  "DIESEL",
                )
              }
              className={`
                min-h-[42px]
                rounded-[11px]
                text-[11px]
                font-semibold
                ${
                  udhariFuelType ===
                  "DIESEL"
                    ? "bg-blue-600 text-white"
                    : "border border-blue-100 bg-blue-50 text-blue-700"
                }
              `}
            >
              {t(
                "udhari.diesel",
              )}
            </button>
          </div>
        </div>

        {/* ENTRY MODE */}
        <div className="mt-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            {t("udhari.enter")}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-1 rounded-[12px] bg-slate-100 p-1">
            <button
              type="button"
              onClick={() =>
                setUdhariMode(
                  "litres",
                )
              }
              className={`
                min-h-[36px]
                rounded-[9px]
                text-[10px]
                font-semibold
                ${
                  udhariMode ===
                  "litres"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }
              `}
            >
              {t(
                "udhari.litres",
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setUdhariMode(
                  "amount",
                )
              }
              className={`
                min-h-[36px]
                rounded-[9px]
                text-[10px]
                font-semibold
                ${
                  udhariMode ===
                  "amount"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }
              `}
            >
              {t(
                "udhari.rupees",
              )}
            </button>
          </div>
        </div>

        {/* LITRES */}
        {udhariMode === "litres" && (
          <div className="mt-3">
            <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              {t(
                "udhari.litres",
              )}
            </label>

            <input
              type="text"
              inputMode="decimal"
              value={udhariLitres}
              onChange={(event) =>
                setUdhariLitres(
                  sanitizeNumberInput(
                    event.target.value,
                  ),
                )
              }
              className="
                mt-2
                h-[50px]
                w-full
                rounded-[12px]
                border
                border-slate-200
                bg-slate-50
                px-3
                text-[16px]
                font-semibold
                text-slate-900
                outline-none
                focus:border-[#047857]
                focus:bg-white
              "
            />

            <div className="mt-2 flex items-center justify-between rounded-[11px] bg-slate-50 px-3 py-2">
              <span className="text-[9px] text-slate-500">
                {t("udhari.rate")}
              </span>

              <span className="text-[11px] font-semibold text-slate-700">
                {currentUdhariRatePaise >
                0
                  ? `₹${(
                      currentUdhariRatePaise /
                      100
                    ).toFixed(2)} / L`
                  : "—"}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-[11px] bg-amber-50 px-3 py-2.5">
              <span className="text-[9px] font-semibold text-slate-600">
                {t(
                  "udhari.amount",
                )}
              </span>

              <span className="text-[14px] font-bold text-slate-900">
                {udhariLitres
                  ? formatCurrency(
                      calculatedUdhariAmount,
                    )
                  : "₹0.00"}
              </span>
            </div>
          </div>
        )}

        {/* AMOUNT */}
        {udhariMode === "amount" && (
          <div className="mt-3">
            <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              {t(
                "udhari.amount",
              )}
            </label>

            <div className="mt-2 flex h-[50px] items-center rounded-[12px] border border-slate-200 bg-slate-50 px-3 focus-within:border-[#047857] focus-within:bg-white">
              <span className="mr-2 text-[16px] font-semibold text-slate-400">
                ₹
              </span>

              <input
                type="text"
                inputMode="decimal"
                value={udhariAmount}
                onChange={(event) =>
                  setUdhariAmount(
                    sanitizeMoneyInput(
                      event.target.value,
                    ),
                  )
                }
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  text-[16px]
                  font-semibold
                  text-slate-900
                  outline-none
                "
              />
            </div>

            <div className="mt-2 flex items-center justify-between rounded-[11px] bg-slate-50 px-3 py-2">
              <span className="text-[9px] text-slate-500">
                {t(
                  "udhari.rate",
                )}
              </span>

              <span className="text-[11px] font-semibold text-slate-700">
                {currentUdhariRatePaise >
                0
                  ? `₹${(
                      currentUdhariRatePaise /
                      100
                    ).toFixed(2)} / L`
                  : "—"}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-[11px] bg-emerald-50 px-3 py-2.5">
              <span className="text-[9px] font-semibold text-slate-600">
                {t(
                  "udhari.litres",
                )}
              </span>

              <span className="text-[14px] font-bold text-[#047857]">
                {udhariAmount
                  ? `${calculatedUdhariLitres.toFixed(
                      2,
                    )} L`
                  : "0.00 L"}
              </span>
            </div>
          </div>
        )}

        {/* ERROR */}
        {udhariError && (
          <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2.5 text-[10px] font-medium leading-4 text-red-700">
            {udhariError}
          </div>
        )}

        {/* ADD */}
        <button
          type="button"
          onClick={handleAddUdhari}
          disabled={
            addingUdhari ||
            !selectedCustomer?._id
          }
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
            disabled:opacity-50
          "
        >
          {addingUdhari
            ? t("udhari.adding")
            : t(
                "udhari.addUdhari",
              )}
        </button>
      </section>

      {/* THIS SHIFT */}
      {udhariEntries.length > 0 && (
        <section className="rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-slate-900">
                {t(
                  "udhari.thisShift",
                )}
              </p>

              <p className="mt-0.5 text-[9px] text-slate-400">
                {t(
                  "udhari.thisShiftHint",
                )}
              </p>
            </div>

            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-700">
              {udhariEntries.length}{" "}
              {udhariEntries.length ===
              1
                ? t(
                    "udhari.entry",
                  )
                : t(
                    "udhari.entries",
                  )}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {udhariEntries.map(
              (entry, index) => {
                const isRemoving =
                  removingUdhariId ===
                  entry.id;

                return (
                  <div
                    key={
                      entry.id ||
                      `${entry.customerId}-${index}`
                    }
                    className="
                      rounded-[14px]
                      border
                      border-slate-100
                      bg-slate-50
                      p-3
                    "
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold text-slate-900">
                          {entry.customer
                            ?.name ||
                            entry.customerName ||
                            ""}
                        </p>

                        <p className="mt-1 text-[9px] font-medium text-slate-500">
                          {entry.fuelType ===
                          "DIESEL"
                            ? t(
                                "udhari.diesel",
                              )
                            : t(
                                "udhari.petrol",
                              )}

                          {" · "}

                          {Number(
                            entry.litres ||
                              0,
                          ).toFixed(
                            2,
                          )}

                          {" L"}
                        </p>

                        {entry.slipNumber && (
                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {t(
                              "udhari.slipLabel",
                            )}{" "}
                            {
                              entry.slipNumber
                            }
                          </p>
                        )}

                        {entry.vehicleNumber && (
                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {
                              entry.vehicleNumber
                            }
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-bold text-slate-900">
                          {formatCurrency(
                            entry.amountPaise,
                          )}
                        </p>

                        <button
                          type="button"
                          disabled={Boolean(
                            removingUdhariId,
                          )}
                          onClick={() =>
                            handleRemoveUdhari(
                              entry,
                            )
                          }
                          className="
                            mt-2
                            inline-flex
                            min-h-[30px]
                            items-center
                            justify-center
                            rounded-[8px]
                            border
                            border-red-100
                            bg-white
                            px-2.5
                            text-[9px]
                            font-semibold
                            text-red-600
                            transition
                            active:scale-[0.98]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          {isRemoving
                            ? t(
                                "udhari.removing",
                              )
                            : t(
                                "udhari.remove",
                              )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-[12px] bg-amber-50 px-3 py-3">
            <span className="text-[10px] font-semibold text-slate-600">
              {t(
                "udhari.shiftUdhari",
              )}
            </span>

            <span className="text-[15px] font-bold text-amber-700">
              {formatCurrency(
                shift?.totalUdhariPaise ||
                  0,
              )}
            </span>
          </div>
        </section>
      )}
    </div>
  );
};

export default UdhariCollection;