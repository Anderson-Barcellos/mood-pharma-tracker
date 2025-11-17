import { ReactElement, cloneElement } from 'react';
import { useAuth } from '@/core/auth/auth-context';

interface ProtectedActionProps {
  children: ReactElement;
  fallback?: () => void;
}

/**
 * ProtectedAction - Wrapper component that requires authentication before executing action
 *
 * Usage:
 * <ProtectedAction>
 *   <Button onClick={() => console.log('Protected!')}>Add Item</Button>
 * </ProtectedAction>
 */
export function ProtectedAction({ children, fallback }: ProtectedActionProps) {
  const { requireAuth } = useAuth();

  const handleClick = (originalOnClick?: (e: any) => void) => (e: any) => {
    e.preventDefault();
    e.stopPropagation();

    requireAuth(() => {
      if (originalOnClick) {
        originalOnClick(e);
      }
    });

    if (fallback) {
      fallback();
    }
  };

  // Clone the child element and wrap its onClick
  const childProps = children.props as any;
  return cloneElement(children, {
    ...childProps,
    onClick: handleClick(childProps?.onClick),
  } as any);
}

/**
 * Hook to protect any action with authentication
 */
export function useProtectedAction() {
  const { requireAuth } = useAuth();

  return (action: () => void) => {
    requireAuth(action);
  };
}