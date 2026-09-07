// src/pages/Dashboard.jsx

import { useEffect, useState, useContext } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import { SyncContext } from '../context/SyncContext';
import { dbService } from '../database/sqlite';

import BottomNav from '../components/ui/BottomNav';

import DashboardHeader from '../components/business/dashboard/DashboardHeader';
import ShiftCard from '../components/business/dashboard/ShiftCard';
import ShiftProgress from '../components/business/dashboard/ShiftProgress';
import QuickActions from '../components/business/dashboard/QuickActions';
import RecentActivity from '../components/business/dashboard/RecentActivity';

const Dashboard = () => {
  const { i18n } = useTranslation();
  const { user } = useContext(AuthContext);
  const { pushOfflineShifts } = useContext(SyncContext);
  const navigate = useNavigate();

  const [rates, setRates] = useState(null);
  const [mpds, setMpds] = useState([]);
  const [selectedMpd, setSelectedMpd] = useState('MPD 1');
  const [isLoading, setIsLoading] = useState(true);

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
    const loadOfflineData = async () => {
      try {
        const rateRes = await dbService.executeQuery(
          'SELECT * FROM fuel_rates ORDER BY business_date DESC LIMIT 1',
        );

        if (rateRes.values?.length) {
          setRates(rateRes.values[0]);
        }

        const mpdRes = await dbService.executeQuery(
          'SELECT * FROM mpds',
        );

        const loadedMpds = mpdRes.values || [];

        const mpdsWithNozzles = await Promise.all(
          loadedMpds.map(async (mpd) => {
            const nozzleRes = await dbService.executeQuery(
              'SELECT * FROM nozzles WHERE mpd_id = ?',
              [mpd.mpd_id],
            );

            return {
              ...mpd,
              nozzles: nozzleRes.values || [],
            };
          }),
        );

        setMpds(mpdsWithNozzles);

        await pushOfflineShifts();
      } catch (error) {
        // Existing app uses local-first behavior.
        // Keep the screen usable even if local data fails.
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOfflineData();
  }, [pushOfflineShifts]);

  const selectedMpdData =
    mpds.find(
      (mpd) => mpd.mpd_number === selectedMpd || mpd.name === selectedMpd,
    ) || mpds[0] || null;

  const handlePrimaryAction = () => {
    if (!selectedMpdData) return;

    navigate(`/shift/${selectedMpdData.mpd_id}`);
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

            {isLoading ? (
              <div className="mt-6 space-y-4">
                <div className="h-[190px] animate-pulse rounded-[24px] bg-white" />
                <div className="h-[150px] animate-pulse rounded-[24px] bg-white" />
                <div className="h-[170px] animate-pulse rounded-[24px] bg-white" />
              </div>
            ) : (
              <>
                <ShiftCard
                  mpds={mpds}
                  selectedMpd={selectedMpd}
                  setSelectedMpd={setSelectedMpd}
                  mpd={selectedMpdData}
                  rates={rates}
                  onClick={handlePrimaryAction}
                />

                <ShiftProgress />

                <QuickActions
                  onNozzle={() => {
                    if (selectedMpdData) {
                      navigate(`/shift/${selectedMpdData.mpd_id}`);
                    }
                  }}
                  onCollection={() => {
                    navigate('/collections');
                  }}
                  onReconciliation={() => {
                    if (selectedMpdData) {
                      navigate(`/shift/${selectedMpdData.mpd_id}`);
                    }
                  }}
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