import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ReservationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, success, failed, expired
  const [paymentData, setPaymentData] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus('failed');
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attemptCount = 0) => {
    const maxAttempts = 8;
    const pollInterval = 2000; // 2 seconds

    if (attemptCount >= maxAttempts) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/payments/status/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();
      setPaymentData(data);

      if (data.payment_status === 'paid') {
        setStatus('success');
        return;
      } else if (data.status === 'expired') {
        setStatus('expired');
        return;
      }

      // Continue polling
      setAttempts(attemptCount + 1);
      setTimeout(() => pollPaymentStatus(attemptCount + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <Card className="glass border-primary/20 max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'checking' && 'Vérification du paiement...'}
            {status === 'success' && '🎉 Réservation confirmée !'}
            {status === 'failed' && 'Erreur de paiement'}
            {status === 'expired' && 'Session expirée'}
            {status === 'timeout' && 'Vérification en cours'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'checking' && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <p className="text-gray-400">
                Vérification de votre paiement en cours...
              </p>
              <p className="text-sm text-gray-500">
                Tentative {attempts + 1}/8
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-lg text-white font-semibold">
                  Paiement réussi !
                </p>
                <p className="text-gray-400">
                  Votre réservation a été confirmée. Un email de confirmation vous a été envoyé.
                </p>
                {paymentData && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                    <p className="text-sm text-green-400">
                      Montant payé : {(paymentData.amount_total / 100).toFixed(2)} {paymentData.currency?.toUpperCase()}
                    </p>
                  </div>
                )}
              </div>
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Retour au tableau de bord
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-lg text-white font-semibold">
                  Erreur de paiement
                </p>
                <p className="text-gray-400">
                  Une erreur est survenue lors de la vérification du paiement.
                </p>
              </div>
              <Button
                onClick={() => navigate('/catalog')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au catalogue
              </Button>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-4">
              <XCircle className="h-16 w-16 text-yellow-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-lg text-white font-semibold">
                  Session expirée
                </p>
                <p className="text-gray-400">
                  Votre session de paiement a expiré. Veuillez réessayer.
                </p>
              </div>
              <Button
                onClick={() => navigate('/catalog')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au catalogue
              </Button>
            </div>
          )}

          {status === 'timeout' && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 text-yellow-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-lg text-white font-semibold">
                  Vérification en cours...
                </p>
                <p className="text-gray-400">
                  La vérification prend plus de temps que prévu. Veuillez vérifier votre email pour la confirmation ou contactez le support.
                </p>
              </div>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au tableau de bord
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservationSuccess;
