import { useTranslation } from 'react-i18next';

const LoginBrandPanel = () => {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-[680px] overflow-hidden rounded-[2rem] bg-bpcl-navy p-10 text-white shadow-xl lg:flex lg:flex-col lg:justify-between">
      <div className="relative z-10">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-bpcl-gold text-lg font-black text-bpcl-navy">SP</div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-200">Retail operations</p>
        <h2 className="mt-4 max-w-sm text-4xl font-extrabold leading-tight">A reliable shift starts here.</h2>
        <p className="mt-4 max-w-sm text-base leading-7 text-blue-100">Fast sign-in, live shift data, and dependable offline access for your forecourt team.</p>
      </div>
      <div className="relative z-10 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
        <p className="text-sm font-semibold text-white">{t('login.secure')}</p>
      </div>
      <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-bpcl-emerald/80 blur-2xl" />
      <div className="absolute bottom-0 left-0 h-3 w-full bg-bpcl-gold" />
    </aside>
  );
};

export default LoginBrandPanel;
