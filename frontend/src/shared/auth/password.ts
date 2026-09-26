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

// One place for the password policy shown in every password form.
export function validateNewPassword(password: string, confirm: string) {
  const tooShort = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const tooCommon = password.length >= PASSWORD_MIN_LENGTH && COMMON_PASSWORDS.has(password.toLowerCase());
  const mismatch = confirm.length > 0 && confirm !== password;
  return {
    valid: password.length >= PASSWORD_MIN_LENGTH && !tooCommon && confirm === password,
    passwordError: tooShort
      ? `Must be at least ${PASSWORD_MIN_LENGTH} characters.`
      : tooCommon
        ? "That password is too common. Choose something less guessable."
        : undefined,
    confirmError: mismatch ? "Passwords do not match." : undefined,
  };
}
