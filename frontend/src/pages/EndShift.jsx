import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  getCurrentShift,
} from '../services/shiftApi';

import nozzleDispenserImage from '../assets/fuel/nozzle-dispenser.webp';
import petrolNozzleImage from '../assets/fuel/petrol-nozzle.webp';
import dieselNozzleImage from '../assets/fuel/diesel-nozzle.webp';

import { getBusinessDate } from '../utils/businessDate';

const formatReading = (value) => {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0.00';
  }

  return number.toFixed(2);
};

const getNozzleNumber = (nozzleId) => {
  if (!nozzleId) return '';

  const match = String(nozzleId).match(/\d+/);
  return match ? match[0] : String(nozzleId);
};

const getFuelType = (reading) => {
  const fuel = String(
    reading?.fuelType ||
    reading?.fuel ||
    ''
  ).toUpperCase();

  if (fuel.includes('DIESEL')) {
    return 'DIESEL';
  }

  return 'PETROL';
};

const EndShift = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [finalReadings, setFinalReadings] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadShift = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await getCurrentShift(getBusinessDate());

        if (!mounted) return;

        const currentShift = response?.data || null;

        if (!currentShift) {
          navigate('/dashboard', { replace: true });
          return;
        }

        setShift(currentShift);

        const initialReadings = {};

        (currentShift.readings || []).forEach((reading) => {
          const nozzleId =
            reading.nozzleId ||
            reading.nozzle ||
            reading._id;

          if (!nozzleId) return;

          initialReadings[nozzleId] =
            reading.closingReading ??
            reading.finalReading ??
            '';
        });

        setFinalReadings(initialReadings);
      } catch (err) {
        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load shift readings.'
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

  const readings = useMemo(() => {
    return [...(shift?.readings || [])].sort((a, b) => {
      const aNumber = Number(getNozzleNumber(a.nozzleId));
      const bNumber = Number(getNozzleNumber(b.nozzleId));

      return aNumber - bNumber;
    });
  }, [shift]);

  const handleReadingChange = (nozzleId, value) => {
    // Allow only numbers and one decimal point.
    const cleaned = value
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1');

    setFinalReadings((current) => ({
      ...current,
      [nozzleId]: cleaned,
    }));
  };

  const canContinue = readings.length > 0 &&
    readings.every((reading) => {
      const nozzleId =
        reading.nozzleId ||
        reading.nozzle ||
        reading._id;

      const value = finalReadings[nozzleId];

      return value !== undefined &&
        value !== '' &&
        Number.isFinite(Number(value));
    });

  if (loading) {
    return (
      <IonPage>
        <IonContent
          fullscreen
          style={{ '--background': '#F3F4F6' }}
        >
          <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />

            <div className="mt-4 overflow-hidden rounded-[20px] bg-white">
              <div className="h-[190px] animate-pulse bg-slate-100" />
            </div>

            <div className="mt-4 h-64 animate-pulse rounded-[20px] bg-white" />
          </main>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{ '--background': '#F3F4F6' }}
      >
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-28 pt-[max(0.9rem,env(safe-area-inset-top))]">

          {/* Header */}
          <header className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
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
              <h1 className="text-[18px] font-semibold text-slate-900">
                End Shift
              </h1>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Final nozzle readings
              </p>
            </div>
          </header>

          {/* Step indicator */}
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

                  <p className="text-[9px] text-[#047857]">
                    Current step
                  </p>
                </div>
              </div>

              <div className="h-px w-8 bg-slate-200" />

              <div className="flex items-center gap-2 px-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-400">
                  2
                </div>

                <p className="hidden text-[11px] font-medium text-slate-400 sm:block">
                  Money
                </p>
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

          {/* Shift info */}
          <section className="mt-4 rounded-[18px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Current Shift
                </p>

                <h2 className="mt-1 text-[18px] font-semibold text-slate-900">
                  {shift?.mpdId?.mpdNumber || 'MPD'}
                </h2>

                <p className="text-[10px] text-slate-500">
                  {shift?.shiftType || ''}
                </p>
              </div>

              <img
                src={nozzleDispenserImage}
                alt=""
                aria-hidden="true"
                className="h-[78px] w-[125px] object-contain"
              />
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Final readings */}
          <section className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">

            <div className="mb-4">
              <h2 className="text-[15px] font-semibold text-slate-900">
                Final nozzle readings
              </h2>

              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Enter the final totalizer reading for each nozzle.
              </p>
            </div>

            {/* Nozzle overview image */}
            <div className="mb-4 flex justify-center rounded-[16px] bg-slate-50 px-3 py-4">
              <img
                src={nozzleDispenserImage}
                alt="Four fuel nozzles"
                className="h-[150px] w-full max-w-[280px] object-contain"
              />
            </div>

            {/* Nozzle cards */}
            <div className="space-y-3">
              {readings.map((reading) => {
                const nozzleId =
                  reading.nozzleId ||
                  reading.nozzle ||
                  reading._id;

                const nozzleNumber = getNozzleNumber(nozzleId);

                const fuelType = getFuelType(reading);

                const openingReading =
                  reading.openingReading ??
                  reading.opening ??
                  0;

                const image =
                  fuelType === 'DIESEL'
                    ? dieselNozzleImage
                    : petrolNozzleImage;

                const currentValue =
                  finalReadings[nozzleId] ?? '';

                return (
                  <div
                    key={nozzleId}
                    className={`
                      overflow-hidden
                      rounded-[18px]
                      border
                      ${
                        fuelType === 'DIESEL'
                          ? 'border-blue-100'
                          : 'border-emerald-100'
                      }
                      bg-white
                    `}
                  >
                    <div className="flex items-center gap-3 p-3">

                      {/* Nozzle image */}
                      <div
                        className={`
                          flex
                          h-[76px]
                          w-[56px]
                          shrink-0
                          items-end
                          justify-center
                          overflow-hidden
                          rounded-[13px]
                          ${
                            fuelType === 'DIESEL'
                              ? 'bg-blue-50'
                              : 'bg-emerald-50'
                          }
                        `}
                      >
                        <img
                          src={image}
                          alt=""
                          aria-hidden="true"
                          className="h-[72px] w-[45px] object-contain object-bottom"
                        />
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-slate-900">
                              N{nozzleNumber}
                            </span>

                            <span
                              className={`
                                rounded-full
                                px-2
                                py-0.5
                                text-[8px]
                                font-semibold
                                ${
                                  fuelType === 'DIESEL'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-emerald-50 text-emerald-700'
                                }
                              `}
                            >
                              {fuelType === 'DIESEL'
                                ? 'Diesel'
                                : 'Petrol'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[8px] font-medium uppercase tracking-[0.04em] text-slate-400">
                              Opening
                            </p>

                            <p className="mt-0.5 text-[11px] font-semibold text-slate-700">
                              {formatReading(openingReading)}
                            </p>
                          </div>

                          <div>
                            <label
                              htmlFor={`final-${nozzleId}`}
                              className="text-[8px] font-medium uppercase tracking-[0.04em] text-slate-400"
                            >
                              Final reading
                            </label>

                            <input
                              id={`final-${nozzleId}`}
                              type="text"
                              inputMode="decimal"
                              value={currentValue}
                              onChange={(event) =>
                                handleReadingChange(
                                  nozzleId,
                                  event.target.value
                                )
                              }
                              placeholder="0.00"
                              className="
                                mt-1
                                h-9
                                w-full
                                rounded-[10px]
                                border
                                border-slate-200
                                bg-slate-50
                                px-2.5
                                text-[12px]
                                font-semibold
                                text-slate-900
                                outline-none
                                transition
                                focus:border-[#047857]
                                focus:bg-white
                                focus:ring-2
                                focus:ring-emerald-100
                              "
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </section>

          {/* Bottom action */}
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <div className="mx-auto max-w-[480px]">
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => {
                  // Stage 2 will be implemented next.
                  console.log('Proceed to money collection');
                }}
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
                  disabled:bg-slate-200
                  disabled:text-slate-400
                  disabled:shadow-none
                "
              >
                Next: Money Collection
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-2 h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

        </main>
      </IonContent>
    </IonPage>
  );
};

export default EndShift;