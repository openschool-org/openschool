const PASSWORD_MIN_LENGTH = 10;

// A short list of the most-guessed passwords and keyboard patterns. Not a
// substitute for the server's own deny list (which also rejects a password
// equal to the account's NIC/index number) - this is client-side UX so a
// user isn't told only after submitting that "password1234" was rejected.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "1234567890", "qwertyuiop", "qwerty123", "letmein123", "welcome123",
  "admin1234", "iloveyou1", "sunshine1", "princess1", "football1",
  "monkey123", "abc1234567", "1qaz2wsx3e", "trustno1a", "changeme1",
]);

function hasSequentialPattern(value: string): boolean {
  const normalized = value.toLowerCase();
  for (let index = 0; index <= normalized.length - 4; index += 1) {
    const chunk = normalized.slice(index, index + 4);
    const ascending = [...chunk].every((character, offset) => offset === 0 || character.charCodeAt(0) === chunk.charCodeAt(offset - 1) + 1);
    const descending = [...chunk].every((character, offset) => offset === 0 || character.charCodeAt(0) === chunk.charCodeAt(offset - 1) - 1);
    if (ascending || descending) return true;
  }
  return false;
}

// Checked in order; the first failing rule supplies the message under the field.
const RULES: { fails: (password: string, long: boolean) => boolean; message: string }[] = [
  { fails: (p, long) => p.length > 0 && !long, message: `Must be at least ${PASSWORD_MIN_LENGTH} characters.` },
  { fails: (p, long) => long && COMMON_PASSWORDS.has(p.toLowerCase()), message: "That password is too common. Choose something less guessable." },
  { fails: (p, long) => long && hasSequentialPattern(p), message: "Avoid predictable sequences such as 1234 or abcd." },
  { fails: (p) => !!p && !/[A-Z]/.test(p), message: "Add at least one uppercase letter." },
  { fails: (p) => !!p && !/[a-z]/.test(p), message: "Add at least one lowercase letter." },
  { fails: (p) => !!p && !/\d/.test(p), message: "Add at least one number." },
  { fails: (p) => !!p && !/[^A-Za-z0-9]/.test(p), message: "Add at least one special character." },
];

// One place for the password policy shown in every password form.
export function validateNewPassword(password: string, confirm: string) {
  const long = password.length >= PASSWORD_MIN_LENGTH;
  const criteria = {
    minLength: long,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    notCommon: long && !COMMON_PASSWORDS.has(password.toLowerCase()) && !hasSequentialPattern(password),
  };
  return {
    criteria,
    valid: Object.values(criteria).every(Boolean) && confirm === password,
    passwordError: RULES.find((rule) => rule.fails(password, long))?.message,
    confirmError: confirm.length > 0 && confirm !== password ? "Passwords do not match." : undefined,
  };
}
