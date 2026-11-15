interface Props {
  name: string;
  meta?: string;
  actions: React.ReactNode;
  // Optional badge before the name, e.g. the grade avatar on a class page. People's pages show none.
  avatar?: React.ReactNode;
}

export default function ProfileBanner({ name, meta, actions, avatar }: Props) {
  return (
    <div className="os-profile__banner">
      {avatar}
      <div className="os-flex-1">
        <p className="os-profile__name">{name}</p>
        {meta && <p className="os-profile__meta">{meta}</p>}
      </div>
      <div className="os-profile__actions">{actions}</div>
    </div>
  );
}
