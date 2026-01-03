import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Trash2,
  ChevronDown,
  Lightbulb,
  BarChart,
  Target,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const AIAssistantWidget = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [taskType, setTaskType] = useState('general');
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && !sessionId) {
      // Create new session when opening
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      setMessages([{
        role: 'assistant',
        content: '👋 Bonjour ! Je suis votre assistant IA BoostTribe. Comment puis-je vous aider aujourd\'hui ?',
        timestamp: new Date()
      }]);
      setSuggestions([
        'Comment créer une campagne ?',
        'Analyser mes résultats',
        'Conseils marketing'
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/ai/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend,
          session_id: sessionId,
          task_type: taskType,
          context: {}
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de contacter l'assistant IA",
        variant: "destructive"
      });
      const errorMessage = {
        role: 'assistant',
        content: '❌ Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([{
      role: 'assistant',
      content: '👋 Nouvelle conversation ! Comment puis-je vous aider ?',
      timestamp: new Date()
    }]);
  };

  const changeTaskType = (type) => {
    setTaskType(type);
    const taskMessages = {
      general: 'Mode général activé. Je peux vous aider avec toutes vos questions !',
      campaign: '📧 Mode création de campagne activé. Créons ensemble du contenu engageant !',
      analysis: '📊 Mode analyse activé. Analysons vos données ensemble !',
      strategy: '🎯 Mode stratégie activé. Planifions votre réussite !'
    };
    toast({
      title: "Mode changé",
      description: taskMessages[type]
    });
  };

  if (!token) return null; // Don't show widget if not authenticated

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="h-5 w-5 md:h-6 md:w-6 group-hover:animate-spin" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed inset-4 md:inset-auto md:bottom-6 md:right-6 z-50 w-auto md:w-96 h-auto md:h-[600px] max-h-[calc(100vh-2rem)] md:max-h-[600px] flex flex-col glass rounded-lg shadow-2xl border border-primary/30 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-white" />
              <div>
                <h3 className="font-semibold text-white"><span>Assistant IA</span></h3>
                <p className="text-xs text-white/80"><span>Propulsé par GPT-4o</span></p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearChat}
                className="text-white/80 hover:text-white transition-colors"
                title="Nouvelle conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Task Type Selector */}
          <div className="px-3 py-2 bg-background/50 border-b border-primary/20 flex gap-2 overflow-x-auto">
            <Badge
              onClick={() => changeTaskType('general')}
              className={`cursor-pointer ${taskType === 'general' ? 'bg-primary' : 'bg-gray-600'}`}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              <span>Général</span>
            </Badge>
            <Badge
              onClick={() => changeTaskType('campaign')}
              className={`cursor-pointer ${taskType === 'campaign' ? 'bg-primary' : 'bg-gray-600'}`}
            >
              <Mail className="h-3 w-3 mr-1" />
              <span>Campagne</span>
            </Badge>
            <Badge
              onClick={() => changeTaskType('analysis')}
              className={`cursor-pointer ${taskType === 'analysis' ? 'bg-primary' : 'bg-gray-600'}`}
            >
              <BarChart className="h-3 w-3 mr-1" />
              <span>Analyse</span>
            </Badge>
            <Badge
              onClick={() => changeTaskType('strategy')}
              className={`cursor-pointer ${taskType === 'strategy' ? 'bg-primary' : 'bg-gray-600'}`}
            >
              <Target className="h-3 w-3 mr-1" />
              <span>Stratégie</span>
            </Badge>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                      : 'bg-background/80 border border-primary/20'
                    }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-xs text-gray-400"><span>Assistant</span></span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-50 mt-1 block">
                    {message.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background/80 border border-primary/20 rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary animate-spin" />
                    <span className="text-sm text-gray-400"><span>L'assistant réfléchit...</span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs bg-background/50 hover:bg-background/80 border border-primary/20 rounded-full px-3 py-1 transition-colors flex items-center gap-1"
                >
                  <Lightbulb className="h-3 w-3" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-primary/20 bg-background/50">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-pink-500 to-purple-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              <span>💡 Appuyez sur Entrée pour envoyer</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistantWidget;
