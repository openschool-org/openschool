import { Tooltip } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

export interface StripStep {
  key: string;
  title: string;
  hint?: string;
}

// Vertical progress list: one line per step (number + title), joined by a connector; detail on hover.
export default function StepStrip({ steps, current, failed }: { steps: StripStep[]; current: number; failed?: boolean }) {
  return (
    <ol className="os-step-strip" aria-label="Progress">
      {steps.map((s, i) => {
        const state = i < current ? "is-done" : i === current ? (failed ? "is-failed" : "is-current") : "";
        return (
          <li key={s.key} className={`os-step-strip__item ${state}`} aria-current={i === current ? "step" : undefined}>
            <Tooltip title={s.hint} placement="left">
              <span className="os-step-strip__label">
                <span className="os-step-strip__num" aria-hidden="true">
                  {i < current ? <CheckOutlined /> : i === current && failed ? <CloseOutlined /> : i + 1}
                </span>
                <span className="os-step-strip__title">{s.title}</span>
              </span>
            </Tooltip>
          </li>
        );
      })}
    </ol>
  );
}
