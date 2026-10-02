import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ManagerLayout from "./ManagerLayout";

const ActionIcon = ({ type }) => {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    className: "h-6 w-6",
    "aria-hidden": true,
  };

  if (type === "accounting") {
    return (
      <svg {...common}>
        <path d="M6 3.75h12A1.5 1.5 0 0 1 19.5 5.25v13.5A1.5 1.5 0 0 1 18 20.25H6a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 6 3.75Z" />
        <path d="M8 8h8M8 12h8M8 16h4" />
      </svg>
    );
  }

  if (type === "operations") {
    return (
      <svg {...common}>
        <path d="M4 7.5h16M4 12h16M4 16.5h16" />
        <circle cx="7" cy="7.5" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="17" cy="16.5" r="1" />
      </svg>
    );
  }

  if (type === "stock") {
    return (
      <svg {...common}>
        <path d="M5 4.5h14v15H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (type === "udhari") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M8 12h3M16 9.5v5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.75 19c.55-3.4 2.35-5.25 5.25-5.25S13.7 15.6 14.25 19" />
      <path d="M16 6.5a2.5 2.5 0 1 1 0 5" />
      <path d="M15.5 14.25c2.25.25 3.55 1.65 4 4.25" />
    </svg>
  );
};

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const actions = [
    {
      key: "accounting",
      path: "/manager/accounting",
      title: t("manager.accounting"),
      description: t("manager.accountingDescription"),
    },
    {
      key: "operations",
      path: "/manager/operations",
      title: t("manager.operations"),
      description: t("manager.operationsDescription"),
    },
    {
      key: "stock",
      path: "/manager/stock",
      title: t("manager.stock"),
      description: t("manager.stockDescription"),
    },
    {
      key: "udhari",
      path: "/manager/udhari",
      title: t("manager.udhari"),
      description: t("manager.udhariDescription"),
    },
    {
      key: "employees",
      path: "/manager/employees",
      title: t("manager.employees"),
      description: t("manager.employeesDescription"),
    },
  ];

  return (
    <ManagerLayout title={t("manager.dashboardTitle")}>
      <div className="space-y-5">
        <div>
          <p className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">
            {t("manager.dashboardHeading")}
          </p>

          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {t("manager.dashboardSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => navigate(action.path)}
              className="
                group
                min-h-[150px]
                rounded-[22px]
                border
                border-white
                bg-white
                p-4
                text-left
                shadow-[0_7px_22px_rgba(15,23,42,0.06)]
                transition
                hover:-translate-y-0.5
                hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)]
                active:scale-[0.985]
              "
            >
              <div className="flex items-start justify-between gap-2">
                <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-emerald-50 text-bpcl-emerald">
                  <ActionIcon type={action.key} />
                </div>

                <span className="text-slate-300 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>

              <p className="mt-4 text-[14px] font-bold tracking-[-0.01em] text-slate-900">
                {action.title}
              </p>

              <p className="mt-1 text-[10px] font-medium leading-4 text-slate-500">
                {action.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </ManagerLayout>
  );
};

export default ManagerDashboard;