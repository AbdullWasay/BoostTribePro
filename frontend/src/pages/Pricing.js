import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const Pricing = () => {
  const { t, i18n } = useTranslation();

  const handleSubscribe = (planName) => {
    toast.success(`Intérêt pour ${planName} enregistré ! Contactez-nous pour finaliser.`);
  };

  const descriptions = {
    fr: ['Pour découvrir la plateforme', 'Pour les coachs et formateurs', 'Pour les entreprises'],
    en: ['To discover the platform', 'For coaches and trainers', 'For businesses'],
    de: ['Um die Plattform zu entdecken', 'Für Trainer und Coaches', 'Für Unternehmen']
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
        a: 'Oui, vous pouvez importer vos contacts via fichiers CSV ou Excel. Le système détecte automatiquement les doublons.'
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

  const plans = [
    {
      name: t('pricing.starter.name'),
      price: t('pricing.starter.price'),
      description: descriptions[i18n.language]?.[0] || descriptions.fr[0],
      features: t('pricing.starter.features', { returnObjects: true }),
      cta: t('pricing.tryNow'),
      highlighted: false,
      testid: 'plan-starter'
    },
    {
      name: t('pricing.pro.name'),
      price: t('pricing.pro.price'),
      description: descriptions[i18n.language]?.[1] || descriptions.fr[1],
      features: t('pricing.pro.features', { returnObjects: true }),
      cta: t('pricing.subscribe'),
      highlighted: true,
      testid: 'plan-pro'
    },
    {
      name: t('pricing.business.name'),
      price: t('pricing.business.price'),
      description: descriptions[i18n.language]?.[2] || descriptions.fr[2],
      features: t('pricing.business.features', { returnObjects: true }),
      cta: t('pricing.subscribe'),
      highlighted: false,
      testid: 'plan-business'
    },
  ];

  const currentFaqs = faqs[i18n.language] || faqs.fr;
  const currentCta = ctaSection[i18n.language] || ctaSection.fr;

  return (
    <div className="space-y-12 pb-12" data-testid="pricing-page">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">
          <Sparkles className="mr-1 h-3 w-3" />
          Tarifs BoostTribe
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
        {plans.map((plan, index) => (
          <Card
            key={index}
            className={
              `glass relative transition-all duration-300 ${
                plan.highlighted
                  ? 'border-primary glow scale-105 lg:scale-110'
                  : 'border-primary/20 hover:border-primary/40'
              }`
            }
            data-testid={plan.testid}
          >
            {plan.highlighted && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-white px-4 py-1">
                  {recommendedText[i18n.language] || recommendedText.fr}
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-8 pt-8">
              <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
              <CardDescription className="text-gray-400 mb-4">
                {plan.description}
              </CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gradient">
                  {plan.price.split('/')[0]}
                </span>
                {plan.price.includes('/') && (
                  <span className="text-gray-400 text-lg">/{plan.price.split('/')[1]}</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-8">
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-start gap-3"
                    data-testid={`${plan.testid}-feature-${featureIndex}`}
                  >
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => handleSubscribe(plan.name)}
                className={
                  `w-full ${
                    plan.highlighted
                      ? 'bg-primary hover:bg-primary/90 glow'
                      : 'bg-muted hover:bg-muted/80'
                  }`
                }
                size="lg"
                data-testid={`${plan.testid}-cta`}
              >
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
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
                onClick={() => toast.success('Inscription en cours de développement !')}
                data-testid="cta-start-now"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {currentCta.startNow}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => toast.info('Email: contact@boosttribe.com')}
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
