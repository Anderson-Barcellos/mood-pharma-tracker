import { Lock, LockOpen, Eye } from '@phosphor-icons/react';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/core/auth/auth-context';
import { cn } from '@/shared/utils';

export function AuthStatus() {
  const { isAuthenticated, requireAuth, logout } = useAuth();

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
          isAuthenticated
            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
        )}
      >
        {isAuthenticated ? (
          <>
            <LockOpen className="h-3 w-3" />
            <span>Edit Mode</span>
          </>
        ) : (
          <>
            <Eye className="h-3 w-3" />
            <span>View Only</span>
          </>
        )}
      </div>

      {isAuthenticated ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="h-7 text-xs"
        >
          Logout
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => requireAuth(() => {})}
          className="h-7 text-xs"
        >
          <Lock className="mr-1 h-3 w-3" />
          Login
        </Button>
      )}
    </div>
  );
}