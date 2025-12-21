import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Link2, Gift, Mail, Copy, Check, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Referrals = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showRewardConfig, setShowRewardConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    referred_email: '',
    referred_name: ''
  });

  const [rewardConfig, setRewardConfig] = useState({
    referrer_reward_type: 'discount',
    referrer_reward_value: 10.0,
    referred_reward_type: 'discount',
    referred_reward_value: 10.0
  });

  useEffect(() => {
    fetchReferrals();
    fetchStats();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/referrals/my-referrals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReferrals(response.data);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/referrals/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(
        `${API_URL}/api/referrals`,
        {
          ...formData,
          ...rewardConfig
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: `✅ ${t('referrals.invitationSent')}`,
        description: `${t('referrals.invitationSentDesc')} ${formData.referred_email}`
      });
      
      setShowInviteForm(false);
      setFormData({ referred_email: '', referred_name: '' });
      fetchReferrals();
      fetchStats();
    } catch (error) {
      console.error('Error creating referral:', error);
      toast({
        title: `❌ ${t('referrals.error')}`,
        description: error.response?.data?.detail || t('referrals.errorCreating'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${stats?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: `✅ ${t('referrals.linkCopied')}`,
      description: t('referrals.linkCopiedDesc')
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: t('referrals.statusPending'), className: 'bg-yellow-500/20 text-yellow-400' },
      signed_up: { label: t('referrals.statusSignedUp'), className: 'bg-blue-500/20 text-blue-400' },
      completed: { label: t('referrals.statusCompleted'), className: 'bg-green-500/20 text-green-400' },
      expired: { label: t('referrals.statusExpired'), className: 'bg-gray-500/20 text-gray-400' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getRewardText = (rewardType, rewardValue) => {
    if (rewardType === 'discount') {
      return t('referrals.rewardTextDiscount', { value: rewardValue });
    } else if (rewardType === 'credit') {
      return t('referrals.rewardTextCredit', { value: rewardValue });
    } else if (rewardType === 'free_month') {
      const months = Math.floor(rewardValue);
      return rewardValue > 1 
        ? t('referrals.rewardTextPlural', { value: months })
        : t('referrals.rewardTextFreeMonth', { value: months });
    }
    return t('referrals.rewardTextDefault', { value: rewardValue });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            {t('referrals.title')}
          </h1>
          <p className="text-gray-400 mt-1">
            {t('referrals.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
          <Mail className="mr-2 h-4 w-4" />
          {t('referrals.inviteFriend')}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('referrals.totalReferrals')}</p>
                  <p className="text-3xl font-bold text-primary">{stats.total_referrals}</p>
                </div>
                <Users className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('referrals.pending')}</p>
                  <p className="text-3xl font-bold text-yellow-400">{stats.pending_referrals}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('referrals.completed')}</p>
                  <p className="text-3xl font-bold text-green-400">{stats.completed_referrals}</p>
                </div>
                <Check className="h-8 w-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('referrals.rewards')}</p>
                  <p className="text-3xl font-bold text-primary">{stats.total_rewards_earned} CHF</p>
                </div>
                <Gift className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referral Link Card */}
      {stats && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {t('referrals.referralLink')}
            </CardTitle>
            <CardDescription>
              {t('referrals.shareLink')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-background border border-gray-700 rounded-md px-3 sm:px-4 py-2 sm:py-3 font-mono text-xs sm:text-sm overflow-x-auto">
                {window.location.origin}/register?ref={stats.referral_code}
              </div>
              <Button 
                onClick={copyReferralLink}
                className="w-full sm:w-auto flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t('referrals.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('referrals.copy')}
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Gift className="h-4 w-4" />
              <span>
                {t('referrals.youWillReceive')} {getRewardText(rewardConfig.referrer_reward_type, rewardConfig.referrer_reward_value)} 
                {' '}{t('referrals.friendWillReceive')} {getRewardText(rewardConfig.referred_reward_type, rewardConfig.referred_reward_value)}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowRewardConfig(!showRewardConfig)}
              className="w-full"
            >
              {showRewardConfig ? t('referrals.hideRewards') : t('referrals.configureRewards')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reward Configuration */}
      {showRewardConfig && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {t('referrals.rewardConfig')}
            </CardTitle>
            <CardDescription>
              {t('referrals.rewardConfigDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Referrer Rewards */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">🎯 {t('referrals.yourReward')}</h3>
                <div>
                  <Label>{t('referrals.rewardType')}</Label>
                  <select
                    value={rewardConfig.referrer_reward_type}
                    onChange={(e) => setRewardConfig({...rewardConfig, referrer_reward_type: e.target.value})}
                    className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  >
                    <option value="discount">{t('referrals.discountPercent')}</option>
                    <option value="credit">{t('referrals.creditCHF')}</option>
                    <option value="free_month">{t('referrals.freeMonth')}</option>
                  </select>
                </div>
                <div>
                  <Label>{t('referrals.value')}</Label>
                  <Input
                    type="number"
                    value={rewardConfig.referrer_reward_value}
                    onChange={(e) => setRewardConfig({...rewardConfig, referrer_reward_value: parseFloat(e.target.value)})}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getRewardText(rewardConfig.referrer_reward_type, rewardConfig.referrer_reward_value)}
                  </p>
                </div>
              </div>

              {/* Referred Rewards */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">👥 {t('referrals.friendReward')}</h3>
                <div>
                  <Label>{t('referrals.rewardType')}</Label>
                  <select
                    value={rewardConfig.referred_reward_type}
                    onChange={(e) => setRewardConfig({...rewardConfig, referred_reward_type: e.target.value})}
                    className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  >
                    <option value="discount">{t('referrals.discountPercent')}</option>
                    <option value="credit">{t('referrals.creditCHF')}</option>
                    <option value="free_month">{t('referrals.freeMonth')}</option>
                  </select>
                </div>
                <div>
                  <Label>{t('referrals.value')}</Label>
                  <Input
                    type="number"
                    value={rewardConfig.referred_reward_value}
                    onChange={(e) => setRewardConfig({...rewardConfig, referred_reward_value: parseFloat(e.target.value)})}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getRewardText(rewardConfig.referred_reward_type, rewardConfig.referred_reward_value)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                💡 <strong>{t('referrals.rewardPreview')}</strong> {t('referrals.rewardPreviewText')}{' '}
                <strong>{getRewardText(rewardConfig.referrer_reward_type, rewardConfig.referrer_reward_value)}</strong>
                {' '}{t('referrals.rewardPreviewAnd')} <strong>{getRewardText(rewardConfig.referred_reward_type, rewardConfig.referred_reward_value)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle>{t('referrals.inviteFriendTitle')}</CardTitle>
            <CardDescription>
              {t('referrals.inviteFriendDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('referrals.referredEmail')} *</Label>
                  <Input
                    type="email"
                    value={formData.referred_email}
                    onChange={(e) => setFormData({ ...formData, referred_email: e.target.value })}
                    placeholder="ami@example.com"
                    required
                  />
                </div>
                <div>
                  <Label>{t('referrals.referredName')}</Label>
                  <Input
                    value={formData.referred_name}
                    onChange={(e) => setFormData({ ...formData, referred_name: e.target.value })}
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Mail className="mr-2 h-4 w-4" />
                  {loading ? t('referrals.sending') : t('referrals.sendInvitation')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Referrals List */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle>{t('referrals.myReferrals')}</CardTitle>
          <CardDescription>
            {t('referrals.referralsList')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">{t('referrals.noReferrals')}</p>
              <Button onClick={() => setShowInviteForm(true)}>
                <Mail className="mr-2 h-4 w-4" />
                {t('referrals.inviteFirstFriend')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 bg-background/50 border border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {referral.referred_name || referral.referred_email}
                      </p>
                      {referral.referred_name && (
                        <p className="text-sm text-gray-400">{referral.referred_email}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {t('referrals.invitedOn')} {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {referral.referrer_reward_applied && (
                      <Badge className="bg-green-500/20 text-green-400">
                        <Gift className="mr-1 h-3 w-3" />
                        {t('referrals.rewardReceived')}
                      </Badge>
                    )}
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Referrals;
