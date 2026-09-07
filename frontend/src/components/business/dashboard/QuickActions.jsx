// src/components/business/dashboard/QuickActions.jsx

import { useTranslation } from 'react-i18next';

const ActionIcon = ({ type }) => {
  const paths = {
    nozzle: (
      <>
        <path d="M7 7h5a2 2 0 0 1 2 2v10H7V7Z" />
        <path d="M14 10h3l2 3v6h-5" />
        <path d="M9 4h3" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M7 9h.01M17 15h.01" />
      </>
    ),
    reconcile: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="m8 8 2 2 4-4M8 14h8M8 17h5" />
      </>
    ),
    reports: (
      <>
        <path d="M5 20V10M12 20V4M19 20v-7" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
    >
      {paths[type]}
    </svg>
  );
};

const ActionCard = ({ type, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="
      group
      min-h-[118px]
      rounded-[20px]
      border
      border-slate-100
      bg-white
      p-4
      text-left
      shadow-[0_5px_18px_rgba(15,23,42,0.05)]
      transition-all
      duration-200
      active:scale-[0.985]
    "
  >
    <div
      className="
        grid
        h-10
        w-10
        place-items-center
        rounded-[13px]
        bg-emerald-50
        text-[#047857]
        transition-colors
        group-active:bg-emerald-100
      "
    >
      <ActionIcon type={type} />
    </div>

    <p
      lang="hi"
      className="
        mt-4
        font-devanagari
        text-[15px]
        font-semibold
        leading-tight
        text-slate-900
      "
    >
      {title}
    </p>

    <p className="mt-1 text-[10px] font-medium text-slate-400">
      {subtitle}
    </p>
  </button>
);

const QuickActions = ({
  onNozzle,
  onCollection,
  onReconciliation,
  onReports,
}) => {
  const { t } = useTranslation();

  const actions = [
    {
      type: 'nozzle',
      title: t('dashboard.nozzleReading'),
      subtitle: t('dashboard.recordReading'),
      onClick: onNozzle,
    },
    {
      type: 'cash',
      title: t('dashboard.cashCollection'),
      subtitle: t('dashboard.moneyCollection'),
      onClick: onCollection,
    },
    {
      type: 'reconcile',
      title: t('dashboard.dailyReconciliation'),
      subtitle: t('dashboard.reconciliation'),
      onClick: onReconciliation,
    },
    {
      type: 'reports',
      title: t('dashboard.viewReports'),
      subtitle: 'Reports',
      onClick: onReports,
    },
  ];

  return (
    <section className="mt-7">
      <div className="mb-4">
        <p className="text-[17px] font-semibold text-slate-900">
          {t('dashboard.quickActions')}
        </p>

        <p className="font-devanagari text-[13px] text-slate-500">
          {t('dashboard.completeWork')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <ActionCard
            key={action.type}
            {...action}
          />
        ))}
      </div>
    </section>
  );
};

export default QuickActions;