import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, UserCheck, Star, Facebook, Instagram, Linkedin } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdChat = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChats();
  }, [filterStatus]);

  const fetchChats = async () => {
    try {
      const url = filterStatus === 'all' 
        ? `${API_URL}/api/ad-chat`
        : `${API_URL}/api/ad-chat?status=${filterStatus}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de charger les conversations',
        variant: 'destructive'
      });
    }
  };

  const loadChatDetails = async (chatId) => {
    try {
      const response = await axios.get(`${API_URL}/api/ad-chat/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedChat(response.data);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/ad-chat/${selectedChat.id}/message`,
        {
          sender: 'agent',
          content: message.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSelectedChat(response.data);
      setMessage('');
      
      // Update chat in list
      setChats(chats.map(c => c.id === selectedChat.id ? response.data : c));
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToContact = async (chatId) => {
    try {
      await axios.post(
        `${API_URL}/api/ad-chat/${chatId}/convert`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: '✅ Converti en contact',
        description: 'Le visiteur a été ajouté à vos contacts'
      });
      
      fetchChats();
      if (selectedChat?.id === chatId) {
        loadChatDetails(chatId);
      }
    } catch (error) {
      console.error('Error converting to contact:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || 'Impossible de convertir en contact',
        variant: 'destructive'
      });
    }
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      facebook: <Facebook className="h-4 w-4" />,
      instagram: <Instagram className="h-4 w-4" />,
      google: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>,
      linkedin: <Linkedin className="h-4 w-4" />
    };
    return icons[platform] || <MessageCircle className="h-4 w-4" />;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Actif', className: 'bg-green-500/20 text-green-400' },
      resolved: { label: 'Résolu', className: 'bg-blue-500/20 text-blue-400' },
      archived: { label: 'Archivé', className: 'bg-gray-500/20 text-gray-400' },
      converted: { label: 'Converti', className: 'bg-purple-500/20 text-purple-400' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      urgent: { label: 'Urgent', className: 'bg-red-500/20 text-red-400' },
      high: { label: 'Haute', className: 'bg-orange-500/20 text-orange-400' },
      normal: { label: 'Normale', className: 'bg-blue-500/20 text-blue-400' },
      low: { label: 'Basse', className: 'bg-gray-500/20 text-gray-400' }
    };
    
    const config = priorityConfig[priority] || priorityConfig.normal;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4">
      {/* Chat List */}
      <Card className={`glass border-primary/20 w-full md:w-1/3 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations Publicitaires
          </CardTitle>
          <CardDescription>
            {chats.length} conversation(s)
          </CardDescription>
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
            >
              Tous
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('active')}
            >
              Actifs
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'converted' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('converted')}
            >
              Convertis
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {chats.length === 0 ? (
            <div className="py-12 text-center">
              <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucune conversation pour le moment</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => loadChatDetails(chat.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChat?.id === chat.id
                    ? 'bg-primary/20 border border-primary'
                    : 'bg-background/50 border border-gray-700 hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(chat.ad_platform)}
                    <span className="font-medium text-sm">
                      {chat.visitor_name || 'Visiteur anonyme'}
                    </span>
                  </div>
                  {getStatusBadge(chat.status)}
                </div>
                <p className="text-xs text-gray-400 truncate mb-2">
                  {chat.messages[chat.messages.length - 1]?.content || 'Nouvelle conversation'}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(chat.last_message_at).toLocaleString('fr-FR')}</span>
                  {chat.messages.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {chat.messages.length} msg
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chat Details */}
      <Card className={`glass border-primary/20 flex-1 flex flex-col ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedChat ? (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {/* Back button on mobile */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden"
                      onClick={() => setSelectedChat(null)}
                    >
                      ← Retour
                    </Button>
                    <CardTitle className="flex items-center gap-2">
                      {getPlatformIcon(selectedChat.ad_platform)}
                      {selectedChat.visitor_name || 'Visiteur anonyme'}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-1">
                    {selectedChat.visitor_email && (
                      <span className="block">{selectedChat.visitor_email}</span>
                    )}
                    {selectedChat.visitor_phone && (
                      <span className="block">{selectedChat.visitor_phone}</span>
                    )}
                    <span className="block">
                      Campagne: {selectedChat.ad_campaign_name || 'Non spécifiée'}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {getStatusBadge(selectedChat.status)}
                  {getPriorityBadge(selectedChat.priority)}
                  {!selectedChat.converted_to_contact && selectedChat.visitor_email && (
                    <Button
                      size="sm"
                      onClick={() => handleConvertToContact(selectedChat.id)}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Convertir en contact
                    </Button>
                  )}
                  {selectedChat.converted_to_contact && (
                    <Badge className="bg-purple-500/20 text-purple-400">
                      <UserCheck className="mr-1 h-3 w-3" />
                      Contact créé
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {selectedChat.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      msg.sender === 'agent'
                        ? 'bg-primary text-white'
                        : 'bg-background border border-gray-700'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>

            {/* Message Input */}
            <CardContent className="border-t border-gray-700 pt-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  disabled={loading || selectedChat.status === 'archived'}
                />
                <Button type="submit" disabled={loading || !message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Sélectionnez une conversation pour commencer
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AdChat;
