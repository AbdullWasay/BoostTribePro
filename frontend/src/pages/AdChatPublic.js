import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageCircle, Send, Sparkles, User, Bot, Loader2, Info } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdChatPublic = () => {
  const { t, i18n } = useTranslation();
  const messagesEndRef = useRef(null);
  const { slug } = useParams();
  const [coach, setCoach] = useState(null);
  const [fetchingCoach, setFetchingCoach] = useState(true);

  const [chatStarted, setChatStarted] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [visitorInfo, setVisitorInfo] = useState({
    name: '',
    email: '',
    phone: '',
    initial_message: ''
  });

  useEffect(() => {
    if (slug) {
      fetchCoach();
    }
  }, [slug]);

  const fetchCoach = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/coach/slug/${slug}`);
      setCoach(response.data);
    } catch (error) {
      console.error('Error fetching coach:', error);
      toast.error('Coach non trouvé');
    } finally {
      setFetchingCoach(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages when chat is started
  useEffect(() => {
    let interval;
    if (chatStarted && chatId) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/api/ad-chat/${chatId}`);
          setMessages(response.data.messages || []);
        } catch (error) {
          console.error('Error polling messages:', error);
        }
      }, 5000); // Poll every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [chatStarted, chatId]);

  const handleStartChat = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/ad-chat/public`, {
        user_id: coach?.id,
        visitor_name: visitorInfo.name,
        visitor_email: visitorInfo.email,
        visitor_phone: visitorInfo.phone,
        ad_platform: 'public_chat',
        messages: [{
          sender: 'visitor',
          content: visitorInfo.initial_message,
          timestamp: new Date().toISOString()
        }]
      });

      setChatId(response.data.id);
      setMessages(response.data.messages || []);
      setChatStarted(true);

    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Impossible de démarrer le chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || !chatId) return;

    // Optimistic UI update
    const tempMessage = {
      sender: 'visitor',
      content: currentMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/ad-chat/${chatId}/message`,
        {
          sender: 'visitor',
          content: tempMessage.content
        }
      );

      setMessages(response.data.messages || []);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Impossible d\'envoyer le message');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingCoach) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!chatStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-2 sm:p-4">
        <Card className="glass border-primary/20 w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">
              {coach ? t('adChat.chatWith', { name: coach.name }) : t('adChat.welcome')}
            </CardTitle>
            <p className="text-sm sm:text-base text-gray-400 mt-2">
              {t('adChat.askQuestion', { coach: coach ? t('common.toYourCoach', { defaultValue: 'à votre coach' }) : '' })}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartChat} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-base">{t('adChat.visitorName')}</Label>
                <Input
                  id="name"
                  value={visitorInfo.name}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, name: e.target.value })}
                  placeholder="Jean Dupont"
                  required
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-base">{t('adChat.visitorEmail')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={visitorInfo.email}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, email: e.target.value })}
                  placeholder="jean@example.com"
                  required
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-base">{t('adChat.visitorPhone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={visitorInfo.phone}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, phone: e.target.value })}
                  placeholder="+41 79 123 45 67"
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-base">{t('adChat.visitorMessage')}</Label>
                <textarea
                  id="message"
                  value={visitorInfo.initial_message}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, initial_message: e.target.value })}
                  placeholder="Bonjour, je suis intéressé par..."
                  required
                  className="w-full bg-background border border-gray-700 rounded-md px-4 py-3 text-white min-h-[100px] text-base"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                disabled={loading}
              >
                {loading ? t('adChat.connecting') : t('adChat.startChat')}
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-primary/20 p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">
              {coach ? t('adChat.chatWith', { name: coach.name }) : t('adChat.assistantTitle')}
            </h1>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-xs sm:text-sm text-gray-400">{t('adChat.online')}</p>
            </div>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/50 hidden sm:inline-flex">
            {t('adChat.activeAI')}
          </Badge>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex-shrink-0">
        <Alert className="bg-transparent border-0 p-0">
          <Info className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs sm:text-sm text-amber-200 ml-2">
            {t('adChat.guestWarning', { defaultValue: '⚠️ Guest mode: Your chat history may be lost. Register for a free account to save your conversations!' })}
          </AlertDescription>
        </Alert>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === 'visitor' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
            >
              <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%] ${msg.sender === 'visitor' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'visitor'
                  ? 'bg-primary'
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                  {msg.sender === 'visitor' ? (
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  )}
                </div>

                <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${msg.sender === 'visitor'
                  ? 'bg-primary text-white'
                  : 'bg-gray-800/80 text-gray-100 border border-gray-700/50'
                  }`}>
                  <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <p className={`text-[10px] sm:text-xs mt-1 ${msg.sender === 'visitor' ? 'text-white/70' : 'text-gray-500'
                    }`}>
                    {new Date(msg.timestamp).toLocaleTimeString(i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-in fade-in">
              <div className="flex gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl px-4 py-3 flex items-center gap-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container */}
      <div className="bg-black/30 backdrop-blur-sm border-t border-primary/20 p-2 sm:p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder={t('adChat.typeMessage')}
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg bg-gray-800/50 border-gray-700 focus:border-primary"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !currentMessage.trim()}
              className="h-12 sm:h-14 w-12 sm:w-14 p-0 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 flex-shrink-0"
            >
              <Send className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdChatPublic;
