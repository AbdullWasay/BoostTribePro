import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const productId = searchParams.get('product_id');
  const initialQuantity = parseInt(searchParams.get('quantity') || '1');
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    quantity: initialQuantity
  });

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/catalog/${productId}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: '❌ Erreur',
        description: 'Produit introuvable',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Call real Stripe checkout route
      const response = await axios.post(`${API_URL}/api/reservations/checkout`, {
        catalog_item_id: productId,
        quantity: formData.quantity,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        origin_url: window.location.origin
      });
      
      // Redirect to Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('URL de paiement manquante');
      }
      
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || 'Erreur lors de la création de la session de paiement',
        variant: 'destructive'
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <Card className="glass border-primary/20 max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-white text-xl mb-4">Produit introuvable</p>
            <Button onClick={() => navigate('/catalog/public')}>
              Retour au catalogue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkoutComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <Card className="glass border-primary/20 max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Commande créée !</h2>
            <Badge className="bg-yellow-500/20 text-yellow-400 mb-4">
              Mode Simulation
            </Badge>
            <p className="text-gray-300 mb-6">
              Votre commande a été enregistrée en mode simulation.
              Les paiements Stripe et Twint seront configurés prochainement.
            </p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => navigate('/catalog/public')}
              >
                Retour au catalogue
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/p/${product.slug}`)}
              >
                Voir le produit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = product.price * formData.quantity;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Finaliser votre commande
          </h1>
          <Badge className="bg-yellow-500/20 text-yellow-400">
            Mode Simulation - Paiement à venir
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Résumé de la commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="h-10 w-10 text-primary/50" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{product.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{product.description}</p>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Prix unitaire:</span>
                  <span>{product.price} {product.currency}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Quantité:</span>
                  <span>{formData.quantity}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-primary border-t border-gray-700 pt-2">
                  <span>Total:</span>
                  <span>{totalAmount} {product.currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Vos informations
              </CardTitle>
              <CardDescription>
                Remplissez vos coordonnées pour finaliser
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nom complet *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Jean Dupont"
                    required
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="jean@example.com"
                    required
                  />
                </div>

                <div>
                  <Label>Téléphone</Label>
                  <Input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="+41 79 123 45 67"
                  />
                </div>

                <div>
                  <Label>Quantité *</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                    >
                      -
                    </Button>
                    <span className="text-white w-12 text-center">{formData.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? 'Redirection vers Stripe...' : `Payer ${totalAmount} ${product.currency}`}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/p/${product.slug}`)}
                  >
                    Retour au produit
                  </Button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                  <p className="text-xs text-blue-400 text-center">
                    🔒 Paiement sécurisé via Stripe. Vos données sont protégées et cryptées.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
