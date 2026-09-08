import { useTranslation } from 'react-i18next';

const ShiftCard = ({ shift }) => {
  const { t } = useTranslation();
  const mpdName = shift?.mpdId?.mpdNumber || 'MPD';
  const shiftLabel = t(`employee.shifts.${shift?.shiftType?.toLowerCase() || 'morning'}`);

  return (
    <section className="relative mt-6 overflow-hidden rounded-[24px] bg-[#047857] p-5 text-white shadow-[0_12px_28px_rgba(4,120,87,0.20)]">
      <div aria-hidden="true" className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/[0.06]" />
      <div aria-hidden="true" className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-emerald-900/20" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium text-emerald-100">{t('employee.dashboard.currentShift')}</p>
            <h2 className="mt-1 text-[21px] font-semibold">{mpdName}</h2>
            <p className="mt-1 text-[12px] text-emerald-100">{shiftLabel}</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold">● {t('employee.dashboard.active')}</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-emerald-100">{t('employee.dashboard.started')}</p>
            <p className="mt-1 text-[15px] font-semibold">
              {new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(shift.startedAt))}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-emerald-100">{t('employee.dashboard.nozzles')}</p>
            <p className="mt-1 text-[15px] font-semibold">{shift?.mpdId?.nozzles?.filter((n) => n.isActive !== false).length || 0}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShiftCard;
