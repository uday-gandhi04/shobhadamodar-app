import { useTranslation } from 'react-i18next';
import dispenserImage from '../../../assets/fuel/dispenser-dashboard.webp';

const ShiftCard = ({ shift }) => {
  const { t } = useTranslation();

  const mpdName = shift?.mpdId?.mpdNumber || 'MPD';

  const shiftLabel = t(
    `employee.shifts.${shift?.shiftType?.toLowerCase() || 'morning'}`
  );

  const startedTime = shift?.startedAt
    ? new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(shift.startedAt))
    : '—';

  const nozzleCount =
    shift?.mpdId?.nozzles?.filter((n) => n.isActive !== false).length || 0;

  return (
    <section className="relative mt-6 min-h-[148px] overflow-hidden rounded-[24px] bg-[#047857] p-5 text-white shadow-[0_12px_28px_rgba(4,120,87,0.20)]">
      {/* Background decorative circles */}
      <div
        aria-hidden="true"
        className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/[0.06]"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-16 h-36 w-36 rounded-full bg-emerald-900/20"
      />

      {/* Soft glow behind dispenser */}
      <div
        aria-hidden="true"
        className="absolute right-[58px] top-8 h-24 w-24 rounded-full bg-white/[0.07] blur-xl"
      />

      {/* Dispenser */}
      <img
        src={dispenserImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-10px] right-[-2px] z-[1] h-[170px] w-[138px] object-contain object-bottom"
      />

      {/* Content */}
      <div className="relative z-10 pr-[110px]">
        <div className="-mr-[110px] flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-emerald-100">
              {t('employee.dashboard.currentShift')}
            </p>

            <h2 className="mt-1 text-[21px] font-semibold tracking-[-0.02em]">
              {mpdName}
            </h2>

            <p className="mt-1 text-[12px] text-emerald-100">
              {shiftLabel}
            </p>
          </div>

          <span className="ml-auto shrink-0 rounded-full bg-white/10 px-2.5 py-1.5 text-[9px] font-semibold">
            ● {t('employee.dashboard.active')}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-emerald-100">
              {t('employee.dashboard.started')}
            </p>

            <p className="mt-1 text-[14px] font-semibold">
              {startedTime}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-emerald-100">
              {t('employee.dashboard.nozzles')}
            </p>

            <p className="mt-1 text-[14px] font-semibold">
              {nozzleCount}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShiftCard;