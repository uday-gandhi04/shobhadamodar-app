import { useEffect, useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import { getCurrentShift } from '../services/shiftApi';
import { getBusinessDate } from '../utils/businessDate';
import { useContext } from 'react';

import DashboardHeader from '../components/business/dashboard/DashboardHeader';
import ShiftCard from '../components/business/dashboard/ShiftCard';
import ShiftProgress from '../components/business/dashboard/ShiftProgress';
import QuickActions, { EndShiftButton } from '../components/business/dashboard/QuickActions';

const formatDate = (date, language) => {
  const locale = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 6)));
};

const Dashboard = () => {
  const { i18n } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const language = i18n.language?.split('-')[0] || 'en';
  const businessDate = getBusinessDate();

  const loadShift = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getCurrentShift();
      if (!response.data) {
        navigate('/select-mpd', { replace: true });
        return;
      }
      setCurrentShift(response.data);
    } catch (err) {
      setError(err.message || 'Unable to load your shift.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShift();
  }, []);

  const mpdId = currentShift?.mpdId?._id || currentShift?.mpdId;

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#F3F4F6' }}>
        <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] overflow-hidden bg-[#F3F4F6] px-5 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
          <DashboardHeader
            user={user}
            formattedDate={formatDate(businessDate, language)}
          />

          {loading ? (
            <div className="mt-6 space-y-4">
              <div className="h-[190px] animate-pulse rounded-[24px] bg-white" />
              <div className="h-[145px] animate-pulse rounded-[24px] bg-white" />
              <div className="h-[155px] animate-pulse rounded-[24px] bg-white" />
            </div>
          ) : currentShift ? (
            <>
              <ShiftCard shift={currentShift} />
              <QuickActions
                onNozzle={() => navigate(`/shift/${mpdId}`)}
                onCollection={() => navigate('/collections')}
              />
              <ShiftProgress shift={currentShift} />
              <EndShiftButton onClick={() => navigate('/end-shift')} />
            </>
          ) : null}

          {error && (
            <div className="mt-5 rounded-[14px] bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
              {error}
            </div>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
