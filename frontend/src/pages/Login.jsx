import { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import LoginWelcome from '../components/business/LoginWelcome';
import LoginForm from '../components/business/LoginForm';
import LoginStationVisual from '../components/business/LoginStationVisual';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import RoleToggle from '../components/ui/RoleToggle';

const Login = () => {
  const { i18n } = useTranslation();
  const [role, setRole] = useState('EMPLOYEE');

  const toggleLanguage = () => {
    const nextLanguage = i18n.language === 'en' ? 'hi' : i18n.language === 'hi' ? 'mr' : 'en';
    i18n.changeLanguage(nextLanguage);
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#f4f7f5' }}>
        <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-[#f4f7f5] px-5 pb-0 pt-[max(1.25rem,env(safe-area-inset-top))] sm:rounded-[2rem] sm:shadow-2xl sm:shadow-slate-900/10">
          <div aria-hidden="true" className="absolute -right-20 top-28 h-48 w-48 rounded-full bg-emerald-100/70 blur-3xl" />
          <header className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-bpcl-navy shadow-lg shadow-blue-950/15">
                <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-bpcl-gold text-[10px] font-black text-bpcl-gold">SP</span>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-bpcl-navy">BPCL authorised outlet</p>
                <p className="mt-0.5 text-sm font-extrabold tracking-tight text-slate-900">Shobhadamodar Petroleum</p>
              </div>
            </div>
            <LanguageSwitcher language={i18n.language} onChange={toggleLanguage} />
          </header>

          <section className="relative z-10 pt-8">
            <LoginWelcome />
            <div className="mt-7">
              <RoleToggle role={role} setRole={setRole} />
            </div>
            <LoginForm role={role} />
          </section>

          <section className="relative z-10 mt-6 flex items-center justify-center gap-2 text-center" aria-label="Security assurance">
            <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-bpcl-emerald">
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.5"><path d="M12 3 5 6v5c0 4.55 2.98 8.66 7 10 4.02-1.34 7-5.45 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
            </span>
            <p className="text-xs font-medium tracking-[0.01em] text-slate-500">{i18n.t('login.secure')}</p>
          </section>

          <LoginStationVisual />
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Login;
