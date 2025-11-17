/**
 * Lock Screen Component
 *
 * Password-protected entry screen
 * Glassmorphism design matching app aesthetic
 */

import { useState, FormEvent } from 'react';
import { GradientBackground } from '@/shared/ui/gradient-bg';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/shared/ui/glass-card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { login } from '../services/simple-auth';

interface LockScreenProps {
  onSuccess: () => void;
}

export function LockScreen({ onSuccess }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(password);

      if (success) {
        onSuccess();
      } else {
        setError('Senha incorreta');
        setPassword('');
      }
    } catch (err) {
      setError('Erro ao autenticar');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      {/* Animated gradient background */}
      <GradientBackground
        preset="medical"
        animation="slow"
        meshOrbs
        orbCount={3}
        opacity="medium"
      />

      {/* Lock screen card */}
      <div className="relative z-10 w-full max-w-md">
        <GlassCard variant="elevated" glow="medical">
          <GlassCardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-accent-3">
                <Lock className="w-8 h-8 text-accent-11" />
              </div>
            </div>
            <GlassCardTitle className="text-2xl">Mood & Pharma Tracker</GlassCardTitle>
            <GlassCardDescription>
              Digite sua senha para acessar o aplicativo
            </GlassCardDescription>
          </GlassCardHeader>

          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-neutral-12">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="pr-10"
                    disabled={isLoading}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-10 hover:text-neutral-12 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-error-100 border border-error-600 text-error-700 text-sm">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !password}
              >
                {isLoading ? 'Autenticando...' : 'Entrar'}
              </Button>
            </form>

            {/* Helper text */}
            <div className="mt-6 text-center text-xs text-neutral-10">
              <p>Seus dados estão protegidos com senha</p>
              <p className="mt-1">
                Para redefinir a senha, limpe os dados do navegador
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}
