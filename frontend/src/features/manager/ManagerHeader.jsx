import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import { AuthContext } from "../../context/AuthContext";

const ManagerHeader = ({ title, showBack = false, onBack, variant = "default" }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useContext(AuthContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const managerName =
    user?.name ||
    user?.employeeId ||
    "Manager";
  const dashboard = variant === "dashboard";

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    window.location.replace("/login");
  };

  return (
    <header className={`relative z-20 flex items-center gap-2.5 ${dashboard ? "rounded-[15px] bg-gradient-to-r from-[#075b45] via-[#08785a] to-[#075b45] px-3 py-2.5 text-white shadow-[0_7px_20px_rgba(4,92,67,0.18)]" : "gap-3"}`}>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="
            grid
            h-10
            w-10
            shrink-0
            place-items-center
            rounded-[13px]
            bg-white
            text-slate-700
            shadow-[0_3px_12px_rgba(15,23,42,0.06)]
            transition
            active:scale-[0.97]
          "
          aria-label={t("manager.back")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className={`text-[8px] font-bold uppercase tracking-[0.08em] ${dashboard ? "text-emerald-50/75" : "text-bpcl-navy"}`}>
          {dashboard ? t("manager.manager") : "BPCL AUTHORISED OUTLET"}
        </p>

        <p className={`mt-0.5 truncate text-[14px] font-bold ${dashboard ? "text-white" : "text-slate-900"}`}>
          {title || "Shobhadamodar Petroleum"}
        </p>
      </div>

      <div
        ref={menuRef}
        className="relative shrink-0"
      >
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`flex items-center gap-1.5 rounded-[10px] px-1 py-1 transition active:scale-[0.98] ${dashboard ? "text-white" : "gap-2 rounded-[12px]"}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={t("manager.profileMenu")}
        >
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${dashboard ? "bg-white/15 text-white" : "h-9 w-9 bg-emerald-50 text-[#047857]"}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5.5 19c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" />
            </svg>
          </div>

          <div className={`${dashboard ? "block max-w-[48px]" : "hidden sm:block"} min-w-0 text-left`}>
            <p className={`max-w-[80px] truncate text-[9px] font-semibold leading-none ${dashboard ? "text-white" : "text-slate-900"}`}>
              {managerName}
            </p>

            <p className={`mt-1 text-[6px] font-medium uppercase tracking-[0.04em] ${dashboard ? "text-emerald-50/75" : "text-slate-400"}`}>
              {t("manager.manager")}
            </p>
          </div>

          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`h-3 w-3 transition-transform ${dashboard ? "text-white/75" : "text-slate-400"} ${
              menuOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="
              absolute
              right-0
              top-[calc(100%+8px)]
              z-50
              w-[190px]
              overflow-hidden
              rounded-[16px]
              border
              border-slate-100
              bg-white
              p-2
              shadow-[0_12px_30px_rgba(15,23,42,0.12)]
            "
          >
            <div className="px-2 py-2">
              <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                {t("manager.language")}
              </p>

              <LanguageSwitcher
                language={i18n.language}
                onChange={(language) => {
                  i18n.changeLanguage(language);
                }}
              />
            </div>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="
                flex
                min-h-[40px]
                w-full
                items-center
                gap-2
                rounded-[10px]
                px-2
                text-left
                text-[11px]
                font-semibold
                text-red-600
                transition
                hover:bg-red-50
                active:scale-[0.99]
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 4v16" />
              </svg>

              <span>{t("manager.logout")}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default ManagerHeader;