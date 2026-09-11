const WORKFLOW_STAGES = [
  { key: "nozzle", label: "Nozzle" },
  { key: "cash", label: "Cash" },
  { key: "upi", label: "UPI" },
  { key: "card", label: "Card" },
  { key: "udhari", label: "Udhari" },
  { key: "expense", label: "Expense" },
  { key: "review", label: "Review" },
];

const WorkflowStatusBar = ({ currentStage }) => {
  const currentIndex = WORKFLOW_STAGES.findIndex(
    (stage) => stage.key === currentStage,
  );

  return (
    <div className="mt-5 rounded-[18px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-7 items-center gap-1 text-center">
        {WORKFLOW_STAGES.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={stage.key} className="min-w-0">
              <div
                className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${
                  isCurrent
                    ? "bg-[#047857] text-white"
                    : isCompleted
                      ? "bg-emerald-100 text-[#047857]"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {index + 1}
              </div>
              <p
                className={`mt-1 truncate text-[8px] font-semibold ${
                  isCurrent
                    ? "text-[#047857]"
                    : isCompleted
                      ? "text-slate-600"
                      : "text-slate-400"
                }`}
              >
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowStatusBar;
