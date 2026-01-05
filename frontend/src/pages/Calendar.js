import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { fr, enUS, de } from 'date-fns/locale';
import "react-day-picker/style.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Calendar = () => {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6" data-testid="calendar-page">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2" data-testid="calendar-title">{t('calendar.title')}</h1>
        <p className="text-sm sm:text-base text-gray-400">{t('calendar.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Calendar */}
        <Card className="glass border-primary/20" data-testid="calendar-widget">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {t('calendar.campaignCalendar')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-3 sm:p-4 md:p-6">
            <div className="w-full max-w-full overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-[280px] px-2 sm:px-0">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={getLocale()}
                  className="rounded-lg border-primary/20 w-full"
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Campaigns for Selected Date */}
        <Card className="glass border-primary/20" data-testid="scheduled-campaigns">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg break-words">
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
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="font-semibold text-white break-words flex-1 min-w-0">{campaign.title}</h3>
                        <Badge variant="outline" className="border-primary shrink-0">
                          {scheduledTime.toLocaleTimeString(i18n.language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2 break-words">{campaign.subject}</p>
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
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`all-scheduled-campaign-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white break-words">{campaign.title}</p>
                        <p className="text-sm text-gray-400 break-words">{campaign.subject}</p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
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
