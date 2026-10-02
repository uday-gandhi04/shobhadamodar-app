import ManagerLayout from "./ManagerLayout";
import { useTranslation } from "react-i18next";

const Accounting = () => {
  const { t } = useTranslation();

  return (
    <ManagerLayout
      title={t("manager.accounting")}
      showBack
    >
      <div className="rounded-[22px] bg-white p-5 shadow-sm">
        <p className="text-[18px] font-bold text-slate-900">
          {t("manager.accounting")}
        </p>

        <p className="mt-2 text-[12px] leading-5 text-slate-500">
          Accounting screen will be built next.
        </p>
      </div>
    </ManagerLayout>
  );
};

export default Accounting;