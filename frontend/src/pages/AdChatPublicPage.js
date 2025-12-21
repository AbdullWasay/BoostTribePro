import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdChatPublicPage = () => {
  const { userId } = useParams();
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/ad-chat/public`, {
        user_id: userId,
        visitor_name: formData.visitor_name,
        visitor_email: formData.visitor_email,
        ad_platform: 'public_page',
        messages: [{
          sender: 'visitor',
          content: formData.message,
          timestamp: new Date().toISOString()
        }]
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <MessageCircle className="h-16 w-16 mx-auto text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">✅ Message envoyé !</h2>
            <p className="text-gray-400">
              Merci pour votre message. Nous vous répondrons dans les plus brefs délais.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full glass border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold mb-2">
            💬 Contactez-nous
          </CardTitle>
          <p className="text-gray-400">
            Envoyez-nous un message et nous vous répondrons rapidement
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Votre nom</label>
              <Input
                required
                value={formData.visitor_name}
                onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                placeholder="Jean Dupont"
                className="bg-background/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Votre email</label>
              <Input
                required
                type="email"
                value={formData.visitor_email}
                onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                placeholder="jean@example.com"
                className="bg-background/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Votre message</label>
              <Textarea
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Décrivez votre demande..."
                className="bg-background/50"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              {loading ? 'Envoi...' : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Envoyer le message
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdChatPublicPage;
