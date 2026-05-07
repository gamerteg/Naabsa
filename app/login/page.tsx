import { LoginForm } from './LoginForm'

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams
  let initialError = ''

  if (error === 'inactive') {
    initialError = 'Your account is inactive. Contact an administrator.'
  } else if (error === 'profile') {
    initialError = 'Login succeeded, but no active profile was found for this user.'
  }

  return <LoginForm initialError={initialError} />
}
