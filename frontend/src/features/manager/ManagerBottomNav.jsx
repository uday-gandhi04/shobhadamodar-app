import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const ManagerBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    {
      path: "/manager",
      label: t("manager.dashboard"),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 10.5 12 3l8.25 7.5M5.25 9.75V21h5.25v-5.25h3V21h5.25V9.75"
        />
      ),
    },
    {
      path: "/manager/operations",
      label: t("manager.operations"),
      icon: (
        <>
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M5 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
          <path d="M9 14l2 2 4-4" />
        </>
      ),
    },
    {
      path: "/manager/accounting",
      label: t("manager.accounting"),
      icon: (
        <>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </>
      ),
    },
    {
      path: "/manager/stock",
      label: t("manager.stock"),
      icon: (
        <>
          <path d="M3 6h18M3 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6M3 6l1-2h16l1 2" />
          <path d="M10 10h4" />
        </>
      ),
    },
    {
      path: "/manager/udhari",
      label: t("manager.udhari"),
      icon: (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
    },
    {
      path: "/manager/employees",
      label: t("manager.employees"),
      icon: (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </>
      ),
    },
  ];

  return (
    <nav
      className="
        fixed
        bottom-0
        left-0
        right-0
        z-40
        border-t
        border-slate-100
        bg-white
        shadow-[0_-4px_16px_rgba(15,23,42,0.05)]
        pb-[env(safe-area-inset-bottom)]
      "
    >
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/manager" &&
              location.pathname.startsWith(item.path));

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="
                flex
                min-h-[58px]
                min-w-0
                flex-1
                flex-col
                items-center
                justify-center
                gap-1
                rounded-[14px]
              "
            >
              <div
                className={`
                  grid
                  h-[32px]
                  w-[40px]
                  place-items-center
                  rounded-[12px]
                  transition-colors
                  ${
                    isActive
                      ? "bg-emerald-50 text-bpcl-emerald"
                      : "text-slate-400"
                  }
                `}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isActive ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[20px] w-[20px]"
                >
                  {item.icon}
                </svg>
              </div>

              <span
                className={`
                  max-w-[56px]
                  truncate
                  text-[9px]
                  font-semibold
                  ${
                    isActive
                      ? "text-bpcl-emerald"
                      : "text-slate-400"
                  }
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ManagerBottomNav;