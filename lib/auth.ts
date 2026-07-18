const FAKE_EMAIL_DOMAIN = 'gmail.com'

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`
}