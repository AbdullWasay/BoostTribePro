import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Gift, Plus, Calendar, User, Mail, CreditCard, Check, X, Edit, Copy, Share2, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const GiftCards = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'CHF',
    recipient_name: '',
    recipient_email: '',
    personal_message: '',
    sender_name: user?.name || '',
    sender_email: user?.email || '',
    expires_at: '',
    design_template: 'default',
    design_color: '#8B5CF6'
  });

  useEffect(() => {
    fetchGiftCards();
  }, []);

  const fetchGiftCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/gift-cards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGiftCards(response.data);
    } catch (error) {
      console.error('Error fetching gift cards:', error);
      toast({
        title: `❌ ${t('giftCards.error')}`,
        description: t('giftCards.errorLoading'),
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      currency: 'CHF',
      recipient_name: '',
      recipient_email: '',
      personal_message: '',
      sender_name: user?.name || '',
      sender_email: user?.email || '',
      expires_at: '',
      design_template: 'default',
      design_color: '#8B5CF6'
    });
    setEditingCard(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Set expiration date (default 1 year from now if not set)
      const expiresAt = formData.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      
      await axios.post(
        `${API_URL}/api/gift-cards`,
        {
          ...formData,
          amount: parseFloat(formData.amount),
          expires_at: expiresAt
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: `✅ ${t('giftCards.cardCreated')}`,
        description: t('giftCards.cardCreatedDesc')
      });
      
      setShowCreateForm(false);
      resetForm();
      fetchGiftCards();
    } catch (error) {
      console.error('Error creating gift card:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || t('giftCards.errorCreating'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updateData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };
      if (formData.expires_at) {
        updateData.expires_at = new Date(formData.expires_at).toISOString();
      }
      
      await axios.put(
        `${API_URL}/api/gift-cards/${editingCard.id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: `✅ ${t('giftCards.cardUpdated') || 'Card Updated'}`,
        description: t('giftCards.cardUpdatedDesc') || 'Gift card updated successfully'
      });
      
      setShowEditForm(false);
      resetForm();
      fetchGiftCards();
    } catch (error) {
      console.error('Error updating gift card:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || t('giftCards.errorUpdating') || 'Error updating gift card',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setFormData({
      amount: card.amount.toString(),
      currency: card.currency,
      recipient_name: card.recipient_name,
      recipient_email: card.recipient_email,
      personal_message: card.personal_message || '',
      sender_name: card.sender_name,
      sender_email: card.sender_email,
      expires_at: card.expires_at ? new Date(card.expires_at).toISOString().split('T')[0] : '',
      design_template: card.design_template || 'default',
      design_color: card.design_color || '#8B5CF6'
    });
    setShowEditForm(true);
    setShowCreateForm(false);
  };

  const handleDuplicate = async (card) => {
    try {
      const expiresAt = card.expires_at 
        ? new Date(card.expires_at).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      
      await axios.post(
        `${API_URL}/api/gift-cards`,
        {
          amount: card.amount,
          currency: card.currency,
          recipient_name: card.recipient_name,
          recipient_email: card.recipient_email,
          personal_message: card.personal_message || '',
          sender_name: user?.name || card.sender_name,
          sender_email: user?.email || card.sender_email,
          expires_at: expiresAt,
          design_template: card.design_template || 'default',
          design_color: card.design_color || '#8B5CF6'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: `✅ ${t('giftCards.cardDuplicated') || 'Card Duplicated'}`,
        description: t('giftCards.cardDuplicatedDesc') || 'Gift card duplicated successfully'
      });
      
      fetchGiftCards();
    } catch (error) {
      console.error('Error duplicating gift card:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || t('giftCards.errorDuplicating') || 'Error duplicating gift card',
        variant: 'destructive'
      });
    }
  };

  const handleShare = (card) => {
    const shareUrl = `${window.location.origin}/gift-card/${card.code}`;
    const shareText = `Check out this gift card: ${card.amount} ${card.currency}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Gift Card',
        text: shareText,
        url: shareUrl,
      }).catch((error) => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: `✅ ${t('giftCards.linkCopied') || 'Link Copied'}`,
          description: t('giftCards.linkCopiedDesc') || 'Gift card link copied to clipboard'
        });
      }).catch((error) => {
        console.error('Error copying to clipboard:', error);
        toast({
          title: '❌ Erreur',
          description: 'Could not copy link to clipboard',
          variant: 'destructive'
        });
      });
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm(t('giftCards.confirmDelete') || 'Are you sure you want to delete this gift card?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/gift-cards/${card.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: `✅ ${t('giftCards.cardDeleted') || 'Card Deleted'}`,
        description: t('giftCards.cardDeletedDesc') || 'Gift card deleted successfully'
      });
      fetchGiftCards();
    } catch (error) {
      console.error('Error deleting gift card:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || t('giftCards.errorDeleting') || 'Error deleting gift card',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: t('giftCards.statusActive'), className: 'bg-green-500/20 text-green-400' },
      used: { label: t('giftCards.statusUsed'), className: 'bg-gray-500/20 text-gray-400' },
      expired: { label: t('giftCards.statusExpired'), className: 'bg-red-500/20 text-red-400' },
      cancelled: { label: t('giftCards.statusCancelled'), className: 'bg-orange-500/20 text-orange-400' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-primary" />
            {t('giftCards.title')}
          </h1>
          <p className="text-gray-400 mt-1">
            {t('giftCards.subtitle')}
          </p>
        </div>
        {giftCards.length > 0 && (
          <Button onClick={() => {
            resetForm();
            setShowCreateForm(!showCreateForm);
            setShowEditForm(false);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('giftCards.createCard')}
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle>{t('giftCards.createCardTitle')}</CardTitle>
            <CardDescription>
              {t('giftCards.createCardDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <Label>{t('giftCards.amount')}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="100.00"
                      required
                    />
                    <Input
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-24"
                      required
                    />
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <Label>{t('giftCards.expirationDate')}</Label>
                  <Input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('giftCards.defaultExpiration')}</p>
                </div>

                {/* Recipient Name */}
                <div>
                  <Label>{t('giftCards.recipientName')}</Label>
                  <Input
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    placeholder="Marie Dupont"
                    required
                  />
                </div>

                {/* Recipient Email */}
                <div>
                  <Label>{t('giftCards.recipientEmail')}</Label>
                  <Input
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                    placeholder="marie@example.com"
                    required
                  />
                </div>
              </div>

              {/* Personal Message */}
              <div>
                <Label>{t('giftCards.personalMessage')}</Label>
                <Textarea
                  value={formData.personal_message}
                  onChange={(e) => setFormData({ ...formData, personal_message: e.target.value })}
                    placeholder={t('giftCards.messagePlaceholder')}
                  rows={3}
                />
              </div>

              {/* Design Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('giftCards.template')}</Label>
                  <select
                    value={formData.design_template}
                    onChange={(e) => setFormData({ ...formData, design_template: e.target.value })}
                    className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  >
                    <option value="default">{t('giftCards.templateDefault')}</option>
                    <option value="birthday">{t('giftCards.templateBirthday')}</option>
                    <option value="christmas">{t('giftCards.templateChristmas')}</option>
                    <option value="custom">{t('giftCards.templateCustom')}</option>
                  </select>
                </div>

                <div>
                  <Label>{t('giftCards.color')}</Label>
                  <Input
                    type="color"
                    value={formData.design_color}
                    onChange={(e) => setFormData({ ...formData, design_color: e.target.value })}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Gift className="mr-2 h-4 w-4" />
                  {loading ? t('giftCards.creating') : t('giftCards.createButton')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
                  {t('giftCards.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Gift Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {giftCards.length === 0 ? (
          <Card className="glass border-primary/20 col-span-full">
            <CardContent className="py-12 text-center">
              <Gift className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{t('giftCards.noCards')}</p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer votre première carte
              </Button>
            </CardContent>
          </Card>
        ) : (
          giftCards.map((card) => (
            <Card
              key={card.id}
              className="glass border-primary/20 hover:border-primary/40 transition-colors"
              style={{ borderColor: card.design_color + '40' }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gift className="h-5 w-5" style={{ color: card.design_color }} />
                      {card.amount} {card.currency}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Code: <span className="font-mono text-primary">{card.code}</span>
                    </CardDescription>
                  </div>
                  {getStatusBadge(card.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{card.recipient_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{card.recipient_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      Expire: {new Date(card.expires_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {card.remaining_balance !== null && card.remaining_balance !== card.amount && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span>Solde: {card.remaining_balance} {card.currency}</span>
                    </div>
                  )}
                </div>

                {card.personal_message && (
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400 italic">
                      "{card.personal_message}"
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-gray-700 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(card)}
                    title={t('common.edit') || 'Edit'}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicate(card)}
                    title={t('common.duplicate') || 'Duplicate'}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShare(card)}
                    title={t('common.share') || 'Share'}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(card)}
                    title={t('common.delete') || 'Delete'}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => {
        setShowEditForm(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('common.edit') || 'Edit'} {t('giftCards.title') || 'Gift Card'}</DialogTitle>
            <DialogDescription>
              {t('giftCards.updateCardDesc') || 'Update gift card details'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <Label>{t('giftCards.amount')}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="100.00"
                    required
                  />
                  <Input
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-24"
                    required
                  />
                </div>
              </div>

              {/* Expiration */}
              <div>
                <Label>{t('giftCards.expirationDate')}</Label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-400 mt-1">{t('giftCards.defaultExpiration')}</p>
              </div>

              {/* Recipient Name */}
              <div>
                <Label>{t('giftCards.recipientName')}</Label>
                <Input
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  placeholder="Marie Dupont"
                  required
                />
              </div>

              {/* Recipient Email */}
              <div>
                <Label>{t('giftCards.recipientEmail')}</Label>
                <Input
                  type="email"
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  placeholder="marie@example.com"
                  required
                />
              </div>
            </div>

            {/* Personal Message */}
            <div>
              <Label>{t('giftCards.personalMessage')}</Label>
              <Textarea
                value={formData.personal_message}
                onChange={(e) => setFormData({ ...formData, personal_message: e.target.value })}
                placeholder={t('giftCards.messagePlaceholder')}
                rows={3}
              />
            </div>

            {/* Design Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('giftCards.template')}</Label>
                <select
                  value={formData.design_template}
                  onChange={(e) => setFormData({ ...formData, design_template: e.target.value })}
                  className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                >
                  <option value="default">{t('giftCards.templateDefault')}</option>
                  <option value="birthday">{t('giftCards.templateBirthday')}</option>
                  <option value="christmas">{t('giftCards.templateChristmas')}</option>
                  <option value="custom">{t('giftCards.templateCustom')}</option>
                </select>
              </div>

              <div>
                <Label>{t('giftCards.color')}</Label>
                <Input
                  type="color"
                  value={formData.design_color}
                  onChange={(e) => setFormData({ ...formData, design_color: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditForm(false);
                  resetForm();
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={loading}>
                <Gift className="mr-2 h-4 w-4" />
                {loading ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GiftCards;
