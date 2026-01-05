import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Key, CreditCard, Calendar, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useAuth(); // Get logged-in user data
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [userPlan, setUserPlan] = useState(null);

  useEffect(() => {
    if (user && token) {
      fetchStats();
      fetchUserPlan();
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

  const fetchUserPlan = async () => {
    try {
      // Get user's actual plan from the user object
      const userPlanValue = user?.plan || 'free';
      
      // If plan is 'pro', fetch the pricing plan details
      if (userPlanValue === 'pro') {
        // Try to get the most common pro plan (you might want to store plan_id in user object)
        const plansResponse = await axios.get(`${API}/pricing-plans`);
        const plans = plansResponse.data.filter(p => p.active && p.price > 0);
        if (plans.length > 0) {
          // Get the first paid plan or highlighted plan
          const proPlan = plans.find(p => p.highlighted) || plans[0];
          setUserPlan({
            name: proPlan.name || 'Pro',
            price: proPlan.price,
            currency: proPlan.currency || 'CHF'
          });
        } else {
          setUserPlan({ name: 'Pro', price: 49, currency: 'CHF' });
        }
      } else {
        // Free plan
        setUserPlan({ name: 'Free', price: 0, currency: 'CHF' });
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
      // Fallback to user.plan value
      setUserPlan({ 
        name: user?.plan === 'pro' ? 'Pro' : 'Free', 
        price: user?.plan === 'pro' ? 49 : 0, 
        currency: 'CHF' 
      });
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
              <div 
                className="flex items-center gap-2 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/pricing')}
                title={t('profile.upgrade') || 'Modifier votre plan'}
              >
                <Badge className={user?.plan === 'pro' ? 'bg-primary text-white' : 'bg-gray-600 text-white'}>
                  {userPlan?.name || (user?.plan === 'pro' ? 'Pro' : 'Free')}
                </Badge>
                {userPlan && userPlan.price > 0 ? (
                  <span className="text-sm text-gray-400">{userPlan.price} {userPlan.currency}/mois</span>
                ) : (
                  <span className="text-sm text-gray-400">{t('catalog.free') || 'Gratuit'}</span>
                )}
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

      {/* Subscription Management - COMMENTED OUT */}


    </div>
  );
};

export default Profile;
