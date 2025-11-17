import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lock, LockOpen } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';

interface AuthContextType {
  isAuthenticated: boolean;
  requireAuth: (callback: () => void) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// CONFIGURE YOUR PASSWORD HERE
const CORRECT_PASSWORD = 'pharma2025'; // Change this to your desired password
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Check for existing session on mount
  useEffect(() => {
    const sessionExpiry = localStorage.getItem('auth_session_expiry');
    if (sessionExpiry) {
      const expiryTime = parseInt(sessionExpiry, 10);
      if (Date.now() < expiryTime) {
        setIsAuthenticated(true);

        // Set timeout to auto-logout when session expires
        const timeRemaining = expiryTime - Date.now();
        const timeoutId = setTimeout(() => {
          logout();
          toast.error('Session expired. Please login again to make changes.');
        }, timeRemaining);

        return () => clearTimeout(timeoutId);
      } else {
        // Session expired, clear it
        localStorage.removeItem('auth_session_expiry');
      }
    }
  }, []);

  const login = () => {
    const expiryTime = Date.now() + SESSION_DURATION;
    localStorage.setItem('auth_session_expiry', expiryTime.toString());
    setIsAuthenticated(true);

    // Set timeout for auto-logout
    setTimeout(() => {
      logout();
      toast.error('Session expired. Please login again to make changes.');
    }, SESSION_DURATION);
  };

  const logout = () => {
    localStorage.removeItem('auth_session_expiry');
    setIsAuthenticated(false);
    toast.info('Logged out. The app is now in read-only mode.');
  };

  const requireAuth = (callback: () => void) => {
    if (isAuthenticated) {
      callback();
    } else {
      setPendingCallback(() => callback);
      setShowPasswordDialog(true);
    }
  };

  const checkAuth = () => isAuthenticated;

  const handlePasswordSubmit = () => {
    if (password === CORRECT_PASSWORD) {
      login();
      setShowPasswordDialog(false);
      setPassword('');
      setAttempts(0);
      toast.success('Authentication successful! You can now make changes.');

      // Execute pending callback
      if (pendingCallback) {
        pendingCallback();
        setPendingCallback(null);
      }
    } else {
      setAttempts(prev => prev + 1);
      setPassword('');

      if (attempts >= 2) {
        toast.error('Too many failed attempts. Please try again later.');
        setShowPasswordDialog(false);
        setAttempts(0);
        setPendingCallback(null);
      } else {
        toast.error(`Incorrect password. ${2 - attempts} attempts remaining.`);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, requireAuth, logout, checkAuth }}>
      {children}

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <DialogTitle>Authentication Required</DialogTitle>
            </div>
            <DialogDescription>
              This action requires authentication. Please enter the password to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
                placeholder="Enter password"
                autoFocus
              />
            </div>

            {attempts > 0 && (
              <p className="text-sm text-destructive">
                {2 - attempts} attempts remaining
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPassword('');
                setPendingCallback(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordSubmit} disabled={!password}>
              <LockOpen className="mr-2 h-4 w-4" />
              Authenticate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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