import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { fr, enUS, de } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Calendar = () => {
  const { t, i18n } = useTranslation();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/campaigns`);
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocale = () => {
    switch (i18n.language) {
      case 'fr':
        return fr;
      case 'de':
        return de;
      default:
        return enUS;
    }
  };

  const scheduledCampaigns = campaigns.filter(
    (c) => c.status === 'scheduled' && c.scheduled_at
  );

  const campaignsOnSelectedDate = scheduledCampaigns.filter((campaign) => {
    const campaignDate = new Date(campaign.scheduled_at);
    return (
      campaignDate.getDate() === selectedDate.getDate() &&
      campaignDate.getMonth() === selectedDate.getMonth() &&
      campaignDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const datesWithCampaigns = scheduledCampaigns.map(
    (c) => new Date(c.scheduled_at)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="calendar-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="calendar-title">{t('calendar.title')}</h1>
        <p className="text-gray-400">{t('calendar.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar */}
        <Card className="glass border-primary/20" data-testid="calendar-widget">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {t('calendar.campaignCalendar')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={getLocale()}
              className="rounded-lg border-primary/20"
              modifiers={{
                scheduled: datesWithCampaigns,
              }}
              modifiersStyles={{
                scheduled: {
                  backgroundColor: 'rgba(217, 28, 210, 0.3)',
                  color: '#fff',
                  fontWeight: 'bold',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Scheduled Campaigns for Selected Date */}
        <Card className="glass border-primary/20" data-testid="scheduled-campaigns">
          <CardHeader>
            <CardTitle>
              {t('calendar.scheduledCampaigns', { 
                date: selectedDate.toLocaleDateString(i18n.language, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaignsOnSelectedDate.length > 0 ? (
              <div className="space-y-4">
                {campaignsOnSelectedDate.map((campaign, index) => {
                  const scheduledTime = new Date(campaign.scheduled_at);
                  return (
                    <div
                      key={campaign.id}
                      className="p-4 rounded-lg bg-muted/30 border border-primary/20 hover:bg-muted/50 transition-colors"
                      data-testid={`scheduled-campaign-${index}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white">{campaign.title}</h3>
                        <Badge variant="outline" className="border-primary">
                          {scheduledTime.toLocaleTimeString(i18n.language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{campaign.subject}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {campaign.language.toUpperCase()}
                        </Badge>
                        <Badge variant="default" className="text-xs bg-primary">
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400" data-testid="no-campaigns-on-date">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>{t('calendar.noCampaigns')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Scheduled Campaigns */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle>{t('calendar.allScheduled')}</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledCampaigns.length > 0 ? (
            <div className="space-y-3">
              {scheduledCampaigns
                .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                .map((campaign, index) => {
                  const scheduledDate = new Date(campaign.scheduled_at);
                  return (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`all-scheduled-campaign-${index}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">{campaign.title}</p>
                        <p className="text-sm text-gray-400">{campaign.subject}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-primary">
                          {scheduledDate.toLocaleDateString(i18n.language, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {scheduledDate.toLocaleTimeString(i18n.language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400" data-testid="no-scheduled-campaigns">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p>{t('calendar.noScheduledCampaigns')}</p>
              <p className="text-sm mt-2">{t('calendar.createCampaignHint')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;
