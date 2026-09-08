import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../../context/AuthContext";
import { SyncContext } from "../../context/SyncContext";

const EyeIcon = ({ visible }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-5 w-5"
  >
    {visible ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.6 10.7a3 3 0 0 0 4.2 4.2"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.9 4.2A10.9 10.9 0 0 1 12 4c5.1 0 9.3 3.2 10.8 8-.6 1.8-1.7 3.4-3.2 4.6"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.2 6.2C4.5 7.5 3.4 9.6 3 12c1.5 4.8 5.7 8 9 8 1.2 0 2.3-.2 3.4-.6"
        />
      </>
    ) : (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.3 12S5.8 5.5 12 5.5 21.7 12 21.7 12 18.2 18.5 12 18.5 2.3 12 2.3 12Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        />
      </>
    )}
  </svg>
);

const LoginForm = ({ role }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { login } = useContext(AuthContext);
  const { performBootstrapSync } = useContext(SyncContext);

  const [employeeId, setEmployeeId] = useState("ADMIN01");
  const [password, setPassword] = useState("admin_password_123");
  const [rememberDevice, setRememberDevice] = useState(true);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(employeeId, password, rememberDevice);

      if (result.success) {
        await performBootstrapSync(result.token);

        if (result.user?.role === "MANAGER") {
          navigate("/manager", { replace: true });
        } else {
          navigate("/select-mpd", { replace: true });
        }

        return;
      }

      setError(result.message);
    } catch (submitError) {
      setError(submitError?.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="
        mt-5
        rounded-[20px]
        border border-white
        bg-white
        p-5
        shadow-[0_10px_30px_rgba(15,23,42,0.08)]
      "
    >
      {error && (
        <div
          role="alert"
          className="
            mb-4
            rounded-[12px]
            border border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            font-medium
            text-red-700
          "
        >
          {error}
        </div>
      )}

      {/* Employee ID */}
      <label className="block">
        <span className="mb-2 block text-[11px] font-semibold tracking-[0.04em] text-slate-600">
          {t("login.employeeId")}
        </span>

        <input
          type="text"
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value.toUpperCase())}
          className="
            min-h-[54px]
            w-full
            rounded-[12px]
            border border-slate-200
            bg-slate-50
            px-4
            text-[15px]
            font-medium
            text-slate-900
            outline-none
            transition-all
            duration-200
            placeholder:text-slate-400
            focus:border-bpcl-emerald
            focus:bg-white
            focus:ring-4
            focus:ring-emerald-100
          "
          placeholder="EMP001"
          autoComplete="username"
          required
        />
      </label>

      {/* Password */}
      <label className="mt-4 block">
        <span className="mb-2 block text-[11px] font-semibold tracking-[0.04em] text-slate-600">
          {t("login.password")}
        </span>

        <span className="relative block">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="
              min-h-[54px]
              w-full
              rounded-[12px]
              border border-slate-200
              bg-slate-50
              px-4
              pr-14
              text-[15px]
              font-medium
              text-slate-900
              outline-none
              transition-all
              duration-200
              placeholder:text-slate-400
              focus:border-bpcl-emerald
              focus:bg-white
              focus:ring-4
              focus:ring-emerald-100
            "
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="
              absolute
              right-1.5
              top-1/2
              flex
              h-11
              w-11
              -translate-y-1/2
              items-center
              justify-center
              rounded-[10px]
              text-slate-500
              transition
              hover:bg-slate-200
              hover:text-slate-800
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-offset-1
              focus-visible:outline-bpcl-emerald
            "
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon visible={showPassword} />
          </button>
        </span>
      </label>

      {/* Remember / Help */}
      <div className="mt-4 flex min-h-[44px] items-center justify-between gap-3">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
            className="
              h-[18px]
              w-[18px]
              rounded-[4px]
              border-slate-300
              text-bpcl-emerald
              accent-[#059669]
              focus:ring-bpcl-emerald
            "
          />

          <span className="text-[12px] font-medium text-slate-600">
            Remember me
          </span>
        </label>

        <span className="max-w-[130px] text-right text-[9px] font-medium leading-3.5 text-slate-500">
          Need help? Contact your manager.
        </span>
      </div>

      {/* Login */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="
    group
    relative
    flex
    min-h-[54px]
    w-full
    items-center
    justify-center
    rounded-[15px]
    bg-transparent
    p-0
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-emerald-500
    focus-visible:ring-offset-2
    disabled:cursor-not-allowed
  "
      >
        {/* Actual rounded button surface */}
        <span
          className="
    absolute
    inset-0
    rounded-[15px]
    bg-[#047857]
    shadow-[0_7px_16px_rgba(4,120,87,0.22)]
    transition-all
    duration-200
    group-hover:bg-[#065F46]
    group-active:scale-[0.985]
  "
        />

        <span
          className="
      relative
      z-10
      flex
      items-center
      justify-center
      gap-2
      text-[15px]
      font-semibold
      tracking-[-0.01em]
      text-white
    "
        >
          {isSubmitting ? (
            <>
              <span
                className="
            h-4
            w-4
            animate-spin
            rounded-full
            border-2
            border-white/30
            border-t-white
          "
              />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>{t("login.submit").replace(" →", "")}</span>

              <span
                aria-hidden="true"
                className="
            text-[18px]
            leading-none
            transition-transform
            duration-200
            group-hover:translate-x-0.5
          "
              >
                →
              </span>
            </>
          )}
        </span>
      </button>
    </form>
  );
};

export default LoginForm;
