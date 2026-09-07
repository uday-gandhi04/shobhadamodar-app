// src/pages/ShiftEntry.jsx
import { useState, useEffect } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle } from '@ionic/react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../database/sqlite';

const ShiftEntry = () => {
  const { mpdId } = useParams();
  const navigate = useNavigate();
  
  const [mpd, setMpd] = useState(null);
  const [nozzles, setNozzles] = useState([]);
  const [rates, setRates] = useState(null);
  const [readings, setReadings] = useState({}); // Stores { nozzle_id: closingValue }
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadShiftData = async () => {
      try {
        // 1. Fetch the specific MPD
        const mpdRes = await dbService.executeQuery('SELECT * FROM mpds WHERE mpd_id = ?', [mpdId]);
        if (mpdRes.values.length > 0) setMpd(mpdRes.values[0]);

        // 2. Fetch its Nozzles
        const nozzleRes = await dbService.executeQuery('SELECT * FROM nozzles WHERE mpd_id = ?', [mpdId]);
        setNozzles(nozzleRes.values || []);

        // 3. Fetch Rates
        const rateRes = await dbService.executeQuery('SELECT * FROM fuel_rates LIMIT 1');
        if (rateRes.values.length > 0) setRates(rateRes.values[0]);

      } catch (error) {
        console.error("Failed to load shift data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadShiftData();
  }, [mpdId]);

  // Handle Input Changes
  const handleReadingChange = (nozzleId, value) => {
    setReadings(prev => ({
      ...prev,
      [nozzleId]: parseFloat(value) || 0
    }));
  };

  // Calculate live dispensing metrics
  const getNozzleMetrics = (nozzle) => {
    const closing = readings[nozzle.nozzle_id] || nozzle.current_reading;
    const dispensed = Math.max(0, closing - nozzle.current_reading).toFixed(2);
    
    const ratePaise = nozzle.fuel_type === 'PETROL' ? rates?.petrol_paise : rates?.diesel_paise;
    const expectedSale = ((dispensed * (ratePaise || 0)) / 100).toFixed(2);
    
    return { dispensed, expectedSale };
  };

  const handleProceed = () => {
    let totalExpectedSale = 0;
    nozzles.forEach(nozzle => {
      const metrics = getNozzleMetrics(nozzle);
      totalExpectedSale += parseFloat(metrics.expectedSale);
    });

    navigate('/collections', {
      state: {
        mpdId,
        readings,
        nozzles,
        totalExpectedSale,
        rates
      }
    });
  };

  return (
    <IonPage>
      {/* Native-feeling header with a back button */}
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff' }}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" color="dark" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-gray-800 text-lg">
            {mpd ? `Shift: ${mpd.mpd_number}` : 'Loading...'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#F3F4F6' }}>
        <div className="max-w-md mx-auto pb-48">
          
          {isLoading ? (
            <p className="text-center text-gray-500 mt-10">Loading local data...</p>
          ) : (
            <div className="space-y-6 mt-4">
              {nozzles.map(nozzle => {
                const metrics = getNozzleMetrics(nozzle);
                const isPetrol = nozzle.fuel_type === 'PETROL';
                
                return (
                  <div key={nozzle.nozzle_id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={`font-bold text-lg ${isPetrol ? 'text-fuel-petrol' : 'text-fuel-diesel'}`}>
                        {nozzle.nozzle_id.toUpperCase()} • {nozzle.fuel_type}
                      </h3>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">Opening</p>
                        <p className="font-semibold text-gray-700">{nozzle.current_reading}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Closing Reading</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={nozzle.current_reading.toString()}
                        onChange={(e) => handleReadingChange(nozzle.nozzle_id, e.target.value)}
                        className={`w-full h-14 px-4 bg-gray-50 rounded-xl border-2 ${isPetrol ? 'focus:border-fuel-petrol' : 'focus:border-fuel-diesel'} focus:bg-white transition-all font-bold text-lg text-gray-800 outline-none`}
                      />
                    </div>

                    {/* Live Calculation Output */}
                    <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Dispensed</p>
                        <p className="font-bold text-gray-800">{metrics.dispensed} L</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium">Expected Sale</p>
                        <p className="font-bold text-bpcl-emerald">₹{metrics.expectedSale}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Bottom Action Bar */}
        {!isLoading && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto">
              <button 
                onClick={handleProceed}
                className="w-full h-14 bg-bpcl-emerald text-white font-bold text-lg rounded-full active:scale-[0.98] transition-transform shadow-lg shadow-green-200"
              >
                Continue to Collections →
              </button>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ShiftEntry;