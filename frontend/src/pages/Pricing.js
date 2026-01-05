import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Pricing = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/pricing-plans`);
        setPlans(response.data.filter(p => p.active));
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (plan) => {
    console.log('handleSubscribe called with plan:', plan);
    console.log('Plan ID:', plan.id);
    console.log('User logged in:', !!user);
    
    if (!plan.id) {
      console.error('Plan ID is missing!', plan);
      return;
    }
    
    // If user is not logged in, redirect to registration
    if (!user || !token) {
      console.log('User not logged in, redirecting to registration...');
      navigate(`/register?plan_id=${plan.id}`);
      return;
    }
    
    // User is logged in - proceed directly to payment
    console.log('User is logged in, proceeding to payment...');
    setProcessingPlan(plan.id);
    
    try {
      // Check if it's a free plan
      if (plan.price === 0) {
        toast({
          title: 'Plan gratuit',
          description: 'Ce plan est gratuit. Vous pouvez l\'activer depuis votre profil.',
        });
        setProcessingPlan(null);
        navigate('/profile');
        return;
      }
      
      // Create Stripe checkout session for logged-in user
      const checkoutResponse = await axios.post(
        `${API}/stripe/create-subscription-checkout`,
        {
          plan_id: plan.id,
          customer_email: user.email,
          customer_name: user.name,
          origin_url: window.location.origin
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Checkout response:', checkoutResponse.data);
      
      if (checkoutResponse.data?.url) {
        console.log('Redirecting to Stripe checkout:', checkoutResponse.data.url);
        // Redirect to Stripe checkout
        window.location.href = checkoutResponse.data.url;
        return;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      const errorMessage = error.response?.data?.detail || error.message || '';
      const errorMessageLower = errorMessage.toLowerCase();
      
      // Check if Stripe is not configured
      if (
        errorMessageLower.includes('stripe not configured') ||
        errorMessageLower.includes('configure stripe keys') ||
        errorMessageLower.includes('stripe') && errorMessageLower.includes('payment settings')
      ) {
        console.log('Stripe not configured, redirecting to payment settings...');
        toast({
          title: 'Configuration requise',
          description: 'Veuillez configurer vos clés Stripe pour compléter votre abonnement.',
          variant: "default"
        });
        navigate(`/payment-settings?plan_id=${plan.id}`);
      } else {
        toast({
          title: 'Erreur',
          description: errorMessage || 'Erreur lors de la création de la session de paiement. Veuillez réessayer.',
          variant: "destructive"
        });
      }
    } finally {
      setProcessingPlan(null);
    }
  };

  const getLocalizedPlan = (plan) => {
    const lang = i18n.language || 'fr';
    return {
      ...plan,
      name: (lang === 'en' ? plan.name_en : lang === 'de' ? plan.name_de : plan.name) || plan.name || '',
      description: (lang === 'en' ? plan.description_en : lang === 'de' ? plan.description_de : plan.description_fr) || plan.description_fr || '',
      features: (lang === 'en' ? plan.features_en : lang === 'de' ? plan.features_de : plan.features_fr) || plan.features_fr || [],
      priceDisplay: plan.price === 0 ? t('catalog.free') : `${plan.price} ${plan.currency || 'CHF'}`,
      cta: (lang === 'en' ? plan.cta_en : lang === 'de' ? plan.cta_de : plan.cta_fr) || (plan.price === 0 ? t('pricing.tryNow') : t('pricing.subscribe'))
    };
  };

  const subtitle = {
    fr: 'Des plans adaptés à tous vos besoins d\'email et WhatsApp marketing, avec IA intégrée',
    en: 'Plans adapted to all your email and WhatsApp marketing needs, with integrated AI',
    de: 'Pläne für alle Ihre E-Mail- und WhatsApp-Marketing-Bedürfnisse, mit integrierter KI'
  };

  const recommendedText = {
    fr: 'Recommandé',
    en: 'Recommended',
    de: 'Empfohlen'
  };

  const faqTitle = {
    fr: 'Questions fréquentes',
    en: 'Frequently asked questions',
    de: 'Häufig gestellte Fragen'
  };

  const faqs = {
    fr: [
      {
        q: 'Puis-je changer de plan à tout moment ?',
        a: 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements prennent effet immédiatement.'
      },
      {
        q: 'Comment fonctionne l\'IA BoostTribe ?',
        a: 'Notre IA utilise GPT-4-turbo pour générer du contenu email et WhatsApp sur mesure en français, anglais et allemand. Elle comprend le contexte de vos campagnes et s\'adapte au ton de votre marque.'
      },
      {
        q: 'Les clés API sont-elles incluses ?',
        a: 'Vous devez fournir vos propres clés API OpenAI, Resend, WhatsApp et Stripe dans les paramètres d\'administration. Des clés de test peuvent être utilisées pour démarrer.'
      },
      {
        q: 'Puis-je importer mes contacts existants ?',
        a: 'Oui, vous pouvez imposer vos contacts via fichiers CSV ou Excel. Le système détecte automatiquement les doublons.'
      }
    ],
    en: [
      {
        q: 'Can I change plans at any time?',
        a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.'
      },
      {
        q: 'How does BoostTribe AI work?',
        a: 'Our AI uses GPT-4-turbo to generate custom email and WhatsApp content in French, English and German. It understands your campaign context and adapts to your brand tone.'
      },
      {
        q: 'Are API keys included?',
        a: 'You must provide your own API keys for OpenAI, Resend, WhatsApp and Stripe in the admin settings. Test keys can be used to get started.'
      },
      {
        q: 'Can I import my existing contacts?',
        a: 'Yes, you can import your contacts via CSV or Excel files. The system automatically detects duplicates.'
      }
    ],
    de: [
      {
        q: 'Kann ich jederzeit den Plan wechseln?',
        a: 'Ja, Sie können Ihren Plan jederzeit upgraden oder downgraden. Änderungen werden sofort wirksam.'
      },
      {
        q: 'Wie funktioniert BoostTribe KI?',
        a: 'Unsere KI verwendet GPT-4-turbo, um maßgeschneiderte E-Mail- und WhatsApp-Inhalte auf Französisch, Englisch und Deutsch zu generieren. Sie versteht den Kontext Ihrer Kampagnen und passt sich Ihrem Markenton an.'
      },
      {
        q: 'Sind API-Schlüssel enthalten?',
        a: 'Sie müssen Ihre eigenen API-Schlüssel für OpenAI, Resend, WhatsApp und Stripe in den Admin-Einstellungen bereitstellen. Testschlüssel können zum Einstieg verwendet werden.'
      },
      {
        q: 'Kann ich meine bestehenden Kontakte importieren?',
        a: 'Ja, Sie können Ihre Kontakte über CSV- oder Excel-Dateien importieren. Das System erkennt automatisch Duplikate.'
      }
    ]
  };

  const ctaSection = {
    fr: {
      title: 'Prêt à transformer vos campagnes marketing ?',
      subtitle: 'Rejoignez les coachs et entreprises qui utilisent BoostTribe pour automatiser et optimiser leur email et WhatsApp marketing.',
      startNow: 'Commencer maintenant',
      contact: 'Nous contacter'
    },
    en: {
      title: 'Ready to transform your marketing campaigns?',
      subtitle: 'Join the coaches and businesses using BoostTribe to automate and optimize their email and WhatsApp marketing.',
      startNow: 'Start now',
      contact: 'Contact us'
    },
    de: {
      title: 'Bereit, Ihre Marketing-Kampagnen zu transformieren?',
      subtitle: 'Schließen Sie sich den Trainern und Unternehmen an, die BoostTribe verwenden, um ihr E-Mail- und WhatsApp-Marketing zu automatisieren und zu optimieren.',
      startNow: 'Jetzt starten',
      contact: 'Kontaktieren Sie uns'
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-xl text-gray-400 animate-pulse">{t('superadmin.plans.loading')}</p>
      </div>
    );
  }

  const currentFaqs = faqs[i18n.language] || faqs.fr;
  const currentCta = ctaSection[i18n.language] || ctaSection.fr;

  return (
    <div className="space-y-12 pb-12" data-testid="pricing-page">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-primary hover:bg-primary/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.backToHome', { defaultValue: 'Retour à l\'accueil' })}
        </Button>
      </div>

      {/* Header */}
      <div className="text-center space-y-4">
        <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">
          <Sparkles className="mr-1 h-3 w-3" />
          <span>Tarifs BoostTribe</span>
        </Badge>
        <h1 className="text-5xl font-bold mb-4" data-testid="pricing-title">
          {t('pricing.title')}
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          {subtitle[i18n.language] || subtitle.fr}
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 lg:grid-cols-3 max-w-7xl mx-auto">
        {plans.map((plan, index) => {
          const lp = getLocalizedPlan(plan);
          return (
            <Card
              key={plan.id || index}
              className={
                `glass relative transition-all duration-300 ${lp.highlighted
                  ? 'border-primary glow scale-105 lg:scale-110'
                  : 'border-primary/20 hover:border-primary/40'
                }`
              }
              data-testid={`plan-${index}`}
            >
              {lp.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4 py-1">
                    {recommendedText[i18n.language] || recommendedText.fr}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{lp.name}</CardTitle>
                <CardDescription className="text-gray-400 mb-4">
                  {lp.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-gradient">
                    {lp.priceDisplay}
                  </span>
                  {lp.price > 0 && (
                    <span className="text-gray-400 text-lg"><span>/</span>{t('pricing.month')}</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pb-8">
                <ul className="space-y-3">
                  {(lp.features || []).map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-start gap-3"
                      data-testid={`plan-${index}-feature-${featureIndex}`}
                    >
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={processingPlan === plan.id}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 glow border-primary text-white"
                  size="lg"
                  data-testid={`plan-${index}-cta`}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading') || 'Chargement...'}
                    </>
                  ) : (
                    lp.cta
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mt-20">
        <h2 className="text-3xl font-bold text-center mb-8">
          {faqTitle[i18n.language] || faqTitle.fr}
        </h2>
        <div className="space-y-4">
          {currentFaqs.map((faq, index) => (
            <Card key={index} className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto mt-16">
        <Card className="glass border-primary glow text-center">
          <CardContent className="py-12">
            <h2 className="text-3xl font-bold mb-4">{currentCta.title}</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              {currentCta.subtitle}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 glow"
                onClick={() => navigate('/register')}
                data-testid="cta-start-now"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                <span>{currentCta.startNow}</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.href = 'mailto:contact@boosttribe.com'}
                data-testid="cta-contact"
              >
                {currentCta.contact}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pricing;
