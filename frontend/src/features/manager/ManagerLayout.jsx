import { IonContent, IonPage } from "@ionic/react";
import { useNavigate } from "react-router-dom";

import ManagerHeader from "./ManagerHeader";
import ManagerBottomNav from "./ManagerBottomNav";

const ManagerLayout = ({ title, showBack = false, onBack, children, variant = "default" }) => {
  const navigate = useNavigate();
  const dashboard = variant === "dashboard";

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          "--background": "#F3F4F6",
        }}
      >
        <main
          className={`mx-auto min-h-[100dvh] w-full max-w-[480px] overflow-hidden pb-[92px] pt-[max(0.65rem,env(safe-area-inset-top))] ${
            dashboard
              ? "bg-[linear-gradient(180deg,#edf6f2_0%,#f4f7f6_35%,#f3f4f6_100%)] px-4"
              : "bg-[#F3F4F6] px-5 pt-[max(1rem,env(safe-area-inset-top))]"
          }`}
        >
          <ManagerHeader
            title={title}
            showBack={showBack}
            onBack={onBack || (() => navigate("/manager"))}
            variant={variant}
          />

          <section className={dashboard ? "mt-3" : "mt-6"}>{children}</section>
        </main>

        <ManagerBottomNav />
      </IonContent>
    </IonPage>
  );
};

export default ManagerLayout;
