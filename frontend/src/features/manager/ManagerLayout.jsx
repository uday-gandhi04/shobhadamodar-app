import { IonContent, IonPage } from "@ionic/react";
import { useNavigate } from "react-router-dom";

import ManagerHeader from "./ManagerHeader";
import ManagerBottomNav from "./ManagerBottomNav";

const ManagerLayout = ({
  title,
  showBack = false,
  children,
}) => {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          "--background": "#F3F4F6",
        }}
      >
        <main
          className="
            mx-auto
            min-h-[100dvh]
            w-full
            max-w-[480px]
            overflow-hidden
            bg-[#F3F4F6]
            px-5
            pb-[92px]
            pt-[max(1rem,env(safe-area-inset-top))]
          "
        >
          <ManagerHeader
            title={title}
            showBack={showBack}
            onBack={() => navigate("/manager")}
          />

          <section className="mt-6">
            {children}
          </section>
        </main>

        <ManagerBottomNav />
      </IonContent>
    </IonPage>
  );
};

export default ManagerLayout;