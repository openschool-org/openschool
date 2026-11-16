import { Button, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";

interface Props {
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}

// Edit and delete icon buttons for the last column of a grid row.
export default function RowActions({ editLabel, deleteLabel, onEdit, onDelete }: Props) {
  return (
    <div className="os-grid__actions">
      <Tooltip title={editLabel}>
        <Button type="text" size="small" aria-label={editLabel} icon={<EditOutlined />} onClick={onEdit} />
      </Tooltip>
      <Tooltip title={deleteLabel}>
        <Button type="text" size="small" danger aria-label={deleteLabel} icon={<DeleteOutlined />} onClick={onDelete} />
      </Tooltip>
    </div>
  );
}
