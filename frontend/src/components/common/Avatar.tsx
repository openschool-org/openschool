function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const SIZE = { sm: "2.25rem", md: "3.25rem" };
const FONT_SIZE = { sm: "0.75rem", md: "1.1rem" };

interface Props {
  name: string;
  size?: "sm" | "md";
}

export default function Avatar({ name, size = "md" }: Props) {
  if (size === "md") {
    return <div className="os-profile__avatar">{initials(name)}</div>;
  }
  return (
    <div
      style={{
        width: SIZE[size],
        height: SIZE[size],
        borderRadius: "50%",
        background: "#406AAF",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: FONT_SIZE[size],
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}
