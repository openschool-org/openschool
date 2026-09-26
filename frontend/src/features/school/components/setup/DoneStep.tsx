import { Link } from "react-router";
import { Button, InlineNotification, InlineLoading } from "@carbon/react";
import { CheckmarkFilled, ArrowRight, Layers, Book, UserMultiple, EventSchedule, ChevronRight } from "@carbon/icons-react";

const NEXT_STEPS = [
  {
    title: "Curriculum",
    body: "Define levels (a grade, a stream, an exam class) and selection groups to control which subjects students can pick.",
    path: "/curriculum",
    icon: Layers,
  },
  {
    title: "Subjects",
    body: "Build your subject catalogue, then offer subjects to students through curriculum selection groups.",
    path: "/subjects",
    icon: Book,
  },
  {
    title: "Students & teachers",
    body: "Enrol students and add teachers - each gets their own sign-in and profile automatically.",
    path: "/students",
    icon: UserMultiple,
  },
  {
    title: "Attendance",
    body: "Once classes have students, teachers can create sessions and mark attendance from the class page.",
    path: "/attendance",
    icon: EventSchedule,
  },
];

interface Props {
  submitting: boolean;
  submitError: string | null;
  submitted: boolean;
  onRetry: () => void;
  onGoToDashboard: () => void;
}

export default function DoneStep({ submitting, submitError, submitted, onRetry, onGoToDashboard }: Props) {
  return (
    <div>
      {submitting && (
        <div className="os-flex os-justify-center os-py-14 os-px-0">
          <InlineLoading description="Saving your school setup…" />
        </div>
      )}

      {!submitting && submitError && (
        <div className="os-text-center">
          <InlineNotification
            kind="error"
            title="Could not finish setup"
            subtitle={submitError}
            hideCloseButton
            lowContrast className="os-mb-5 os-max-w-full os-text-left"
          />
          <Button onClick={onRetry} className="os-w-full os-max-w-full">
            Retry
          </Button>
        </div>
      )}

      {!submitting && !submitError && submitted && (
        <>
          <div className="os-text-center os-mb-7">
            <div className="os-w-3h os-h-3h os-mx-auto os-mt-0 os-mb-4 os-rounded-full os-bg-status-present os-flex os-items-center os-justify-center"
            >
              <CheckmarkFilled size={28} className="os-fill-success" />
            </div>
            <h2 className="os-mt-0 os-mx-0 os-mb-1h os-text-xl os-fw-600 os-c-primary">
              Your school is ready
            </h2>
            <p className="os-m-0 os-text-md os-c-secondary">
              Here's what OpenSchool helps you run day to day, and where to go next.
            </p>
          </div>

          <div className="os-grid os-gap-3 os-mb-6">
            {NEXT_STEPS.map((item) => (
              <Link
                key={item.title}
                to={item.path} className="os-flex os-items-center os-gap-3h os-py-3h os-px-4 os-border os-bg-layer-hover os-no-underline os-transition"
              >
                <div className="os-w-2q os-h-2q os-rounded-full os-bg-accent-light os-flex os-items-center os-justify-center os-shrink-0"
                >
                  <item.icon size={18} className="os-fill-accent" />
                </div>
                <div className="os-flex-1 os-min-w-0">
                  <p className="os-mt-0 os-mx-0 os-mb-1 os-text-md os-fw-600 os-c-primary">
                    {item.title}
                  </p>
                  <p className="os-m-0 os-text-sm os-c-secondary">{item.body}</p>
                </div>
                <ChevronRight size={16} className="os-fill-tertiary os-shrink-0" />
              </Link>
            ))}
          </div>

          <Button renderIcon={ArrowRight} kind="primary" onClick={onGoToDashboard} className="os-w-full os-max-w-full">
            Go to Dashboard
          </Button>
        </>
      )}
    </div>
  );
}
