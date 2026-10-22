import { IonPage, IonContent } from "@ionic/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <IonPage id="not-found-page">
      <IonContent fullscreen style={{ "--background": "#F5F7F6" }}>
        <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col items-center justify-center px-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-bpcl-navy shadow-[0_8px_20px_rgba(30,58,138,0.2)]">
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-bpcl-gold text-[12px] font-bold text-bpcl-gold">
              SP
            </span>
          </div>

          <h1 className="mt-6 text-[32px] font-extrabold tracking-tight text-slate-900">
            404
          </h1>

          <p className="mt-2 text-[15px] font-semibold text-slate-700">
            {t("common.pageNotFound", "Page not found")}
          </p>

          <p className="mt-1 max-w-[280px] text-[12px] text-slate-500">
            {t(
              "common.pageNotFoundDescription",
              "The requested destination does not exist or may have been moved."
            )}
          </p>

          <button
            id="return-home-btn"
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="mt-8 flex min-h-[48px] w-full max-w-[240px] items-center justify-center rounded-[14px] bg-[#047857] px-6 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(4,120,87,0.24)] transition hover:bg-[#065F46] active:scale-95"
          >
            {t("common.returnHome", "Return to Home")}
          </button>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default NotFound;
