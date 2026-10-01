import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import LanguageSwitcher from "../../ui/LanguageSwitcher";
import { AuthContext } from "../../../context/AuthContext";

const formatShiftStart = (startedAt) => {
  if (!startedAt) return "";

  return new Date(startedAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const EmployeeShiftHeader = ({ shift, user, onBack }) => {
  const { t, i18n } = useTranslation();
  const { logout } = useContext(AuthContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const employeeName =
    user?.name ||
    user?.employeeId ||
    t("workflow.employee");

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
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

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    window.location.replace("/login");
  };

  return (
    <header className="flex items-center gap-3">
      {/* BACK BUTTON */}
      <button
        type="button"
        onClick={onBack}
        className="
          grid
          h-9
          w-9
          shrink-0
          place-items-center
          rounded-[12px]
          bg-white
          text-slate-700
          shadow-[0_2px_8px_rgba(15,23,42,0.06)]
        "
        aria-label={t("workflow.back")}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        {/* MPD + START TIME */}
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-none tracking-[-0.02em] text-slate-900">
            {shift?.mpdId?.mpdNumber || "MPD"}
          </p>

          <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            {formatShiftStart(shift?.startedAt)}
          </p>
        </div>

        {/* PROFILE */}
        <div
          ref={menuRef}
          className="relative shrink-0"
        >
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="
              flex
              items-center
              gap-2
              rounded-[12px]
              px-1
              py-1
              transition
              active:scale-[0.98]
            "
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t("workflow.profileMenu")}
          >
            {/* USER ICON */}
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[#047857]">
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

            {/* NAME + ROLE */}
            <div className="min-w-0 text-left">
              <p className="max-w-[95px] truncate text-[10px] font-semibold leading-none text-slate-900">
                {employeeName}
              </p>

              <p className="mt-1 text-[7px] font-medium uppercase tracking-[0.05em] text-slate-400">
                {t("workflow.employee")}
              </p>
            </div>

            {/* CHEVRON */}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </button>

          {/* DROPDOWN */}
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
              {/* LANGUAGE */}
              <div className="px-2 py-2">
                <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                  {t("workflow.language")}
                </p>

                <LanguageSwitcher
                  language={i18n.language}
                  onChange={(language) => {
                    i18n.changeLanguage(language);
                  }}
                />
              </div>

              <div className="my-1 border-t border-slate-100" />

              {/* LOGOUT */}
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

                <span>{t("workflow.logout")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default EmployeeShiftHeader;