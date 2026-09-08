import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { endShift, getCurrentShift, previewEndShift } from '../services/shiftApi';
import { getBusinessDate } from '../utils/businessDate';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const EndShift = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [shift, setShift] = useState(null);
  const [closings, setClosings] = useState({});
  const [cashCounts, setCashCounts] = useState({});
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState('');
  const [udhari, setUdhari] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getCurrentShift(getBusinessDate());
        if (!response.data) {
          navigate('/select-mpd', { replace: true });
          return;
        }
        const current = response.data;
        setShift(current);
        const nextClosings = {};
        (current.readings || []).forEach((reading) => { nextClosings[reading.nozzleId] = String(reading.openingReading); });
        setClosings(nextClosings);
        const nextCash = {};
        (current.cashCollections || []).forEach((item) => { nextCash[item.denomination] = String(item.count); });
        setCashCounts(nextCash);
        setUpi(current.totalUpiPaise ? (current.totalUpiPaise / 100).toFixed(2) : '');
        setCard(current.totalCardPaise ? (current.totalCardPaise / 100).toFixed(2) : '');
        setUdhari(current.totalUdhariPaise ? (current.totalUdhariPaise / 100).toFixed(2) : '');
      } catch (err) {
        setError(err.message || t('employee.endShift.loadError'));
      } finally { setLoading(false); }
    };
    load();
  }, [navigate, t]);

  const totalCash = useMemo(() => DENOMINATIONS.reduce((sum, d) => sum + d * (Number(cashCounts[d]) || 0), 0), [cashCounts]);

  const payload = () => ({
    readings: Object.entries(closings).map(([nozzleId, closingReading]) => ({ nozzleId, closingReading: Number(closingReading) })),
    collections: {
      cashBreakdown: DENOMINATIONS.map((denomination) => ({ denomination, count: Number(cashCounts[denomination]) || 0 })),
      upiPaise: Math.round((Number(upi) || 0) * 100),
      cardPaise: Math.round((Number(card) || 0) * 100),
      udhariPaise: Math.round((Number(udhari) || 0) * 100),
    },
  });

  const calculate = async () => {
    if (!shift || calculating) return;
    try {
      setCalculating(true); setError('');
      const response = await previewEndShift(shift._id, payload());
      setPreview(response.data);
    } catch (err) {
      setError(err.message || t('employee.endShift.previewError'));
    } finally { setCalculating(false); }
  };

  const confirmEnd = async () => {
    if (!shift || ending || !preview) return;
    try {
      setEnding(true); setError('');
      await endShift(shift._id, payload());
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || t('employee.endShift.endError'));
    } finally { setEnding(false); }
  };

  const formatMoney = (paise) => `₹${(Number(paise || 0) / 100).toFixed(2)}`;

  return (
    <IonPage>
      <IonHeader className="ion-no-border"><IonToolbar style={{ '--background': '#ffffff' }}><IonButtons slot="start"><IonBackButton defaultHref="/dashboard" color="dark" text="" /></IonButtons><IonTitle className="font-bold text-gray-800 text-lg">{t('employee.endShift.title')}</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding" style={{ '--background': '#F3F4F6' }}>
        <div className="mx-auto max-w-md pb-40">
          {loading ? <div className="mt-4 h-48 animate-pulse rounded-[20px] bg-white" /> : shift ? (
            <>
              <div className="mt-3 rounded-[20px] bg-white p-5 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{shift.mpdId?.mpdNumber}</p><p className="mt-1 text-[13px] text-slate-500">{t('employee.endShift.subtitle')}</p></div>

              <section className="mt-4 rounded-[20px] bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-900">{t('employee.endShift.finalNozzles')}</p>
                <div className="mt-3 space-y-3">
                  {(shift.readings || []).map((reading) => {
                    const nozzle = shift.mpdId?.nozzles?.find((item) => item.nozzleId === reading.nozzleId);
                    return <label key={reading.nozzleId} className="block rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3"><span className="block text-[10px] font-semibold text-slate-500">{nozzle?.name || reading.nozzleId} · {t('employee.endShift.opening')} {Number(reading.openingReading).toFixed(2)}</span><input type="number" min={reading.openingReading} step="0.01" value={closings[reading.nozzleId] || ''} onChange={(e) => { setClosings((p) => ({ ...p, [reading.nozzleId]: e.target.value })); setPreview(null); }} className="mt-1 w-full bg-transparent text-[19px] font-semibold text-slate-900 outline-none" /></label>;
                  })}
                </div>
              </section>

              <section className="mt-4 rounded-[20px] bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-900">{t('employee.endShift.finalMoney')}</p>
                <p className="mt-1 text-[11px] text-slate-500">{t('employee.endShift.sameCollectionPage')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {DENOMINATIONS.map((d) => <label key={d} className="rounded-[12px] border border-slate-200 bg-slate-50 p-2.5"><span className="block text-[10px] font-semibold text-slate-500">₹{d}</span><input type="number" min="0" step="1" value={cashCounts[d] || ''} onChange={(e) => { setCashCounts((p) => ({ ...p, [d]: e.target.value })); setPreview(null); }} className="mt-1 w-full bg-transparent text-[15px] font-semibold text-slate-900 outline-none" placeholder="0" /></label>)}
                </div>
                <div className="mt-3 flex justify-between text-[12px]"><span className="text-slate-500">{t('employee.endShift.cashTotal')}</span><span className="font-semibold text-slate-900">₹{totalCash.toFixed(2)}</span></div>
                {[['UPI', upi, setUpi], ['Card / ATM', card, setCard], ['Udhari', udhari, setUdhari]].map(([label, value, setter]) => <label key={label} className="mt-3 block rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3"><span className="block text-[10px] font-semibold text-slate-500">{label}</span><div className="mt-1 flex items-center"><span className="mr-1 text-slate-500">₹</span><input type="number" min="0" step="0.01" value={value} onChange={(e) => { setter(e.target.value); setPreview(null); }} className="w-full bg-transparent text-[18px] font-semibold text-slate-900 outline-none" placeholder="0.00" /></div></label>)}
              </section>

              {preview && <section className="mt-4 rounded-[20px] bg-slate-900 p-5 text-white shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">{t('employee.endShift.finalResult')}</p><div className="mt-3 grid grid-cols-2 gap-4"><div><p className="text-[10px] text-slate-400">{t('employee.endShift.sale')}</p><p className="mt-1 text-[22px] font-bold">{formatMoney(preview.expectedTotalSalePaise)}</p></div><div><p className="text-[10px] text-slate-400">{t('employee.endShift.collected')}</p><p className="mt-1 text-[22px] font-bold">{formatMoney(preview.totalCollectedPaise)}</p></div></div><div className="mt-4 rounded-[14px] bg-white/10 p-4"><p className="text-[11px] text-slate-300">{t('employee.endShift.result')}</p><p className={`mt-1 text-[28px] font-bold ${preview.reconciliationStatus === 'MATCHED' ? 'text-emerald-300' : preview.reconciliationStatus === 'SHORT' ? 'text-rose-300' : 'text-amber-300'}`}>{preview.reconciliationStatus === 'MATCHED' ? t('employee.endShift.matched') : preview.reconciliationStatus === 'SHORT' ? `${t('employee.endShift.short')} ${formatMoney(Math.abs(preview.differencePaise))}` : `${t('employee.endShift.excess')} ${formatMoney(preview.differencePaise)}`}</p></div></section>}

              {error && <div className="mt-4 rounded-[14px] bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">{error}</div>}
            </>
          ) : null}
        </div>

        {!loading && shift && <div className="fixed bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_18px_rgba(0,0,0,0.05)]"><div className="mx-auto max-w-md">{preview ? <button type="button" disabled={ending} onClick={confirmEnd} className="flex min-h-[54px] w-full items-center justify-center rounded-[15px] bg-[#047857] text-[15px] font-semibold text-white disabled:opacity-60">{ending ? t('employee.endShift.ending') : t('employee.endShift.confirm')}</button> : <button type="button" disabled={calculating} onClick={calculate} className="flex min-h-[54px] w-full items-center justify-center rounded-[15px] bg-[#047857] text-[15px] font-semibold text-white disabled:opacity-60">{calculating ? t('employee.endShift.calculating') : t('employee.endShift.preview')}</button>}</div></div>}
      </IonContent>
    </IonPage>
  );
};

export default EndShift;
