import { useTranslation } from 'react-i18next';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const ShiftProgress = ({ shift }) => {
  const { t } = useTranslation();
  const hasCollections = (shift?.totalCollectedPaise || 0) > 0;
  const steps = [
    { id: 1, title: t('employee.dashboard.nozzleReading'), subtitle: t('employee.dashboard.readOnly'), completed: true },
    { id: 2, title: t('employee.dashboard.cashCollection'), subtitle: t('employee.dashboard.updateAnytime'), completed: hasCollections },
    { id: 3, title: t('employee.dashboard.endShift'), subtitle: t('employee.dashboard.finalCheck'), completed: false },
  ];
  const completed = steps.filter((step) => step.completed).length;

  return (
    <section className="mt-7">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[17px] font-semibold text-slate-900">{t('employee.dashboard.todayWork')}</p>
          <p className="font-devanagari text-[13px] text-slate-500">{t('employee.dashboard.shiftProgress')}</p>
        </div>
        <span className="text-[12px] font-semibold text-slate-500">{completed} / {steps.length}</span>
      </div>

      <div className="rounded-[20px] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,0.06)]">
        <div className="space-y-5">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-4">
              <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${step.completed ? 'border-[#059669] bg-[#059669] text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                {step.completed ? <CheckIcon /> : <span className="h-2 w-2" />}
              </div>
              <div className="flex-1">
                <p className="font-devanagari text-[15px] font-semibold text-slate-900">{step.title}</p>
                <p className="text-[11px] font-medium text-slate-400">{step.subtitle}</p>
              </div>
              <span className={`text-[11px] font-semibold ${step.completed ? 'text-[#059669]' : 'text-slate-400'}`}>
                {step.completed ? t('employee.dashboard.done') : t('employee.dashboard.pending')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShiftProgress;
