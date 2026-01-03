import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Edit, Trash2, Save, X, DollarSign, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPlans = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const initialFormState = {
    name: '',
    name_en: '',
    name_de: '',
    price: 0,
    currency: 'CHF',
    description_fr: '',
    description_en: '',
    description_de: '',
    features_fr: '',
    features_en: '',
    features_de: '',
    cta_fr: 'Souscrire',
    cta_en: 'Subscribe',
    cta_de: 'Abonnieren',
    limits: {
      emails_per_month: 0,
      whatsapp_per_month: 0,
      contacts_max: 0,
      ai_enabled: false,
      whatsapp_enabled: false,
      multi_user: false
    },
    active: true,
    highlighted: false,
    order: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchPlans();
  }, [token]);

  const fetchPlans = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/pricing-plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data);
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('superadmin.plans.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Warning: This will delete all current plans and restore the default Starter, Pro Coach, and Business plans. Continue?")) return;
    try {
      setLoading(true);
      await axios.post(`${API}/pricing-plans/initialize`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Default plans restored successfully");
      fetchPlans();
    } catch (error) {
      console.error('Error initializing plans:', error);
      toast.error("Failed to initialize plans. Make sure you are a Super Admin.");
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setCurrentPlan(null);
    setFormData(initialFormState);
    setShowEditDialog(true);
  };

  const openEditDialog = (plan) => {
    setCurrentPlan(plan);
    setFormData({
      name: plan.name,
      name_en: plan.name_en || plan.name,
      name_de: plan.name_de || plan.name,
      price: plan.price,
      currency: plan.currency,
      description_fr: plan.description_fr || '',
      description_en: plan.description_en || '',
      description_de: plan.description_de || '',
      features_fr: plan.features_fr ? plan.features_fr.join('\n') : '',
      features_en: plan.features_en ? plan.features_en.join('\n') : '',
      features_de: plan.features_de ? plan.features_de.join('\n') : '',
      cta_fr: plan.cta_fr || 'Souscrire',
      cta_en: plan.cta_en || 'Subscribe',
      cta_de: plan.cta_de || 'Abonnieren',
      limits: plan.limits || initialFormState.limits,
      active: plan.active,
      highlighted: plan.highlighted,
      order: plan.order || 0
    });
    setShowEditDialog(true);
  };

  const handleDelete = async (planId) => {
    if (!window.confirm(t('common.confirmDelete') || 'Are you sure you want to delete this plan?')) return;
    try {
      await axios.delete(`${API}/pricing-plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('common.deleted') || 'Plan deleted');
      fetchPlans();
    } catch (error) {
      toast.error(t('common.error') || 'Error deleting plan');
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        features_fr: formData.features_fr.split('\n').filter(f => f.trim()),
        features_en: formData.features_en.split('\n').filter(f => f.trim()),
        features_de: formData.features_de.split('\n').filter(f => f.trim())
      };

      if (currentPlan) {
        await axios.put(`${API}/pricing-plans/${currentPlan.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(t('superadmin.plans.updateSuccess'));
      } else {
        await axios.post(`${API}/pricing-plans`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(t('common.success') || 'Plan created');
      }
      setShowEditDialog(false);
      fetchPlans();
    } catch (error) {
      toast.error(t('superadmin.plans.updateError'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-2xl text-primary animate-pulse">{t('superadmin.plans.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pricing-mgmt">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2"><span>{t('superadmin.plans.title')}</span></h1>
          <p className="text-gray-400"><span>{t('superadmin.plans.subtitle')}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetDefaults} className="border-primary/20 hover:bg-primary/10">
            <Zap className="mr-2 h-4 w-4" />
            <span>Reset to Defaults</span>
          </Button>
          <Button onClick={openAddDialog} className="bg-primary hover:bg-primary/90 glow">
            <Plus className="mr-2 h-4 w-4" />
            <span>Add Plan</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, index) => (
          <Card key={plan.id} className="glass border-primary/20" data-testid={`plan-${index}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  {plan.highlighted && <Badge className="bg-primary">{t('superadmin.plans.recommended')}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditDialog(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-400" onClick={() => handleDelete(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-bold text-gradient">
                    {plan.price === 0 ? t('catalog.free') : `${plan.price} ${plan.currency}`}
                  </p>
                  <p className="text-sm text-gray-400">{t('superadmin.plans.perMonth')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-2">{t('superadmin.plans.limits')}</p>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p><span>• </span><span>{t('superadmin.plans.emails')}</span><span>: </span><span>{plan.limits.emails_per_month === -1 ? t('superadmin.plans.unlimited') : plan.limits.emails_per_month}</span></p>
                    <p><span>• </span><span>{t('superadmin.plans.whatsapp')}</span><span>: </span><span>{plan.limits.whatsapp_per_month === -1 ? t('superadmin.plans.unlimited') : plan.limits.whatsapp_per_month}</span></p>
                    <p><span>• </span><span>Contacts</span><span>: </span><span>{plan.limits.contacts_max === -1 ? t('superadmin.plans.unlimited') : (plan.limits.contacts_max || 0)}</span></p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-1"><span>{t('superadmin.plans.description')}</span><span>:</span></p>
                  <p className="text-xs text-gray-400 italic line-clamp-2"><span>{plan.description_fr}</span></p>
                </div>
                <div>
                  <Badge variant={plan.active ? 'default' : 'secondary'}>
                    {plan.active ? t('superadmin.plans.active') : t('superadmin.plans.inactive')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass max-w-2xl" data-testid="edit-dialog">
          <DialogHeader>
            <DialogTitle>{t('superadmin.plans.editTitle')}: {currentPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-1">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Name (FR)</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Name (EN)</Label>
                <Input value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Name (DE)</Label>
                <Input value={formData.name_de} onChange={(e) => setFormData({ ...formData, name_de: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('superadmin.plans.price')}</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('superadmin.plans.currency')}</Label>
                <Input value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })} />
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('superadmin.plans.description')} (FR)</Label>
                <Textarea value={formData.description_fr} onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('superadmin.plans.description')} (EN)</Label>
                <Textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('superadmin.plans.description')} (DE)</Label>
                <Textarea value={formData.description_de} onChange={(e) => setFormData({ ...formData, description_de: e.target.value })} />
              </div>
            </div>

            {/* CTAs */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Button Text (FR)</Label>
                <Input value={formData.cta_fr} onChange={(e) => setFormData({ ...formData, cta_fr: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Button Text (EN)</Label>
                <Input value={formData.cta_en} onChange={(e) => setFormData({ ...formData, cta_en: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Button Text (DE)</Label>
                <Input value={formData.cta_de} onChange={(e) => setFormData({ ...formData, cta_de: e.target.value })} />
              </div>
            </div>

            {/* Limits */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('superadmin.plans.emailsLimit')}</Label>
                <Input
                  type="number"
                  value={formData.limits.emails_per_month}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, emails_per_month: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('superadmin.plans.whatsappLimit')}</Label>
                <Input
                  type="number"
                  value={formData.limits.whatsapp_per_month || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, whatsapp_per_month: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Contacts (-1 = unlimited)</Label>
                <Input
                  type="number"
                  value={formData.limits.contacts_max || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, contacts_max: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-6 p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.limits.ai_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, limits: { ...formData.limits, ai_enabled: checked } })}
                />
                <Label>AI Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.limits.whatsapp_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, limits: { ...formData.limits, whatsapp_enabled: checked } })}
                />
                <Label>WhatsApp Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.limits.multi_user}
                  onCheckedChange={(checked) => setFormData({ ...formData, limits: { ...formData.limits, multi_user: checked } })}
                />
                <Label>Multi-User</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label>{t('superadmin.plans.active')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.highlighted}
                  onCheckedChange={(checked) => setFormData({ ...formData, highlighted: checked })}
                />
                <Label>{t('superadmin.plans.recommended')}</Label>
              </div>
            </div>

            {/* Localized Features */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('superadmin.plans.features')} (FR)</Label>
                <Textarea
                  value={formData.features_fr}
                  onChange={(e) => setFormData({ ...formData, features_fr: e.target.value })}
                  rows={6}
                  placeholder="One feature per line"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('superadmin.plans.features')} (EN)</Label>
                <Textarea
                  value={formData.features_en}
                  onChange={(e) => setFormData({ ...formData, features_en: e.target.value })}
                  rows={6}
                  placeholder="One feature per line"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('superadmin.plans.features')} (DE)</Label>
                <Textarea
                  value={formData.features_de}
                  onChange={(e) => setFormData({ ...formData, features_de: e.target.value })}
                  rows={6}
                  placeholder="One feature per line"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t('superadmin.plans.cancel')}</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90"><span>{t('superadmin.plans.save')}</span></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlans;
