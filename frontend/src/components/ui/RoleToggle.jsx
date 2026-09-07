// src/components/ui/RoleToggle.jsx
const RoleToggle = ({ role, setRole }) => {
  return (
    <div className="grid grid-cols-2 !rounded-[18px] border border-slate-200/90 bg-white p-1.5 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.32)]" style={{ borderRadius: '18px' }} role="tablist" aria-label="Select your role">
      <button 
        type="button"
        onClick={() => setRole('EMPLOYEE')}
        role="tab"
        aria-selected={role === 'EMPLOYEE'}
        className={`flex min-h-12 items-center justify-center gap-2 !rounded-[13px] px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bpcl-emerald ${role === 'EMPLOYEE' ? 'bg-bpcl-emerald text-white shadow-md shadow-emerald-950/20 ring-1 ring-inset ring-emerald-950/10' : 'text-slate-700 hover:bg-emerald-50/70 hover:text-bpcl-emerald'}`}
        style={{ borderRadius: '13px', WebkitAppearance: 'none' }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
        Employee
      </button>
      <button 
        type="button"
        onClick={() => setRole('MANAGER')}
        role="tab"
        aria-selected={role === 'MANAGER'}
        className={`flex min-h-12 items-center justify-center gap-2 !rounded-[13px] px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bpcl-emerald ${role === 'MANAGER' ? 'bg-bpcl-emerald text-white shadow-md shadow-emerald-950/20 ring-1 ring-inset ring-emerald-950/10' : 'text-slate-700 hover:bg-emerald-50/70 hover:text-bpcl-emerald'}`}
        style={{ borderRadius: '13px', WebkitAppearance: 'none' }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M12 3 4 7v5c0 4.5 3.1 7.8 8 9 4.9-1.2 8-4.5 8-9V7l-8-4Z" /><path d="M9 12h6M12 9v6" /></svg>
        Manager
      </button>
    </div>
  );
};

export default RoleToggle;
