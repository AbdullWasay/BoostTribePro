import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Share2, ShoppingCart, Calendar, MapPin, Users, Copy, Mail, MessageCircle, ChevronLeft } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  // Update meta tags for Open Graph (WhatsApp/Facebook link previews)
  useEffect(() => {
    if (product) {
      const productUrl = window.location.href;
      let productImage = product.image_url || `${window.location.origin}/logo512.png`;
      
      // Check if image_url is a YouTube URL and extract thumbnail
      if (product.image_url) {
        const youtubeMatch = product.image_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/);
        if (youtubeMatch) {
          const videoId = youtubeMatch[1];
          productImage = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }
      
      const productTitle = product.title;
      const productDescription = product.description || `${product.title} - ${product.price} ${product.currency}`;
      
      // Update or create OG meta tags
      const updateMetaTag = (property, content) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      // Update title
      document.title = productTitle;

      // Update OG tags
      updateMetaTag('og:title', productTitle);
      updateMetaTag('og:description', productDescription);
      updateMetaTag('og:image', productImage);
      updateMetaTag('og:url', productUrl);
      updateMetaTag('og:type', 'product');

      // Update Twitter card tags
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', productTitle);
      updateMetaTag('twitter:description', productDescription);
      updateMetaTag('twitter:image', productImage);

      // Update description meta tag
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.setAttribute('name', 'description');
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute('content', productDescription);
    }

    // Cleanup: restore default meta tags when component unmounts
    return () => {
      document.title = 'BoostTribe - Marketing Multicanal Intelligent';
      const defaultOGTitle = document.querySelector('meta[property="og:title"]');
      if (defaultOGTitle) {
        defaultOGTitle.setAttribute('content', 'BoostTribe - Marketing Multicanal Intelligent');
      }
    };
  }, [product]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/catalog/public/${slug}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: '❌ Produit introuvable',
        description: 'Ce produit n\'existe pas ou n\'est plus disponible',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    // Navigate to checkout page
    navigate(`/checkout?product_id=${product.id}&quantity=${quantity}`);
  };

  const handleShareWhatsApp = () => {
    const productUrl = window.location.href;
    const text = `Découvre ${product.title} - ${product.price} ${product.currency}\n${productUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: '✅ Partage WhatsApp',
      description: 'Fenêtre de partage ouverte'
    });
  };

  const handleShareEmail = () => {
    const productUrl = window.location.href;
    const subject = `Découvre ${product.title}`;
    const body = `Bonjour,\n\nJe voulais partager avec toi ce produit:\n\n${product.title}\nPrix: ${product.price} ${product.currency}\n\n${product.description}\n\nLien: ${productUrl}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    
    toast({
      title: '✅ Email ouvert',
      description: 'Composez votre message'
    });
  };

  const handleCopyLink = () => {
    const productUrl = window.location.href;
    navigator.clipboard.writeText(productUrl);
    toast({
      title: '✅ Lien copié',
      description: 'Le lien du produit a été copié'
    });
  };

  const getCategoryBadge = (category) => {
    const categories = {
      course: { label: '📚 Cours', className: 'bg-blue-500/20 text-blue-400' },
      event: { label: '🎉 Événement', className: 'bg-purple-500/20 text-purple-400' },
      product: { label: '📦 Produit', className: 'bg-green-500/20 text-green-400' }
    };
    const config = categories[category] || categories.product;
    return <Badge className={config.className}>{config.label}</Badge>;
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
            <p className="text-white text-xl mb-4">Produit introuvable</p>
            <Button onClick={() => navigate('/catalog/public')}>
              Voir le catalogue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const placesLeft = product.max_attendees 
    ? product.max_attendees - product.current_attendees 
    : null;
  const stockInfo = product.stock_quantity !== null ? product.stock_quantity : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => navigate('/catalog/public')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Retour au catalogue
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <Card className="glass border-primary/20">
            <CardContent className="p-6">
              {product.image_url ? (() => {
                const url = product.image_url;
                const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/);
                const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                
                if (youtubeMatch) {
                  const videoId = youtubeMatch[1];
                  return (
                    <div className="relative w-full h-96 group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                      <img 
                        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                        alt={product.title}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors rounded-lg">
                        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-t-12 border-t-transparent border-l-16 border-l-white border-b-12 border-b-transparent ml-2"></div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (vimeoMatch) {
                  return (
                    <div className="w-full h-96 bg-black rounded-lg flex items-center justify-center cursor-pointer" onClick={() => window.open(url, '_blank')}>
                      <div className="text-center">
                        <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <div className="w-0 h-0 border-t-12 border-t-transparent border-l-16 border-l-white border-b-12 border-b-transparent ml-2"></div>
                        </div>
                        <p className="text-lg text-gray-300">Vidéo Vimeo</p>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <img
                      src={url}
                      alt={product.title}
                      className="w-full h-96 object-cover rounded-lg"
                    />
                  );
                }
              })() : (
                <div className="w-full h-96 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-24 w-24 text-primary/50" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Details */}
          <div className="space-y-6">
            <Card className="glass border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-2">{product.title}</CardTitle>
                    {getCategoryBadge(product.category)}
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-primary">
                      {product.price} {product.currency}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">{product.description}</p>

                {/* Additional Info */}
                <div className="space-y-2">
                  {product.event_date && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>
                        {new Date(product.event_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  
                  {product.location && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{product.location}</span>
                    </div>
                  )}
                  
                  {placesLeft !== null && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{placesLeft} places restantes</span>
                    </div>
                  )}
                  
                  {stockInfo !== null && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      <span>Stock: {stockInfo} unités</span>
                    </div>
                  )}
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-4">
                  <label className="text-white">Quantité:</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <span className="text-white w-12 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Buy Button */}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleBuyNow}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Acheter maintenant
                </Button>

                {/* Share Buttons */}
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-white mb-3 font-medium">Partager ce produit:</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={handleShareWhatsApp}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShareEmail}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copier le lien
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
