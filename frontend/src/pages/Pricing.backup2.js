import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Pricing = () => {
  const { t, i18n } = useTranslation();

  const descriptions = {
    fr: ['Pour découvrir la plateforme', 'Pour les coachs et formateurs', 'Pour les entreprises'],
    en: ['To discover the platform', 'For coaches and trainers', 'For businesses'],
    de: ['Um die Plattform zu entdecken', 'Für Trainer und Coaches', 'Für Unternehmen']
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

  return (
    <div className="space-y-12 pb-12" data-testid="pricing-page">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">
          <Sparkles className="mr-1 h-3 w-3" />
          Tarifs Afroboost Mailer
        </Badge>
        <h1 className="text-5xl font-bold mb-4" data-testid="pricing-title">
          {t('pricing.title')}
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          {i18n.language === 'fr' && 'Des plans adaptés à tous vos besoins d\'email marketing, avec IA intégrée'}
          {i18n.language === 'en' && 'Plans adapted to all your email marketing needs, with integrated AI'}
          {i18n.language === 'de' && 'Pläne für alle Ihre E-Mail-Marketing-Bedürfnisse, mit integrierter KI'}
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
                  Recommandé
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
        <h2 className="text-3xl font-bold text-center mb-8">Questions fréquentes</h2>
        <div className="space-y-4">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Puis-je changer de plan à tout moment ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements prennent effet immédiatement.
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Comment fonctionne l'IA Afroboost ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Notre IA utilise GPT-4-turbo pour générer du contenu email sur mesure en français, anglais et allemand. Elle comprend le contexte de vos campagnes et s'adapte au ton de votre marque.
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Les clés API sont-elles incluses ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Vous devez fournir vos propres clés API OpenAI et Resend dans les paramètres d'administration. Des clés de test peuvent être utilisées pour démarrer.
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Puis-je importer mes contacts existants ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Oui, vous pouvez importer vos contacts via fichiers CSV ou Excel. Le système détecte automatiquement les doublons.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto mt-16">
        <Card className="glass border-primary glow text-center">
          <CardContent className="py-12">
            <h2 className="text-3xl font-bold mb-4">Prêt à transformer vos campagnes email ?</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Rejoignez les coachs et entreprises qui utilisent Afroboost Mailer pour automatiser et optimiser leur email marketing.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-primary hover:bg-primary/90 glow" data-testid="cta-start-now">
                <Sparkles className="mr-2 h-5 w-5" />
                Commencer maintenant
              </Button>
              <Button size="lg" variant="outline" data-testid="cta-contact">
                Nous contacter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pricing;
