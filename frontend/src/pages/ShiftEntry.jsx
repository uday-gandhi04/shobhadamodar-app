import { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCurrentShift } from '../services/shiftApi';
import { getBusinessDate } from '../utils/businessDate';

const ShiftEntry = () => {
  const { mpdId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getCurrentShift(getBusinessDate());
        if (!response.data) {
          navigate('/select-mpd', { replace: true });
          return;
        }
        const assignedMpdId = response.data.mpdId?._id || response.data.mpdId;
        if (String(assignedMpdId) !== String(mpdId)) {
          navigate(`/shift/${assignedMpdId}`, { replace: true });
          return;
        }
        setShift(response.data);
      } catch (err) {
        setError(err.message || t('employee.nozzles.loadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mpdId, navigate, t]);

  const nozzles = shift?.mpdId?.nozzles || [];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff' }}>
          <IonButtons slot="start"><IonBackButton defaultHref="/dashboard" color="dark" text="" /></IonButtons>
          <IonTitle className="font-bold text-gray-800 text-lg">{t('employee.nozzles.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#F3F4F6' }}>
        <div className="mx-auto max-w-md pb-10">
          {loading ? <div className="mt-4 h-24 animate-pulse rounded-[20px] bg-white" /> : error ? <div className="mt-4 rounded-[14px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : (
            <>
              <div className="mt-3 rounded-[20px] bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{shift.mpdId.mpdNumber}</p>
                <p className="mt-1 text-[13px] text-slate-500">{t('employee.nozzles.subtitle')}</p>
              </div>

              <div className="mt-4 space-y-3">
                {nozzles.map((nozzle) => (
                  <div key={nozzle.nozzleId} className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-[16px] font-bold ${nozzle.fuelType === 'PETROL' ? 'text-emerald-700' : 'text-slate-800'}`}>{nozzle.name}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{t('employee.nozzles.cumulative')}</p>
                      </div>
                      <p className="text-[24px] font-bold tabular-nums text-slate-900">{Number(nozzle.currentCumulativeReading || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ShiftEntry;
