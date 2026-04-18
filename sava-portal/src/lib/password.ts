export type PasswordError = 'tooShort' | 'noUppercase' | 'noNumber' | 'noSpecial'

export function validatePassword(password: string): PasswordError | null {
  if (password.length < 8) return 'tooShort'
  if (!/[A-Z]/.test(password)) return 'noUppercase'
  if (!/[0-9]/.test(password)) return 'noNumber'
  if (!/[^A-Za-z0-9]/.test(password)) return 'noSpecial'
  return null
}
