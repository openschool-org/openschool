interface Props {
  label: string;
  bg: string;
  border: string;
  color: string;
}

export default function StatusTag({ label, bg, border, color }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.6rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        border: `1px solid ${border}`,
        background: bg,
        color,
        borderRadius: "2px",
      }}
    >
      {label}
    </span>
  );
}
