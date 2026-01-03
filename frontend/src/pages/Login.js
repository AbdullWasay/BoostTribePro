import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast({
        title: `✅ ${t('auth.login.success')}`,
        description: `${t('auth.login.welcome')} ${result.user.name} !`,
      });

      // Use requestAnimationFrame to ensure React processes state updates before navigation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          navigate('/dashboard');
        });
      });
    } else {
      toast({
        title: `❌ ${t('auth.login.error')}`,
        description: result.error || t('auth.login.invalidCredentials'),
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400"><span>Loading...</span></p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">
            <span className="text-gradient">BoostTribe</span>
          </h1>
          <p className="text-gray-400 mt-2"><span>{t('nav.dashboard')}</span></p>
        </div>

        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center"><span>{t('auth.login.title')}</span></CardTitle>
            <CardDescription className="text-center">
              <span>{t('auth.login.subtitle')}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.login.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.login.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 glow"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>{t('auth.login.loading')}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>{t('auth.login.submit')}</span>
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                <span>Mot de passe oublié ?</span>
              </Link>
            </div>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-400">
                <span>{t('auth.login.noAccount')}</span>{' '}
                <Link to="/register" className="text-primary hover:underline">
                  <span>{t('auth.login.createAccount')}</span>
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link to="/" className="text-sm text-gray-400 hover:text-primary">
                <span>{t('auth.login.backHome')}</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
