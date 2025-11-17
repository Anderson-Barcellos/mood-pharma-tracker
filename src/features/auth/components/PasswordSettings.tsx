/**
 * Password Settings Component
 *
 * Configure lock screen password
 * Toggle lock screen on/off
 */

import { useState, FormEvent } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/shared/ui/glass-card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import {
  setPassword,
  isLockEnabled,
  enableLock,
  disableLock,
  hasPassword,
  validatePassword
} from '../services/simple-auth';

export function PasswordSettings() {
  const [lockEnabled, setLockEnabled] = useState(isLockEnabled());
  const [hasExistingPassword, setHasExistingPassword] = useState(hasPassword());

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleLock = () => {
    if (lockEnabled) {
      disableLock();
      setLockEnabled(false);
      setMessage({ type: 'success', text: 'Proteção por senha desativada' });
    } else {
      if (hasExistingPassword) {
        enableLock();
        setLockEnabled(true);
        setMessage({ type: 'success', text: 'Proteção por senha ativada' });
      } else {
        setMessage({
          type: 'error',
          text: 'Configure uma senha primeiro'
        });
      }
    }
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      // Validate confirm password matches
      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'As senhas não coincidem' });
        setIsLoading(false);
        return;
      }

      // Validate password length
      if (newPassword.length < 4) {
        setMessage({ type: 'error', text: 'Senha deve ter pelo menos 4 caracteres' });
        setIsLoading(false);
        return;
      }

      // If changing password, validate current password
      if (hasExistingPassword) {
        const isCurrentValid = await validatePassword(currentPassword);
        if (!isCurrentValid) {
          setMessage({ type: 'error', text: 'Senha atual incorreta' });
          setIsLoading(false);
          return;
        }
      }

      // Set new password
      await setPassword(newPassword);

      setHasExistingPassword(true);
      setLockEnabled(true);

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setMessage({
        type: 'success',
        text: hasExistingPassword ? 'Senha alterada com sucesso!' : 'Senha configurada com sucesso!'
      });
    } catch (error) {
      console.error('Password setting error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao configurar senha'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard variant="elevated" className="w-full">
      <GlassCardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-3">
            <Lock className="w-5 h-5 text-accent-11" />
          </div>
          <div>
            <GlassCardTitle>Proteção por Senha</GlassCardTitle>
            <GlassCardDescription>
              Configure uma senha para proteger seus dados
            </GlassCardDescription>
          </div>
        </div>
      </GlassCardHeader>

      <GlassCardContent>
        <div className="space-y-6">
          {/* Lock toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-2 border border-neutral-6">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="lock-toggle" className="text-base font-semibold cursor-pointer">
                  Ativar proteção
                </Label>
                {lockEnabled && <ShieldCheck className="w-4 h-4 text-success-600" />}
              </div>
              <p className="text-sm text-neutral-11">
                {lockEnabled ? 'Senha será solicitada ao abrir o app' : 'App abre sem solicitar senha'}
              </p>
            </div>
            <Switch
              id="lock-toggle"
              checked={lockEnabled}
              onCheckedChange={handleToggleLock}
              disabled={!hasExistingPassword && !lockEnabled}
            />
          </div>

          {/* Password form */}
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-neutral-12">
                {hasExistingPassword ? 'Alterar Senha' : 'Configurar Senha'}
              </h4>

              {/* Current password (only if changing) */}
              {hasExistingPassword && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      className="pr-10"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-10 hover:text-neutral-12"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite nova senha (mín. 4 caracteres)"
                    className="pr-10"
                    disabled={isLoading}
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-10 hover:text-neutral-12"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente a nova senha"
                    className="pr-10"
                    disabled={isLoading}
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-10 hover:text-neutral-12"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Message feedback */}
            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-success-100 text-success-700 border border-success-600'
                    : 'bg-error-100 text-error-700 border border-error-600'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? 'Salvando...' : hasExistingPassword ? 'Alterar Senha' : 'Configurar Senha'}
            </Button>
          </form>

          {/* Help text */}
          <div className="text-xs text-neutral-10 space-y-1 pt-4 border-t border-neutral-6">
            <p className="font-semibold">Importante:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>A senha é armazenada localmente de forma segura (SHA-256)</li>
              <li>Senha mínima: 4 caracteres</li>
              <li>Para redefinir senha esquecida: limpe os dados do navegador</li>
              <li>Lock screen é opcional - pode desativar a qualquer momento</li>
            </ul>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
