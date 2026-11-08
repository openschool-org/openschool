import { Link } from "react-router";
import { Card, Progress } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";

export interface SetupChecklistItem {
  label: string;
  done: boolean;
  path: string;
}

export default function SetupChecklistCard({ items }: { items: SetupChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;
  const progress = Math.round((doneCount / items.length) * 100);

  return (
    <Card className="os-dash-card">
      <div className="os-dash-setup__head">
        <div>
          <h2 className="os-dash-setup__title">Finish setting up your school</h2>
          <p className="os-dash-setup__desc">Complete these essentials to get ready for daily use.</p>
        </div>
        <span className="os-dash-setup__count"><strong>{doneCount}</strong> of {items.length} complete</span>
      </div>
      <div className="os-dash-setup__bar">
        <Progress percent={progress} showInfo={false} size={{ height: 6 }} aria-label="Setup progress" />
      </div>
      <div className="os-dash-setup__items">
        {items.map((item) => (
          <Link key={item.label} to={item.path} className={`os-dash-setup__item${item.done ? " is-complete" : ""}`}>
            <span className="os-dash-setup__item__mark">
              {item.done ? <CheckCircleFilled /> : <span className="os-dash-setup__todo" />}
            </span>
            <span className="os-dash-setup__item__label">{item.label}</span>
            {!item.done && <span className="os-dash-setup__item__go">Set up</span>}
          </Link>
        ))}
      </div>
    </Card>
  );
}
