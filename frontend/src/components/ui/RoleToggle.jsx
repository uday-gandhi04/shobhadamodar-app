// src/components/ui/RoleToggle.jsx

const PersonIcon = ({ active }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`h-[17px] w-[17px] ${active ? 'text-white' : 'text-slate-500'}`}
  >
    <circle cx="12" cy="7" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </svg>
);

const ManagerIcon = ({ active }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`h-[17px] w-[17px] ${active ? 'text-white' : 'text-slate-500'}`}
  >
    <path d="M12 3 5 6v5c0 4.7 2.8 8.4 7 10 4.2-1.6 7-5.3 7-10V6l-7-3Z" />
    <path d="M9.5 12h5M12 9.5v5" />
  </svg>
);

const RoleToggle = ({ role, setRole }) => {
  const employeeActive = role === 'EMPLOYEE';
  const managerActive = role === 'MANAGER';

  return (
    <div
      role="tablist"
      aria-label="Select your role"
      className="
        grid
        grid-cols-2
        gap-1
        rounded-[16px]
        border
        border-slate-200
        bg-[#edf2ee]
        p-1
        shadow-[0_4px_12px_rgba(15,23,42,0.05)]
      "
    >
      {/* Employee */}
      <button
        type="button"
        role="tab"
        aria-selected={employeeActive}
        onClick={() => setRole('EMPLOYEE')}
        className="
          relative
          flex
          min-h-[46px]
          items-center
          justify-center
          rounded-[12px]
          bg-transparent
          p-0
          text-[14px]
          font-semibold
          transition-transform
          duration-150
          active:scale-[0.985]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-emerald-500
          focus-visible:ring-offset-1
          focus-visible:ring-offset-white
        "
      >
        <span
          className={[
            'absolute inset-0 rounded-[12px] transition-all duration-200',
            employeeActive
              ? 'bg-[#047857] shadow-[0_4px_10px_rgba(4,120,87,0.20)]'
              : 'bg-transparent',
          ].join(' ')}
        />

        <span className="relative z-10 flex items-center justify-center gap-2">
          <PersonIcon active={employeeActive} />

          <span
            className={
              employeeActive
                ? 'text-white'
                : 'text-slate-600'
            }
          >
            Employee
          </span>
        </span>
      </button>

      {/* Manager */}
      <button
        type="button"
        role="tab"
        aria-selected={managerActive}
        onClick={() => setRole('MANAGER')}
        className="
          relative
          flex
          min-h-[46px]
          items-center
          justify-center
          rounded-[12px]
          bg-transparent
          p-0
          text-[14px]
          font-semibold
          transition-transform
          duration-150
          active:scale-[0.985]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-emerald-500
          focus-visible:ring-offset-1
          focus-visible:ring-offset-white
        "
      >
        <span
          className={[
            'absolute inset-0 rounded-[12px] transition-all duration-200',
            managerActive
              ? 'bg-[#047857] shadow-[0_4px_10px_rgba(4,120,87,0.20)]'
              : 'bg-transparent',
          ].join(' ')}
        />

        <span className="relative z-10 flex items-center justify-center gap-2">
          <ManagerIcon active={managerActive} />

          <span
            className={
              managerActive
                ? 'text-white'
                : 'text-slate-600'
            }
          >
            Manager
          </span>
        </span>
      </button>
    </div>
  );
};

export default RoleToggle;