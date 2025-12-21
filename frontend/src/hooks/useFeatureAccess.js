import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

/**
 * Hook to check if user has access to a feature
 * Admins bypass all limits
 */
export const useFeatureAccess = () => {
  const { user, isAdmin } = useAuth();

  const hasAccess = (feature) => {
    // Admins have unlimited access
    if (isAdmin()) {
      return { allowed: true, isAdmin: true, unlimited: true };
    }

    // Default limits for regular users (can be customized per plan)
    const userLimits = {
      emails_per_month: 1000,
      whatsapp_per_month: 500,
      contacts_max: 5000,
      gift_cards_per_month: 10,
      discounts_active: 5,
      referrals: true,
      ad_chat: true,
      ai_assistant: true
    };

    // Check feature-specific access
    switch (feature) {
      case 'unlimited_emails':
        return { allowed: false, limit: userLimits.emails_per_month };
      case 'unlimited_whatsapp':
        return { allowed: false, limit: userLimits.whatsapp_per_month };
      case 'unlimited_contacts':
        return { allowed: false, limit: userLimits.contacts_max };
      case 'gift_cards':
        return { allowed: true, limit: userLimits.gift_cards_per_month };
      case 'discounts':
        return { allowed: true, limit: userLimits.discounts_active };
      case 'referrals':
        return { allowed: userLimits.referrals };
      case 'ad_chat':
        return { allowed: userLimits.ad_chat };
      case 'ai_assistant':
        return { allowed: userLimits.ai_assistant };
      default:
        return { allowed: true };
    }
  };

  return { hasAccess, isAdmin: isAdmin() };
};

/**
 * Component to display admin badge
 */
export const AdminBadge = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin()) return null;

  return (
    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
      <Crown className="mr-1 h-3 w-3" />
      Admin - Accès Illimité
    </Badge>
  );
};

/**
 * Component to display feature limits
 */
export const FeatureLimit = ({ feature, current, children }) => {
  const { hasAccess, isAdmin } = useFeatureAccess();
  const access = hasAccess(feature);

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        {children}
        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
          <Crown className="mr-1 h-3 w-3" />
          Illimité
        </Badge>
      </div>
    );
  }

  if (access.limit !== undefined) {
    const percentage = (current / access.limit) * 100;
    const isNearLimit = percentage >= 80;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          {children}
          <span className={isNearLimit ? 'text-orange-400' : 'text-gray-400'}>
            {current} / {access.limit}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              isNearLimit ? 'bg-orange-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return children;
};

/**
 * Component to restrict feature access
 */
export const FeatureGate = ({ feature, fallback, children }) => {
  const { hasAccess, isAdmin } = useFeatureAccess();
  const access = hasAccess(feature);

  // Admins always have access
  if (isAdmin || access.allowed) {
    return children;
  }

  // Show fallback for restricted features
  return fallback || (
    <div className="text-center p-8 glass border border-primary/20 rounded-lg">
      <p className="text-gray-400 mb-4">
        Cette fonctionnalité n'est pas disponible sur votre plan actuel.
      </p>
      <Badge variant="outline" className="text-primary border-primary">
        Passez au plan supérieur pour débloquer
      </Badge>
    </div>
  );
};

export default { useFeatureAccess, AdminBadge, FeatureLimit, FeatureGate };
