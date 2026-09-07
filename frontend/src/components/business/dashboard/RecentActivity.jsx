// src/components/business/dashboard/RecentActivity.jsx

import { useTranslation } from 'react-i18next';

const activities = [
  {
    time: '12:05 PM',
    titleKey: 'dashboard.upiUpdated',
    type: 'success',
  },
  {
    time: '11:10 AM',
    titleKey: 'dashboard.cashUpdated',
    type: 'success',
  },
  {
    time: '10:24 AM',
    titleKey: 'dashboard.nozzleSaved',
    type: 'success',
  },
];

const RecentActivity = () => {
  const { t } = useTranslation();

  return (
    <section className="mt-7">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[17px] font-semibold text-slate-900">
            {t('dashboard.recentActivity')}
          </p>

          <p className="text-[12px] font-medium text-slate-500">
            {t('dashboard.recentActivity')}
          </p>
        </div>

        <button
          type="button"
          className="min-h-12 px-2 text-[12px] font-semibold text-[#047857]"
        >
          {t('dashboard.seeAll')}
        </button>
      </div>

      <div className="rounded-[20px] bg-white p-4 shadow-[0_5px_18px_rgba(15,23,42,0.05)]">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={`${activity.time}-${activity.title}`}
              className="flex items-center gap-3"
            >
              <div
                className="
                  grid
                  h-9
                  w-9
                  shrink-0
                  place-items-center
                  rounded-[11px]
                  bg-emerald-50
                  text-[#059669]
                "
              >
                ✓
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-slate-800">
                  {t(activity.titleKey)}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentActivity;