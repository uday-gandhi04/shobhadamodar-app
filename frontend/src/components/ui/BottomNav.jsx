// src/components/ui/BottomNav.jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  const navItems = [
    { 
      id: 'home', 
      path: '/dashboard', 
      label: isEnglish ? 'Home' : 'होम',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    },
    { 
      id: 'history', 
      path: '#', // Placeholder
      label: isEnglish ? 'History' : 'इतिहास',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    },
    { 
      id: 'reports', 
      path: '#', // Placeholder
      label: isEnglish ? 'Reports' : 'रिपोर्ट',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    },
    { 
      id: 'profile', 
      path: '#', // Placeholder
      label: isEnglish ? 'Profile' : 'प्रोफ़ाइल',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-[480px] mx-auto flex justify-between items-center px-6 py-3">
        {navItems.map((item) => {
          const isActive = location.pathname.includes(item.path) && item.path !== '#';
          return (
            <button 
              key={item.id}
              onClick={() => item.path !== '#' && navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 min-w-[64px]"
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-emerald-50 text-bpcl-emerald' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={isActive ? 2.5 : 2} stroke="currentColor" className="w-6 h-6">
                  {item.icon}
                </svg>
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-bpcl-emerald' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;