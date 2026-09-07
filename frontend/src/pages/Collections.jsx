// src/pages/Collections.jsx
import { useState, useMemo } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle } from '@ionic/react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import api from '../services/api';
import { dbService } from '../database/sqlite';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10];

const Collections = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const shiftData = location.state || {};
  const { mpdId, readings, nozzles = [], totalExpectedSale = 0, rates } = shiftData;

  // State for collections
  const [cashCounts, setCashCounts] = useState(
    DENOMINATIONS.reduce((acc, den) => ({ ...acc, [den]: '' }), {})
  );
  const [upiAmount, setUpiAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [udhariAmount, setUdhariAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Cash Input
  const handleCashChange = (denomination, count) => {
    setCashCounts(prev => ({
      ...prev,
      [denomination]: count === '' ? '' : parseInt(count, 10) || 0
    }));
  };

  // Memoized Calculations
  const calculations = useMemo(() => {
    const totalCash = DENOMINATIONS.reduce((sum, den) => {
      const count = cashCounts[den] === '' ? 0 : cashCounts[den];
      return sum + (den * count);
    }, 0);

    const upi = parseFloat(upiAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    const udhari = parseFloat(udhariAmount) || 0;

    const totalCollected = totalCash + upi + card + udhari;
    const difference = totalCollected - totalExpectedSale;

    return {
      totalCash,
      upi,
      card,
      udhari,
      totalCollected,
      difference
    };
  }, [cashCounts, upiAmount, cardAmount, udhariAmount, totalExpectedSale]);

  const handleSubmitShift = async () => {
    setIsSubmitting(true);
    let payload;

    try {
      const formattedReadings = nozzles.map((nozzle) => ({
        nozzleId: nozzle.nozzle_id,
        fuelType: nozzle.fuel_type,
        openingReading: nozzle.current_reading,
        closingReading: readings[nozzle.nozzle_id] || nozzle.current_reading
      }));

      const formattedCash = Object.entries(cashCounts)
        .filter(([, count]) => count > 0)
        .map(([denomination, count]) => ({
          denomination: parseInt(denomination, 10),
          count
        }));

      payload = {
        idempotencyKey: crypto.randomUUID(),
        businessDate: rates?.business_date || new Date().toISOString().split('T')[0],
        shiftType: 'EVENING',
        mpdId,
        readings: formattedReadings,
        collections: {
          cashBreakdown: formattedCash,
          upiAmount: calculations.upi,
          cardAmount: calculations.card,
          udhariTransactions: calculations.udhari > 0
            ? [{ customerId: 'walk-in', amount: calculations.udhari }]
            : []
        }
      };

      console.log('Sending Payload to Backend:', payload);

      // Update local SQLite immediately so the next person on this device sees the latest readings.
      try {
        for (const reading of formattedReadings) {
          await dbService.executeRun(
            'UPDATE nozzles SET current_reading = ? WHERE nozzle_id = ?',
            [reading.closingReading, reading.nozzleId]
          );
        }
      } catch (localDbError) {
        console.error('Failed to update local nozzles:', localDbError);
      }

      const response = await api.post('/sync/submit', payload);

      if (response.data.success) {
        alert(`Shift Successfully Reconciled!\nBackend Status: ${response.data.receipt.status}`);
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Shift Submission Failed:', error.response?.data || error);

      // If the backend is unreachable, save to the offline SQLite queue
      try {
        await dbService.executeRun(
          'INSERT INTO pending_shifts (idempotency_key, business_date, payload, sync_status) VALUES (?, ?, ?, ?)',
          [payload.idempotencyKey, payload.businessDate, JSON.stringify(payload), 'QUEUED']
        );

        alert('Network Offline: Shift saved securely to device storage. It will automatically sync when internet is restored!');
        navigate('/dashboard', { replace: true });
      } catch (dbError) {
        console.error('Critical Error saving to SQLite:', dbError);
        alert('Critical Error: Could not reach the server OR save locally.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!location.state) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff' }}>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/shift/${mpdId}`} color="dark" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-gray-800 text-lg">
            Reconciliation
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#F3F4F6' }}>
        <div className="max-w-md mx-auto pb-32 space-y-6 mt-2">

          {/* Expected Sale Header */}
          <div className="bg-bpcl-navy p-6 rounded-2xl shadow-md text-white">
            <p className="text-sm text-blue-200 font-medium mb-1">Total Expected Sale</p>
            <h2 className="text-3xl font-bold tracking-tight">₹{totalExpectedSale.toFixed(2)}</h2>
          </div>

          {/* Cash Denominations Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Cash Breakdown</h3>
            <div className="space-y-3">
              {DENOMINATIONS.map(den => (
                <div key={den} className="flex items-center justify-between">
                  <div className="w-16 font-semibold text-gray-600">₹{den}</div>
                  <div className="text-gray-400 font-medium text-sm px-2">x</div>
                  <input
                    type="number"
                    min="0"
                    value={cashCounts[den]}
                    onChange={(e) => handleCashChange(den, e.target.value)}
                    className="w-20 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold focus:border-bpcl-emerald focus:ring-1 focus:ring-bpcl-emerald outline-none"
                    placeholder="0"
                  />
                  <div className="w-24 text-right font-bold text-gray-800">
                    ₹{((cashCounts[den] || 0) * den).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t flex justify-between items-center">
              <span className="font-bold text-gray-500 text-sm uppercase">Total Cash</span>
              <span className="font-bold text-lg text-bpcl-emerald">₹{calculations.totalCash.toLocaleString()}</span>
            </div>
          </div>

          {/* Digital & Credit Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Digital & Credit</h3>
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-600 flex items-center space-x-2">
                  <span className="w-8 h-8 rounded bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">UPI</span>
                </span>
                <input
                  type="number"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  className="w-32 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-right font-bold focus:border-bpcl-emerald outline-none"
                  placeholder="₹0"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-600 flex items-center space-x-2">
                  <span className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">POS</span>
                </span>
                <input
                  type="number"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  className="w-32 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-right font-bold focus:border-bpcl-emerald outline-none"
                  placeholder="₹0"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-600 flex items-center space-x-2">
                  <span className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">CR</span>
                </span>
                <input
                  type="number"
                  value={udhariAmount}
                  onChange={(e) => setUdhariAmount(e.target.value)}
                  className="w-32 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-right font-bold focus:border-bpcl-emerald outline-none"
                  placeholder="₹0"
                />
              </div>

            </div>
          </div>

          {/* Reconciliation Summary */}
          <div className={`p-5 rounded-2xl shadow-sm border ${calculations.difference === 0 ? 'bg-green-50 border-green-200' : calculations.difference < 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-gray-600">Total Collected</span>
              <span className="font-bold text-gray-900">₹{calculations.totalCollected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-600">Difference</span>
              <span className={`font-bold text-lg ${calculations.difference === 0 ? 'text-green-600' : calculations.difference < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                {calculations.difference > 0 ? '+' : ''}₹{calculations.difference.toFixed(2)}
              </span>
            </div>
          </div>

        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="max-w-md mx-auto">
            <button 
              onClick={handleSubmitShift}
              disabled={isSubmitting}
              className="w-full h-14 bg-bpcl-navy text-white font-bold text-lg rounded-full active:scale-[0.98] transition-transform shadow-lg shadow-blue-900/20 disabled:opacity-70"
            >
              {isSubmitting ? 'Syncing to BPCL Servers...' : 'Finalize Shift'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Collections;