import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Calendar, Mail, Phone, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reservations = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [reservations, setReservations] = useState([]);
  const [catalogItems, setCatalogItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchReservations();
    fetchCatalogItems();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch(`${API}/reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      const response = await fetch(`${API}/catalog?published_only=false`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const itemsMap = {};
      data.forEach(item => {
        itemsMap[item.id] = item;
      });
      setCatalogItems(itemsMap);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
    }
  };

  const updateReservationStatus = async (reservationId, status, paymentStatus = null) => {
    try {
      const url = `${API}/reservations/${reservationId}/status?status=${status}${paymentStatus ? `&payment_status=${paymentStatus}` : ''}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "✅ Mis à jour",
          description: "Statut de la réservation mis à jour"
        });
        fetchReservations();
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { label: t('reservations.pending'), color: 'bg-yellow-500', icon: Clock },
      'confirmed': { label: t('reservations.confirmed'), color: 'bg-blue-500', icon: CheckCircle },
      'completed': { label: t('reservations.completed'), color: 'bg-green-500', icon: CheckCircle },
      'cancelled': { label: t('reservations.cancelled'), color: 'bg-red-500', icon: XCircle }
    };
    const badge = badges[status] || badges['pending'];
    const Icon = badge.icon;
    return (
      <Badge className={`${badge.color} text-white`}>
        <Icon className="mr-1 h-3 w-3" />
        {badge.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      'pending': { label: t('reservations.unpaid'), color: 'bg-gray-500' },
      'completed': { label: t('reservations.paid'), color: 'bg-green-500' },
      'failed': { label: t('reservations.failed'), color: 'bg-red-500' },
      'refunded': { label: t('reservations.refunded'), color: 'bg-orange-500' }
    };
    const badge = badges[status] || badges['pending'];
    return (
      <Badge className={`${badge.color} text-white`}>
        {badge.label}
      </Badge>
    );
  };

  const filteredReservations = filterStatus === 'all'
    ? reservations
    : reservations.filter(res => res.status === filterStatus);

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'completed').length,
    totalRevenue: reservations
      .filter(r => r.payment_status === 'completed')
      .reduce((sum, r) => sum + r.total_price, 0)
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
      <div>
        <h1 className="text-4xl font-bold mb-2">🎫 {t('reservations.title')}</h1>
        <p className="text-gray-400">{t('reservations.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass border-primary/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gradient">{stats.total}</div>
            <div className="text-sm text-gray-400">{t('reservations.total')}</div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-gray-400">{t('reservations.pending')}</div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{stats.confirmed}</div>
            <div className="text-sm text-gray-400">{t('reservations.confirmed')}</div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-sm text-gray-400">{t('reservations.completed')}</div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.totalRevenue.toFixed(2)} CHF</div>
            <div className="text-sm text-gray-400">{t('reservations.revenue')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass border-primary/20">
        <CardContent className="pt-6">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reservations.allStatuses')}</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="confirmed">Confirmées</SelectItem>
              <SelectItem value="completed">Terminées</SelectItem>
              <SelectItem value="cancelled">Annulées</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Reservations List */}
      {filteredReservations.length === 0 ? (
        <Card className="glass border-primary/20">
          <CardContent className="py-12 text-center text-gray-400">
            {t('reservations.noReservations')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => {
            const item = catalogItems[reservation.catalog_item_id];
            return (
              <Card key={reservation.id} className="glass border-primary/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {item?.title || 'Article supprimé'}
                      </CardTitle>
                      <div className="flex gap-2 mb-2">
                        {getStatusBadge(reservation.status)}
                        {getPaymentStatusBadge(reservation.payment_status)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {reservation.total_price} {reservation.currency}
                      </div>
                      <div className="text-sm text-gray-400">
                        {t('reservations.quantity')}: {reservation.quantity}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-gray-400">Client</h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{reservation.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Mail className="h-3 w-3" />
                          {reservation.customer_email}
                        </div>
                        {reservation.customer_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone className="h-3 w-3" />
                            {reservation.customer_phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-gray-400">Détails</h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {new Date(reservation.reservation_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <DollarSign className="h-3 w-3" />
                          {reservation.payment_method || 'Non spécifié'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {reservation.notes && (
                    <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-gray-400">
                        <span className="font-semibold">Note:</span> {reservation.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {reservation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          Confirmer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                          className="text-red-500"
                        >
                          Annuler
                        </Button>
                      </>
                    )}
                    {reservation.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => updateReservationStatus(reservation.id, 'completed', 'completed')}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Marquer comme terminée
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reservations;
