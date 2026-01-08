import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, token: contextToken } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const planId = searchParams.get('plan_id');
  
  // Debug: Log plan_id on component mount
  useEffect(() => {
    if (planId) {
      console.log('Register page loaded with plan_id:', planId);
    } else {
      console.log('Register page loaded without plan_id');
    }
  }, [planId]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      toast({
        title: `❌ ${t('common.error')}`,
        description: t('auth.register.passwordMismatch'),
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: `❌ ${t('common.error')}`,
        description: t('auth.register.passwordTooShort'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const result = await register(name, email, password);

    if (result.success) {
      // Get token from result or context (fallback) - try multiple times
      // Priority: result.token > localStorage > contextToken (contextToken might not be updated yet)
      let authToken = result.token || localStorage.getItem('token') || contextToken;
      
      // If token is still not available and we have a planId, wait a bit and try again
      if (!authToken && planId) {
        console.log('⚠️ Token not immediately available, waiting 200ms for state update...');
        await new Promise(resolve => setTimeout(resolve, 200));
        authToken = result.token || localStorage.getItem('token') || contextToken;
        
        // Try one more time after another short delay
        if (!authToken) {
          console.log('⚠️ Token still not available, waiting another 200ms...');
          await new Promise(resolve => setTimeout(resolve, 200));
          authToken = result.token || localStorage.getItem('token') || contextToken;
        }
      }
      
      console.log('=== REGISTRATION SUCCESS ===');
      console.log('planId:', planId);
      console.log('result.token:', result.token ? 'present' : 'missing');
      console.log('contextToken:', contextToken ? 'present' : 'missing');
      console.log('localStorage token:', localStorage.getItem('token') ? 'present' : 'missing');
      console.log('Final authToken:', authToken ? 'present' : 'missing');
      console.log('Full URL search params:', window.location.search);
      
      // Show welcome message only if no plan_id (normal registration)
      if (!planId) {
      const welcomeMessage = result.user.role === 'admin' 
        ? t('auth.register.welcomeAdmin', { name: result.user.name })
        : t('auth.register.welcomeUser', { name: result.user.name });
      
      toast({
        title: `✅ ${t('auth.register.success')}`,
        description: welcomeMessage,
      });
      }
      
      // If plan_id is provided, trigger payment flow immediately after registration
      if (planId) {
        if (!authToken) {
          console.error('ERROR: No token available for payment flow!');
          toast({
            title: `⚠️ ${t('common.warning')}`,
            description: 'Registration successful, but authentication token is missing. Please log in and try again.',
            variant: "default"
          });
          // Navigate to login instead of dashboard
          navigate('/login');
          setLoading(false);
          return;
        }
        
        console.log('✅ Starting payment flow for plan_id:', planId);
        setLoading(false); // Stop loading before redirect
        
        try {
          console.log('📋 Fetching plan details for plan_id:', planId);
          
          // Fetch plan details to get price
          const planResponse = await axios.get(`${API}/pricing-plans/${planId}`);
          const plan = planResponse.data;
          console.log('📦 Plan details received:', plan);
          
          if (!plan) {
            throw new Error('Plan not found');
          }
          
          if (plan.price > 0) {
            console.log('💳 Paid plan detected (price:', plan.price, '), creating Stripe checkout...');
            
            try {
              // Create Stripe checkout session for subscription
              const checkoutResponse = await axios.post(
                `${API}/stripe/create-subscription-checkout`,
                {
                  plan_id: planId,
                  customer_email: email,
                  customer_name: name,
                  origin_url: window.location.origin
                },
                {
                  headers: { Authorization: `Bearer ${authToken}` }
                }
              );
              
              console.log('✅ Checkout response:', checkoutResponse.data);
              
              if (checkoutResponse.data?.url) {
                console.log('🚀 Redirecting to Stripe checkout:', checkoutResponse.data.url);
                // Redirect to Stripe checkout immediately - this will stop execution
                window.location.href = checkoutResponse.data.url;
                return; // Don't navigate to dashboard
              } else {
                throw new Error('No checkout URL received from server');
              }
            } catch (checkoutError) {
              // Check if error is due to Stripe not being configured
              const errorDetail = checkoutError.response?.data?.detail || '';
              const errorMessage = (errorDetail || checkoutError.message || '').toLowerCase();
              const statusCode = checkoutError.response?.status;
              
              console.log('⚠️ INNER CATCH - Checkout error detail:', errorDetail);
              console.log('⚠️ INNER CATCH - Error message (lowercase):', errorMessage);
              console.log('⚠️ INNER CATCH - Status code:', statusCode);
              console.log('⚠️ INNER CATCH - planId:', planId);
              
              // Check for Stripe configuration errors (can be 400 or 500 from backend)
              // The error message format is: "Error creating checkout: 400: Stripe not configured..."
              // It might be truncated, so check for partial matches
              const hasStripeNotConfigured = errorMessage.includes('stripe not configure'); // with or without 'd'
              const hasConfigureStripeKeys = errorMessage.includes('configure stripe keys') || errorMessage.includes('configure stripe');
              const hasStripeAndPaymentSettings = errorMessage.includes('stripe') && errorMessage.includes('payment settings');
              const hasStripeWithErrorStatus = errorMessage.includes('stripe') && (statusCode === 400 || statusCode === 500);
              
              const isStripeConfigError = hasStripeNotConfigured || hasConfigureStripeKeys || hasStripeAndPaymentSettings || hasStripeWithErrorStatus;
              
              console.log('⚠️ INNER CATCH - hasStripeNotConfigured:', hasStripeNotConfigured);
              console.log('⚠️ INNER CATCH - hasConfigureStripeKeys:', hasConfigureStripeKeys);
              console.log('⚠️ INNER CATCH - hasStripeAndPaymentSettings:', hasStripeAndPaymentSettings);
              console.log('⚠️ INNER CATCH - hasStripeWithErrorStatus:', hasStripeWithErrorStatus);
              console.log('⚠️ INNER CATCH - isStripeConfigError:', isStripeConfigError);
              
              if (isStripeConfigError && planId) {
                console.log('📝 INNER CATCH - Stripe not configured detected, redirecting to payment settings...');
                toast({
                  title: `💳 ${t('common.info') || 'Configuration requise'}`,
                  description: 'Veuillez configurer vos clés Stripe pour compléter votre abonnement.',
                  variant: "default"
                });
                // Redirect to payment settings with plan_id
                setLoading(false);
                navigate(`/payment-settings?plan_id=${planId}`);
                return; // IMPORTANT: Don't re-throw, just return
              }
              
              console.log('❌ INNER CATCH - Other error, re-throwing to outer catch');
              // Re-throw other errors to be caught by outer catch
              throw checkoutError;
            }
          } else if (plan.price === 0) {
            // Free plan - just navigate to dashboard
            console.log('🆓 Free plan detected, activating...');
            toast({
              title: `✅ ${t('common.success')}`,
              description: 'Free plan activated successfully!',
            });
            // Navigate to dashboard for free plan
            setLoading(false);
            navigate('/dashboard');
            return;
          } else {
            throw new Error('Invalid plan data: price is undefined');
          }
        } catch (error) {
          console.error('❌ OUTER CATCH - Error creating subscription checkout:', error);
          console.error('❌ OUTER CATCH - Error response:', error.response?.data);
          console.error('❌ OUTER CATCH - Error message:', error.message);
          
          // Check if this is a Stripe configuration error (fallback check)
          const errorDetail = error.response?.data?.detail || '';
          const errorMessage = (errorDetail || error.message || '').toLowerCase();
          const statusCode = error.response?.status;
          
          console.log('❌ OUTER CATCH - errorDetail:', errorDetail);
          console.log('❌ OUTER CATCH - errorMessage (lowercase):', errorMessage);
          console.log('❌ OUTER CATCH - statusCode:', statusCode);
          console.log('❌ OUTER CATCH - planId:', planId);
          
          // More lenient checks for Stripe errors
          const hasStripeNotConfigured = errorMessage.includes('stripe not configure'); // with or without 'd'
          const hasConfigureStripeKeys = errorMessage.includes('configure stripe keys') || errorMessage.includes('configure stripe');
          const hasStripeAndPaymentSettings = errorMessage.includes('stripe') && errorMessage.includes('payment settings');
          const hasStripeWithErrorStatus = errorMessage.includes('stripe') && (statusCode === 400 || statusCode === 500);
          
          const isStripeConfigError = hasStripeNotConfigured || hasConfigureStripeKeys || hasStripeAndPaymentSettings || hasStripeWithErrorStatus;
          
          console.log('❌ OUTER CATCH - hasStripeNotConfigured:', hasStripeNotConfigured);
          console.log('❌ OUTER CATCH - hasConfigureStripeKeys:', hasConfigureStripeKeys);
          console.log('❌ OUTER CATCH - hasStripeAndPaymentSettings:', hasStripeAndPaymentSettings);
          console.log('❌ OUTER CATCH - hasStripeWithErrorStatus:', hasStripeWithErrorStatus);
          console.log('❌ OUTER CATCH - isStripeConfigError:', isStripeConfigError);
          
          if (isStripeConfigError && planId) {
            console.log('📝 OUTER CATCH - Stripe not configured (detected in outer catch), redirecting to payment settings...');
            toast({
              title: `💳 ${t('common.info') || 'Configuration requise'}`,
              description: 'Veuillez configurer vos clés Stripe pour compléter votre abonnement.',
              variant: "default"
            });
            setLoading(false);
            navigate(`/payment-settings?plan_id=${planId}`);
            return;
          }
          
          console.log('❌ OUTER CATCH - Not a Stripe config error, navigating to dashboard');
          toast({
            title: `⚠️ ${t('common.warning')}`,
            description: error.response?.data?.detail || error.message || 'Registration successful, but payment setup failed. You can complete payment later.',
            variant: "default"
          });
          // Still navigate to dashboard even if payment setup failed
          setLoading(false);
          navigate('/dashboard');
          return;
        }
      }
      
      // Only navigate to dashboard if no plan_id was provided (normal registration)
      console.log('📝 No plan_id provided, navigating to dashboard (normal registration)');
      setLoading(false);
      navigate('/dashboard');
    } else {
      toast({
        title: `❌ ${t('auth.register.error')}`,
        description: result.error || t('common.error'),
        variant: "destructive"
      });
    }

    setLoading(false);
  };

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
          <p className="text-gray-400 mt-2">{t('nav.dashboard')}</p>
        </div>

        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t('auth.register.title')}</CardTitle>
            <CardDescription className="text-center">
              {t('auth.register.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.register.name')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.register.email')}</Label>
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
                <Label htmlFor="password">{t('auth.register.password')}</Label>
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
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.register.confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
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
                    {t('auth.register.loading')}
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('auth.register.submit')}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-400">
                {t('auth.register.hasAccount')}{' '}
                <Link to="/login" className="text-primary hover:underline">
                  {t('auth.register.login')}
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link to="/" className="text-sm text-gray-400 hover:text-primary">
                {t('auth.register.backHome')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
