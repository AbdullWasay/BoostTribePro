import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#D91CD2', '#9D1C9D', '#6B136B', '#4A0D4A'];

const Analytics = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/analytics/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/analytics/campaigns`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setStats(statsRes.data);
      setCampaignAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="analytics-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  const pieData = [
    { name: t('analytics.openedLabel'), value: stats?.total_emails_opened || 0 },
    { name: t('analytics.nonOpenedLabel'), value: (stats?.total_emails_sent || 0) - (stats?.total_emails_opened || 0) },
  ];

  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="analytics-title">{t('analytics.title')}</h1>
        <p className="text-gray-400">{t('analytics.subtitle')}</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">{t('analytics.totalSent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">{stats?.total_emails_sent || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">{t('analytics.openRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats?.open_rate || 0}%</div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">{t('analytics.clickRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{stats?.click_rate || 0}%</div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">{t('analytics.campaignsSent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats?.sent_campaigns || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campaign Performance Bar Chart */}
        <Card className="glass border-primary/20" data-testid="chart-performance-bar">
          <CardHeader>
            <CardTitle>{t('analytics.campaignPerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={campaignAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(217, 28, 210, 0.1)" />
                <XAxis dataKey="title" stroke="#888" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(217, 28, 210, 0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="open_rate" fill="#D91CD2" name={t('analytics.openRateLabel')} />
                <Bar dataKey="click_rate" fill="#6B136B" name={t('analytics.clickRateLabel')} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Email Status Pie Chart */}
        <Card className="glass border-primary/20" data-testid="chart-status-pie">
          <CardHeader>
            <CardTitle>{t('analytics.openDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(217, 28, 210, 0.2)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Emails Sent Line Chart */}
        <Card className="glass border-primary/20 lg:col-span-2" data-testid="chart-emails-line">
          <CardHeader>
            <CardTitle>{t('analytics.emailsVolume')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={campaignAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(217, 28, 210, 0.1)" />
                <XAxis dataKey="title" stroke="#888" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(217, 28, 210, 0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#D91CD2" strokeWidth={3} name={t('analytics.emailsSent')} />
                <Line type="monotone" dataKey="opened" stroke="#4ADE80" strokeWidth={3} name={t('analytics.emailsOpened')} />
                <Line type="monotone" dataKey="clicked" stroke="#60A5FA" strokeWidth={3} name={t('analytics.emailsClicked')} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Campaigns */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle>{t('analytics.topCampaigns')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaignAnalytics
              .sort((a, b) => b.open_rate - a.open_rate)
              .slice(0, 5)
              .map((campaign, index) => (
                <div
                  key={campaign.campaign_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  data-testid={`top-campaign-${index}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{campaign.title}</p>
                      <p className="text-sm text-gray-400">
                        {campaign.sent} {t('analytics.emails')} • {campaign.opened} {t('analytics.opened')} • {campaign.clicked} {t('analytics.clicks')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-green-500 font-bold text-lg">{campaign.open_rate}%</p>
                      <p className="text-gray-400">{t('analytics.openLabel')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-500 font-bold text-lg">{campaign.click_rate}%</p>
                      <p className="text-gray-400">{t('analytics.clickLabel')}</p>
                    </div>
                  </div>
                </div>
              ))}
            {campaignAnalytics.length === 0 && (
              <p className="text-center text-gray-400 py-8">{t('analytics.noData')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
