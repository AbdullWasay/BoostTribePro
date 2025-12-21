import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, X } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ProductLinkSelector = ({ onSelectProduct, onClose }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/catalog`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const published = response.data.filter(p => p.is_published && p.is_active);
      setProducts(published);
      setFilteredProducts(published);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product) => {
    const productUrl = `${window.location.origin}/p/${product.slug}`;
    const productText = `🛍️ ${product.title} - ${product.price} ${product.currency}\n${productUrl}`;
    onSelectProduct(productText, product);
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
      <div className="p-8 text-center">
        <div className="text-white">Chargement des produits...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Sélectionner un produit</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredProducts.length === 0 ? (
          <Card className="glass border-primary/20">
            <CardContent className="py-8 text-center text-gray-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun produit publié</p>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="glass border-primary/20 hover:border-primary/40 transition-all cursor-pointer"
              onClick={() => handleSelectProduct(product)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white truncate">{product.title}</h4>
                      {getCategoryBadge(product.category)}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-1">{product.description}</p>
                    <p className="text-lg font-bold text-primary mt-1">
                      {product.price} {product.currency}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        💡 Cliquez sur un produit pour insérer son lien dans votre message
      </p>
    </div>
  );
};

export default ProductLinkSelector;
