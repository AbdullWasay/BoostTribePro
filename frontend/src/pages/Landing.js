import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mail, MessageCircle, Sparkles, BarChart3, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

const Landing = () => {
  const { i18n } = useTranslation();

  const content = {
    fr: {
      hero: {
        badge: 'Plateforme Email & WhatsApp Marketing',
        title: 'Transformez votre marketing avec l\'IA',
        subtitle: 'Automatisez vos campagnes email et WhatsApp avec l\'intelligence artificielle. Générez du contenu personnalisé en quelques secondes.',
        cta: 'Commencer gratuitement',
        pricing: 'Tarifs',
        demo: 'Voir la démo'
      },
      features: {
        title: 'Tout ce dont vous avez besoin',
        subtitle: 'Une plateforme complète pour vos campagnes marketing multicanal',
        items: [
          {
            icon: Mail,
            title: 'Campagnes Email',
            desc: 'Créez et envoyez des emails HTML professionnels avec tracking complet'
          },
          {
            icon: MessageCircle,
            title: 'WhatsApp Business',
            desc: 'Envoyez des messages WhatsApp en masse avec réponses IA automatiques'
          },
          {
            icon: Sparkles,
            title: 'IA GPT-4 Turbo',
            desc: 'Générez du contenu personnalisé en français, anglais et allemand'
          },
          {
            icon: BarChart3,
            title: 'Analytics Avancées',
            desc: 'Suivez les performances avec taux d\'ouverture et clics en temps réel'
          },
          {
            icon: Users,
            title: 'Gestion Contacts',
            desc: 'Importez, segmentez et gérez vos contacts facilement'
          },
          {
            icon: Zap,
            title: 'Automatisation',
            desc: 'Planifiez vos campagnes et activez les relances automatiques'
          }
        ]
      },
      stats: {
        title: 'Des résultats qui parlent',
        items: [
          { value: '5000+', label: 'Emails envoyés' },
          { value: '95%', label: 'Taux de livraison' },
          { value: '3 langues', label: 'Supportées' },
          { value: '24/7', label: 'Support disponible' }
        ]
      },
      cta: {
        title: 'Prêt à booster vos campagnes ?',
        subtitle: 'Rejoignez BoostTribe aujourd\'hui',
        button: 'Démarrer maintenant'
      }
    },
    en: {
      hero: {
        badge: 'Email & WhatsApp Marketing Platform',
        title: 'Transform your marketing with AI',
        subtitle: 'Automate your email and WhatsApp campaigns with artificial intelligence. Generate personalized content in seconds.',
        cta: 'Start for free',
        pricing: 'Pricing',
        demo: 'See demo'
      },
      features: {
        title: 'Everything you need',
        subtitle: 'A complete platform for your multichannel marketing campaigns',
        items: [
          {
            icon: Mail,
            title: 'Email Campaigns',
            desc: 'Create and send professional HTML emails with full tracking'
          },
          {
            icon: MessageCircle,
            title: 'WhatsApp Business',
            desc: 'Send bulk WhatsApp messages with automatic AI responses'
          },
          {
            icon: Sparkles,
            title: 'GPT-4 Turbo AI',
            desc: 'Generate personalized content in French, English and German'
          },
          {
            icon: BarChart3,
            title: 'Advanced Analytics',
            desc: 'Track performance with real-time open and click rates'
          },
          {
            icon: Users,
            title: 'Contact Management',
            desc: 'Import, segment and manage your contacts easily'
          },
          {
            icon: Zap,
            title: 'Automation',
            desc: 'Schedule your campaigns and activate automatic follow-ups'
          }
        ]
      },
      stats: {
        title: 'Results that speak',
        items: [
          { value: '5000+', label: 'Emails sent' },
          { value: '95%', label: 'Delivery rate' },
          { value: '3 languages', label: 'Supported' },
          { value: '24/7', label: 'Support available' }
        ]
      },
      cta: {
        title: 'Ready to boost your campaigns?',
        subtitle: 'Join BoostTribe today',
        button: 'Get started now'
      }
    },
    de: {
      hero: {
        badge: 'Email & WhatsApp Marketing Plattform',
        title: 'Transformieren Sie Ihr Marketing mit KI',
        subtitle: 'Automatisieren Sie Ihre E-Mail- und WhatsApp-Kampagnen mit künstlicher Intelligenz. Erstellen Sie personalisierte Inhalte in Sekunden.',
        cta: 'Kostenlos starten',
        pricing: 'Preise',
        demo: 'Demo ansehen'
      },
      features: {
        title: 'Alles was Sie brauchen',
        subtitle: 'Eine komplette Plattform für Ihre Multichannel-Marketing-Kampagnen',
        items: [
          {
            icon: Mail,
            title: 'E-Mail-Kampagnen',
            desc: 'Erstellen und versenden Sie professionelle HTML-E-Mails mit vollständigem Tracking'
          },
          {
            icon: MessageCircle,
            title: 'WhatsApp Business',
            desc: 'Senden Sie Massen-WhatsApp-Nachrichten mit automatischen KI-Antworten'
          },
          {
            icon: Sparkles,
            title: 'GPT-4 Turbo KI',
            desc: 'Generieren Sie personalisierte Inhalte auf Französisch, Englisch und Deutsch'
          },
          {
            icon: BarChart3,
            title: 'Erweiterte Analytics',
            desc: 'Verfolgen Sie die Leistung mit Echtzeit-Öffnungs- und Klickraten'
          },
          {
            icon: Users,
            title: 'Kontaktverwaltung',
            desc: 'Importieren, segmentieren und verwalten Sie Ihre Kontakte einfach'
          },
          {
            icon: Zap,
            title: 'Automatisierung',
            desc: 'Planen Sie Ihre Kampagnen und aktivieren Sie automatische Follow-ups'
          }
        ]
      },
      stats: {
        title: 'Ergebnisse, die sprechen',
        items: [
          { value: '5000+', label: 'Gesendete E-Mails' },
          { value: '95%', label: 'Zustellrate' },
          { value: '3 Sprachen', label: 'Unterstützt' },
          { value: '24/7', label: 'Support verfügbar' }
        ]
      },
      cta: {
        title: 'Bereit, Ihre Kampagnen zu boosten?',
        subtitle: 'Treten Sie BoostTribe heute bei',
        button: 'Jetzt starten'
      }
    }
  };

  const t = content[i18n.language] || content.fr;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-lg px-6 py-2">
            {t.hero.badge}
          </Badge>

          <h1 className="text-6xl md:text-7xl font-bold leading-tight">
            <span className="text-gradient">{t.hero.title}</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
            {t.hero.subtitle}
          </p>

          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 glow text-lg px-8 py-6"
              onClick={() => window.location.href = '/register'}
            >
              {t.hero.cta}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => window.location.href = '/pricing'}
            >
              {t.hero.pricing}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  {t.hero.demo}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
                <video
                  controls
                  autoPlay
                  className="w-full h-full aspect-video"
                >
                  <source src="/demo.mov" type="video/quicktime" />
                  <source src="/demo.mov" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t.features.title}</h2>
            <p className="text-xl text-gray-400">{t.features.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.items.map((feature, index) => (
              <Card key={index} className="glass border-primary/20 hover:glow transition-all duration-300">
                <CardContent className="pt-6">
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                  <p className="text-gray-400">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">{t.stats.title}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {t.stats.items.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-5xl font-bold text-gradient mb-2">{stat.value}</p>
                <p className="text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="glass border-primary glow text-center">
            <CardContent className="py-16">
              <h2 className="text-4xl font-bold mb-4">{t.cta.title}</h2>
              <p className="text-xl text-gray-400 mb-8">{t.cta.subtitle}</p>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 glow text-lg px-8 py-6"
                onClick={() => window.location.href = '/dashboard'}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {t.cta.button}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Landing;
