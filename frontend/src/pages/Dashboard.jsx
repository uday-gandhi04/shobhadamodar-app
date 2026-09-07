// src/pages/Dashboard.jsx
import { useEffect, useState, useContext } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { SyncContext } from '../context/SyncContext';
import { dbService } from '../database/sqlite';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useContext(AuthContext);
  const { pushOfflineShifts } = useContext(SyncContext);
  const navigate = useNavigate();
  
  const [rates, setRates] = useState(null);
  const [mpds, setMpds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOfflineData = async () => {
      try {
        // 1. Fetch today's rates from local SQLite
        const rateRes = await dbService.executeQuery('SELECT * FROM fuel_rates LIMIT 1');
        if (rateRes.values && rateRes.values.length > 0) {
          setRates(rateRes.values[0]);
        }

        // 2. Fetch MPDs
        const mpdRes = await dbService.executeQuery('SELECT * FROM mpds');
        const loadedMpds = mpdRes.values || [];

        // 3. Fetch Nozzles for each MPD
        const mpdsWithNozzles = await Promise.all(loadedMpds.map(async (mpd) => {
          const nozzleRes = await dbService.executeQuery(
            'SELECT * FROM nozzles WHERE mpd_id = ?', 
            [mpd.mpd_id]
          );
          return { ...mpd, nozzles: nozzleRes.values || [] };
        }));

        setMpds(mpdsWithNozzles);

        // Attempt to upload pending shifts after the local dashboard data is ready.
        pushOfflineShifts();
      } catch (error) {
        console.error("Error reading from local SQLite:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOfflineData();
  }, [pushOfflineShifts]);

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ '--background': '#F3F4F6' }}>
        <div className="max-w-md mx-auto py-6 px-2">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'Employee'}</h1>
              <p className="text-sm font-medium text-bpcl-emerald">Active Shift • Offline Mode Ready</p>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 bg-white text-red-600 font-bold rounded-full shadow-sm text-sm"
            >
              Logout
            </button>
          </div>

          {/* Offline Data Display */}
          {isLoading ? (
            <p className="text-center text-gray-500 font-medium mt-10">Loading pump data...</p>
          ) : (
            <div className="space-y-6">
              
              {/* Rates Card */}
              {rates && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Today's Rates</p>
                    <div className="flex space-x-4">
                      <span className="font-bold text-fuel-petrol">P: ₹{(rates.petrol_paise / 100).toFixed(2)}</span>
                      <span className="font-bold text-fuel-diesel">D: ₹{(rates.diesel_paise / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                    <span className="text-bpcl-emerald font-bold">₹</span>
                  </div>
                </div>
              )}

              {/* MPD Cards */}
              <h2 className="text-lg font-bold text-gray-800 pt-2">Pump Layout</h2>
              {mpds.map((mpd) => (
                <div
                  key={mpd.mpd_id}
                  onClick={() => navigate(`/shift/${mpd.mpd_id}`)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] active:bg-gray-50 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-bpcl-navy text-lg">{mpd.mpd_number}</h3>
                    <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">Tap to start shift →</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pointer-events-none">
                    {mpd.nozzles.map((nozzle) => (
                      <div 
                        key={nozzle.nozzle_id} 
                        className={`p-3 rounded-xl border-2 ${nozzle.fuel_type === 'PETROL' ? 'border-fuel-petrol/20 bg-green-50' : 'border-fuel-diesel/20 bg-blue-50'}`}
                      >
                        <p className={`text-sm font-bold ${nozzle.fuel_type === 'PETROL' ? 'text-fuel-petrol' : 'text-fuel-diesel'}`}>
                          {nozzle.nozzle_id.toUpperCase()} • {nozzle.fuel_type}
                        </p>
                        <p className="text-xs text-gray-600 font-medium mt-1">Meter: {nozzle.current_reading}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;