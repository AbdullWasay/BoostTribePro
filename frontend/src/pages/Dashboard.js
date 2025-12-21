import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Users, Mail, TrendingUp, MousePointerClick } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/analytics/overview`),
        axios.get(`${API}/analytics/campaigns`)
      ]);
      setStats(statsRes.data);
      setCampaignAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="dashboard-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('dashboard.totalContacts'),
      value: stats?.total_contacts || 0,
      icon: Users,
      color: 'text-blue-500',
      testid: 'stat-total-contacts'
    },
    {
      title: t('dashboard.emailsSent'),
      value: stats?.total_emails_sent || 0,
      icon: Mail,
      color: 'text-primary',
      testid: 'stat-emails-sent'
    },
    {
      title: t('dashboard.openRate'),
      value: `${stats?.open_rate || 0}%`,
      icon: TrendingUp,
      color: 'text-green-500',
      testid: 'stat-open-rate'
    },
    {
      title: t('dashboard.clickRate'),
      value: `${stats?.click_rate || 0}%`,
      icon: MousePointerClick,
      color: 'text-purple-500',
      testid: 'stat-click-rate'
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="dashboard-title">{t('dashboard.title')}</h1>
        <p className="text-gray-400">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="glass border-primary/20 hover:glow transition-all duration-300" data-testid={stat.testid}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gradient">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Campaign Performance Bar Chart */}
        <Card className="glass border-primary/20" data-testid="chart-campaign-performance">
          <CardHeader>
            <CardTitle>{t('dashboard.performance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignAnalytics.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(217, 28, 210, 0.1)" />
                <XAxis dataKey="title" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(217, 28, 210, 0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="open_rate" fill="#D91CD2" name={t('dashboard.openRateLabel')} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Campaigns Table */}
        <Card className="glass border-primary/20" data-testid="recent-campaigns">
          <CardHeader>
            <CardTitle>{t('dashboard.recentCampaigns')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignAnalytics.slice(0, 5).map((campaign, index) => (
                <div
                  key={campaign.campaign_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  data-testid={`campaign-${index}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-white">{campaign.title}</p>
                    <p className="text-sm text-gray-400">
                      {campaign.sent} {t('dashboard.sentLabel')} • {campaign.open_rate}% {t('dashboard.openLabel')}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-primary">
                    {campaign.click_rate}% {t('dashboard.clicksLabel')}
                  </div>
                </div>
              ))}
              {campaignAnalytics.length === 0 && (
                <p className="text-center text-gray-400 py-8">{t('dashboard.noCampaignsSent')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
