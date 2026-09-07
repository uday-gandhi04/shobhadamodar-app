// src/pages/Dashboard.jsx
import { useEffect, useState, useContext } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SyncContext } from '../context/SyncContext';
import { dbService } from '../database/sqlite';
import BottomNav from '../components/ui/BottomNav';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext);
  const { pushOfflineShifts } = useContext(SyncContext);
  const navigate = useNavigate();
  const isEnglish = i18n.language === 'en';
  
  const [rates, setRates] = useState(null);
  const [mpds, setMpds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date();
  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = today.toLocaleDateString(isEnglish ? 'en-IN' : 'hi-IN', dateOptions);

  useEffect(() => {
    const loadOfflineData = async () => {
      try {
        const rateRes = await dbService.executeQuery('SELECT * FROM fuel_rates LIMIT 1');
        if (rateRes.values && rateRes.values.length > 0) setRates(rateRes.values[0]);

        const mpdRes = await dbService.executeQuery('SELECT * FROM mpds');
        const loadedMpds = mpdRes.values || [];

        const mpdsWithNozzles = await Promise.all(loadedMpds.map(async (mpd) => {
          const nozzleRes = await dbService.executeQuery(
            'SELECT * FROM nozzles WHERE mpd_id = ?', 
            [mpd.mpd_id]
          );
          return { ...mpd, nozzles: nozzleRes.values || [] };
        }));

        setMpds(mpdsWithNozzles);
        pushOfflineShifts(); 
      } catch (error) {
        console.error("Error reading from local SQLite:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOfflineData();
  }, []);

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#f4f7f5' }}>
        <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-[#f4f7f5] pb-24">
          
          {/* Header matching the Login Screen's rounded bottom and spacing */}
          <header className="relative z-10 rounded-b-[2rem] bg-white px-6 pb-6 pt-[max(2rem,env(safe-area-inset-top))] shadow-sm shadow-slate-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p lang="hi" className="font-[Mukta] text-2xl font-bold leading-none text-bpcl-emerald mb-1">
                  {isEnglish ? `Hello, ${user?.name || 'Station Admin'}` : `नमस्ते, ${user?.name || 'स्टेशन एडमिन'}`}
                </p>
                <p className="text-xs font-semibold text-slate-500">{formattedDate}</p>
              </div>
              
              {/* Profile Avatar / Status */}
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-bpcl-emerald border border-emerald-100 shadow-inner">
                <span className="text-lg font-black">{user?.name?.charAt(0) || 'A'}</span>
              </div>
            </div>
            
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
               <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bpcl-emerald opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-bpcl-emerald"></span>
                </span>
                <span className="text-[11px] font-extrabold tracking-wide text-slate-600 uppercase">System Online & Synced</span>
            </div>
          </header>

          <div className="px-5 mt-6 space-y-6">
            {isLoading ? (
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-28 bg-slate-200 rounded-[1.5rem]"></div>
                <div className="h-32 bg-slate-200 rounded-[1.5rem]"></div>
              </div>
            ) : (
              <>
                {/* Rates Card - Redesigned to match the BPCL Navy styling */}
                {rates && (
                  <div className="relative overflow-hidden rounded-[1.5rem] bg-bpcl-navy p-6 shadow-lg shadow-blue-950/20 text-white">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                    <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-bpcl-emerald/20 blur-xl"></div>
                    
                    <div className="relative z-10 flex items-center justify-between mb-4">
                      <p className="text-xs font-extrabold text-blue-200 uppercase tracking-widest">Today's Rates</p>
                      <div className="grid h-7 w-7 place-items-center rounded-full border border-bpcl-gold text-[8px] font-black text-bpcl-gold">SP</div>
                    </div>
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Petrol</p>
                        <p className="text-2xl font-black text-white leading-none">₹{(rates.petrol_paise / 100).toFixed(2)}</p>
                      </div>
                      <div className="w-[1px] h-10 bg-white/15"></div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diesel</p>
                        <p className="text-2xl font-black text-white leading-none">₹{(rates.diesel_paise / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MPD Selection */}
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 mb-4 ml-1 uppercase tracking-wider">
                    {isEnglish ? "Select Pump" : "पंप चुनें"}
                  </h2>
                  <div className="space-y-4">
                    {mpds.map((mpd) => (
                      <button 
                        key={mpd.mpd_id}
                        onClick={() => navigate(`/shift/${mpd.mpd_id}`)}
                        className="group w-full text-left rounded-[1.5rem] border border-white/90 bg-white p-5 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.15)] transition-all duration-200 active:scale-[0.98] active:bg-slate-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f4f7f5] text-bpcl-emerald transition-colors group-hover:bg-emerald-50">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-lg tracking-tight">{mpd.mpd_number}</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                              {mpd.nozzles.length} Nozzles • Ready
                            </p>
                          </div>
                        </div>
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-bpcl-emerald group-hover:text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </>
            )}
          </div>
        </main>
      </IonContent>
      <BottomNav />
    </IonPage>
  );
};

export default Dashboard;