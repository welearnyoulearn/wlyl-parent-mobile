import { useRouter } from 'expo-router'
import { Cake } from 'lucide-react-native'
import { BirthdayField } from '@/components/birthday-field'
import { AuthShell } from '@/components/auth-shell'
import { useT } from '@/lib/i18n'

// Shown once, right after the first-login password change, when /me has no
// date_of_birth (change-password.tsx decides). Optional: Skip goes straight home.
export default function BirthdayScreen() {
  const router = useRouter()
  const t = useT()
  const home = () => router.replace('/')

  return (
    <AuthShell icon={Cake} title={t.birthday.title} subtitle={t.birthday.subtitle} step={{ n: 2, of: 2 }} testID="birthday-screen">
      <BirthdayField value={null} onSaved={home} onSkip={home} />
    </AuthShell>
  )
}
