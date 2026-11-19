import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Field, Input, Button, Card } from 'react-typescript-ui';
import { useToast } from '../../hooks/useToast';
import { Stethoscope, User, Lock, Eye, EyeOff, LogIn, CircleX } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, error } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await login({ username, password });
      if (success) {
        showToast('success', 'Login successful');
        navigate('/dashboard');
      } else {
        showToast('error', error || 'Invalid credentials');
      }
    } catch (err) {
      showToast('error', error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Brand panel: hidden below md, per the shell's own breakpoint for
          collapsing to a single column. Uses primary-900, the "optional
          dark-green sidebar variant" the style guide calls out, here as
          the one deliberate spot of strong color on this screen. */}
      <div className="hidden md:flex md:w-[42%] flex-col justify-between bg-primary-900 text-white px-12 py-12">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <Stethoscope size={18} />
          </div>
          <span className="text-lg font-semibold">HomeoCare Pro</span>
        </div>
        <div>
          <p className="text-2xl font-semibold leading-snug max-w-sm">
            Everything a homeopathy clinic needs, in one calm place.
          </p>
          <p className="mt-3 text-sm text-white/70 max-w-sm">
            Patients, cases, prescriptions, follow-ups, inventory and
            billing — built for the way a clinic actually runs its day.
          </p>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} HomeoCare Pro</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex md:hidden items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Stethoscope size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-text">HomeoCare Pro</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-text">Welcome back</h1>
            <p className="mt-1 text-sm text-muted">Sign in to continue to your clinic.</p>
          </div>

          <Card padding="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Username" required>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  leftAddon={<User size={16} className="text-faint" />}
                  required
                />
              </Field>

              <Field label="Password" required>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  leftAddon={<Lock size={16} className="text-faint" />}
                  rightAddon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="focus-ring text-faint hover:text-muted"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  required
                />
              </Field>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-danger/10 border border-danger/30">
                  <CircleX size={16} className="text-danger shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                loading={loading}
                leftIcon={!loading ? <LogIn size={16} /> : undefined}
              >
                Sign in
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
