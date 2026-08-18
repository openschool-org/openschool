// This file defines the CustomStepper component, a highly polished, responsive horizontal progress indicator used to guide users through multi-step setup wizards in the application.

export interface StepItem {
  label: string;
  description?: string;
}

interface Props {
  steps: readonly string[] | StepItem[];
  currentIndex: number;
}

export default function CustomStepper({ steps, currentIndex }: Props) {
  return (
    <div className="os-custom-stepper">
      {steps.map((step, index) => {
        const label = typeof step === "string" ? step : step.label;
        const description = typeof step === "string" ? undefined : step.description;
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const stateClass = isCompleted ? "completed" : isActive ? "active" : "upcoming";

        return (
          <div key={label} className={`os-step-item ${stateClass}`}>
            <div className="os-step-circle">
              {isCompleted ? (
                <svg className="os-step-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="os-step-num">{index + 1}</span>
              )}
            </div>
            <div className="os-step-content">
              <span className="os-step-label">{label}</span>
              {description && <span className="os-step-description">{description}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
