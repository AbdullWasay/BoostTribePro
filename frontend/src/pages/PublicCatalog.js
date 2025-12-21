import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Calendar, MapPin, Search, Filter } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PublicCatalog = () => {
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, categoryFilter, products]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/catalog-public/all`);
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    setFilteredProducts(filtered);
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
        <div className="text-white text-xl">Chargement du catalogue...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gradient mb-4">
            BoostTribe Catalogue
          </h1>
          <p className="text-gray-300 text-xl">
            Découvrez nos produits, cours et événements
          </p>
        </div>

        {/* Filters */}
        <Card className="glass border-primary/20 mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex-1 bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                >
                  <option value="all">Toutes les catégories</option>
                  <option value="product">Produits</option>
                  <option value="course">Cours</option>
                  <option value="event">Événements</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-400">
              {filteredProducts.length} produit(s) trouvé(s)
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card className="glass border-primary/20">
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucun produit trouvé</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="glass border-primary/20 hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => navigate(`/p/${product.slug}`)}
              >
                <CardHeader>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg mb-4 flex items-center justify-center">
                      <ShoppingCart className="h-16 w-16 text-primary/50" />
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{product.title}</CardTitle>
                    {getCategoryBadge(product.category)}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-2">
                    {product.description}
                  </CardDescription>

                  {/* Additional Info */}
                  <div className="space-y-2 mb-4 text-sm">
                    {product.event_date && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{new Date(product.event_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    
                    {product.location && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="truncate">{product.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Price & Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {product.price} {product.currency}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/p/${product.slug}`);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Voir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCatalog;
