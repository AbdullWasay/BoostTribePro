import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

// Move BACKEND_URL outside component to avoid recreation on every render
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedAuth = useRef(false);

  // Define logout first so it can be used in verifyToken
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // Load user from localStorage on mount - runs only once
  useEffect(() => {
    // Ensure this only runs once
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Immediately set user and token from cache for fast initial render
        setToken(storedToken);
        setUser(parsedUser);
        setLoading(false); // Set loading to false immediately
        
        // Verify token in the background (non-blocking)
        // Use BACKEND_URL directly (it's a module-level constant, doesn't need to be in deps)
        const backendUrl = BACKEND_URL;
        const verifyToken = async (tokenToVerify) => {
          try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(`${backendUrl}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${tokenToVerify}`
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              setToken(tokenToVerify);
              // Update localStorage with fresh user data
              localStorage.setItem('user', JSON.stringify(userData));
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setToken(null);
              setUser(null);
            }
          } catch (error) {
            if (error.name === 'AbortError') {
              console.warn('Token verification timeout, using cached user data');
              return; // Keep cached user data on timeout
            }
            console.error('Token verification failed:', error);
            // On network errors, keep cached user data to avoid logging out users
            if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
              console.warn('Network error during token verification, using cached user data');
            } else {
              // Only clear on actual auth errors (not network issues)
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setToken(null);
              setUser(null);
            }
          }
        };
        
        // Verify in background, don't block UI
        verifyToken(storedToken).catch(err => {
          console.error('Background token verification error:', err);
        });
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []); // Empty deps - BACKEND_URL is module-level constant, hasCheckedAuth is ref

  const login = async (email, password) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Login error:', error);
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Debug logging
      console.log('Login response:', { 
        hasToken: !!data.token, 
        hasUser: !!data.user,
        userRole: data.user?.role,
        userId: data.user?.id
      });
      
      // Validate response structure
      if (!data.token || !data.user) {
        console.error('Invalid login response structure:', data);
        throw new Error('Invalid response from server');
      }
      
      // Ensure user role is set
      if (!data.user.role) {
        console.warn('User role missing, defaulting to user');
        data.user.role = 'user';
      }
      
      // Store token and user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login exception:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const data = await response.json();
      
      // Store token and user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const isAdmin = useCallback(() => {
    return user && user.role === 'admin';
  }, [user]);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
