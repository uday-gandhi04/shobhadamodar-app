import ManagerLayout from "./ManagerLayout";
import { useTranslation } from "react-i18next";

const Udhari = () => {
  const { t } = useTranslation();

  return (
    <ManagerLayout
      title={t("manager.udhari")}
      showBack
    >
      <div className="rounded-[22px] bg-white p-5 shadow-sm">
        <p className="text-[18px] font-bold text-slate-900">
          {t("manager.udhari")}
        </p>

        <p className="mt-2 text-[12px] leading-5 text-slate-500">
          Udhari screen will be built next.
        </p>
      </div>
    </ManagerLayout>
  );
};

export default Udhari;