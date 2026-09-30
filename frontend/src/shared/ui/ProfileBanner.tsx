import Avatar from "@/shared/ui/Avatar";

interface Props {
  name: string;
  meta?: string;
  actions: React.ReactNode;
  // Replaces the initials avatar, e.g. with a grade avatar on a class page.
  avatar?: React.ReactNode;
}

export default function ProfileBanner({ name, meta, actions, avatar }: Props) {
  return (
    <div className="os-profile__banner">
      {avatar ?? <Avatar name={name} />}
      <div className="os-flex-1">
        <p className="os-profile__name">{name}</p>
        {meta && <p className="os-profile__meta">{meta}</p>}
      </div>
      <div className="os-profile__actions">{actions}</div>
    </div>
  );
}
