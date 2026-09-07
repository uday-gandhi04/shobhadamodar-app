import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';
import { SyncContext } from '../../context/SyncContext';
import { useNavigate } from 'react-router-dom';

const EyeIcon = ({ visible }) => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
    {visible ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M9.9 4.2A10.9 10.9 0 0 1 12 4c5.1 0 9.3 3.2 10.8 8-.6 1.8-1.7 3.4-3.2 4.6M6.2 6.2C4.5 7.5 3.4 9.6 3 12c1.5 4.8 5.7 8 9 8 1.2 0 2.3-.2 3.4-.6" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.3 12S5.8 5.5 12 5.5 21.7 12 21.7 12 18.2 18.5 12 18.5 2.3 12 2.3 12Z" />
    )}
    {!visible && <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />}
  </svg>
);

const LoginForm = ({ role }) => {
  const { t } = useTranslation();
  const navigate = useNavigate()
  const { login } = useContext(AuthContext);
  const { performBootstrapSync } = useContext(SyncContext);
  const [employeeId, setEmployeeId] = useState('ADMIN01');
  const [password, setPassword] = useState('admin_password_123');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(employeeId, password, rememberDevice);
    if (result.success) {
      await performBootstrapSync(result.token);

      if (role === 'MANAGER') {
        navigate('/manager', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      setError(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4 rounded-[1.5rem] border border-white/90 bg-white p-5 shadow-[0_14px_32px_-20px_rgba(15,23,42,0.28)]" noValidate>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">{t('login.employeeId')}</span>
        <input
          type="text"
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value.toUpperCase())}
          className="min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-bold uppercase tracking-[0.02em] text-slate-900 outline-none transition duration-200 placeholder:font-medium placeholder:text-slate-400 focus:border-bpcl-emerald focus:bg-white focus:ring-4 focus:ring-emerald-100"
          placeholder="EMP001"
          autoComplete="username"
          required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">{t('login.password')}</span>
        <span className="relative block">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-14 text-base font-bold text-slate-900 outline-none transition duration-200 placeholder:font-medium placeholder:text-slate-400 focus:border-bpcl-emerald focus:bg-white focus:ring-4 focus:ring-emerald-100"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-bpcl-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bpcl-emerald" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            <EyeIcon visible={showPassword} />
          </button>
        </span>
      </label>

      <div className="flex min-h-12 items-center gap-3">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600">
          <input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-bpcl-emerald focus:ring-bpcl-emerald" />
          Remember me
        </label>
        <span className="ml-auto max-w-32 text-right text-[11px] font-medium leading-4 text-slate-500">Need help? Contact your manager.</span>
      </div>

      <button type="submit" disabled={isSubmitting} className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-bpcl-emerald px-6 text-base font-bold text-white shadow-lg shadow-emerald-200 transition duration-200 hover:bg-bpcl-emeraldHover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bpcl-emerald disabled:cursor-not-allowed disabled:opacity-70">
        <span>{isSubmitting ? 'Signing in…' : t('login.submit').replace(' →', '')}</span>
        {!isSubmitting && <span aria-hidden="true" className="text-xl leading-none">→</span>}
      </button>
    </form>
  );
};

export default LoginForm;
