interface Props {
  name: string;
  meta?: string;
  actions: React.ReactNode;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ProfileBanner({ name, meta, actions }: Props) {
  return (
    <div className="os-profile__banner">
      <div className="os-profile__avatar">{initials(name)}</div>
      <div style={{ flex: 1 }}>
        <p className="os-profile__name">{name}</p>
        {meta && <p className="os-profile__meta">{meta}</p>}
      </div>
      <div className="os-profile__actions">{actions}</div>
    </div>
  );
}
