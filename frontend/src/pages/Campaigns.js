import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Send, Calendar, Sparkles, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Campaigns = () => {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState('email');
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content_html: '',
    language: 'fr',
    scheduled_at: '',
    target_groups: [],
    target_tags: []
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/campaigns`);
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error(t('campaigns.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        scheduled_at: formData.scheduled_at || null
      };
      await axios.post(`${API}/campaigns`, payload);
      toast.success(t('campaigns.campaignCreated'));
      setShowCreateDialog(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(t('campaigns.errorCreating'));
    }
  };

  const handleEditCampaign = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        scheduled_at: formData.scheduled_at || null
      };
      await axios.put(`${API}/campaigns/${currentCampaign.id}`, payload);
      toast.success(t('campaigns.campaignUpdated'));
      setShowEditDialog(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error(t('campaigns.errorUpdating'));
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm(t('campaigns.confirmDelete'))) return;
    
    try {
      await axios.delete(`${API}/campaigns/${campaignId}`);
      toast.success(t('campaigns.campaignDeleted'));
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error(t('campaigns.errorDeleting'));
    }
  };

  const handleSendCampaign = async (campaignId) => {
    if (!window.confirm('Voulez-vous vraiment envoyer cette campagne maintenant ?')) return;
    
    try {
      await axios.post(`${API}/campaigns/${campaignId}/send`);
      toast.success('Campagne en cours d\'envoi');
      fetchCampaigns();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error(error.response?.data?.detail || t('campaigns.errorSending'));
    }
  };

  const handleAIGenerate = async () => {
    setAiLoading(true);
    try {
      const response = await axios.post(`${API}/ai/generate`, {
        prompt: aiPrompt,
        language: formData.language,
        tone: 'professional',
        type: aiType
      });
      
      if (aiType === 'email') {
        setFormData({ ...formData, content_html: response.data.content });
      } else if (aiType === 'subject') {
        setFormData({ ...formData, subject: response.data.content });
      }
      
      toast.success('Contenu généré avec succès par l\'IA');
      setShowAIDialog(false);
      setAiPrompt('');
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast.error(error.response?.data?.detail || t('campaigns.errorGenerating'));
    } finally {
      setAiLoading(false);
    }
  };

  const openEditDialog = (campaign) => {
    setCurrentCampaign(campaign);
    setFormData({
      title: campaign.title,
      subject: campaign.subject,
      content_html: campaign.content_html,
      language: campaign.language,
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : '',
      target_groups: campaign.target_groups || [],
      target_tags: campaign.target_tags || []
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      content_html: '',
      language: 'fr',
      scheduled_at: '',
      target_groups: [],
      target_tags: []
    });
    setCurrentCampaign(null);
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'default',
      sending: 'default',
      sent: 'outline',
      failed: 'destructive'
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {t(`campaigns.${status}`) || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="campaigns-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="campaigns-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="campaigns-title">{t('campaigns.title')}</h1>
          <p className="text-gray-400">{t('campaigns.subtitle', { count: campaigns.length })}</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-primary hover:bg-primary/90 glow"
          data-testid="create-campaign-button"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('campaigns.createCampaign')}
        </Button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign, index) => (
          <Card key={campaign.id} className="glass border-primary/20 hover:glow transition-all duration-300" data-testid={`campaign-card-${index}`}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white mb-1">{campaign.title}</h3>
                    <p className="text-sm text-gray-400 line-clamp-1">{campaign.subject}</p>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>{t('campaigns.language')}:</span>
                    <span className="text-white">{campaign.language.toUpperCase()}</span>
                  </div>
                  {campaign.stats && (
                    <div className="flex justify-between text-gray-400">
                      <span>{t('campaigns.sent_count')}:</span>
                      <span className="text-primary font-medium">{campaign.stats.sent || 0}</span>
                    </div>
                  )}
                  {campaign.stats && campaign.stats.sent > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>{t('dashboard.openRate')}:</span>
                      <span className="text-green-500 font-medium">
                        {campaign.stats.sent > 0 ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100) : 0}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  {campaign.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openEditDialog(campaign)}
                        variant="outline"
                        className="flex-1"
                        data-testid={`edit-campaign-${index}`}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        {t('campaigns.edit')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSendCampaign(campaign.id)}
                        className="flex-1 bg-primary hover:bg-primary/90"
                        data-testid={`send-campaign-${index}`}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        {t('campaigns.send')}
                      </Button>
                    </>
                  )}
                  {campaign.status !== 'sent' && campaign.status !== 'sending' && (
                    <Button
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      variant="ghost"
                      className="text-red-500 hover:text-red-400"
                      data-testid={`delete-campaign-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card className="glass border-primary/20">
          <CardContent className="py-12 text-center text-gray-400" data-testid="no-campaigns-message">
            {t('campaigns.noCampaigns')}
          </CardContent>
        </Card>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="create-campaign-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {t('campaigns.createCampaign')}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAIDialog(true)}
                className="ml-auto"
                data-testid="open-ai-dialog-button"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t('campaigns.useAI')}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">{t('campaigns.campaignTitle')}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="create-title-input"
                  />
                </div>
                <div>
                  <Label htmlFor="language">{t('campaigns.language')}</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                    <SelectTrigger data-testid="create-language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="subject">{t('campaigns.subject')}</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  data-testid="create-subject-input"
                />
              </div>
              <div>
                <Label>{t('campaigns.content')}</Label>
                <Textarea
                  value={formData.content_html}
                  onChange={(e) => setFormData({ ...formData, content_html: e.target.value })}
                  placeholder="<p>Bonjour,</p><p>Votre contenu HTML ici...</p>"
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="create-content-editor"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Contenu HTML (utilisez des balises: &lt;p&gt;, &lt;strong&gt;, &lt;br&gt;, &lt;a&gt;)
                </p>
              </div>
              <div>
                <Label htmlFor="scheduled">{t('campaigns.schedule')} (optionnel)</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  data-testid="create-schedule-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="submit-create-campaign">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="edit-campaign-dialog">
          <DialogHeader>
            <DialogTitle>{t('common.edit')} Campagne</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCampaign}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-title">{t('campaigns.campaignTitle')}</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="edit-title-input"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-language">{t('campaigns.language')}</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                    <SelectTrigger data-testid="edit-language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-subject">{t('campaigns.subject')}</Label>
                <Input
                  id="edit-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  data-testid="edit-subject-input"
                />
              </div>
              <div>
                <Label>{t('campaigns.content')}</Label>
                <Textarea
                  value={formData.content_html}
                  onChange={(e) => setFormData({ ...formData, content_html: e.target.value })}
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="edit-content-editor"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Contenu HTML
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="submit-edit-campaign">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="glass" data-testid="ai-generate-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              Générer avec l'IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="ai-type">Type de contenu</Label>
              <Select value={aiType} onValueChange={setAiType}>
                <SelectTrigger data-testid="ai-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email complet</SelectItem>
                  <SelectItem value="subject">Objet uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ai-prompt">Description du contenu</Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: Email de relance pour un cours de danse Afrobeat à Neuchâtel, ton professionnel et encourageant"
                rows={4}
                data-testid="ai-prompt-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAIDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={!aiPrompt || aiLoading}
              className="bg-primary hover:bg-primary/90"
              data-testid="submit-ai-generate"
            >
              {aiLoading ? (
                <span>Génération...</span>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Campaigns;
