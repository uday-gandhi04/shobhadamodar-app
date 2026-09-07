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

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          '--background': '#F5F7F6',
        }}
      >
        <main
          className="
            relative
            mx-auto
            flex
            min-h-[100dvh]
            w-full
            max-w-[480px]
            flex-col
            overflow-hidden
            bg-[#F5F7F6]
            px-5
            pb-0
            pt-[max(1rem,env(safe-area-inset-top))]
          "
        >
          {/* very subtle ambient background */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-24
              top-14
              h-56
              w-56
              rounded-full
              bg-emerald-100/50
              blur-3xl
            "
          />

          {/* Brand header */}
          <header className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="
                  grid
                  h-10
                  w-10
                  shrink-0
                  place-items-center
                  rounded-[12px]
                  bg-bpcl-navy
                  shadow-[0_5px_14px_rgba(30,58,138,0.18)]
                "
              >
                <span
                  className="
                    grid
                    h-7
                    w-7
                    place-items-center
                    rounded-full
                    border-2
                    border-bpcl-gold
                    text-[9px]
                    font-bold
                    text-bpcl-gold
                  "
                >
                  SP
                </span>
              </div>

              <div>
                <p
                  className="
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-bpcl-navy
                  "
                >
                  BPCL AUTHORISED OUTLET
                </p>

                <p
                  className="
                    mt-0.5
                    text-[13px]
                    font-semibold
                    tracking-[-0.01em]
                    text-slate-900
                  "
                >
                  Shobhadamodar Petroleum
                </p>
              </div>
            </div>

            <LanguageSwitcher
              language={i18n.language}
              onChange={changeLanguage}
            />
          </header>

          {/* Main */}
          <section className="relative z-10 pt-7">
            <LoginWelcome />

            <div className="mt-6">
              <RoleToggle
                role={role}
                setRole={setRole}
              />
            </div>

            <LoginForm role={role} />
          </section>

          {/* Security assurance */}
          <section
            className="
              relative
              z-10
              mt-5
              flex
              items-center
              justify-center
              gap-2
            "
            aria-label="Security assurance"
          >
            <span
              aria-hidden="true"
              className="
                grid
                h-4
                w-4
                place-items-center
                rounded-full
                bg-emerald-100
                text-bpcl-emerald
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-2.5 w-2.5"
                stroke="currentColor"
                strokeWidth="2.8"
              >
                <path d="M12 3 5 6v5c0 4.55 2.98 8.66 7 10 4.02-1.34 7-5.45 7-10V6l-7-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>

            <p className="text-[9px] font-medium text-slate-500">
              {i18n.t('login.secure')}
            </p>
          </section>

          {/* Bottom visual */}
          <LoginStationVisual />
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Login;