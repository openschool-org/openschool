import TextField from "@/shared/ui/TextField";
import { suggestNameWithInitials, type PersonNameValues } from "@/shared/lib/name";

interface Props {
  idPrefix: string;
  value: PersonNameValues;
  onChange: (next: PersonNameValues) => void;
  fullNameInvalid?: boolean;
  onFullNameBlur?: () => void;
  disabled?: boolean;
  // Profile pages show the names locked until Edit is pressed.
  readOnly?: boolean;
}

// Full name, name with initials and calling name. The name with initials follows the full name
// until someone edits it, so an admin only types it for names the rule gets wrong.
export default function PersonNameFields({ idPrefix, value, onChange, fullNameInvalid, onFullNameBlur, disabled, readOnly }: Props) {
  const setFullName = (full: string) => {
    const following = !value.name_with_initials || value.name_with_initials === suggestNameWithInitials(value.full_name);
    onChange({ ...value, full_name: full, name_with_initials: following ? suggestNameWithInitials(full) : value.name_with_initials });
  };

  return (
    <>
      <div className="os-col-span-full">
        <TextField
          id={`${idPrefix}-full-name`}
          label="Full name"
          helperText={readOnly ? undefined : "As on the birth certificate or NIC, e.g. Hettiwatta Arachchige Hasitha Erandika Wickramasinghe."}
          value={value.full_name}
          disabled={disabled}
          readOnly={readOnly}
          invalid={fullNameInvalid}
          invalidText="Full name is required."
          onChange={setFullName}
          onBlur={onFullNameBlur}
        />
      </div>
      <TextField
        id={`${idPrefix}-name-with-initials`}
        label="Name with initials"
        helperText={readOnly ? undefined : "Filled in from the full name. Change it if needed, e.g. for Tamil or Muslim names."}
        placeholder="H.A.H.E. Wickramasinghe"
        value={value.name_with_initials}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(v) => onChange({ ...value, name_with_initials: v })}
      />
      <TextField
        id={`${idPrefix}-calling-name`}
        label="Calling name (optional)"
        helperText={readOnly ? undefined : "What they are usually called day to day, e.g. by teachers."}
        placeholder="Hasitha"
        value={value.calling_name}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(v) => onChange({ ...value, calling_name: v })}
      />
    </>
  );
}
