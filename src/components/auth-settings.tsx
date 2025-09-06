'use client';

import { useState, useEffect } from 'react';
import { Settings, X, Lock, Eye, EyeOff, Shield } from 'lucide-react';

interface AuthSettingsProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  onAuthChange?: () => void;
}

export function AuthSettings({ showSettings, setShowSettings, onAuthChange }: AuthSettingsProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setAuthenticated(false);
        return;
      }
      
      const response = await fetch('/api/auth/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      setAuthenticated(data.authenticated);
      onAuthChange?.(); // Notify parent of auth change
    } catch (error) {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (!showSettings) return null;

  if (loading) {
    return (
      <div className="glass-card p-6 border-gray-500/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onAuthSuccess={() => { checkAuthStatus(); onAuthChange?.(); }} onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="glass-card p-6 border-green-500/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Admin Settings</h2>
        <button
          onClick={() => setShowSettings(false)}
          className="text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      {/* OpenAI API Key Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-3">OpenAI Configuration</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="openai-key" className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                className="input-uber"
                defaultValue=""
              />
              <p className="text-sm text-gray-400 mt-2">
                Required for AI workflow analysis. Key is stored locally in your browser.
              </p>
            </div>
            <button className="uber-button">
              Save API Key
            </button>
          </div>
        </div>

        {/* System Information */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-white mb-3">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800/30 rounded-lg p-3">
              <div className="text-gray-400">Environment</div>
              <div className="text-white font-mono">Production</div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <div className="text-gray-400">Version</div>
              <div className="text-white font-mono">1.0.0</div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <div className="text-gray-400">Authentication</div>
              <div className="text-green-400 font-mono">Enabled</div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <div className="text-gray-400">Rate Limiting</div>
              <div className="text-green-400 font-mono">Active</div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-white mb-3">Security</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="text-white font-medium">Bot Protection</div>
                <div className="text-sm text-gray-400">Prevent automated scraping</div>
              </div>
              <div className="text-green-400 text-sm font-mono">Enabled</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="text-white font-medium">Rate Limiting</div>
                <div className="text-sm text-gray-400">60 requests per 15 minutes</div>
              </div>
              <div className="text-green-400 text-sm font-mono">Active</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="text-white font-medium">Data Obfuscation</div>
                <div className="text-sm text-gray-400">Hide sensitive workflow data</div>
              </div>
              <div className="text-green-400 text-sm font-mono">Enabled</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LoginFormProps {
  onAuthSuccess: () => void;
  onClose: () => void;
}

function LoginForm({ onAuthSuccess, onClose }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        onAuthSuccess();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 border-blue-500/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Admin Login</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
        <p className="text-gray-400">Enter admin password to access settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium text-gray-300 mb-2">
            Admin Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="input-uber pl-10 pr-12"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="uber-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Authenticating...
            </div>
          ) : (
            'Login'
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400 text-center">
          Default password: <code className="text-green-400 bg-gray-800 px-2 py-1 rounded">admin</code>
        </p>
      </div>
    </div>
  );
}