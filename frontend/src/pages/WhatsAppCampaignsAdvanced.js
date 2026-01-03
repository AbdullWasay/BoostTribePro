import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle, Plus, Send, Sparkles, Edit, Trash2,
  Calendar, Target, BarChart3, Image, Link as LinkIcon,
  Smile, Bold, Italic, ChevronDown, ChevronUp, ShoppingCart
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
import { useToast } from '@/hooks/use-toast';
import EmojiPicker from 'emoji-picker-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import ProductLinkSelector from '@/components/ProductLinkSelector';
import ImageUploader from '@/components/ImageUploader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppCampaignsAdvanced = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // State management
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);

  // Form states
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    message_content: '',
    language: 'fr',
    buttons: [],
    list_sections: [],
    media_url: '',
    media_type: null,
    target_contacts: [],
    target_tags: [],
    target_status: null,
    use_personalization: false,
    scheduled_at: '',
    payment_links: []
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'marketing',
    content: '',
    variables: [],
    language: 'fr',
    buttons: [],
    media_url: '',
    media_type: null
  });

  // Editor states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  // Button builder state
  const [currentButton, setCurrentButton] = useState({
    type: 'reply',
    text: '',
    id: '',
    url: '',
    phone_number: ''
  });

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
    fetchContacts();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/advanced-campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
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

  const handleEmojiClick = (emojiObject) => {
    setCampaignForm(prev => ({
      ...prev,
      message_content: prev.message_content + emojiObject.emoji
    }));
    setShowEmojiPicker(false);
  };

  const handleProductSelect = (productText, product) => {
    setCampaignForm(prev => ({
      ...prev,
      message_content: prev.message_content + '\n\n' + productText,
      payment_links: [...prev.payment_links, {
        product_id: product.id,
        product_slug: product.slug,
        product_title: product.title
      }]
    }));
    setShowProductSelector(false);
    toast({
      title: t('whatsappAdvanced.productAdded'),
      description: t('whatsappAdvanced.productAddedDesc', { title: product.title })
    });
  };

  const addButton = () => {
    if (!currentButton.text) {
      toast({
        title: t('common.error'),
        description: t('whatsappAdvanced.buttonTextRequired'),
        variant: "destructive"
      });
      return;
    }

    const newButton = { ...currentButton };
    if (currentButton.type === 'reply') {
      newButton.id = currentButton.text.toLowerCase().replace(/\s+/g, '_');
    }

    setCampaignForm(prev => ({
      ...prev,
      buttons: [...prev.buttons, newButton]
    }));

    setCurrentButton({
      type: 'reply',
      text: '',
      id: '',
      url: '',
      phone_number: ''
    });

    toast({
      title: t('whatsappAdvanced.buttonAdded'),
      description: t('whatsappAdvanced.buttonAddedDesc')
    });
  };

  const removeButton = (index) => {
    setCampaignForm(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const createCampaign = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/advanced-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(campaignForm)
      });

      if (response.ok) {
        toast({
          title: t('whatsappAdvanced.campaignCreated'),
          description: t('whatsappAdvanced.campaignCreatedDesc')
        });
        setShowCreateDialog(false);
        fetchCampaigns();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: t('whatsappAdvanced.errorCreating'),
        description: t('whatsappAdvanced.errorCreatingDesc'),
        variant: "destructive"
      });
    }
  };

  const updateCampaign = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/advanced-campaigns/${editingCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(campaignForm)
      });

      if (response.ok) {
        toast({
          title: t('whatsappAdvanced.campaignUpdated'),
          description: t('whatsappAdvanced.campaignUpdatedDesc')
        });
        setShowEditDialog(false);
        fetchCampaigns();
        resetForm();
        setEditingCampaign(null);
      } else {
        const errorData = await response.json();
        toast({
          title: t('common.error'),
          description: errorData.detail || t('whatsappAdvanced.errorUpdating'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: t('whatsappAdvanced.errorUpdating'),
        description: t('whatsappAdvanced.errorUpdatingDesc'),
        variant: "destructive"
      });
    }
  };

  const deleteCampaign = async (campaignId) => {
    if (!window.confirm(t('whatsappAdvanced.confirmDelete'))) return;

    try {
      const response = await fetch(`${API}/whatsapp/advanced-campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: t('whatsappAdvanced.campaignDeleted'),
          description: t('whatsappAdvanced.campaignDeletedDesc')
        });
        fetchCampaigns();
      } else {
        const errorData = await response.json();
        toast({
          title: t('common.error'),
          description: errorData.detail || t('whatsappAdvanced.errorDeleting'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: t('whatsappAdvanced.errorDeleting'),
        description: t('whatsappAdvanced.errorDeletingDesc'),
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      title: campaign.title || '',
      message_content: campaign.message_content || '',
      language: campaign.language || 'fr',
      buttons: campaign.buttons || [],
      list_sections: campaign.list_sections || [],
      media_url: campaign.media_url || '',
      media_type: campaign.media_type || null,
      target_contacts: campaign.target_contacts || [],
      target_tags: campaign.target_tags || [],
      target_status: campaign.target_status || null,
      use_personalization: campaign.use_personalization || false,
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : '',
      payment_links: campaign.payment_links || []
    });
    setShowEditDialog(true);
  };

  const sendCampaign = async (campaignId) => {
    try {
      const response = await fetch(`${API}/whatsapp/advanced-campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: t('whatsappAdvanced.campaignSent'),
          description: t('whatsappAdvanced.campaignSentDesc', { count: data.contacts_targeted })
        });
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: t('whatsappAdvanced.errorSending'),
        description: t('whatsappAdvanced.errorSendingDesc'),
        variant: "destructive"
      });
    }
  };

  const fetchAnalytics = async (campaignId) => {
    try {
      const response = await fetch(`${API}/whatsapp/campaigns/${campaignId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAnalytics(data);
      setShowAnalyticsDialog(true);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: t('common.error'),
        description: t('whatsappAdvanced.errorLoadingAnalytics'),
        variant: "destructive"
      });
    }
  };

  const createTemplate = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(templateForm)
      });

      if (response.ok) {
        toast({
          title: t('whatsappAdvanced.templateCreated'),
          description: t('whatsappAdvanced.templateCreatedDesc')
        });
        setShowTemplateDialog(false);
        fetchTemplates();
        setTemplateForm({
          name: '',
          category: 'marketing',
          content: '',
          variables: [],
          language: 'fr',
          buttons: [],
          media_url: '',
          media_type: null
        });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: t('common.error'),
        description: t('whatsappAdvanced.errorCreatingTemplate'),
        variant: "destructive"
      });
    }
  };

  const loadTemplate = (template) => {
    setCampaignForm(prev => ({
      ...prev,
      message_content: template.content,
      buttons: template.buttons,
      media_url: template.media_url,
      media_type: template.media_type
    }));
    toast({
      title: t('whatsappAdvanced.templateLoaded'),
      description: t('whatsappAdvanced.templateLoadedDesc', { name: template.name })
    });
  };

  const resetForm = () => {
    setCampaignForm({
      title: '',
      message_content: '',
      language: 'fr',
      buttons: [],
      list_sections: [],
      media_url: '',
      media_type: null,
      target_contacts: [],
      target_tags: [],
      target_status: null,
      use_personalization: false,
      scheduled_at: '',
      payment_links: []
    });
    setEditingCampaign(null);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { color: 'bg-gray-500', label: t('whatsappAdvanced.statusDraft') },
      scheduled: { color: 'bg-blue-500', label: t('whatsappAdvanced.statusScheduled') },
      sending: { color: 'bg-yellow-500', label: t('whatsappAdvanced.statusSending') },
      sent: { color: 'bg-green-500', label: t('whatsappAdvanced.statusSent') },
      failed: { color: 'bg-red-500', label: t('whatsappAdvanced.statusFailed') }
    };
    const { color, label } = config[status] || config.draft;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">💬 {t('whatsappAdvanced.title')}</h1>
          <p className="text-gray-400 text-sm md:text-base">{t('whatsappAdvanced.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button
            onClick={() => setShowTemplateDialog(true)}
            variant="outline"
            className="border-primary/50 w-full sm:w-auto"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {t('whatsappAdvanced.templates')}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="bg-gradient-to-r from-pink-500 to-purple-600 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('whatsappAdvanced.newCampaign')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">{t('whatsappAdvanced.totalCampaigns')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">{t('whatsappAdvanced.sent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {campaigns.filter(c => c.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">{t('whatsappAdvanced.scheduled')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {campaigns.filter(c => c.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">{t('whatsappAdvanced.templates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">{templates.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="glass border-primary/20">
          <CardContent className="py-12 text-center text-gray-400">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>{t('whatsappAdvanced.noCampaigns')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="glass border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{campaign.title}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-gray-400 mb-4 line-clamp-2">{campaign.message_content}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {campaign.buttons && campaign.buttons.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {campaign.buttons.length} {t('whatsappAdvanced.buttonsCount')}
                        </span>
                      )}
                      {campaign.media_url && (
                        <span className="flex items-center gap-1">
                          <Image className="h-4 w-4" />
                          {t('whatsappAdvanced.media')}
                        </span>
                      )}
                      {campaign.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(campaign.scheduled_at)}
                        </span>
                      )}
                    </div>

                    {campaign.stats && campaign.status === 'sent' && (
                      <div className="mt-4 flex gap-6 text-sm">
                        <span className="text-green-500">✓ {campaign.stats.sent} {t('whatsappAdvanced.sentCount')}</span>
                        <span className="text-blue-500">✓ {campaign.stats.delivered} {t('whatsappAdvanced.deliveredCount')}</span>
                        <span className="text-purple-500">✓ {campaign.stats.read} {t('whatsappAdvanced.readCount')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditDialog(campaign)}
                      size="sm"
                      variant="outline"
                      className="border-primary/50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => deleteCampaign(campaign.id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {campaign.status === 'draft' && (
                      <Button
                        onClick={() => sendCampaign(campaign.id)}
                        size="sm"
                        className="bg-gradient-to-r from-pink-500 to-purple-600"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    {campaign.status === 'sent' && (
                      <Button
                        onClick={() => fetchAnalytics(campaign.id)}
                        size="sm"
                        variant="outline"
                        className="border-primary/50"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📱 {t('whatsappAdvanced.newCampaignDialog')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>{t('whatsappAdvanced.campaignTitle')}</Label>
                <Input
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  placeholder={t('whatsappAdvanced.campaignTitlePlaceholder')}
                />
              </div>

              {/* Template Selector */}
              {templates.length > 0 && (
                <div>
                  <Label>{t('whatsappAdvanced.loadTemplate')}</Label>
                  <Select onValueChange={(value) => {
                    const template = templates.find(t => t.id === value);
                    if (template) loadTemplate(template);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('whatsappAdvanced.selectTemplate')} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Message Editor */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>{t('whatsappAdvanced.messageContent')}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title={t('whatsappAdvanced.addEmoji')}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowProductSelector(!showProductSelector)}
                      className="text-primary"
                      title={t('whatsappAdvanced.insertProductLink')}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {t('whatsappAdvanced.preview')}
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={campaignForm.message_content}
                  onChange={(e) => setCampaignForm({ ...campaignForm, message_content: e.target.value })}
                  placeholder={t('whatsappAdvanced.messagePlaceholder')}
                  rows={6}
                  className="font-mono"
                />

                {showEmojiPicker && (
                  <div className="mt-2">
                    <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" />
                  </div>
                )}

                {showProductSelector && (
                  <div className="mt-2 p-4 rounded-lg bg-background border border-primary/20">
                    <ProductLinkSelector
                      onSelectProduct={handleProductSelect}
                      onClose={() => setShowProductSelector(false)}
                    />
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  {t('whatsappAdvanced.personalizationHint')}
                </p>
              </div>

              {/* Media URL (Image/Video) */}
              <div>
                <ImageUploader
                  value={campaignForm.media_url}
                  onChange={(url) => setCampaignForm({ ...campaignForm, media_url: url })}
                  label={t('whatsappAdvanced.mediaUrl')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('whatsappAdvanced.mediaHint')}
                </p>

              </div>

              {/* WhatsApp Preview */}
              {showPreview && campaignForm.message_content && (
                <div className="p-4 bg-gradient-to-br from-teal-900/20 to-green-900/20 rounded-lg border border-green-500/30">
                  <Label className="text-xs text-gray-400 mb-2 block">{t('whatsappAdvanced.whatsappPreview')}</Label>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                    {campaignForm.media_url && (() => {
                      const url = campaignForm.media_url;
                      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/);
                      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

                      if (youtubeMatch) {
                        const videoId = youtubeMatch[1];
                        return (
                          <div className="relative w-full h-48 mb-2 group">
                            <img
                              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                              alt="YouTube"
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                <div className="w-0 h-0 border-t-10 border-t-transparent border-l-14 border-l-white border-b-10 border-b-transparent ml-1"></div>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (vimeoMatch) {
                        return (
                          <div className="w-full h-48 bg-black rounded mb-2 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <div className="w-0 h-0 border-t-10 border-t-transparent border-l-14 border-l-white border-b-10 border-b-transparent ml-1"></div>
                              </div>
                              <p className="text-sm text-gray-300">Vidéo Vimeo</p>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <img
                            src={url}
                            alt="Media"
                            className="w-full rounded mb-2 max-h-64 object-cover"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        );
                      }
                    })()}
                    <div className="text-sm whitespace-pre-wrap">{campaignForm.message_content}</div>
                    {campaignForm.buttons.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {campaignForm.buttons.map((btn, idx) => (
                          <div key={idx} className="bg-white/5 rounded px-3 py-2 text-center text-sm border border-white/20">
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Elements */}
            <div className="space-y-4 p-4 rounded-lg bg-background/50 border border-primary/20">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t('whatsappAdvanced.interactiveElements')}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('whatsappAdvanced.buttonType')}</Label>
                  <Select
                    value={currentButton.type}
                    onValueChange={(value) => setCurrentButton({ ...currentButton, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reply">{t('whatsappAdvanced.replyButton')}</SelectItem>
                      <SelectItem value="url">{t('whatsappAdvanced.urlButton')}</SelectItem>
                      <SelectItem value="call">{t('whatsappAdvanced.callButton')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('whatsappAdvanced.buttonText')}</Label>
                  <Input
                    value={currentButton.text}
                    onChange={(e) => setCurrentButton({ ...currentButton, text: e.target.value })}
                    placeholder={t('whatsappAdvanced.buttonTextPlaceholder')}
                  />
                </div>

                {currentButton.type === 'url' && (
                  <div className="col-span-2">
                    <Label>{t('whatsappAdvanced.url')}</Label>
                    <Input
                      value={currentButton.url}
                      onChange={(e) => setCurrentButton({ ...currentButton, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                )}

                {currentButton.type === 'call' && (
                  <div className="col-span-2">
                    <Label>{t('whatsappAdvanced.phoneNumber')}</Label>
                    <Input
                      value={currentButton.phone_number}
                      onChange={(e) => setCurrentButton({ ...currentButton, phone_number: e.target.value })}
                      placeholder={t('whatsappAdvanced.phonePlaceholder')}
                    />
                  </div>
                )}
              </div>

              <Button type="button" onClick={addButton} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {t('whatsappAdvanced.addButton')}
              </Button>

              {campaignForm.buttons.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">{t('whatsappAdvanced.addedButtons')}</Label>
                  {campaignForm.buttons.map((btn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-background/30 rounded">
                      <span className="text-sm">{btn.text} ({btn.type})</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeButton(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Targeting */}
            <div className="space-y-4 p-4 rounded-lg bg-background/50 border border-primary/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t('whatsappAdvanced.targeting')}
              </h3>

              <div>
                <Label>{t('whatsappAdvanced.contactStatus')}</Label>
                <Select
                  value={campaignForm.target_status || ''}
                  onValueChange={(value) => setCampaignForm({ ...campaignForm, target_status: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('whatsappAdvanced.allContacts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('whatsappAdvanced.allContacts')}</SelectItem>
                    <SelectItem value="active">{t('whatsappAdvanced.activeContacts')}</SelectItem>
                    <SelectItem value="inactive">{t('whatsappAdvanced.inactiveContacts')}</SelectItem>
                    <SelectItem value="vip">{t('whatsappAdvanced.vipContacts')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('whatsappAdvanced.scheduling')}</Label>
                <Input
                  type="datetime-local"
                  value={campaignForm.scheduled_at}
                  onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_at: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              {t('whatsappAdvanced.cancel')}
            </Button>
            <Button onClick={createCampaign} className="bg-gradient-to-r from-pink-500 to-purple-600">
              {t('whatsappAdvanced.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✏️ {t('whatsappAdvanced.editCampaign') || 'Edit Campaign'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>{t('whatsappAdvanced.campaignTitle')}</Label>
                <Input
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  placeholder={t('whatsappAdvanced.campaignTitlePlaceholder')}
                />
              </div>

              {/* Message Editor */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>{t('whatsappAdvanced.messageContent')}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title={t('whatsappAdvanced.addEmoji')}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowProductSelector(!showProductSelector)}
                      className="text-primary"
                      title={t('whatsappAdvanced.insertProductLink')}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {t('whatsappAdvanced.preview')}
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={campaignForm.message_content}
                  onChange={(e) => setCampaignForm({ ...campaignForm, message_content: e.target.value })}
                  placeholder={t('whatsappAdvanced.messagePlaceholder')}
                  rows={6}
                  className="font-mono"
                />

                {showEmojiPicker && (
                  <div className="mt-2">
                    <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" />
                  </div>
                )}

                {showProductSelector && (
                  <div className="mt-2 p-4 rounded-lg bg-background border border-primary/20">
                    <ProductLinkSelector
                      onSelectProduct={handleProductSelect}
                      onClose={() => setShowProductSelector(false)}
                    />
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  {t('whatsappAdvanced.personalizationHint')}
                </p>
              </div>

              {/* Media URL (Image/Video) */}
              <div>
                <Label htmlFor="edit_media_url">{t('whatsappAdvanced.mediaUrl')}</Label>
                <Input
                  id="edit_media_url"
                  value={campaignForm.media_url}
                  onChange={(e) => setCampaignForm({ ...campaignForm, media_url: e.target.value })}
                  placeholder={t('whatsappAdvanced.mediaUrlPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('whatsappAdvanced.mediaHint')}
                </p>
                {campaignForm.media_url && (() => {
                  const url = campaignForm.media_url;
                  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/);
                  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

                  if (youtubeMatch) {
                    const videoId = youtubeMatch[1];
                    return (
                      <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Aperçu YouTube :</p>
                        <div className="relative w-48 h-36 group">
                          <img
                            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                            alt="YouTube preview"
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors rounded">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (vimeoMatch) {
                    return (
                      <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Aperçu Vimeo :</p>
                        <div className="w-48 h-36 bg-black rounded flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                            </div>
                            <p className="text-xs text-gray-300">Vidéo Vimeo</p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Aperçu image :</p>
                        <img
                          src={url}
                          alt="Media preview"
                          className="w-48 h-36 object-cover rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<p class="text-xs text-red-400">❌ Impossible de charger l\'aperçu. Vérifiez l\'URL.</p>';
                          }}
                        />
                      </div>
                    );
                  }
                })()}
              </div>

              {/* WhatsApp Preview */}
              {showPreview && campaignForm.message_content && (
                <div className="p-4 bg-gradient-to-br from-teal-900/20 to-green-900/20 rounded-lg border border-green-500/30">
                  <Label className="text-xs text-gray-400 mb-2 block">{t('whatsappAdvanced.whatsappPreview')}</Label>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                    {campaignForm.media_url && (() => {
                      const url = campaignForm.media_url;
                      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/);
                      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

                      if (youtubeMatch) {
                        const videoId = youtubeMatch[1];
                        return (
                          <div className="relative w-full h-48 mb-2 group">
                            <img
                              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                              alt="YouTube"
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                <div className="w-0 h-0 border-t-10 border-t-transparent border-l-14 border-l-white border-b-10 border-b-transparent ml-1"></div>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (vimeoMatch) {
                        return (
                          <div className="w-full h-48 bg-black rounded mb-2 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <div className="w-0 h-0 border-t-10 border-t-transparent border-l-14 border-l-white border-b-10 border-b-transparent ml-1"></div>
                              </div>
                              <p className="text-sm text-gray-300">Vidéo Vimeo</p>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <img
                            src={url}
                            alt="Media"
                            className="w-full rounded mb-2 max-h-64 object-cover"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        );
                      }
                    })()}
                    <div className="text-sm whitespace-pre-wrap">{campaignForm.message_content}</div>
                    {campaignForm.buttons.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {campaignForm.buttons.map((btn, idx) => (
                          <div key={idx} className="bg-white/5 rounded px-3 py-2 text-center text-sm border border-white/20">
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Elements */}
            <div className="space-y-4 p-4 rounded-lg bg-background/50 border border-primary/20">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t('whatsappAdvanced.interactiveElements')}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('whatsappAdvanced.buttonType')}</Label>
                  <Select
                    value={currentButton.type}
                    onValueChange={(value) => setCurrentButton({ ...currentButton, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reply">{t('whatsappAdvanced.replyButton')}</SelectItem>
                      <SelectItem value="url">{t('whatsappAdvanced.urlButton')}</SelectItem>
                      <SelectItem value="call">{t('whatsappAdvanced.callButton')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('whatsappAdvanced.buttonText')}</Label>
                  <Input
                    value={currentButton.text}
                    onChange={(e) => setCurrentButton({ ...currentButton, text: e.target.value })}
                    placeholder={t('whatsappAdvanced.buttonTextPlaceholder')}
                  />
                </div>

                {currentButton.type === 'url' && (
                  <div className="col-span-2">
                    <Label>{t('whatsappAdvanced.url')}</Label>
                    <Input
                      value={currentButton.url}
                      onChange={(e) => setCurrentButton({ ...currentButton, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                )}

                {currentButton.type === 'call' && (
                  <div className="col-span-2">
                    <Label>{t('whatsappAdvanced.phoneNumber')}</Label>
                    <Input
                      value={currentButton.phone_number}
                      onChange={(e) => setCurrentButton({ ...currentButton, phone_number: e.target.value })}
                      placeholder={t('whatsappAdvanced.phonePlaceholder')}
                    />
                  </div>
                )}
              </div>

              <Button type="button" onClick={addButton} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {t('whatsappAdvanced.addButton')}
              </Button>

              {campaignForm.buttons.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">{t('whatsappAdvanced.addedButtons')}</Label>
                  {campaignForm.buttons.map((btn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-background/30 rounded">
                      <span className="text-sm">{btn.text} ({btn.type})</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeButton(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Targeting */}
            <div className="space-y-4 p-4 rounded-lg bg-background/50 border border-primary/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t('whatsappAdvanced.targeting')}
              </h3>

              <div>
                <Label>{t('whatsappAdvanced.contactStatus')}</Label>
                <Select
                  value={campaignForm.target_status || ''}
                  onValueChange={(value) => setCampaignForm({ ...campaignForm, target_status: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('whatsappAdvanced.allContacts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('whatsappAdvanced.allContacts')}</SelectItem>
                    <SelectItem value="active">{t('whatsappAdvanced.activeContacts')}</SelectItem>
                    <SelectItem value="inactive">{t('whatsappAdvanced.inactiveContacts')}</SelectItem>
                    <SelectItem value="vip">{t('whatsappAdvanced.vipContacts')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('whatsappAdvanced.scheduling')}</Label>
                <Input
                  type="datetime-local"
                  value={campaignForm.scheduled_at}
                  onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_at: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              resetForm();
            }}>
              {t('whatsappAdvanced.cancel')}
            </Button>
            <Button onClick={updateCampaign} className="bg-gradient-to-r from-pink-500 to-purple-600">
              {t('whatsappAdvanced.save') || 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('whatsappAdvanced.manageTemplates')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('whatsappAdvanced.templateName')}</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder={t('whatsappAdvanced.templateNamePlaceholder')}
              />
            </div>

            <div>
              <Label>{t('whatsappAdvanced.category')}</Label>
              <Select
                value={templateForm.category}
                onValueChange={(value) => setTemplateForm({ ...templateForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">{t('whatsappAdvanced.marketing')}</SelectItem>
                  <SelectItem value="utility">{t('whatsappAdvanced.utility')}</SelectItem>
                  <SelectItem value="transactional">{t('whatsappAdvanced.transactional')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('whatsappAdvanced.content')}</Label>
              <Textarea
                value={templateForm.content}
                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                placeholder={t('whatsappAdvanced.contentPlaceholder')}
                rows={5}
              />
            </div>

            <Button onClick={createTemplate} className="w-full bg-gradient-to-r from-pink-500 to-purple-600">
              <Plus className="mr-2 h-4 w-4" />
              {t('whatsappAdvanced.saveTemplate')}
            </Button>

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-400">{t('whatsappAdvanced.existingTemplates')}</Label>
                {templates.map(template => (
                  <Card key={template.id} className="glass border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-sm text-gray-400 line-clamp-2">{template.content}</p>
                        </div>
                        <Badge className="bg-purple-500">{template.category}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      {analytics && (
        <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
          <DialogContent className="glass max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t('whatsappAdvanced.analytics')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-500">{analytics.summary.sent}</div>
                    <div className="text-sm text-gray-400">{t('whatsappAdvanced.sentLabel')}</div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-blue-500">{analytics.summary.delivered}</div>
                    <div className="text-sm text-gray-400">{t('whatsappAdvanced.deliveredLabel')}</div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-purple-500">{analytics.summary.read}</div>
                    <div className="text-sm text-gray-400">{t('whatsappAdvanced.readLabel')}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-yellow-500">{analytics.summary.replied}</div>
                    <div className="text-sm text-gray-400">{t('whatsappAdvanced.repliedLabel')}</div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-pink-500">{analytics.summary.clicked}</div>
                    <div className="text-sm text-gray-400">{t('whatsappAdvanced.clickedLabel')}</div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-500">{analytics.summary.payment_completed}</div>
                    <div className="text-sm text-gray-400">{t('whatsappAdvanced.paymentsLabel')}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Rate */}
              <Card className="glass border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">{t('whatsappAdvanced.engagementRate')}</span>
                    <span className="text-lg font-bold text-primary">
                      {analytics.summary.sent > 0
                        ? ((analytics.summary.read / analytics.summary.sent) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${analytics.summary.sent > 0
                          ? (analytics.summary.read / analytics.summary.sent) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WhatsAppCampaignsAdvanced;
