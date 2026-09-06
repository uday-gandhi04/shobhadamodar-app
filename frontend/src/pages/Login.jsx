// src/pages/Login.jsx
import { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import RoleToggle from '../components/ui/RoleToggle';
import LoginForm from '../components/business/LoginForm';

const Login = () => {
  const { t, i18n } = useTranslation();
  const [role, setRole] = useState('EMPLOYEE');

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : i18n.language === 'hi' ? 'mr' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ '--background': '#ffffff' }}>
        {/* Responsive Grid: 1 column on mobile, 2 on medium screens and up */}
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center p-6 pb-32">
          
          {/* Left Side: Form Section */}
          <div className="w-full max-w-md mx-auto flex flex-col justify-center">
            
            <div className="flex justify-between items-start mb-8">
              <div>
                {/* Fixed the duplicate text issue here */}
                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-1">
                  {t('login.welcome')}
                </h1>
                <p className="text-gray-500 text-sm font-medium">Sign in to continue</p>
              </div>
              
              <button 
                onClick={toggleLanguage}
                className="text-xs font-bold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-bpcl-navy rounded-md transition-colors"
              >
                {i18n.language.toUpperCase()}
              </button>
            </div>

            <RoleToggle role={role} setRole={setRole} />
            <LoginForm />

          </div>

          {/* Right Side: Branding (Hidden on mobile, visible on desktop/tablet) */}
          <div className="hidden md:flex flex-col items-center justify-center p-8 bg-bpcl-surface rounded-3xl h-full min-h-[500px]">
             <h2 className="text-4xl font-bold text-bpcl-emerald text-center mb-4">Shobhadamodar<br/>Petroleum</h2>
             <p className="text-bpcl-navy font-medium italic">Har Din Behtar Kal™</p>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;