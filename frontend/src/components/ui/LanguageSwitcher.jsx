const languages = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिं' },
  { code: 'mr', label: 'म' },
];

const LanguageSwitcher = ({ language, onChange }) => {
  const currentLanguage = language?.split('-')[0] || 'en';

  return (
    <div
      role="group"
      aria-label="Language selection"
      className="
        flex
        items-center
        gap-0.5
        rounded-[13px]
        border
        border-slate-200
        bg-white
        p-1
        shadow-[0_4px_12px_rgba(15,23,42,0.06)]
      "
    >
      {languages.map(({ code, label }) => {
        const active = currentLanguage === code;

        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={active}
            className="
              group
              relative
              flex
              min-h-[30px]
              min-w-[30px]
              items-center
              justify-center
              rounded-[9px]
              bg-transparent
              p-0
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-emerald-500
              focus-visible:ring-offset-1
            "
          >
            {/* Rounded active surface */}
            {active && (
              <span
                className="
                  absolute
                  inset-0
                  rounded-[9px]
                  bg-bpcl-emerald
                  shadow-sm
                "
              />
            )}

            {/* Label */}
            <span
              lang={code === 'en' ? 'en' : code}
              className={[
                'relative z-10',
                'text-[9px]',
                'font-semibold',
                'leading-none',
                'transition-colors duration-150',
                active
                  ? 'text-white'
                  : 'text-slate-500 group-hover:text-slate-800',
              ].join(' ')}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;