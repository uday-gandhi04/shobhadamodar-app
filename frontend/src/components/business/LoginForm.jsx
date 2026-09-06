// src/components/business/LoginForm.jsx
import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const LoginForm = () => {
  const { login } = useContext(AuthContext);
  
  const [employeeId, setEmployeeId] = useState('ADMIN01');
  const [password, setPassword] = useState('admin_password_123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(employeeId, password);
    if (result.success) {
      alert("Login Successful! (Routing to Dashboard next)");
    } else {
      setError(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full max-w-sm mx-auto">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 pl-1">Employee ID</label>
        <input
          type="text"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
          className="w-full h-14 px-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-bpcl-emerald transition-all font-semibold uppercase"
          placeholder="EMP001"
          required
        />
      </div>

      <div className="relative">
        <label className="block text-xs font-semibold text-gray-500 mb-1 pl-1">Password</label>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-14 px-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-bpcl-emerald transition-all font-semibold tracking-wider"
          placeholder="••••••••"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-[30px] p-2 text-gray-400 hover:text-bpcl-emerald"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-14 mt-6 bg-bpcl-emerald text-white font-bold text-lg rounded-full active:scale-95 shadow-lg shadow-green-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
      >
        <span>{isSubmitting ? 'Logging in...' : 'Login'}</span>
      </button>
    </form>
  );
};

export default LoginForm;