import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCurrentShift, updateCollections } from '../services/shiftApi';
import { getBusinessDate } from '../utils/businessDate';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
const emptyCash = DENOMINATIONS.reduce((acc, denomination) => ({ ...acc, [denomination]: '' }), {});

const Collections = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [shift, setShift] = useState(null);
  const [cashCounts, setCashCounts] = useState(emptyCash);
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState('');
  const [udhari, setUdhari] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
        const nextCash = { ...emptyCash };
        (current.cashCollections || []).forEach((item) => { nextCash[item.denomination] = String(item.count); });
        setCashCounts(nextCash);
        setUpi(current.totalUpiPaise ? (current.totalUpiPaise / 100).toFixed(2) : '');
        setCard(current.totalCardPaise ? (current.totalCardPaise / 100).toFixed(2) : '');
        setUdhari(current.totalUdhariPaise ? (current.totalUdhariPaise / 100).toFixed(2) : '');
      } catch (err) {
        setError(err.message || t('employee.collections.loadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, t]);

  const totals = useMemo(() => {
    const cash = DENOMINATIONS.reduce((sum, denomination) => sum + denomination * (Number(cashCounts[denomination]) || 0), 0);
    const upiValue = Number(upi) || 0;
    const cardValue = Number(card) || 0;
    const udhariValue = Number(udhari) || 0;
    return { cash, upi: upiValue, card: cardValue, udhari: udhariValue, total: cash + upiValue + cardValue + udhariValue };
  }, [cashCounts, upi, card, udhari]);

  const save = async () => {
    if (!shift || saving) return;
    try {
      setSaving(true);
      setSaved(false);
      setError('');
      const response = await updateCollections(shift._id, {
        cashBreakdown: DENOMINATIONS.map((denomination) => ({ denomination, count: Number(cashCounts[denomination]) || 0 })),
        upiPaise: Math.round((Number(upi) || 0) * 100),
        cardPaise: Math.round((Number(card) || 0) * 100),
        udhariPaise: Math.round((Number(udhari) || 0) * 100),
      });
      setShift(response.data);
      setSaved(true);
    } catch (err) {
      setError(err.message || t('employee.collections.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff' }}>
          <IonButtons slot="start"><IonBackButton defaultHref="/dashboard" color="dark" text="" /></IonButtons>
          <IonTitle className="font-bold text-gray-800 text-lg">{t('employee.collections.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#F3F4F6' }}>
        <div className="mx-auto max-w-md pb-36">
          {loading ? <div className="mt-4 h-40 animate-pulse rounded-[20px] bg-white" /> : !shift ? null : (
            <>
              <div className="mt-3 rounded-[20px] bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{shift.mpdId?.mpdNumber}</p>
                <div className="mt-3 flex items-end justify-between">
                  <div><p className="text-[12px] text-slate-500">{t('employee.collections.currentTotal')}</p><p className="text-[28px] font-bold text-slate-900">₹{totals.total.toFixed(2)}</p></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">{saved ? t('employee.collections.saved') : t('employee.collections.editable')}</span>
                </div>
              </div>

              <section className="mt-4 rounded-[20px] bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-900">{t('employee.collections.cash')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {DENOMINATIONS.map((denomination) => (
                    <label key={denomination} className="rounded-[12px] border border-slate-200 bg-slate-50 p-2.5">
                      <span className="block text-[10px] font-semibold text-slate-500">₹{denomination}</span>
                      <input type="number" min="0" step="1" value={cashCounts[denomination]} onChange={(event) => setCashCounts((prev) => ({ ...prev, [denomination]: event.target.value }))} className="mt-1 w-full bg-transparent text-[15px] font-semibold text-slate-900 outline-none" placeholder="0" />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-[12px]"><span className="text-slate-500">{t('employee.collections.cashTotal')}</span><span className="font-semibold text-slate-900">₹{totals.cash.toFixed(2)}</span></div>
              </section>

              <section className="mt-4 rounded-[20px] bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold text-slate-900">{t('employee.collections.other')}</p>
                {[['UPI', upi, setUpi], ['Card / ATM', card, setCard], ['Udhari', udhari, setUdhari]].map(([label, value, setter]) => (
                  <label key={label} className="mt-3 block rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="block text-[10px] font-semibold text-slate-500">{label}</span>
                    <div className="mt-1 flex items-center"><span className="mr-1 text-slate-500">₹</span><input type="number" min="0" step="0.01" value={value} onChange={(event) => setter(event.target.value)} className="w-full bg-transparent text-[18px] font-semibold text-slate-900 outline-none" placeholder="0.00" /></div>
                  </label>
                ))}
              </section>

              {error && <div className="mt-4 rounded-[14px] bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">{error}</div>}
            </>
          )}
        </div>

        {!loading && shift && <div className="fixed bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_18px_rgba(0,0,0,0.05)]"><div className="mx-auto max-w-md"><button type="button" disabled={saving} onClick={save} className="flex min-h-[54px] w-full items-center justify-center rounded-[15px] bg-[#047857] text-[15px] font-semibold text-white disabled:opacity-60">{saving ? t('employee.collections.saving') : t('employee.collections.save')}</button></div></div>}
      </IonContent>
    </IonPage>
  );
};

export default Collections;
