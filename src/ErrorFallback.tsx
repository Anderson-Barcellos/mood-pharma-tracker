import { Alert, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

export const ErrorFallback = ({ error, resetErrorBoundary }) => {
  // Log error in development but still show the error UI
  if (import.meta.env.DEV) {
    console.error('[DEV] Error caught by ErrorBoundary:', error);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>Mood & Pharma Tracker travou</AlertTitle>
          <AlertDescription>
            Algo inesperado rolou enquanto renderizávamos a interface. Os detalhes do erro aparecem abaixo — compartilha com o autor pra gente debugar rapidinho.
          </AlertDescription>
        </Alert>
        
        <div className="bg-card border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Error Details:</h3>
          <pre className="text-xs text-destructive bg-muted/50 p-3 rounded border overflow-auto max-h-32">
            {error.message}
          </pre>
        </div>
        
        <Button 
          onClick={resetErrorBoundary} 
          className="w-full"
          variant="outline"
        >
          <RefreshCwIcon />
          Recarregar interface
        </Button>
      </div>
    </div>
  );
}
