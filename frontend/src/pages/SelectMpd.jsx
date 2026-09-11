// frontend/src/pages/SelectMpd.jsx

import { useEffect, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  getAvailableMpds,
  getCurrentShift,
  startShift,
} from '../services/shiftApi';

import { getBusinessDate } from '../utils/businessDate';

const SelectMpd = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [mpds, setMpds] = useState([]);
  const [selectedMpd, setSelectedMpd] = useState('');
  const [shiftType, setShiftType] = useState('MORNING');

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadShiftOptions = async () => {
      try {
        setLoading(true);
        setError('');

        /*
         * First check whether this employee
         * currently has an active shift.
         *
         * This is independent of business date.
         */
        const currentResponse = await getCurrentShift();

        if (!mounted) return;

        const currentShift = currentResponse?.data || null;

        /*
         * Active shift exists:
         * employee should resume the staged shift workflow.
         */
        if (currentShift) {
          const activeMpdId = currentShift.mpdId?._id || currentShift.mpdId;
          navigate(`/shift/${activeMpdId}`, {
            replace: true,
          });

          return;
        }

        /*
         * No active shift:
         * load MPDs currently available.
         */
        const response = await getAvailableMpds();

        if (!mounted) return;

        const availableMpds = response?.data || [];

        setMpds(availableMpds);

        /*
         * Automatically select the first
         * available MPD.
         */
        const firstAvailable = availableMpds.find(
          (mpd) => mpd.isAvailable,
        );

        setSelectedMpd(firstAvailable?._id || '');
      } catch (err) {
        if (!mounted) return;

        console.error(
          '[SelectMpd] Failed to load shift options:',
          err,
        );

        setError(
          err?.response?.data?.message ||
            err?.message ||
            t('employee.selectMpd.loadError'),
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadShiftOptions();

    return () => {
      mounted = false;
    };
  }, [navigate, t]);

  const handleStartShift = async () => {
    if (!selectedMpd || starting) return;

    try {
      setStarting(true);
      setError('');

      const businessDate = getBusinessDate();

      await startShift({
        businessDate,
        shiftType,
        mpdId: selectedMpd,
      });

      // The backend has now created the shift and locked
      // both the employee and selected MPD.
      const activeMpdId = selectedMpd;
      navigate(`/shift/${activeMpdId}`, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('employee.selectMpd.startError');

      setError(message);

      // Most likely scenario:
      // another employee grabbed the MPD between
      // availability check and start request.
      if (status === 409) {
        try {
          const response = await getAvailableMpds();
          const refreshedMpds = response?.data || [];

          setMpds(refreshedMpds);

          const refreshedSelection = refreshedMpds.find(
            (mpd) => mpd.isAvailable,
          );

          setSelectedMpd(refreshedSelection?._id || '');
        } catch {
          // Keep the original error visible.
        }
      }
    } finally {
      setStarting(false);
    }
  };

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{ '--background': '#F3F4F6' }}
      >
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-10">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#047857]">
              {t('employee.selectMpd.kicker')}
            </p>

            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-slate-900">
              {t('employee.selectMpd.title')}
            </h1>

            <p className="mt-2 font-devanagari text-[15px] leading-6 text-slate-500">
              {t('employee.selectMpd.subtitle')}
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-[20px] bg-white" />
              <div className="h-24 animate-pulse rounded-[20px] bg-white" />
            </div>
          )}

          {/* Content */}
          {!loading && (
            <>
              {/* MPD selection */}
              <section className="rounded-[24px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">

                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  {t('employee.selectMpd.mpdLabel')}
                </p>

                <div className="mt-3 space-y-3">

                  {mpds.map((mpd) => {
                    const active = selectedMpd === mpd._id;
                    const available = mpd.isAvailable;

                    return (
                      <button
                        key={mpd._id}
                        type="button"
                        disabled={!available || starting}
                        onClick={() => setSelectedMpd(mpd._id)}
                        className={`
                          flex
                          min-h-[76px]
                          w-full
                          items-center
                          justify-between
                          rounded-[16px]
                          border
                          px-4
                          text-left
                          transition
                          ${active
                            ? 'border-[#047857] bg-emerald-50'
                            : available
                              ? 'border-slate-200 bg-white hover:border-slate-300'
                              : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                          }
                        `}
                      >
                        <div>
                          <p className="text-[17px] font-semibold text-slate-900">
                            {mpd.mpdNumber}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {available
                              ? t('employee.selectMpd.available')
                              : t('employee.selectMpd.inUse')}
                          </p>
                        </div>

                        <span
                          className={`
                            grid
                            h-7
                            w-7
                            place-items-center
                            rounded-full
                            border-2
                            ${active
                              ? 'border-[#047857] bg-[#047857]'
                              : 'border-slate-300'
                            }
                          `}
                        >
                          {active && (
                            <span className="h-2.5 w-2.5 rounded-full bg-white" />
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {mpds.length === 0 && (
                    <div className="rounded-[16px] bg-slate-50 px-4 py-5 text-center">
                      <p className="text-[14px] font-semibold text-slate-700">
                        {t('employee.selectMpd.noneAvailable')}
                      </p>

                      <p className="mt-1 text-[12px] text-slate-500">
                        {t('employee.selectMpd.noneAvailableHint')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Shift selection */}
                <p className="mt-7 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  {t('employee.selectMpd.shiftLabel')}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    [
                      'MORNING',
                      t('employee.shifts.morning'),
                    ],
                    [
                      'EVENING',
                      t('employee.shifts.evening'),
                    ],
                    [
                      'NIGHT',
                      t('employee.shifts.night'),
                    ],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={starting}
                      onClick={() => setShiftType(value)}
                      className={`
                        min-h-[46px]
                        rounded-[12px]
                        border
                        text-[12px]
                        font-semibold
                        transition
                        ${shiftType === value
                          ? 'border-[#047857] bg-[#047857] text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }
                      `}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-medium leading-5 text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Start button */}
              <button
                type="button"
                onClick={handleStartShift}
                disabled={!selectedMpd || starting}
                className="
                  mt-5
                  flex
                  min-h-[54px]
                  w-full
                  items-center
                  justify-center
                  rounded-[15px]
                  bg-[#047857]
                  text-[15px]
                  font-semibold
                  text-white
                  shadow-[0_8px_18px_rgba(4,120,87,0.18)]
                  transition
                  hover:bg-[#065F46]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {starting
                  ? t('employee.selectMpd.starting')
                  : t('employee.selectMpd.start')}
              </button>
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default SelectMpd;