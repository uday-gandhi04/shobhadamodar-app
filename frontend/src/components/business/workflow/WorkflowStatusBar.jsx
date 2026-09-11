import { useTranslation } from "react-i18next";

const WORKFLOW_STAGES = [
  "nozzle",
  "cash",
  "upi",
  "card",
  "udhari",
  "expense",
  "review",
];

const WorkflowStatusBar = ({ currentStage }) => {
  const { t } = useTranslation();

  const currentIndex = WORKFLOW_STAGES.findIndex(
    (stage) => stage === currentStage,
  );

  return (
    <div className="mt-5 rounded-[18px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-7 items-center gap-1 text-center">
        {WORKFLOW_STAGES.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={stage} className="min-w-0">
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
                {t(`workflow.stages.${stage}`)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowStatusBar;