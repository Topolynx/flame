import { LoginForm } from '@/components/auth/LoginForm';
import { ThemeApplier } from '@/components/themes/ThemeApplier';
import { Container } from '@/components/ui/Container';
import { Headline } from '@/components/ui/Headline';
import { getActiveTheme } from '@/lib/activeTheme';

export default async function LoginPage() {
  const activeTheme = await getActiveTheme(null);

  return (
    <Container>
      <ThemeApplier theme={activeTheme} />
      <Headline title="Login" linkToHome />
      <LoginForm />
    </Container>
  );
}
