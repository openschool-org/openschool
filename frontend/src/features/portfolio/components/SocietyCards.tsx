import { Button, Card, Skeleton, Tag, Tooltip } from "antd";
import { BulbOutlined, EditOutlined, TeamOutlined } from "@ant-design/icons";
import EmptyState from "@/shared/ui/EmptyState";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { Society } from "@/features/portfolio/api/society";

interface Props {
  loading: boolean;
  societies: Society[];
  readOnly: boolean;
  onOpen: (id: string) => void;
  onEdit: (s: Society) => void;
  onDelete: (s: Society) => void;
}

// One card per society; a card opens its roster. Edit and delete are hidden in a past year.
export default function SocietyCards({ loading, societies, readOnly, onOpen, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="os-society-grid">
        {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="os-society-card"><Skeleton active title paragraph={{ rows: 2 }} /></Card>)}
      </div>
    );
  }
  if (societies.length === 0) {
    return (
      <div className="os-section">
        <EmptyState title="No societies yet" description="Create a society and assign its Teacher-in-Charge." />
      </div>
    );
  }
  return (
    <div className="os-society-grid">
      {societies.map((s) => (
        <Card
          key={s.id}
          className="os-society-card"
          role="button"
          tabIndex={0}
          aria-label={`Open ${s.name}`}
          onClick={() => onOpen(s.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(s.id); } }}
          title={<span className="os-flex os-items-center os-gap-2"><BulbOutlined className="os-c-accent" />{s.name}</span>}
          extra={
            !readOnly && (
              <span className="os-flex os-gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Tooltip title="Edit society">
                  <Button type="text" size="small" aria-label={`Edit ${s.name}`} icon={<EditOutlined />} onClick={() => onEdit(s)} />
                </Tooltip>
                <RemoveIconButton label={`Delete ${s.name}`} onClick={() => onDelete(s)} />
              </span>
            )
          }
        >
          <p className="os-society-card__label">Teacher-in-Charge</p>
          <p className="os-society-card__teacher">{s.teacher_name}</p>
          <Tag variant="filled" icon={<TeamOutlined />}>{s.member_count} {s.member_count === 1 ? "member" : "members"}</Tag>
        </Card>
      ))}
    </div>
  );
}
