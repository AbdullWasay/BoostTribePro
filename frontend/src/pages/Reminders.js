import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Bell, Plus, Calendar, Clock, Mail, MessageCircle, Zap,
  Trash2, Power, PowerOff, Edit, CheckCircle, XCircle,
  AlertCircle, Target, Users, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const RemindersPage = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [reminders, setReminders] = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [notificationStats, setNotificationStats] = useState(null);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  
  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    reminder_type: 'custom',
    scheduled_at: '',
    channels: ['email'],
    target_contacts: [],
    message_template: ''
  });
  
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    trigger_event: 'new_contact',
    action_type: 'send_email',
    action_config: {},
    delay_minutes: 0,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchReminders(),
        fetchAutomationRules(),
        fetchContacts(),
        fetchNotificationStats()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await fetch(`${API}/reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const fetchAutomationRules = async () => {
    try {
      const response = await fetch(`${API}/automation/rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAutomationRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchNotificationStats = async () => {
    try {
      const response = await fetch(`${API}/notifications/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setNotificationStats(data);
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  const sendCourseReminders = async () => {
    setSendingNotifications(true);
    try {
      const response = await fetch(`${API}/notifications/send-course-reminders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '✅ Rappels envoyés',
          description: data.message || `${data.notifications_sent} notification(s) envoyée(s)`
        });
        // Refresh stats
        await fetchNotificationStats();
      } else {
        toast({
          title: '❌ Erreur',
          description: data.error || 'Impossible d\'envoyer les rappels',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast({
        title: '❌ Erreur',
        description: 'Erreur lors de l\'envoi des rappels',
        variant: 'destructive'
      });
    } finally {
      setSendingNotifications(false);
    }
  };

  const createReminder = async () => {
    try {
      const response = await fetch(`${API}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reminderForm)
      });

      if (response.ok) {
        toast({
          title: "✅ Rappel créé",
          description: "Votre rappel a été programmé avec succès"
        });
        setShowReminderDialog(false);
        fetchReminders();
        resetReminderForm();
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rappel",
        variant: "destructive"
      });
    }
  };

  const deleteReminder = async (reminderId) => {
    try {
      const response = await fetch(`${API}/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "✅ Rappel supprimé"
        });
        fetchReminders();
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const createAutomationRule = async () => {
    try {
      const response = await fetch(`${API}/automation/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(ruleForm)
      });

      if (response.ok) {
        toast({
          title: "✅ Règle créée",
          description: "Votre automatisation est maintenant active"
        });
        setShowRuleDialog(false);
        fetchAutomationRules();
        resetRuleForm();
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la règle",
        variant: "destructive"
      });
    }
  };

  const toggleRule = async (ruleId, isActive) => {
    try {
      const response = await fetch(`${API}/automation/rules/${ruleId}?is_active=${!isActive}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: !isActive ? "✅ Règle activée" : "⏸️ Règle désactivée"
        });
        fetchAutomationRules();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const deleteRule = async (ruleId) => {
    try {
      const response = await fetch(`${API}/automation/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "✅ Règle supprimée"
        });
        fetchAutomationRules();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const resetReminderForm = () => {
    setReminderForm({
      title: '',
      description: '',
      reminder_type: 'custom',
      scheduled_at: '',
      channels: ['email'],
      target_contacts: [],
      message_template: ''
    });
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      description: '',
      trigger_event: 'new_contact',
      action_type: 'send_email',
      action_config: {},
      delay_minutes: 0,
      is_active: true
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-500', icon: Clock, label: t('reminders.statusPending') },
      sent: { color: 'bg-green-500', icon: CheckCircle, label: t('reminders.statusSent') },
      failed: { color: 'bg-red-500', icon: XCircle, label: t('reminders.statusFailed') },
      cancelled: { color: 'bg-gray-500', icon: XCircle, label: t('reminders.statusCancelled') }
    };
    const { color, icon: Icon, label } = config[status] || config.pending;
    return (
      <Badge className={`${color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getReminderTypeLabel = (type) => {
    const types = {
      event: t('reminders.typeEvent'),
      payment: t('reminders.typePayment'),
      renewal: t('reminders.typeRenewal'),
      followup: t('reminders.typeFollowup'),
      custom: t('reminders.typeCustom')
    };
    return types[type] || types.custom;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">🔔 {t('reminders.title')}</h1>
          <p className="text-gray-400">{t('reminders.subtitle')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">{t('reminders.activeReminders')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {reminders.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">{t('reminders.sent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {reminders.filter(r => r.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">{t('reminders.automations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">
              {automationRules.filter(r => r.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">{t('reminders.totalExecutions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {automationRules.reduce((sum, r) => sum + r.execution_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="reminders" className="w-full">
        <TabsList className="glass">
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Rappels
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automatisations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Notifications Auto
          </TabsTrigger>
        </TabsList>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowReminderDialog(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau rappel
            </Button>
          </div>

          {reminders.length === 0 ? (
            <Card className="glass border-primary/20">
              <CardContent className="py-12 text-center text-gray-400">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Aucun rappel programmé. Créez-en un pour ne rien oublier !</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <Card key={reminder.id} className="glass border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{reminder.title}</h3>
                          {getStatusBadge(reminder.status)}
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-3">{reminder.description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-1 text-gray-500">
                            <Calendar className="h-4 w-4" />
                            {new Date(reminder.scheduled_at).toLocaleString('fr-FR')}
                          </span>
                          <span className="text-gray-500">
                            {getReminderTypeLabel(reminder.reminder_type)}
                          </span>
                          <div className="flex gap-1">
                            {reminder.channels.includes('email') && (
                              <Badge variant="outline"><Mail className="h-3 w-3" /></Badge>
                            )}
                            {reminder.channels.includes('whatsapp') && (
                              <Badge variant="outline"><MessageCircle className="h-3 w-3" /></Badge>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Users className="h-4 w-4" />
                            {reminder.target_contacts.length} contact(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteReminder(reminder.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowRuleDialog(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle règle
            </Button>
          </div>

          {automationRules.length === 0 ? (
            <Card className="glass border-primary/20">
              <CardContent className="py-12 text-center text-gray-400">
                <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Aucune automatisation configurée. Gagnez du temps avec des workflows automatiques !</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {automationRules.map((rule) => (
                <Card key={rule.id} className="glass border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{rule.name}</h3>
                          <Badge className={rule.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                            {rule.is_active ? <Power className="h-3 w-3 mr-1" /> : <PowerOff className="h-3 w-3 mr-1" />}
                            {rule.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-3">{rule.description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>
                            <strong>Déclencheur:</strong> {rule.trigger_event.replace('_', ' ')}
                          </span>
                          <span>
                            <strong>Action:</strong> {rule.action_type.replace('_', ' ')}
                          </span>
                          {rule.delay_minutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Délai: {rule.delay_minutes} min
                            </span>
                          )}
                          <span>
                            <strong>Exécutions:</strong> {rule.execution_count}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRule(rule.id, rule.is_active)}
                        >
                          {rule.is_active ? (
                            <PowerOff className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <Power className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notifications Auto Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Rappels Automatiques de Cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-400 mb-2">📧 Comment ça marche ?</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Scanne automatiquement les cours/événements à venir (24-48h)</li>
                  <li>• Envoie un email de rappel à tous les participants confirmés</li>
                  <li>• Évite les doublons (ne renvoie pas si déjà envoyé)</li>
                  <li>• Affiche la date, lieu, détails complets de l'événement</li>
                </ul>
              </div>

              {/* Stats */}
              {notificationStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="glass border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Total envoyé</p>
                          <p className="text-3xl font-bold text-primary">
                            {notificationStats.total_sent}
                          </p>
                        </div>
                        <Mail className="h-12 w-12 text-primary/50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Rappels cours</p>
                          <p className="text-3xl font-bold text-green-500">
                            {notificationStats.by_type?.course_reminders || 0}
                          </p>
                        </div>
                        <Bell className="h-12 w-12 text-green-500/50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={sendCourseReminders}
                  disabled={sendingNotifications}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  {sendingNotifications ? (
                    <>
                      <Clock className="mr-2 h-5 w-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      {t('reminders.send')} les rappels maintenant
                    </>
                  )}
                </Button>
              </div>

              {/* Recent Notifications */}
              {notificationStats?.recent && notificationStats.recent.length > 0 && (
                <div>
                  <h3 className="font-semibold text-white mb-3">📨 Dernières notifications envoyées</h3>
                  <div className="space-y-2">
                    {notificationStats.recent.map((notif, idx) => (
                      <Card key={idx} className="glass border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {notif.type === 'course_reminder' ? 'Rappel de cours' : notif.type}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(notif.sent_at).toLocaleString('fr-FR')}
                                </p>
                              </div>
                            </div>
                            <Badge className="bg-green-500/20 text-green-400">
                              Envoyé
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-xs text-yellow-400">
                  💡 <strong>Astuce :</strong> En production, configurez un cron job pour exécuter cette tâche automatiquement chaque jour.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>🔔 {t('reminders.newReminder')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('reminders.title_label')}</Label>
              <Input
                value={reminderForm.title}
                onChange={(e) => setReminderForm({...reminderForm, title: e.target.value})}
                placeholder="Ex: Rappel cours demain"
              />
            </div>

            <div>
              <Label>{t('reminders.description')}</Label>
              <Textarea
                value={reminderForm.description}
                onChange={(e) => setReminderForm({...reminderForm, description: e.target.value})}
                placeholder="Détails du rappel..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('reminders.reminderType')}</Label>
                <Select
                  value={reminderForm.reminder_type}
                  onValueChange={(value) => setReminderForm({...reminderForm, reminder_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">{t('reminders.typeEvent')}</SelectItem>
                    <SelectItem value="payment">{t('reminders.typePayment')}</SelectItem>
                    <SelectItem value="renewal">{t('reminders.typeRenewal')}</SelectItem>
                    <SelectItem value="followup">{t('reminders.typeFollowup')}</SelectItem>
                    <SelectItem value="custom">{t('reminders.typeCustom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('reminders.dateTime')}</Label>
                <Input
                  type="datetime-local"
                  value={reminderForm.scheduled_at}
                  onChange={(e) => setReminderForm({...reminderForm, scheduled_at: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>{t('reminders.notificationChannels')}</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderForm.channels.includes('email')}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...reminderForm.channels, 'email']
                        : reminderForm.channels.filter(c => c !== 'email');
                      setReminderForm({...reminderForm, channels});
                    }}
                  />
                  <Mail className="h-4 w-4" />
                  {t('reminders.email')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderForm.channels.includes('whatsapp')}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...reminderForm.channels, 'whatsapp']
                        : reminderForm.channels.filter(c => c !== 'whatsapp');
                      setReminderForm({...reminderForm, channels});
                    }}
                  />
                  <MessageCircle className="h-4 w-4" />
                  {t('reminders.whatsapp')}
                </label>
              </div>
            </div>

            <div>
              <Label>{t('reminders.reminderMessage')}</Label>
              <Textarea
                value={reminderForm.message_template}
                onChange={(e) => setReminderForm({...reminderForm, message_template: e.target.value})}
                placeholder={t('reminders.reminderPlaceholder')}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)}>
              Annuler
            </Button>
            <Button onClick={createReminder} className="bg-gradient-to-r from-pink-500 to-purple-600">
              Créer le rappel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Automation Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>⚡ Nouvelle automatisation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nom de la règle *</Label>
              <Input
                value={ruleForm.name}
                onChange={(e) => setRuleForm({...ruleForm, name: e.target.value})}
                placeholder="Ex: Bienvenue nouveaux contacts"
              />
            </div>

            <div>
              <Label>{t('reminders.description')}</Label>
              <Textarea
                value={ruleForm.description}
                onChange={(e) => setRuleForm({...ruleForm, description: e.target.value})}
                placeholder="Description de l'automatisation..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Déclencheur</Label>
                <Select
                  value={ruleForm.trigger_event}
                  onValueChange={(value) => setRuleForm({...ruleForm, trigger_event: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_contact">👤 Nouveau contact</SelectItem>
                    <SelectItem value="booking_created">📅 Réservation créée</SelectItem>
                    <SelectItem value="payment_received">💳 Paiement reçu</SelectItem>
                    <SelectItem value="inactive_contact">😴 Contact inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Action</Label>
                <Select
                  value={ruleForm.action_type}
                  onValueChange={(value) => setRuleForm({...ruleForm, action_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_email">📧 Envoyer email</SelectItem>
                    <SelectItem value="send_whatsapp">💬 Envoyer WhatsApp</SelectItem>
                    <SelectItem value="create_reminder">🔔 Créer rappel</SelectItem>
                    <SelectItem value="update_contact">✏️ Mettre à jour contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Délai d'exécution (minutes)</Label>
              <Input
                type="number"
                value={ruleForm.delay_minutes}
                onChange={(e) => setRuleForm({...ruleForm, delay_minutes: parseInt(e.target.value) || 0})}
                placeholder="0 pour immédiat"
              />
              <p className="text-xs text-gray-500 mt-1">
                0 = exécution immédiate, 60 = après 1h, 1440 = après 1 jour
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Annuler
            </Button>
            <Button onClick={createAutomationRule} className="bg-gradient-to-r from-pink-500 to-purple-600">
              Créer la règle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RemindersPage;
