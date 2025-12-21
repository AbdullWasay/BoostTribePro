import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Edit, Trash2, Save, X, DollarSign } from 'lucide-react';
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PricingManagement = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    currency: 'CHF',
    features_fr: '',
    limits: { emails_per_month: 0 },
    active: true,
    highlighted: false
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/pricing-plans`);
      setPlans(response.data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (plan) => {
    setCurrentPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      features_fr: plan.features_fr.join('\n'),
      limits: plan.limits,
      active: plan.active,
      highlighted: plan.highlighted
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        ...formData,
        features_fr: formData.features_fr.split('\n').filter(f => f.trim()),
        features_en: formData.features_fr.split('\n').filter(f => f.trim()),
        features_de: formData.features_fr.split('\n').filter(f => f.trim())
      };
      
      await axios.put(`${API}/pricing-plans/${currentPlan.id}`, payload);
      toast.success('Plan modifié avec succès');
      setShowEditDialog(false);
      fetchPlans();
    } catch (error) {
      toast.error('Erreur modification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-2xl text-primary animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pricing-mgmt">
      <div>
        <h1 className="text-4xl font-bold mb-2">Gestion Plans Tarifaires</h1>
        <p className="text-gray-400">Modifiez prix et limites</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, index) => (
          <Card key={plan.id} className="glass border-primary/20" data-testid={`plan-${index}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  {plan.highlighted && <Badge className="bg-primary">Recommandé</Badge>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEditDialog(plan)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-bold text-gradient">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price} ${plan.currency}`}
                  </p>
                  <p className="text-sm text-gray-400">par mois</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-2">Limites:</p>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p>• Emails: {plan.limits.emails_per_month === -1 ? 'Illimité' : plan.limits.emails_per_month}</p>
                    <p>• WhatsApp: {plan.limits.whatsapp_per_month === -1 ? 'Illimité' : plan.limits.whatsapp_per_month}</p>
                  </div>
                </div>
                <div>
                  <Badge variant={plan.active ? 'default' : 'secondary'}>
                    {plan.active ? 'Actif' : 'Inactif'}
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
            <DialogTitle>Modifier: {currentPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Prix</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Devise</Label>
                <Input value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Emails/mois (-1 = illimité)</Label>
              <Input
                type="number"
                value={formData.limits.emails_per_month}
                onChange={(e) => setFormData({
                  ...formData,
                  limits: { ...formData.limits, emails_per_month: parseInt(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>WhatsApp/mois (-1 = illimité)</Label>
              <Input
                type="number"
                value={formData.limits.whatsapp_per_month || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  limits: { ...formData.limits, whatsapp_per_month: parseInt(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>Features (une par ligne)</Label>
              <Textarea
                value={formData.features_fr}
                onChange={(e) => setFormData({ ...formData, features_fr: e.target.value })}
                rows={6}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label>Actif</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.highlighted}
                  onCheckedChange={(checked) => setFormData({ ...formData, highlighted: checked })}
                />
                <Label>Recommandé</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
            <Button onClick={handleUpdate} className="bg-primary hover:bg-primary/90">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingManagement;
