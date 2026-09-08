// src/pages/Dashboard.jsx

import { useEffect, useState, useContext } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import { getCurrentShift } from '../services/shiftApi';
import { getBusinessDate } from '../utils/businessDate';

import BottomNav from '../components/ui/BottomNav';

import DashboardHeader from '../components/business/dashboard/DashboardHeader';
import ShiftCard from '../components/business/dashboard/ShiftCard';
import ShiftProgress from '../components/business/dashboard/ShiftProgress';
import QuickActions from '../components/business/dashboard/QuickActions';
import RecentActivity from '../components/business/dashboard/RecentActivity';

const Dashboard = () => {
  const { i18n } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [currentShift, setCurrentShift] = useState(null);
  const [isLoadingShift, setIsLoadingShift] = useState(true);
  const [shiftError, setShiftError] = useState('');

  const language = i18n.language?.split('-')[0] || 'en';
  const isEnglish = language === 'en';

  const today = new Date();

  const formattedDate = today.toLocaleDateString(
    isEnglish ? 'en-IN' : language === 'mr' ? 'mr-IN' : 'hi-IN',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  );

  useEffect(() => {
    let cancelled = false;

    const loadCurrentShift = async () => {
      try {
        setIsLoadingShift(true);
        setShiftError('');

        const businessDate = getBusinessDate();
        const response = await getCurrentShift(businessDate);

        if (!cancelled) {
          setCurrentShift(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load current shift:', error);
          setShiftError(error.message || 'Unable to load your shift.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingShift(false);
        }
      }
    };

    loadCurrentShift();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePrimaryAction = () => {
    const mpdId = currentShift?.mpdId?._id || currentShift?.mpdId;

    if (mpdId) {
      navigate(`/shift/${mpdId}`);
    }
  };

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          '--background': '#F3F4F6',
        }}
      >
        <main
          className="
            relative
            mx-auto
            min-h-[100dvh]
            w-full
            max-w-[480px]
            overflow-hidden
            bg-[#F3F4F6]
            pb-28
          "
        >
          <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <DashboardHeader
              user={user}
              formattedDate={formattedDate}
            />

            {isLoadingShift ? (
              <div className="mt-6 space-y-4">
                <div className="h-[190px] animate-pulse rounded-[24px] bg-white" />
                <div className="h-[150px] animate-pulse rounded-[24px] bg-white" />
                <div className="h-[170px] animate-pulse rounded-[24px] bg-white" />
              </div>
            ) : (
              <>
                {shiftError && (
                  <p className="mt-6 rounded-[14px] bg-red-50 px-4 py-3 text-sm text-red-700">
                    {shiftError}
                  </p>
                )}

                <ShiftCard
                  shift={currentShift}
                />

                <ShiftProgress />

                <QuickActions
                  onNozzle={handlePrimaryAction}
                  onCollection={() => {
                    navigate('/collections');
                  }}
                  onReconciliation={handlePrimaryAction}
                  onReports={() => {}}
                />

                <RecentActivity />
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