// src/components/ui/RoleToggle.jsx
const RoleToggle = ({ role, setRole }) => {
  return (
    <div className="flex bg-gray-100 p-1 rounded-full w-full max-w-sm mx-auto mb-6">
      <button 
        onClick={() => setRole('EMPLOYEE')}
        className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${role === 'EMPLOYEE' ? 'bg-white shadow-sm text-bpcl-navy' : 'text-gray-500'}`}
      >
        Employee
      </button>
      <button 
        onClick={() => setRole('MANAGER')}
        className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${role === 'MANAGER' ? 'bg-white shadow-sm text-bpcl-navy' : 'text-gray-500'}`}
      >
        Manager
      </button>
    </div>
  );
};

export default RoleToggle;