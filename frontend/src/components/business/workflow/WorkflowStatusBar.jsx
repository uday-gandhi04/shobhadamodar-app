import { useNavigate } from "react-router-dom";
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

const WorkflowStatusBar = ({
  currentStage,
  navigationUnlocked = false,
  mpdId,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const currentIndex = WORKFLOW_STAGES.findIndex(
    (stage) => stage === currentStage,
  );

  const getStageRoute = (stage) => {
    switch (stage) {
      case "nozzle":
        return mpdId
          ? `/shift/${mpdId}`
          : null;

      case "cash":
        return "/shift/cash";

      case "upi":
        return "/shift/upi";

      case "card":
        return "/shift/card";

      case "udhari":
        return "/shift/udhari";

      case "expense":
        return "/shift/expense";

      case "review":
        return "/shift/review";

      default:
        return null;
    }
  };

  const handleStageClick = (stage, index) => {
    // Current stage does nothing.
    if (index === currentIndex) {
      return;
    }

    // Before nozzle is completed, future navigation is disabled.
    if (!navigationUnlocked) {
      return;
    }

    const route = getStageRoute(stage);

    if (route) {
      navigate(route);
    }
  };

  return (
    <div className="mt-5 rounded-[18px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-7 items-center gap-1 text-center">
        {WORKFLOW_STAGES.map(
          (stage, index) => {
            const isCurrent =
              index === currentIndex;

            const isCompleted =
              index < currentIndex;

            const isClickable =
              navigationUnlocked &&
              !isCurrent;

            return (
              <div
                key={stage}
                className="min-w-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    handleStageClick(
                      stage,
                      index,
                    )
                  }
                  disabled={!isClickable}
                  className={`
                    !rounded-full
                    mx-auto
                    grid
                    h-7
                    w-7
                    place-items-center
                    text-[10px]
                    font-bold
                    transition
                    ${
                      isCurrent
                        ? "bg-[#047857] text-white"
                        : isCompleted
                          ? "bg-emerald-100 text-[#047857]"
                          : "bg-slate-100 text-slate-400"
                    }
                    ${
                      isClickable
                        ? "cursor-pointer active:scale-95"
                        : "cursor-default"
                    }
                  `}
                  aria-label={t(
                    `workflow.stages.${stage}`,
                  )}
                >
                  {index + 1}
                </button>

                <p
                  className={`
                    mt-1
                    truncate
                    text-[8px]
                    font-semibold
                    ${
                      isCurrent
                        ? "text-[#047857]"
                        : isCompleted
                          ? "text-slate-600"
                          : "text-slate-400"
                    }
                  `}
                >
                  {t(
                    `workflow.stages.${stage}`,
                  )}
                </p>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};

export default WorkflowStatusBar;