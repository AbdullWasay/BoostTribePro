import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Key, CreditCard, Calendar, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Profile = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth(); // Get logged-in user data
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [apiFormData, setApiFormData] = useState({
    openai_api_key: '',
    resend_api_key: '',
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    stripe_publishable_key: ''
  });

  useEffect(() => {
    if (user && token) {
      fetchStats();
      fetchSettings();
    }
  }, [user, token]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
      setApiFormData({
        openai_api_key: response.data.openai_api_key || '',
        resend_api_key: response.data.resend_api_key || '',
        whatsapp_access_token: response.data.whatsapp_access_token || '',
        whatsapp_phone_number_id: response.data.whatsapp_phone_number_id || '',
        stripe_publishable_key: response.data.stripe_publishable_key || ''
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveApiKeys = async () => {
    try {
      await axios.put(`${API}/settings`, apiFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('profile.apiKeysSaved'));
      setShowApiDialog(false);
      fetchSettings();
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast.error(t('profile.errorSaving'));
    }
  };

  // Format member since date
  const formatMemberSince = (createdAt) => {
    if (!createdAt) return 'N/A';
    const date = new Date(createdAt);
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="profile-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="profile-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" data-testid="profile-title">
          <User className="h-10 w-10 text-primary" />
          {t('profile.title')}
        </h1>
        <p className="text-gray-400">{t('profile.subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info */}
        <Card className="glass border-primary/20" data-testid="account-info-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('profile.account')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-400">{t('profile.name')}</Label>
              <p className="text-lg font-medium text-white">{user?.name || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-gray-400">{t('profile.email')}</Label>
              <p className="text-lg font-medium text-white">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-gray-400">{t('profile.currentPlan')}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-primary text-white">Pro Coach</Badge>
                <span className="text-sm text-gray-400">49 CHF/mois</span>
              </div>
            </div>
            <div>
              <Label className="text-gray-400">{t('profile.memberSince')}</Label>
              <p className="text-lg font-medium text-white">{formatMemberSince(user?.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card className="glass border-primary/20" data-testid="usage-stats-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t('profile.usage')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t('profile.emailsSent')}</span>
              <span className="text-2xl font-bold text-primary">{stats?.total_emails_sent || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t('profile.whatsappSent')}</span>
              <span className="text-2xl font-bold text-primary">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t('profile.contacts')}</span>
              <span className="text-2xl font-bold text-primary">{stats?.total_contacts || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t('profile.campaigns')}</span>
              <span className="text-2xl font-bold text-primary">{stats?.total_campaigns || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Management - COMMENTED OUT */}
      {/* <Card className="glass border-primary/20" data-testid="subscription-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t('profile.subscription')}
          </CardTitle>
          <CardDescription>
            {t('profile.subscriptionDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => toast.info(t('profile.redirectToPricing'))}
              data-testid="upgrade-plan-button"
            >
              {t('profile.upgrade')}
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.info(t('profile.manageSubscriptionInfo'))}
              data-testid="manage-subscription-button"
            >
              {t('profile.manage')}
            </Button>
          </div>
        </CardContent>
      </Card> */}

      {/* API Keys Status */}
      <Card className="glass border-primary/20" data-testid="api-keys-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {t('profile.apiKeys')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-white">OpenAI</span>
              <Badge variant="outline" className={settings?.openai_api_key ? "border-green-500 text-green-500" : "border-gray-500 text-gray-500"}>
                {settings?.openai_api_key ? t('profile.configured') : t('profile.notConfigured')}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-white">{t('profile.resendStatus')}</span>
              <Badge variant="outline" className={settings?.resend_api_key ? "border-green-500 text-green-500" : "border-gray-500 text-gray-500"}>
                {settings?.resend_api_key ? t('profile.configured') : t('profile.notConfigured')}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-white">{t('profile.whatsappStatus')}</span>
              <Badge variant="outline" className={settings?.whatsapp_access_token ? "border-green-500 text-green-500" : "border-gray-500 text-gray-500"}>
                {settings?.whatsapp_access_token ? t('profile.configured') : t('profile.notConfigured')}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-white">{t('profile.stripeStatus')}</span>
              <Badge variant="outline" className={settings?.stripe_publishable_key ? "border-green-500 text-green-500" : "border-gray-500 text-gray-500"}>
                {settings?.stripe_publishable_key ? t('profile.configured') : t('profile.notConfigured')}
              </Badge>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowApiDialog(true)}
              data-testid="configure-api-keys-button"
            >
              <Key className="mr-2 h-4 w-4" />
              {t('profile.configureApiKeysButton')}
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/admin'}
              data-testid="goto-admin-button"
            >
              {t('profile.settings')} →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Configuration Dialog */}
      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className="glass max-w-2xl" data-testid="api-keys-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              {t('profile.configureApiKeysButton')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="openai">{t('profile.openaiKey')}</Label>
              <Input
                id="openai"
                type="password"
                value={apiFormData.openai_api_key}
                onChange={(e) => setApiFormData({ ...apiFormData, openai_api_key: e.target.value })}
                placeholder="sk-proj-..."
                className="font-mono"
                data-testid="openai-key-input"
              />
              <p className="text-xs text-gray-400">
                {t('profile.openaiDesc')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend">{t('profile.resendKey')}</Label>
              <Input
                id="resend"
                type="password"
                value={apiFormData.resend_api_key}
                onChange={(e) => setApiFormData({ ...apiFormData, resend_api_key: e.target.value })}
                placeholder="re_..."
                className="font-mono"
                data-testid="resend-key-input"
              />
              <p className="text-xs text-gray-400">
                {t('profile.resendDesc')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-token">{t('profile.whatsappToken')}</Label>
              <Input
                id="whatsapp-token"
                type="password"
                value={apiFormData.whatsapp_access_token}
                onChange={(e) => setApiFormData({ ...apiFormData, whatsapp_access_token: e.target.value })}
                placeholder="EAAG..."
                className="font-mono"
                data-testid="whatsapp-token-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">{t('profile.whatsappPhone')}</Label>
              <Input
                id="whatsapp-phone"
                type="text"
                value={apiFormData.whatsapp_phone_number_id}
                onChange={(e) => setApiFormData({ ...apiFormData, whatsapp_phone_number_id: e.target.value })}
                placeholder="123456789012345"
                className="font-mono"
                data-testid="whatsapp-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-key">{t('profile.stripeKey')}</Label>
              <Input
                id="stripe-key"
                type="text"
                value={apiFormData.stripe_publishable_key}
                onChange={(e) => setApiFormData({ ...apiFormData, stripe_publishable_key: e.target.value })}
                placeholder="pk_live_..."
                className="font-mono"
                data-testid="stripe-key-input"
              />
              <p className="text-xs text-gray-400">
                {t('profile.stripeDesc')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowApiDialog(false)}>
              {t('profile.cancel')}
            </Button>
            <Button 
              onClick={handleSaveApiKeys}
              className="bg-primary hover:bg-primary/90" 
              data-testid="save-api-keys-button"
            >
              {t('profile.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
