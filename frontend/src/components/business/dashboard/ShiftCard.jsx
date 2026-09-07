// src/components/business/dashboard/ShiftCard.jsx

import { useTranslation } from 'react-i18next';
import dispenserImage from '../../../assets/fuel/dispenser-dashboard.webp';

const ShiftCard = ({
  mpds = [],
  selectedMpd,
  setSelectedMpd,
  mpd,
  onClick,
}) => {
  const { t } = useTranslation();

  const mpdOptions =
    mpds.length > 0
      ? mpds
      : [
          { mpd_number: 'MPD 1', mpd_id: 'mpd-1' },
          { mpd_number: 'MPD 2', mpd_id: 'mpd-2' },
        ];

  return (
    <section className="relative mt-6 overflow-hidden rounded-[24px] bg-[#047857] shadow-[0_12px_28px_rgba(4,120,87,0.20)]">
      {/* Decorative circles */}
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/[0.06]"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-emerald-900/20"
      />

      <div className="relative z-10 p-5">
        {/* MPD selector */}
        <div className="overflow-hidden rounded-[14px] bg-white/[0.10] p-1">
          <div className="grid grid-cols-2 gap-1">
            {mpdOptions.slice(0, 2).map((item) => {
              const number =
                item.mpd_number ||
                item.name ||
                `MPD ${item.mpd_id}`;

              const active = selectedMpd === number;

              return (
                <button
                  key={item.mpd_id || number}
                  type="button"
                  onClick={() => setSelectedMpd(number)}
                  className={[
                    'min-h-[40px] rounded-[10px]',
                    'text-[13px] font-semibold',
                    'transition-all duration-200',
                    active
                      ? 'rounded-[10px] bg-white text-[#047857] shadow-sm'
                      : 'text-white/75 hover:bg-white/[0.08] hover:text-white',
                  ].join(' ')}
                >
                  {number}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift information */}
        <div className="mt-5 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium text-emerald-100">
              {t('dashboard.assignedPump')}
            </p>

            <h2 className="mt-1 text-[19px] font-semibold text-white">
              {selectedMpd || 'MPD 1'}
              <span className="ml-2 text-[12px] font-medium text-emerald-100">
                • Shift A
              </span>
            </h2>

            <p className="mt-1 text-[11px] text-emerald-100">
              06:00 AM — 02:00 PM
            </p>
          </div>

          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10">
            ● Live
          </span>
        </div>

        {/* Sale */}
        <div className="mt-7 flex items-end justify-between">
          <div>
            <p
              lang="hi"
              className="font-devanagari text-[13px] font-medium text-emerald-100"
            >
              {t('dashboard.todaySale')}
            </p>

            <p className="mt-1 text-[32px] font-bold leading-none tracking-[-0.045em] text-white">
              ₹1,24,560
            </p>

            <p className="mt-2 text-[11px] font-medium text-emerald-100">
              ✓ {t('dashboard.matched')}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              bottom-4
              right-4
              h-28
              w-28
              rounded-full
              bg-white/10
              blur-2xl
            "
          />

          <div
            aria-hidden="true"
            className="
              absolute
              bottom-2
              right-2
              flex
              h-[145px]
              w-[125px]
              pointer-events-none
              items-end
              justify-center
            "
          >
            <img
              src={dispenserImage}
              alt=""
              className="
                h-auto
                w-full
                max-w-[125px]
                object-contain
                object-bottom
                drop-shadow-[0_12px_20px_rgba(0,0,0,0.12)]
              "
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShiftCard;