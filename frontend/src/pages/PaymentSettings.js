import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Key, Save, Eye, EyeOff, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${API_URL}/api`;

const PaymentSettings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const planId = searchParams.get('plan_id');
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState({
    stripe_secret: false,
    stripe_public: false,
    paypal: false
  });
  
  const [paymentConfig, setPaymentConfig] = useState({
    stripe_secret_key: '',
    stripe_publishable_key: '',
    paypal_client_id: '',
    paypal_secret: ''
  });

  useEffect(() => {
    fetchPaymentConfig();
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      const response = await axios.get(`${API}/user/payment-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setPaymentConfig(response.data);
      }
    } catch (error) {
      console.error('Error fetching payment config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate that Stripe keys are provided if plan_id exists
      if (planId && (!paymentConfig.stripe_secret_key || !paymentConfig.stripe_publishable_key)) {
        toast({
          title: t('payments.error') || 'Erreur',
          description: 'Veuillez configurer vos clés Stripe (clé secrète et clé publique) pour continuer.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      
      await axios.post(
        `${API}/user/payment-config`,
        paymentConfig,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: t('payments.configSaved') || 'Configuration enregistrée',
        description: t('payments.configSavedDesc') || 'Vos paramètres de paiement ont été enregistrés avec succès.'
      });
      
      // If plan_id is provided, automatically trigger payment flow after saving
      if (planId && paymentConfig.stripe_secret_key && paymentConfig.stripe_publishable_key) {
        console.log('✅ Stripe configured, triggering payment flow for plan_id:', planId);
        
        // Wait a moment for the config to be saved
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          // Fetch plan details
          const planResponse = await axios.get(`${API}/pricing-plans/${planId}`);
          const plan = planResponse.data;
          
          if (plan && plan.price > 0) {
            console.log('💳 Creating Stripe checkout for plan:', plan.name);
            
            // Create Stripe checkout session
            const checkoutResponse = await axios.post(
              `${API}/stripe/create-subscription-checkout`,
              {
                plan_id: planId,
                customer_email: user?.email || '',
                customer_name: user?.name || '',
                origin_url: window.location.origin
              },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            
            if (checkoutResponse.data?.url) {
              console.log('🚀 Redirecting to Stripe checkout');
              toast({
                title: '✅ Configuration réussie',
                description: 'Redirection vers le paiement...',
              });
              // Redirect to Stripe checkout
              window.location.href = checkoutResponse.data.url;
              return;
            }
          }
        } catch (paymentError) {
          console.error('Error creating checkout:', paymentError);
          toast({
            title: '⚠️ Erreur',
            description: paymentError.response?.data?.detail || 'Erreur lors de la création de la session de paiement. Veuillez réessayer.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error saving payment config:', error);
      toast({
        title: t('payments.error') || 'Erreur',
        description: t('payments.errorSaving') || error.response?.data?.detail || 'Erreur lors de l\'enregistrement',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 7) + '•••••••' + key.substring(key.length - 4);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <CreditCard className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('payments.paymentSettingsTitle')}</h1>
          <p className="text-gray-400">{t('payments.paymentSettingsSubtitle')}</p>
        </div>
      </div>

      {/* Show alert if plan_id is provided */}
      {planId && (
        <Card className="glass border-yellow-500/30 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-400 mb-1">
                  Configuration requise pour votre abonnement
                </h3>
                <p className="text-sm text-yellow-300/80">
                  Pour compléter votre abonnement, veuillez configurer vos clés Stripe ci-dessous. 
                  Une fois configurées, vous serez automatiquement redirigé vers le paiement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stripe Configuration */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t('payments.stripe')}
          </CardTitle>
          <CardDescription>
            {t('payments.stripeDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="stripe_secret">{t('payments.stripeSecretKey')}</Label>
            <div className="flex gap-2">
              <Input
                id="stripe_secret"
                type={showKeys.stripe_secret ? 'text' : 'password'}
                value={paymentConfig.stripe_secret_key}
                onChange={(e) => setPaymentConfig({...paymentConfig, stripe_secret_key: e.target.value})}
                placeholder="sk_live_..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys({...showKeys, stripe_secret: !showKeys.stripe_secret})}
              >
                {showKeys.stripe_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('payments.stripeSecretHint')}
            </p>
          </div>

          <div>
            <Label htmlFor="stripe_public">{t('payments.stripePublicKey')}</Label>
            <div className="flex gap-2">
              <Input
                id="stripe_public"
                type={showKeys.stripe_public ? 'text' : 'password'}
                value={paymentConfig.stripe_publishable_key}
                onChange={(e) => setPaymentConfig({...paymentConfig, stripe_publishable_key: e.target.value})}
                placeholder="pk_live_..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys({...showKeys, stripe_public: !showKeys.stripe_public})}
              >
                {showKeys.stripe_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              💡 <strong>{t('payments.stripeKeysGuide')}</strong>
              <br />1. {t('payments.stripeKeysGuide1')} - <a href="https://dashboard.stripe.com" target="_blank" rel="noopener" className="underline">dashboard.stripe.com</a>
              <br />2. {t('payments.stripeKeysGuide2')}
              <br />3. {t('payments.stripeKeysGuide3')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PayPal Configuration */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {t('payments.paypal')}
          </CardTitle>
          <CardDescription>
            {t('payments.paypalDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="paypal_client">{t('payments.paypalClientId')}</Label>
            <Input
              id="paypal_client"
              type="text"
              value={paymentConfig.paypal_client_id}
              onChange={(e) => setPaymentConfig({...paymentConfig, paypal_client_id: e.target.value})}
              placeholder="AXXXxxxx..."
            />
          </div>

          <div>
            <Label htmlFor="paypal_secret">{t('payments.paypalSecret')}</Label>
            <div className="flex gap-2">
              <Input
                id="paypal_secret"
                type={showKeys.paypal ? 'text' : 'password'}
                value={paymentConfig.paypal_secret}
                onChange={(e) => setPaymentConfig({...paymentConfig, paypal_secret: e.target.value})}
                placeholder="EXXXxxxx..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys({...showKeys, paypal: !showKeys.paypal})}
              >
                {showKeys.paypal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              ⚠️ <strong>{t('payments.paypalOptional')}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          size="lg"
        >
          {loading ? (planId ? 'Configuration en cours...' : t('payments.saving')) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              {planId ? 'Configurer et continuer vers le paiement' : t('payments.save')}
            </>
          )}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-2">{t('payments.security')}</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>✓ {t('payments.security1')}</li>
          <li>✓ {t('payments.security2')}</li>
          <li>✓ {t('payments.security3')}</li>
          <li>✓ {t('payments.security4')}</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentSettings;
