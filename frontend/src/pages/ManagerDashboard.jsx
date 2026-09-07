// src/pages/ManagerDashboard.jsx
import { useState, useEffect } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { dbService } from '../database/sqlite';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [mpds, setMpds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SHIFTS'); // 'SHIFTS' or 'PUMPS'

  // Fetch both backend shifts and local SQLite pump data
  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        // 1. Fetch Backend Shifts
        const shiftRes = await api.get('/sync/shifts').catch(() => ({ data: { success: false, shifts: [] } }));
        if (shiftRes.data?.success) {
          setShifts(shiftRes.data.shifts);
        }

        // 2. Fetch Local Pump Data (For Overrides)
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

      } catch (error) {
        console.error("Failed to load manager data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchManagerData();
  }, []);

  const handleLogout = () => {
    navigate('/login', { replace: true });
  };

  // Manager Override Function
  const handleUpdateReading = async (nozzleId, newReading) => {
    if (!newReading || isNaN(newReading)) return;
    
    const confirmUpdate = window.confirm(`Are you sure you want to force update nozzle ${nozzleId.toUpperCase()} to ${newReading}?`);
    if (!confirmUpdate) return;

    try {
      await dbService.executeRun(
        'UPDATE nozzles SET current_reading = ? WHERE nozzle_id = ?',
        [parseFloat(newReading), nozzleId]
      );
      
      // Update local state to reflect the change
      setMpds((currentMpds) => currentMpds.map((mpd) => ({
        ...mpd,
        nozzles: mpd.nozzles.map((nozzle) => (
          nozzle.nozzle_id === nozzleId
            ? { ...nozzle, current_reading: parseFloat(newReading) }
            : nozzle
        ))
      })));
      
      alert("Reading updated successfully. The next shift will use this new opening reading.");
    } catch (error) {
      console.error("Failed to override reading:", error);
      alert("Database error while updating reading.");
    }
  };

  const totalSalesPaise = shifts.reduce((sum, shift) => sum + (shift.expectedTotalSalePaise || 0), 0);
  const netDifferencePaise = shifts.reduce((sum, shift) => sum + (shift.differencePaise || 0), 0);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff' }}>
          <IonTitle className="font-bold text-bpcl-navy">Manager Command</IonTitle>
          <IonButtons slot="end">
            <button onClick={handleLogout} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-full mr-2">
              Logout
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#F3F4F6' }}>
        <div className="max-w-md mx-auto pb-12 mt-4">
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-200 p-1 rounded-full mb-6">
            <button 
              onClick={() => setActiveTab('SHIFTS')}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'SHIFTS' ? 'bg-white shadow-sm text-bpcl-navy' : 'text-gray-500'}`}
            >
              Shift Feed
            </button>
            <button 
              onClick={() => setActiveTab('PUMPS')}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'PUMPS' ? 'bg-white shadow-sm text-bpcl-navy' : 'text-gray-500'}`}
            >
              Pump Settings
            </button>
          </div>

          {isLoading ? (
            <p className="text-center text-gray-500">Loading station data...</p>
          ) : activeTab === 'SHIFTS' ? (
            /* --- SHIFT FEED TAB --- */
            <div className="space-y-6">
              <div className="bg-bpcl-navy rounded-3xl p-6 text-white shadow-xl">
                <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Today's Total Revenue</p>
                <h2 className="text-4xl font-black tracking-tight mb-6">₹{(totalSalesPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                <div className="flex justify-between items-center pt-4 border-t border-white/20">
                  <span className="text-blue-100 font-medium">Net Short/Excess</span>
                  <span className={`text-lg font-bold px-3 py-1 rounded-full ${netDifferencePaise >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {netDifferencePaise > 0 ? '+' : ''}₹{(netDifferencePaise / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-gray-800 text-lg px-1">Completed Shifts ({shifts.length})</h3>
              
              {shifts.length === 0 ? (
                <div className="text-center bg-white p-8 rounded-2xl border border-gray-100">
                  <p className="text-gray-500 font-medium">No shifts submitted yet today.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div key={shift._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-bpcl-navy text-lg">{shift.shiftType}</p>
                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase">Sale: ₹{((shift.expectedTotalSalePaise || 0) / 100).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block font-bold text-sm px-3 py-1 rounded-lg ${shift.differencePaise === 0 ? 'bg-green-50 text-green-700' : shift.differencePaise < 0 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                          {shift.reconciliationStatus}
                        </span>
                        <p className={`text-sm font-bold mt-1 ${shift.differencePaise === 0 ? 'text-green-600' : shift.differencePaise < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {shift.differencePaise > 0 ? '+' : ''}₹{((shift.differencePaise || 0) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* --- PUMP SETTINGS TAB --- */
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-2">
                <p className="text-orange-800 text-sm font-medium">
                  <strong>Warning:</strong> Only update readings to fix offline sync issues. These changes bypass normal shift tracking.
                </p>
              </div>

              {mpds.map((mpd) => (
                <div key={mpd.mpd_id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-bpcl-navy text-lg mb-4">{mpd.mpd_number}</h3>
                  <div className="space-y-4">
                    {mpd.nozzles.map((nozzle) => (
                      <div key={nozzle.nozzle_id} className="flex flex-col space-y-2 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <span className={`font-bold text-sm ${nozzle.fuel_type === 'PETROL' ? 'text-fuel-petrol' : 'text-fuel-diesel'}`}>
                            {nozzle.nozzle_id.toUpperCase()} • {nozzle.fuel_type}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">Current: {nozzle.current_reading}</span>
                        </div>
                        <div className="flex space-x-2">
                          <input 
                            type="number"
                            step="0.01"
                            id={`input-${nozzle.nozzle_id}`}
                            placeholder="New Reading..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-bpcl-emerald"
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`input-${nozzle.nozzle_id}`);
                              handleUpdateReading(nozzle.nozzle_id, input.value);
                              input.value = ''; // clear after save
                            }}
                            className="bg-bpcl-navy text-white px-4 py-2 rounded-lg text-sm font-bold"
                          >
                            Update
                          </button>
                        </div>
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

export default ManagerDashboard;