import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Settings, Key, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Admin = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    openai_api_key: '',
    resend_api_key: '',
    company_name: 'Afroboost',
    sender_email: 'contact@afroboost.com',
    sender_name: 'Coach Bassi'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
      setFormData({
        openai_api_key: response.data.openai_api_key || '',
        resend_api_key: response.data.resend_api_key || '',
        company_name: response.data.company_name || 'Afroboost',
        sender_email: response.data.sender_email || 'contact@afroboost.com',
        sender_name: response.data.sender_name || 'Coach Bassi'
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, formData);
      toast.success(t('admin.saved'));
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="admin-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="admin-title">{t('admin.title')}</h1>
        <p className="text-gray-400">Configurez vos clés API et paramètres de l'application</p>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="glass border border-primary/20" data-testid="admin-tabs">
          <TabsTrigger value="api" className="data-[state=active]:bg-primary" data-testid="tab-api">
            <Key className="mr-2 h-4 w-4" />
            {t('admin.apiKeys')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary" data-testid="tab-settings">
            <Settings className="mr-2 h-4 w-4" />
            {t('admin.settings')}
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Clés API
              </CardTitle>
              <CardDescription>
                Configurez vos clés API pour activer les fonctionnalités IA et email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenAI API Key */}
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="text-white">
                  {t('admin.openaiKey')}
                </Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={formData.openai_api_key}
                  onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                  placeholder="sk-..."
                  className="font-mono"
                  data-testid="openai-api-key-input"
                />
                <p className="text-sm text-gray-400">
                  Clé API OpenAI pour la génération de contenu IA (GPT-4-turbo)
                </p>
              </div>

              {/* Resend API Key */}
              <div className="space-y-2">
                <Label htmlFor="resend-key" className="text-white">
                  {t('admin.resendKey')}
                </Label>
                <Input
                  id="resend-key"
                  type="password"
                  value={formData.resend_api_key}
                  onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                  placeholder="re_..."
                  className="font-mono"
                  data-testid="resend-api-key-input"
                />
                <p className="text-sm text-gray-400">
                  Clé API Resend pour l'envoi d'emails HTML
                </p>
              </div>

              {/* Info Cards */}
              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <Card className="bg-muted/30 border-primary/10">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2 text-white">OpenAI</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Générez du contenu email intelligent en français, anglais et allemand
                    </p>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Obtenir une clé API →
                    </a>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30 border-primary/10">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2 text-white">Resend</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Envoyez des emails transactionnels et marketing professionnels
                    </p>
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Obtenir une clé API →
                    </a>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Paramètres de l'entreprise
              </CardTitle>
              <CardDescription>
                Informations affichées dans vos campagnes email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-white">
                  {t('admin.companyName')}
                </Label>
                <Input
                  id="company-name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  data-testid="company-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender-name" className="text-white">
                  {t('admin.senderName')}
                </Label>
                <Input
                  id="sender-name"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="Coach Bassi"
                  data-testid="sender-name-input"
                />
                <p className="text-sm text-gray-400">
                  Nom qui apparaîtra comme expéditeur des emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender-email" className="text-white">
                  {t('admin.senderEmail')}
                </Label>
                <Input
                  id="sender-email"
                  type="email"
                  value={formData.sender_email}
                  onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  placeholder="contact@afroboost.com"
                  data-testid="sender-email-input"
                />
                <p className="text-sm text-gray-400">
                  Adresse email d'envoi (doit être vérifiée dans Resend)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 glow"
          size="lg"
          data-testid="save-settings-button"
        >
          {saving ? (
            <span>Enregistrement...</span>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              {t('admin.save')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Admin;
