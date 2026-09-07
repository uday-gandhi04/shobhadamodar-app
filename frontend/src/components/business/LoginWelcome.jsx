import { useTranslation } from 'react-i18next';

const LoginWelcome = () => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  return (
    <div>
      <p lang="hi" className="font-[Mukta] text-xl font-bold leading-none text-bpcl-emerald">
        {isEnglish ? 'नमस्ते!' : t('login.welcome')}
      </p>
      <h1 className="mt-1 text-[1.75rem] font-bold leading-[1.12] tracking-[-0.035em] text-slate-950">
        {isEnglish ? t('login.welcome') : 'Welcome back'}
      </h1>
      <p className="mt-2 text-sm font-medium text-slate-500">
        {isEnglish ? 'Sign in to access today’s shift operations.' : 'आज की शिफ्ट शुरू करने के लिए साइन इन करें।'}
      </p>
    </div>
  );
};

export default LoginWelcome;
