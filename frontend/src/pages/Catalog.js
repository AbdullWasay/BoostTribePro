import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Plus, Edit, Trash2, Eye, Package, Calendar, DollarSign, Share2, Copy, Mail, MessageCircle, ExternalLink, Play, Copy as CopyIcon, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import ImageUploader from '@/components/ImageUploader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Catalog = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reservationForm, setReservationForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    quantity: 1,
    notes: '',
    payment_method: 'stripe' // 'stripe' or 'free'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [categorySelectOpen, setCategorySelectOpen] = useState(false);
  const [currencySelectOpen, setCurrencySelectOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'course',
    price: '',
    currency: 'CHF',
    image_url: '',
    stock_quantity: '',
    max_attendees: '',
    event_date: '',
    event_duration: '',
    location: '',
    is_recurring: false,
    recurrence_type: 'weekly',
    recurrence_days: [],
    recurrence_time: '',
    is_published: false,
    is_active: true
  });

  useEffect(() => {
    fetchItems();
  }, []);

  // Close all Select dropdowns when dialog closes to prevent portal cleanup issues
  useEffect(() => {
    if (!showDialog) {
      setCategorySelectOpen(false);
      setCurrencySelectOpen(false);
    }
  }, [showDialog]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API}/catalog?published_only=false`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le catalogue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        event_duration: formData.event_duration ? parseInt(formData.event_duration) : null,
      };

      const url = editingItem
        ? `${API}/catalog/${editingItem.id}`
        : `${API}/catalog`;

      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Close Select dropdowns first to prevent portal cleanup issues
        setCategorySelectOpen(false);
        setCurrencySelectOpen(false);

        // Use requestAnimationFrame to ensure React processes state updates before closing dialog
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setShowDialog(false);
            resetForm();
            fetchItems();
          });
        });

        toast({
          title: "✅ Succès",
          description: editingItem ? t('catalog.editItem') : t('catalog.createItem')
        });
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'article",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price.toString(),
      currency: item.currency,
      image_url: item.image_url || '',
      stock_quantity: item.stock_quantity?.toString() || '',
      max_attendees: item.max_attendees?.toString() || '',
      event_date: item.event_date ? new Date(item.event_date).toISOString().slice(0, 16) : '',
      event_duration: item.event_duration?.toString() || '',
      location: item.location || '',
      is_recurring: item.is_recurring || false,
      recurrence_type: item.recurrence_type || 'weekly',
      recurrence_days: item.recurrence_days || [],
      recurrence_time: item.recurrence_time || '',
      is_published: item.is_published !== undefined ? item.is_published : false,
      is_active: item.is_active !== undefined ? item.is_active : true
    });
    setShowDialog(true);
  };

  const handleDuplicate = async (item) => {
    try {
      const duplicatedData = {
        title: `${item.title} (${t('catalog.copy') || 'Copy'})`,
        description: item.description,
        category: item.category,
        price: item.price,
        currency: item.currency,
        image_url: item.image_url || '',
        stock_quantity: item.stock_quantity,
        max_attendees: item.max_attendees,
        event_date: item.event_date || null,
        event_duration: item.event_duration,
        location: item.location || '',
        is_recurring: item.is_recurring || false,
        recurrence_type: item.recurrence_type || 'weekly',
        recurrence_days: item.recurrence_days || [],
        recurrence_time: item.recurrence_time || '',
        is_published: false, // Duplicated items should be unpublished by default
        is_active: item.is_active !== undefined ? item.is_active : true
      };

      const response = await fetch(`${API}/catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(duplicatedData)
      });

      if (response.ok) {
        toast({
          title: "✅ Succès",
          description: t('catalog.itemDuplicated') || 'Article dupliqué avec succès'
        });
        fetchItems();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Erreur",
          description: errorData.detail || "Impossible de dupliquer l'article",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer l'article",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id) => {
    console.log('handleDelete called with id:', id);
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      console.log('Attempting to delete:', `${API}/catalog/${id}`);
      const response = await fetch(`${API}/catalog/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Delete response:', response.status, response.ok);

      if (response.ok) {
        toast({ title: "✅ Article supprimé" });
        fetchItems();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete failed:', errorData);
        toast({
          title: "❌ Erreur",
          description: errorData.detail || "Impossible de supprimer l'article",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer l'article",
        variant: "destructive"
      });
    }
  };

  const handleShareWhatsApp = (item) => {
    const url = `${window.location.origin}/p/${item.slug}`;
    // Clean description - remove "none" or empty values
    let description = item.description || '';
    if (description.toLowerCase().trim() === 'none' || description.trim() === '') {
      description = item.title;
    }
    // Only share the product page URL, not the YouTube URL
    const text = `${item.title}\n${description}\n\nPrix : ${item.price} ${item.currency}\n\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleReserve = (item) => {
    setSelectedItem(item);
    setReservationForm({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      quantity: 1,
      notes: '',
      payment_method: item.price > 0 ? 'stripe' : 'free'
    });
    setShowReservationModal(true);
  };

  const handleReservationSubmit = async () => {
    if (!selectedItem) return;

    // Validation
    if (!reservationForm.customer_name || !reservationForm.customer_email) {
      toast({
        title: '❌ Erreur',
        description: 'Nom et email sont requis',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (reservationForm.payment_method === 'stripe' && selectedItem.price > 0) {
        // Create Stripe checkout session
        const response = await fetch(`${API}/reservations/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catalog_item_id: selectedItem.id,
            quantity: reservationForm.quantity,
            customer_name: reservationForm.customer_name,
            customer_email: reservationForm.customer_email,
            customer_phone: reservationForm.customer_phone,
            notes: reservationForm.notes,
            origin_url: window.location.origin
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Erreur lors de la création du paiement');
        }

        const data = await response.json();

        // Redirect to Stripe
        window.location.href = data.url;
      } else {
        // Free reservation (no payment)
        const response = await fetch(`${API}/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catalog_item_id: selectedItem.id,
            customer_name: reservationForm.customer_name,
            customer_email: reservationForm.customer_email,
            customer_phone: reservationForm.customer_phone,
            quantity: reservationForm.quantity,
            notes: reservationForm.notes,
            payment_method: 'free'
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Erreur lors de la réservation');
        }

        toast({
          title: '✅ Réservation confirmée',
          description: 'Un email de confirmation vous a été envoyé'
        });

        setShowReservationModal(false);
        fetchItems();
      }
    } catch (error) {
      console.error('Reservation error:', error);
      toast({
        title: '❌ Erreur',
        description: error.message || 'Impossible de créer la réservation',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareEmail = (item) => {
    const productUrl = `${window.location.origin}/p/${item.slug}`;
    const subject = `Découvre ${item.title}`;
    const body = `Bonjour,\n\nJe voulais partager avec toi:\n\n${item.title}\nPrix: ${item.price} ${item.currency}\n\n${item.description}\n\nLien: ${productUrl}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    toast({ title: '✅ Email ouvert' });
  };

  const handleCopyLink = (item) => {
    const productUrl = `${window.location.origin}/p/${item.slug}`;
    navigator.clipboard.writeText(productUrl);
    toast({ title: '✅ Lien copié', description: 'Lien du produit copié dans le presse-papiers' });
  };

  const handleViewPublic = (item) => {
    window.open(`/p/${item.slug}`, '_blank');
  };



  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'course',
      price: '',
      currency: 'CHF',
      image_url: '',
      stock_quantity: '',
      max_attendees: '',
      event_date: '',
      event_duration: '',
      location: '',
      is_recurring: false,
      recurrence_type: 'weekly',
      recurrence_days: [],
      recurrence_time: '',
      is_published: false,
      is_active: true
    });
    setEditingItem(null);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'course': return <Calendar className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'product': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      course: t('catalog.categories.course'),
      event: t('catalog.categories.event'),
      product: t('catalog.categories.product')
    };
    return labels[category] || category;
  };

  const filteredItems = filterCategory === 'all'
    ? items
    : items.filter(item => item.category === filterCategory);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">📦 Catalogue</h1>
          <p className="text-sm sm:text-base text-gray-400">{t('catalog.subtitle')}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="bg-primary hover:bg-primary/90 glow w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('catalog.createItem')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass border-primary/20">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('catalog.filterAll')}</SelectItem>
                <SelectItem value="course">{t('catalog.filterCourses')}</SelectItem>
                <SelectItem value="event">{t('catalog.filterEvents')}</SelectItem>
                <SelectItem value="product">{t('catalog.filterProducts')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <Card className="glass border-primary/20">
          <CardContent className="py-12 text-center text-gray-400">
            {t('catalog.noItems')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="glass border-primary/20 overflow-hidden w-full flex flex-col">
              {item.image_url && (
                <div className="h-40 sm:h-48 bg-muted overflow-hidden relative">
                  {(() => {
                    const url = item.image_url;
                    // Improved YouTube URL matching
                    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\?\s]+)/);
                    // Improved Vimeo URL matching
                    const vimeoMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
                    // Check if it's an image URL
                    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url) || url.match(/^(https?:\/\/).*\.(jpg|jpeg|png|gif|webp|bmp|svg)/i);

                    if (youtubeMatch) {
                      const videoId = youtubeMatch[1];
                      return (
                        <div
                          className="w-full h-full relative group cursor-pointer"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <img
                            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                            </div>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            YouTube
                          </div>
                        </div>
                      );
                    } else if (vimeoMatch) {
                      const videoId = vimeoMatch[1];
                      return (
                        <div
                          className="w-full h-full relative group cursor-pointer bg-black"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <div className="w-0 h-0 border-t-10 border-t-transparent border-l-14 border-l-white border-b-10 border-b-transparent ml-1"></div>
                              </div>
                              <p className="text-sm text-gray-300">Vidéo Vimeo</p>
                            </div>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Vimeo
                          </div>
                        </div>
                      );
                    } else if (isImage || !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com')) {
                      // Display as image if it's an image file or not a video URL
                      return (
                        <img
                          src={url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            // Show placeholder if image fails to load
                            const parent = e.target.parentElement;
                            if (parent && !parent.querySelector('.image-error')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'image-error absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500 text-sm';
                              errorDiv.textContent = '⚠️ Image non disponible';
                              parent.appendChild(errorDiv);
                            }
                          }}
                        />
                      );
                    } else {
                      // Fallback for unrecognized URLs
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 text-sm">
                          <div className="text-center">
                            <ExternalLink className="h-8 w-8 mx-auto mb-2" />
                            <p>URL non reconnue</p>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs mt-1 block">
                              Ouvrir le lien
                            </a>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
              {!item.image_url && (
                <div className="h-40 sm:h-48 bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                  <Package className="h-12 w-12 sm:h-16 sm:w-16 text-primary/50" />
                </div>
              )}
              <CardHeader className="p-3 sm:p-4 lg:p-6 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm sm:text-base lg:text-lg mb-2 break-words line-clamp-2">{item.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                      <Badge variant="outline" className="border-primary/30 text-[10px] sm:text-xs">
                        {getCategoryIcon(item.category)}
                        <span className="ml-1">{getCategoryLabel(item.category)}</span>
                      </Badge>
                      <Badge className={`text-[10px] sm:text-xs ${item.is_published ? 'bg-green-500' : 'bg-gray-500'}`}>
                        {item.is_published ? t('catalog.published') : t('catalog.draft')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 flex-1 flex flex-col">
                <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4 line-clamp-2 break-words">
                  {item.description}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                    {item.price} {item.currency}
                  </div>
                  {item.max_attendees && (
                    <div className="text-xs sm:text-sm text-gray-400">
                      {item.current_attendees || 0}/{item.max_attendees} {t('catalog.places')}
                    </div>
                  )}
                </div>

                {/* Date display - Recurring or one-time */}
                {item.is_recurring ? (
                  <div className="text-xs sm:text-sm text-gray-400 mb-4 break-words">
                    {t('catalog.recurringCourseLabel')} {Array.isArray(item.recurrence_days) && item.recurrence_days.length > 0 ? (
                      <>
                        {item.recurrence_days.map(day => t(`catalog.days.${day}`)).join(', ')}
                      </>
                    ) : t('catalog.undefined')}
                    {item.recurrence_time && ` ${t('catalog.at')} ${item.recurrence_time}`}
                  </div>
                ) : item.event_date && (
                  <div className="text-xs sm:text-sm text-gray-400 mb-4 break-words">
                    📅 {new Date(item.event_date).toLocaleDateString(i18n.language, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}

                <div className="space-y-2 mt-auto">
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      title={t('catalog.edit')}
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPublic(item)}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      title={t('catalog.viewPublic') || 'View Public'}
                    >
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(item);
                      }}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      title={t('catalog.duplicate') || 'Duplicate'}
                    >
                      <Files className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-600"
                      title={t('common.delete') || 'Delete'}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>

                  {/* Reserve button (prominent) */}
                  {(item.category === 'course' || item.category === 'event') && (
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 mt-2 sm:mt-3 text-xs sm:text-sm"
                      size="sm"
                      onClick={() => handleReserve(item)}
                    >
                      <Calendar className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="break-words text-xs sm:text-sm">{t('catalog.reserve')} {item.price > 0 ? `(${item.price} ${item.currency})` : `(${t('catalog.free')})`}</span>
                    </Button>
                  )}

                  {/* Share buttons */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2 border-t border-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareWhatsApp(item)}
                      className="flex-1 min-w-0 text-[10px] sm:text-xs h-7 sm:h-8"
                    >
                      <MessageCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline truncate">{t('catalog.whatsapp')}</span>
                      <span className="sm:hidden">WA</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareEmail(item)}
                      className="flex-1 min-w-0 text-[10px] sm:text-xs h-7 sm:h-8"
                    >
                      <Mail className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline truncate">{t('catalog.email')}</span>
                      <span className="sm:hidden">Email</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(item)}
                      className="flex-1 min-w-0 text-[10px] sm:text-xs h-7 sm:h-8"
                    >
                      <Copy className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline truncate">{t('catalog.link')}</span>
                      <span className="sm:hidden">Link</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setCategorySelectOpen(false);
            setCurrencySelectOpen(false);
          }
        }}
      >
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t('catalog.editItem') : t('catalog.createItem')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">{t('catalog.title_label')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">{t('catalog.description')}</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full min-h-[100px] p-3 rounded-md bg-background border border-primary/20 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">{t('catalog.category')}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  open={categorySelectOpen}
                  onOpenChange={setCategorySelectOpen}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">{t('catalog.categories.course')}</SelectItem>
                    <SelectItem value="event">{t('catalog.categories.event')}</SelectItem>
                    <SelectItem value="product">{t('catalog.categories.product')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">{t('catalog.price')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    open={currencySelectOpen}
                    onOpenChange={setCurrencySelectOpen}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHF">CHF</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <ImageUploader
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label={t('catalog.imageVideoUrl')}
              />
              <p className="text-xs text-gray-500">
                {t('catalog.imageVideoHint')}
              </p>
            </div>


            {formData.category === 'product' && (
              <div>
                <Label htmlFor="stock_quantity">{t('catalog.stockAvailable')}</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder={t('catalog.unlimitedPlaceholder')}
                />
              </div>
            )}

            {(formData.category === 'course' || formData.category === 'event') && (
              <>
                <div>
                  <Label htmlFor="max_attendees">{t('catalog.maxAttendees')}</Label>
                  <Input
                    id="max_attendees"
                    type="number"
                    value={formData.max_attendees}
                    onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                    placeholder={t('catalog.unlimitedPlaceholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="event_date">{t('catalog.dateTime')}</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="event_duration">{t('catalog.eventDuration')}</Label>
                  <Input
                    id="event_duration"
                    type="number"
                    value={formData.event_duration}
                    onChange={(e) => setFormData({ ...formData, event_duration: e.target.value })}
                    placeholder="60"
                  />
                </div>

                <div>
                  <Label htmlFor="location">{t('catalog.location')}</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Adresse ou Zoom/En ligne"
                  />
                </div>

                {/* Recurring Course Option */}
                <div className="border-t border-primary/20 pt-4 mt-4">
                  <div className="flex items-center space-x-3 mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({
                        ...formData,
                        is_recurring: e.target.checked,
                        event_date: e.target.checked ? '' : formData.event_date
                      })}
                      className="w-5 h-5 rounded border-2 border-primary bg-background checked:bg-primary checked:border-primary cursor-pointer accent-primary"
                    />
                    <Label htmlFor="is_recurring" className="cursor-pointer flex-1 font-medium text-white">
                      {t('catalog.recurringCourseWeekly')}
                    </Label>
                  </div>

                  {formData.is_recurring && (
                    <div className="space-y-4 bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                      <p className="text-sm text-blue-400">
                        {t('catalog.recurringCourseInfo')}
                      </p>

                      <div>
                        <Label>{t('catalog.weekDays')}</Label>
                        <div className="grid grid-cols-7 gap-2 mt-2">
                          {[
                            { key: 'monday' },
                            { key: 'tuesday' },
                            { key: 'wednesday' },
                            { key: 'thursday' },
                            { key: 'friday' },
                            { key: 'saturday' },
                            { key: 'sunday' }
                          ].map(day => {
                            const currentDays = Array.isArray(formData.recurrence_days) ? formData.recurrence_days : [];
                            return (
                              <button
                                key={day.key}
                                type="button"
                                onClick={() => {
                                  const days = currentDays.includes(day.key)
                                    ? currentDays.filter(d => d !== day.key)
                                    : [...currentDays, day.key];
                                  setFormData({ ...formData, recurrence_days: days });
                                }}
                                className={`p-2 rounded text-sm font-medium transition-colors ${currentDays.includes(day.key)
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                  }`}
                              >
                                {t(`catalog.days.${day.key}`)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="recurrence_time">{t('catalog.courseTime')}</Label>
                        <Input
                          id="recurrence_time"
                          type="time"
                          value={formData.recurrence_time}
                          onChange={(e) => setFormData({ ...formData, recurrence_time: e.target.value })}
                          placeholder="19:00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Publication Options */}
            <div className="border-t border-primary/20 pt-4 space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30 hover:bg-green-500/20 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published || false}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-primary bg-background checked:bg-primary checked:border-primary cursor-pointer accent-primary"
                />
                <Label htmlFor="is_published" className="cursor-pointer flex-1 font-medium text-white">
                  {t('catalog.publishVisible')}
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active !== false}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-primary bg-background checked:bg-primary checked:border-primary cursor-pointer accent-primary"
                />
                <Label htmlFor="is_active" className="cursor-pointer flex-1 font-medium text-white">
                  {t('catalog.activateReservations')}
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCategorySelectOpen(false);
                  setCurrencySelectOpen(false);
                  setShowDialog(false);
                  resetForm();
                }}
              >
                {t('catalog.cancel')}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingItem ? t('catalog.update') : t('catalog.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reservation Modal */}
      <Dialog open={showReservationModal} onOpenChange={setShowReservationModal}>
        <DialogContent className="glass border-primary/20">
          <DialogHeader>
            <DialogTitle>
              Réserver : {selectedItem?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedItem && (
              <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
                <p className="text-sm text-gray-300">
                  <strong>Prix :</strong> {selectedItem.price} {selectedItem.currency}
                  {selectedItem.price === 0 && ' (Gratuit)'}
                </p>
                {selectedItem.max_attendees && (
                  <p className="text-sm text-gray-300">
                    <strong>Places disponibles :</strong> {selectedItem.max_attendees - (selectedItem.current_attendees || 0)}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="res_name">Nom complet *</Label>
              <Input
                id="res_name"
                value={reservationForm.customer_name}
                onChange={(e) => setReservationForm({ ...reservationForm, customer_name: e.target.value })}
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <Label htmlFor="res_email">Email *</Label>
              <Input
                id="res_email"
                type="email"
                value={reservationForm.customer_email}
                onChange={(e) => setReservationForm({ ...reservationForm, customer_email: e.target.value })}
                placeholder="jean@example.com"
              />
            </div>

            <div>
              <Label htmlFor="res_phone">Téléphone</Label>
              <Input
                id="res_phone"
                type="tel"
                value={reservationForm.customer_phone}
                onChange={(e) => setReservationForm({ ...reservationForm, customer_phone: e.target.value })}
                placeholder="+41 79 123 45 67"
              />
            </div>

            <div>
              <Label htmlFor="res_quantity">Nombre de places</Label>
              <Input
                id="res_quantity"
                type="number"
                min="1"
                max={selectedItem?.max_attendees ? selectedItem.max_attendees - (selectedItem.current_attendees || 0) : 10}
                value={reservationForm.quantity}
                onChange={(e) => setReservationForm({ ...reservationForm, quantity: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="res_notes">Notes (optionnel)</Label>
              <textarea
                id="res_notes"
                className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white min-h-[80px]"
                value={reservationForm.notes}
                onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                placeholder="Allergies, besoins spéciaux, etc."
              />
            </div>

            {selectedItem && selectedItem.price > 0 && (
              <div className="space-y-2">
                <Label>Méthode de paiement</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      value="stripe"
                      checked={reservationForm.payment_method === 'stripe'}
                      onChange={(e) => setReservationForm({ ...reservationForm, payment_method: e.target.value })}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-white">💳 Payer maintenant (Stripe)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      value="free"
                      checked={reservationForm.payment_method === 'free'}
                      onChange={(e) => setReservationForm({ ...reservationForm, payment_method: e.target.value })}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-white">📝 Réserver sans payer (confirmation requise)</span>
                  </label>
                </div>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-400">
                {reservationForm.payment_method === 'stripe' && selectedItem?.price > 0
                  ? '💳 Vous serez redirigé vers Stripe pour effectuer le paiement sécurisé'
                  : '📧 Un email de confirmation vous sera envoyé'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReservationModal(false)}
              disabled={isProcessing}
            >
              Annuler
            </Button>
            <Button
              onClick={handleReservationSubmit}
              disabled={isProcessing}
              className="bg-gradient-to-r from-primary to-purple-600"
            >
              {isProcessing ? (
                <>Traitement...</>
              ) : (
                <>
                  {reservationForm.payment_method === 'stripe' && selectedItem?.price > 0
                    ? `Payer ${selectedItem.price * reservationForm.quantity} ${selectedItem.currency}`
                    : 'Confirmer la réservation'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Catalog;
