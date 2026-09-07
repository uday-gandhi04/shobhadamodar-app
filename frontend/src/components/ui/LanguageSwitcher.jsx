const languages = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'HI' },
  { code: 'mr', label: 'MR' },
];

const LanguageSwitcher = ({ language, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className="flex min-h-12 items-center gap-0.5 !rounded-[14px] border border-slate-200 bg-white p-1 text-[10px] font-extrabold tracking-[0.04em] text-slate-500 shadow-sm shadow-slate-200/70 transition hover:border-emerald-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bpcl-emerald"
    style={{ borderRadius: '14px', WebkitAppearance: 'none' }}
    aria-label={`Change language. Current language: ${language.toUpperCase()}`}
  >
    {languages.map(({ code, label }) => (
      <span
        key={code}
        className={`grid h-8 min-w-8 place-items-center !rounded-[10px] px-1 transition-colors ${language === code ? 'bg-bpcl-emerald text-white shadow-sm shadow-emerald-950/15' : 'text-slate-500'}`}
        style={{ borderRadius: '10px' }}
      >
        {label}
      </span>
    ))}
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="mr-0.5 h-3 w-3 text-slate-400" stroke="currentColor" strokeWidth="2"><path d="m4 6 4 4 4-4" /></svg>
  </button>
);

export default LanguageSwitcher;
