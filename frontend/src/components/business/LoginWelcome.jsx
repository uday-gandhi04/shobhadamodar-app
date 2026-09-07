import { useTranslation } from 'react-i18next';

const LoginWelcome = () => {
  const { t, i18n } = useTranslation();

  const language = i18n.language?.split('-')[0] || 'en';

  const greeting =
    language === 'mr'
      ? 'नमस्कार!'
      : 'नमस्ते!';

  const subtitle =
    language === 'mr'
      ? 'आजची शिफ्ट सुरू करण्यासाठी साइन इन करा.'
      : language === 'hi'
        ? 'आज की शिफ्ट शुरू करने के लिए साइन इन करें।'
        : "Sign in to access today's shift operations.";

  return (
    <div className="space-y-1">
      <p
        lang={language === 'mr' ? 'mr' : 'hi'}
        className="
          font-devanagari
          text-[24px]
          font-bold
          leading-[1.05]
          tracking-[-0.015em]
          text-bpcl-emerald
        "
      >
        {greeting}
      </p>

      <h1
        className="
          mt-1
          text-[25px]
          font-semibold
          leading-[1.12]
          tracking-[-0.025em]
          text-slate-950
        "
      >
        {language === 'en'
          ? 'Welcome Back'
          : t('login.welcome')}
      </h1>

      <p
        className="
          mt-2
          text-[13px]
          font-normal
          leading-[1.45]
          text-slate-500
        "
      >
        {subtitle}
      </p>
    </div>
  );
};

export default LoginWelcome;