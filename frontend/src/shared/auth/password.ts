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

// One place for the password policy shown in every password form.
export function validateNewPassword(password: string, confirm: string) {
  const tooShort = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const hasSequence = password.length >= PASSWORD_MIN_LENGTH && hasSequentialPattern(password);
  const tooCommon = password.length >= PASSWORD_MIN_LENGTH && COMMON_PASSWORDS.has(password.toLowerCase());
  const criteria = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
      notCommon: password.length >= PASSWORD_MIN_LENGTH && !tooCommon && !hasSequence,
  };
  const mismatch = confirm.length > 0 && confirm !== password;
  return {
    criteria,
    valid: Object.values(criteria).every(Boolean) && confirm === password,
    passwordError: tooShort
      ? `Must be at least ${PASSWORD_MIN_LENGTH} characters.`
      : tooCommon
        ? "That password is too common. Choose something less guessable."
        : hasSequence
          ? "Avoid predictable sequences such as 1234 or abcd."
        : password && !criteria.uppercase
          ? "Add at least one uppercase letter."
          : password && !criteria.lowercase
            ? "Add at least one lowercase letter."
            : password && !criteria.number
              ? "Add at least one number."
              : password && !criteria.special
                ? "Add at least one special character."
        : undefined,
    confirmError: mismatch ? "Passwords do not match." : undefined,
  };
}
