import { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCurrentShift } from '../services/shiftApi';
import { getBusinessDate } from '../utils/businessDate';
import NozzleReadingList from '../components/business/nozzle/NozzleReadingList';
import {
  getFuelType,
  getNozzleNumber,
} from '../components/business/nozzle/nozzleUtils';
import nozzleDispenserImage from '../assets/fuel/nozzle-dispenser.webp';

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
  const nozzleReadings = nozzles.map((nozzle) => ({
    nozzle: {
      id: nozzle.nozzleId,
      number: getNozzleNumber(nozzle.nozzleId || nozzle.name),
      fuelType: getFuelType(nozzle),
    },
    currentReading: nozzle.currentCumulativeReading,
  }));

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
              <div className="mt-3 rounded-[20px] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
                <h2 className="text-[15px] font-semibold text-slate-900">
                  {shift.mpdId.mpdNumber}
                </h2>

                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  {t('employee.nozzles.subtitle')}
                </p>
              </div>

              <div className="mt-4 flex justify-center rounded-[16px] bg-slate-50 px-3 py-4">
                <img
                  src={nozzleDispenserImage}
                  alt={t('employee.nozzles.overviewAlt')}
                  className="w-full object-contain"
                />
              </div>

              <div className="mt-4">
                <NozzleReadingList
                  variant="current"
                  readings={nozzleReadings}
                />
              </div>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ShiftEntry;
