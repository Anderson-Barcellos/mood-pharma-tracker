import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  requireAuth: (callback: () => void) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const logout = () => {
    // No-op in personal mode
  };

  const requireAuth = (callback: () => void) => {
    // Always allow in personal mode
    callback();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        requireAuth,
        logout,
        checkAuth: () => true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
