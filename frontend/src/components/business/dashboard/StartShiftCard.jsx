import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { startShift } from '../../../services/shiftApi';
import { getBusinessDate } from '../../../utils/businessDate';

const StartShiftCard = ({ mpds, onStarted }) => {
  const { t } = useTranslation();

  const [selectedMpd, setSelectedMpd] = useState(
    mpds?.[0]?._id || mpds?.[0]?.mpd_id || '',
  );

  const [shiftType, setShiftType] = useState('MORNING');

  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!selectedMpd) {
      setError('Please select an MPD.');
      return;
    }

    try {
      setIsStarting(true);
      setError('');

      const response = await startShift({
        businessDate: getBusinessDate(),
        shiftType,
        mpdId: selectedMpd,
      });

      onStarted(response.data);
    } catch (err) {
      setError(
        err.message ||
          'Unable to start shift. Please try again.',
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section className="mt-6 rounded-[24px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div>
        <p className="text-[18px] font-semibold text-slate-900">
          Start your shift
        </p>

        <p
          lang="hi"
          className="mt-1 font-devanagari text-[13px] text-slate-500"
        >
          अपना पंप और शिफ्ट चुनें
        </p>
      </div>

      <p className="mt-6 text-[11px] font-semibold text-slate-500">
        MPD
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {(mpds?.length
          ? mpds.slice(0, 2)
          : [
              { _id: 'mpd-1', name: 'MPD 1' },
              { _id: 'mpd-2', name: 'MPD 2' },
            ]
        ).map((mpd) => {
          const id = mpd._id || mpd.mpd_id;
          const name =
            mpd.mpd_number ||
            mpd.name ||
            'MPD';

          const active = selectedMpd === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedMpd(id)}
              className={[
                'min-h-[48px] rounded-[12px] border px-4',
                'text-[13px] font-semibold transition-all',
                active
                  ? 'border-[#047857] bg-[#047857] text-white'
                  : 'border-slate-200 bg-white text-slate-600',
              ].join(' ')}
            >
              {name}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[11px] font-semibold text-slate-500">
        Shift
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          ['MORNING', 'Morning'],
          ['EVENING', 'Evening'],
          ['NIGHT', 'Night'],
        ].map(([value, label]) => {
          const active = shiftType === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setShiftType(value)}
              className={[
                'min-h-[44px] rounded-[11px] border',
                'text-[11px] font-semibold transition-all',
                active
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 text-slate-500',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 rounded-[12px] bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={isStarting}
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
          transition-all
          active:scale-[0.985]
          disabled:opacity-60
        "
      >
        {isStarting ? 'Starting…' : 'Start Shift →'}
      </button>
    </section>
  );
};

export default StartShiftCard;