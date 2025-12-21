import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Settings, Key, Save, MessageCircle, CreditCard, Building2 } from 'lucide-react';
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
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_verify_token: '',
    stripe_publishable_key: '',
    stripe_secret_key: '',
    bank_iban: '',
    bank_name: '',
    bank_currency: 'CHF',
    company_name: 'BoostTribe',
    sender_email: 'contact@boosttribe.com',
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
        whatsapp_access_token: response.data.whatsapp_access_token || '',
        whatsapp_phone_number_id: response.data.whatsapp_phone_number_id || '',
        whatsapp_verify_token: response.data.whatsapp_verify_token || '',
        stripe_publishable_key: response.data.stripe_publishable_key || '',
        stripe_secret_key: response.data.stripe_secret_key || '',
        bank_iban: response.data.bank_iban || '',
        bank_name: response.data.bank_name || '',
        bank_currency: response.data.bank_currency || 'CHF',
        company_name: response.data.company_name || 'BoostTribe',
        sender_email: response.data.sender_email || 'contact@boosttribe.com',
        sender_name: response.data.sender_name || 'Coach Bassi'
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error(t('admin.errorLoading'));
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
      toast.error(t('admin.errorSaving'));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="admin-title">{t('admin.title')}</h1>
          <p className="text-gray-400">{t('admin.subtitle')}</p>
        </div>
        <Button
          onClick={() => window.location.href = '/admin/pricing-plans'}
          className="bg-primary hover:bg-primary/90"
          data-testid="manage-pricing-button"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {t('admin.managePricing')}
        </Button>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="glass border border-primary/20" data-testid="admin-tabs">
          <TabsTrigger value="api" className="data-[state=active]:bg-primary" data-testid="tab-api">
            <Key className="mr-2 h-4 w-4" />
            {t('admin.tabs.api')}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-primary" data-testid="tab-whatsapp">
            <MessageCircle className="mr-2 h-4 w-4" />
            {t('admin.tabs.whatsapp')}
          </TabsTrigger>
          <TabsTrigger value="stripe" className="data-[state=active]:bg-primary" data-testid="tab-stripe">
            <CreditCard className="mr-2 h-4 w-4" />
            {t('admin.tabs.stripe')}
          </TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-primary" data-testid="tab-company">
            <Building2 className="mr-2 h-4 w-4" />
            {t('admin.tabs.company')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary" data-testid="tab-settings">
            <Settings className="mr-2 h-4 w-4" />
            {t('admin.tabs.settings')}
          </TabsTrigger>
        </TabsList>

        {/* AI Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>{t('admin.apiKeys.title')}</CardTitle>
              <CardDescription>
                {t('admin.apiKeys.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="openai-key">{t('admin.apiKeys.openaiKey')}</Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={formData.openai_api_key}
                  onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                  placeholder="sk-proj-..."
                  className="font-mono"
                  data-testid="openai-key-input"
                />
                <p className="text-sm text-gray-400">
                  {t('admin.apiKeys.openaiDesc')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resend-key">{t('admin.apiKeys.resendKey')}</Label>
                <Input
                  id="resend-key"
                  type="password"
                  value={formData.resend_api_key}
                  onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                  placeholder="re_..."
                  className="font-mono"
                  data-testid="resend-key-input"
                />
                <p className="text-sm text-gray-400">
                  {t('admin.apiKeys.resendDesc')}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <Card className="bg-muted/30 border-primary/10">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2 text-white">OpenAI</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      {t('admin.apiKeys.openaiInfo')}
                    </p>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {t('admin.apiKeys.getKey')}
                    </a>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30 border-primary/10">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2 text-white">Resend</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      {t('admin.apiKeys.resendInfo')}
                    </p>
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {t('admin.apiKeys.getKey')}
                    </a>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                {t('admin.whatsapp.title')}
              </CardTitle>
              <CardDescription>
                {t('admin.whatsapp.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-token">{t('admin.whatsapp.accessToken')}</Label>
                <Input
                  id="whatsapp-token"
                  type="password"
                  value={formData.whatsapp_access_token}
                  onChange={(e) => setFormData({ ...formData, whatsapp_access_token: e.target.value })}
                  placeholder="EAAG..."
                  className="font-mono"
                  data-testid="whatsapp-token-input"
                />
                <p className="text-sm text-gray-400">
                  {t('admin.whatsapp.accessTokenDesc')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone">{t('admin.whatsapp.phoneId')}</Label>
                <Input
                  id="whatsapp-phone"
                  type="text"
                  value={formData.whatsapp_phone_number_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
                  placeholder="123456789012345"
                  className="font-mono"
                  data-testid="whatsapp-phone-input"
                />
                <p className="text-sm text-gray-400">
                  {t('admin.whatsapp.phoneIdDescAlt')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-verify">{t('admin.whatsapp.verifyToken')}</Label>
                <Input
                  id="whatsapp-verify"
                  type="text"
                  value={formData.whatsapp_verify_token}
                  onChange={(e) => setFormData({ ...formData, whatsapp_verify_token: e.target.value })}
                  placeholder="afroboost_verify_token"
                  className="font-mono"
                  data-testid="whatsapp-verify-input"
                />
                <p className="text-sm text-gray-400">
                  {t('admin.whatsapp.verifyTokenDesc')}
                </p>
              </div>

              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3 text-white">{t('admin.whatsapp.guideTitle')}</h3>
                  <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                    <li>{t('admin.whatsapp.step1')} - <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('admin.whatsapp.metaLink')}</a></li>
                    <li>{t('admin.whatsapp.step2')}</li>
                    <li>{t('admin.whatsapp.step3')}</li>
                    <li>{t('admin.whatsapp.step4')}</li>
                    <li>{t('admin.whatsapp.step5')}: <code className="text-xs bg-black/30 px-2 py-1 rounded">{BACKEND_URL}/api/whatsapp/webhook</code></li>
                    <li>{t('admin.whatsapp.step6')}</li>
                  </ol>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stripe Tab */}
        <TabsContent value="stripe" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {t('admin.stripe.stripePayments')}
              </CardTitle>
              <CardDescription>
                {t('admin.stripe.stripeSubtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="stripe-public">{t('admin.stripe.publishableKey')}</Label>
                <Input
                  id="stripe-public"
                  type="text"
                  value={formData.stripe_publishable_key}
                  onChange={(e) => setFormData({ ...formData, stripe_publishable_key: e.target.value })}
                  placeholder="pk_live_..."
                  className="font-mono"
                  data-testid="stripe-public-input"
                />
                <p className="text-sm text-gray-400">
                  {t('admin.stripe.publishableKeyDesc')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-secret">{t('admin.stripe.secretKey')}</Label>
                <Input
                  id="stripe-secret"
                  type="password"
                  value={formData.stripe_secret_key}
                  onChange={(e) => setFormData({ ...formData, stripe_secret_key: e.target.value })}
                  placeholder="sk_live_..."
                  className="font-mono"
                  data-testid="stripe-secret-input"
                />
                <p className="text-sm text-gray-400">
                  {t('admin.stripe.secretKeyDesc')}
                </p>
              </div>

              <Card className="bg-muted/30 border-primary/10">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 text-white">Stripe</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {t('admin.stripe.stripeInfo')}
                  </p>
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {t('admin.stripe.getKeys')}
                  </a>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company/Bank Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t('admin.bank.title')}
              </CardTitle>
              <CardDescription>
                {t('admin.bank.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bank-iban">{t('admin.bank.iban')}</Label>
                <Input
                  id="bank-iban"
                  type="text"
                  value={formData.bank_iban}
                  onChange={(e) => setFormData({ ...formData, bank_iban: e.target.value })}
                  placeholder="CH93 0076 2011 6238 5295 7"
                  className="font-mono"
                  data-testid="bank-iban-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">{t('admin.bank.bankName')}</Label>
                  <Input
                    id="bank-name"
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="UBS Switzerland AG"
                    data-testid="bank-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank-currency">{t('admin.bank.currency')}</Label>
                  <Input
                    id="bank-currency"
                    type="text"
                    value={formData.bank_currency}
                    onChange={(e) => setFormData({ ...formData, bank_currency: e.target.value })}
                    placeholder="CHF"
                    data-testid="bank-currency-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>{t('admin.general.title')}</CardTitle>
              <CardDescription>
                {t('admin.general.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">{t('admin.company.companyName')}</Label>
                <Input
                  id="company-name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  data-testid="company-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender-name">{t('admin.company.senderName')}</Label>
                <Input
                  id="sender-name"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="Coach Bassi"
                  data-testid="sender-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender-email">{t('admin.company.senderEmail')}</Label>
                <Input
                  id="sender-email"
                  type="email"
                  value={formData.sender_email}
                  onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  placeholder="contact@boosttribe.com"
                  data-testid="sender-email-input"
                />
                <p className="text-sm text-gray-400">
                  {t('admin.company.senderEmailDesc')}
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
            <span>{t('admin.saving')}</span>
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
