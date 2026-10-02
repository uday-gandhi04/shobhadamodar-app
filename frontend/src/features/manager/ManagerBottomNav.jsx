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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 6.75h15M4.5 12h15M4.5 17.25h15"
        />
      ),
    },
    {
      path: "/manager/accounting",
      label: t("manager.accounting"),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 3.75h12A1.5 1.5 0 0 1 19.5 5.25v13.5A1.5 1.5 0 0 1 18 20.25H6a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 6 3.75Z"
        />
      ),
    },
    {
      path: "/manager/stock",
      label: t("manager.stock"),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 6.75h15v12h-15zM8.25 10.5h7.5M8.25 14.25h4.5"
        />
      ),
    },
    {
      path: "/manager/udhari",
      label: t("manager.udhari"),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 7.5h15v9h-15zM7.5 11.25h3"
        />
      ),
    },
    {
      path: "/manager/employees",
      label: t("manager.employees"),
      icon: (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.75 19c.55-3.4 2.35-5.25 5.25-5.25S13.7 15.6 14.25 19" />
          <path d="M16 6.5a2.5 2.5 0 1 1 0 5" />
          <path d="M15.5 14.25c2.25.25 3.55 1.65 4 4.25" />
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
        shadow-[0_-4px_20px_-10px_rgba(15,23,42,0.10)]
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
                min-h-[54px]
                min-w-0
                flex-1
                flex-col
                items-center
                justify-center
                gap-1
                rounded-[12px]
              "
            >
              <div
                className={`
                  grid
                  h-8
                  w-10
                  place-items-center
                  rounded-[10px]
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
                  strokeWidth={isActive ? 2.4 : 2}
                  className="h-5 w-5"
                >
                  {item.icon}
                </svg>
              </div>

              <span
                className={`
                  max-w-[64px]
                  truncate
                  text-[8px]
                  font-semibold
                  ${
                    isActive
                      ? "text-bpcl-emerald"
                      : "text-slate-500"
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