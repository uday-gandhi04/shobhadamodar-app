// src/components/business/dashboard/ShiftProgress.jsx

import { useTranslation } from 'react-i18next';

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    className="h-3.5 w-3.5"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const ShiftProgress = () => {
  const { t } = useTranslation();

  const steps = [
    {
      id: 1,
      title: t('dashboard.nozzleReading'),
      subtitle: t('dashboard.recordReading'),
      completed: true,
    },
    {
      id: 2,
      title: t('dashboard.cashCollection'),
      subtitle: t('dashboard.moneyCollection'),
      completed: true,
    },
    {
      id: 3,
      title: t('dashboard.dailyReconciliation'),
      subtitle: t('dashboard.reconciliation'),
      completed: false,
    },
  ];

  const completed = steps.filter((step) => step.completed).length;

  return (
    <section className="mt-7">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[17px] font-semibold text-slate-900">
            {t('dashboard.todayWork')}
          </p>

          <p
            lang="hi"
            className="font-devanagari text-[13px] text-slate-500"
          >
            {t('dashboard.shiftProgress')}
          </p>
        </div>

        <span className="text-[12px] font-semibold text-slate-500">
          {completed} / {steps.length}
        </span>
      </div>

      <div className="rounded-[20px] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,0.06)]">
        <div className="relative">
          {steps.slice(0, -1).map((step, index) => (
            <div
              key={`line-${step.id}`}
              className="absolute left-[11px] top-[25px] h-[42px] w-px bg-slate-200"
              style={{
                transform: `translateY(${index * 67}px)`,
              }}
            />
          ))}

          <div className="space-y-5">
            {steps.map((step) => (
              <div
                key={step.id}
                className="relative flex items-center gap-4"
              >
                <div
                  className={[
                    'relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2',
                    step.completed
                      ? 'border-[#059669] bg-[#059669] text-white'
                      : 'border-slate-300 bg-white text-transparent',
                  ].join(' ')}
                >
                  {step.completed ? (
                    <CheckIcon />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-transparent" />
                  )}
                </div>

                <div className="flex-1">
                  <p
                    lang="hi"
                    className={[
                      'font-devanagari text-[15px] font-semibold',
                      step.completed
                        ? 'text-slate-900'
                        : 'text-slate-500',
                    ].join(' ')}
                  >
                    {step.title}
                  </p>

                  <p className="text-[11px] font-medium text-slate-400">
                    {step.subtitle}
                  </p>
                </div>

                <div
                  className={[
                    'text-[11px] font-semibold',
                    step.completed
                      ? 'text-[#059669]'
                      : 'text-slate-400',
                  ].join(' ')}
                >
                  {step.completed ? 'Done' : 'Pending'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShiftProgress;