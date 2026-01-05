import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${API_URL}/api`;

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionId && sessionId !== 'free') {
      verifyPayment();
    } else if (sessionId === 'free') {
      // Free plan - just mark as success
      setSuccess(true);
      setLoading(false);
    } else {
      setError('Session ID manquant');
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      // Check payment status
      const response = await axios.get(`${API}/payments/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.payment_status === 'paid' || response.data.status === 'completed') {
        setSuccess(true);
        toast.success('Abonnement activé avec succès !');
      } else {
        setError('Le paiement n\'a pas encore été confirmé. Veuillez patienter quelques instants.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Erreur lors de la vérification du paiement. Votre abonnement sera activé sous peu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <Card className="glass border-primary/20 max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-white text-xl">Vérification du paiement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <Card className="glass border-primary/20 max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">En attente de confirmation</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Aller au tableau de bord
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/profile')}
              >
                Voir mon profil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <Card className="glass border-primary/20 max-w-md">
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Abonnement activé !</h2>
          <p className="text-gray-300 mb-6">
            Votre abonnement a été activé avec succès. Vous avez maintenant accès à toutes les fonctionnalités premium.
          </p>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              Aller au tableau de bord
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/profile')}
            >
              Voir mon profil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;

