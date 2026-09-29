import { getInitials } from "@/shared/lib/name";

interface Props {
  name: string;
  size?: "sm" | "md";
}

export default function Avatar({ name, size = "md" }: Props) {
  if (size === "md") {
    return <div className="os-profile__avatar">{getInitials(name)}</div>;
  }
  return (
    <div className="os-avatar-circle os-w-2q os-h-2q os-bg-accent-dark os-c-layer os-text-xs">
      {getInitials(name)}
    </div>
  );
}
