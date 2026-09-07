// src/components/business/dashboard/DashboardHeader.jsx

import { useTranslation } from 'react-i18next';

const DashboardHeader = ({ user, formattedDate }) => {
  const { i18n } = useTranslation();

  const language = i18n.language?.split('-')[0] || 'en';

  const firstName = user?.name?.split(' ')[0] || 'Station Admin';

  const greeting =
    language === 'hi'
      ? `नमस्ते, ${firstName}!`
      : language === 'mr'
        ? `नमस्कार, ${firstName}!`
        : `Hello, ${firstName}!`;

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'A';

  return (
    <header className="flex items-start justify-between">
      <div>
        <p
          lang={language === 'en' ? undefined : language}
          className="
            font-devanagari
            text-[22px]
            font-bold
            leading-none
            tracking-[-0.01em]
            text-[#047857]
          "
        >
          {greeting}
        </p>

        <p className="mt-1.5 text-[12px] font-medium text-slate-500">
          {formattedDate}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="
            flex
            min-h-[30px]
            items-center
            gap-1.5
            rounded-full
            bg-emerald-50
            px-3
            text-[10px]
            font-semibold
            text-[#047857]
          "
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#059669]/40" />
            <span className="relative h-2 w-2 rounded-full bg-[#059669]" />
          </span>

          Synced
        </div>

        <div
          className="
            grid
            h-11
            w-11
            place-items-center
            rounded-[14px]
            bg-white
            text-[15px]
            font-semibold
            text-[#047857]
            shadow-[0_4px_12px_rgba(15,23,42,0.06)]
          "
        >
          {initial}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;