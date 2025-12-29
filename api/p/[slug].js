/**
 * Vercel Serverless Function for Product Page Meta Tags
 * This ensures WhatsApp/Facebook crawlers see product-specific meta tags with YouTube thumbnails
 */

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(404).send('Product not found');
  }

  try {
    // Get backend URL from environment
    const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8001';
    
    // Fetch product data from backend
    const response = await fetch(`${backendUrl}/api/catalog/public/${slug}`);
    
    if (!response.ok) {
      return res.status(404).send('Product not found');
    }

    const product = await response.json();

    // Extract image URL and handle YouTube videos
    let productImage = product.image_url || `${req.headers.host ? `https://${req.headers.host}` : ''}/logo512.png`;
    
    if (product.image_url) {
      const imageUrl = product.image_url.trim();
      
      // Check if it's a YouTube URL and extract thumbnail
      const youtubeMatch = imageUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\?\s]+)/);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        productImage = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
      // Check if it's a Vimeo URL
      else if (imageUrl.includes('vimeo.com')) {
        // Vimeo requires API, use fallback
        const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
        productImage = `${baseUrl}/logo512.png`;
      }
      // If it's a relative URL, make it absolute
      else if (imageUrl.startsWith('/')) {
        const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
        productImage = `${baseUrl}${imageUrl}`;
      }
      // If it's already absolute, use it as is
      else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        productImage = imageUrl;
      }
      // Otherwise, make it absolute
      else {
        const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
        productImage = `${baseUrl}/${imageUrl}`;
      }
    } else {
      const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
      productImage = `${baseUrl}/logo512.png`;
    }

    // Clean description - remove "none" or empty values
    let description = product.description || '';
    if (description.toLowerCase().trim() === 'none' || description.trim() === '') {
      description = product.title;
    }

    // Build full description with price
    const fullDescription = product.price 
      ? `${description} - ${product.price} ${product.currency}`
      : description || product.title;

    // Build product URL
    const productUrl = req.headers.host 
      ? `https://${req.headers.host}/p/${slug}`
      : `https://boost-tribe-pro.vercel.app/p/${slug}`;

    // Escape HTML
    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };

    // Generate HTML with proper OG meta tags
    const html = `<!DOCTYPE html>
<html lang="fr" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(product.title)}</title>
    <meta name="description" content="${escapeHtml(fullDescription)}">
    
    <!-- Open Graph / Facebook / WhatsApp - Critical for link previews -->
    <meta property="og:type" content="product">
    <meta property="og:title" content="${escapeHtml(product.title)}">
    <meta property="og:description" content="${escapeHtml(fullDescription)}">
    <meta property="og:image" content="${escapeHtml(productImage)}">
    <meta property="og:image:url" content="${escapeHtml(productImage)}">
    <meta property="og:image:secure_url" content="${escapeHtml(productImage)}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1280">
    <meta property="og:image:height" content="720">
    <meta property="og:url" content="${escapeHtml(productUrl)}">
    <meta property="og:site_name" content="BoostTribe">
    <meta property="og:locale" content="fr_FR">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(product.title)}">
    <meta name="twitter:description" content="${escapeHtml(fullDescription)}">
    <meta name="twitter:image" content="${escapeHtml(productImage)}">
    
    <!-- Additional meta for better WhatsApp support -->
    <meta name="robots" content="index, follow">
    
    <!-- Redirect to React app (with delay to allow crawlers to read meta tags) -->
    <script>
        setTimeout(function() {
            if (window.location.hash !== '#no-redirect') {
                window.location.href = '/p/${slug}';
            }
        }, 500);
    </script>
    <noscript>
        <meta http-equiv="refresh" content="2; url=/p/${slug}">
    </noscript>
</head>
<body>
    <!-- Visible content for crawlers -->
    <div style="display: none;">
        <h1>${escapeHtml(product.title)}</h1>
        <p>${escapeHtml(fullDescription)}</p>
        <img src="${escapeHtml(productImage)}" alt="${escapeHtml(product.title)}" />
    </div>
    <p>Redirecting to product page... <a href="/p/${slug}">Click here</a></p>
</body>
</html>`;

    // Set proper headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error generating product page HTML:', error);
    return res.status(500).send('Error loading product');
  }
}

