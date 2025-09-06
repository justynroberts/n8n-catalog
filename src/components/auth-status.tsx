'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { LogOut, Lock, Key, User, Settings, X, Eye, EyeOff, Upload, Database, Brain } from 'lucide-react';
import { FileUpload } from '@/components/file-upload';
import { UploadedFile } from '@/types/workflow';
import { SQLiteImportProcessor } from '@/lib/sqlite-processor';
import { ApiClient } from '@/lib/api-client';

interface AuthStatusProps {
  onModalStateChange?: (isOpen: boolean) => void;
}

export function AuthStatus({ onModalStateChange }: AuthStatusProps = {}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [importTag, setImportTag] = useState('internetsourced');
  const [processor] = useState(() => SQLiteImportProcessor.getInstance());
  const [api] = useState(() => ApiClient.getInstance());

  useEffect(() => {
    checkAuthStatus();
    // Load API key from localStorage
    const storedApiKey = localStorage.getItem('openai-api-key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    // Load import tag from localStorage
    const storedTag = localStorage.getItem('import-tag');
    if (storedTag) {
      setImportTag(storedTag);
    }
  }, []);

  // Notify parent when any modal opens/closes
  useEffect(() => {
    const isAnyModalOpen = showSettingsModal || showPasswordModal || showLoginModal;
    onModalStateChange?.(isAnyModalOpen);
  }, [showSettingsModal, showPasswordModal, showLoginModal, onModalStateChange]);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      console.log('Checking auth status, token exists:', !!token);
      
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
      console.log('Auth status response:', data);
      setAuthenticated(data.authenticated);
      
      if (!data.authenticated) {
        localStorage.removeItem('auth-token');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthenticated(false);
      localStorage.removeItem('auth-token');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    setAuthenticated(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      // Success - password changed, need to re-login
      alert('Password changed successfully. Please log in again.');
      setShowPasswordModal(false);
      handleLogout();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
        credentials: 'include'
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Success - store token and refresh auth status
      if (data.token) {
        console.log('Storing token...');
        localStorage.setItem('auth-token', data.token);
        setShowLoginModal(false);
        setLoginPassword('');
        setAuthenticated(true);
      } else {
        console.error('No token in response');
        setError('Login failed - no token received');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = async (files: UploadedFile[]) => {
    if (!apiKey.trim()) {
      setError('Please configure your OpenAI API key first');
      return;
    }

    setError('');

    try {
      console.log('Starting import with tag:', importTag);
      const sessionId = await processor.startImport(files, apiKey, importTag);
      setError('');
      // Success handled by import progress context
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start import';
      setError(errorMessage);
    }
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('openai-api-key', apiKey);
    setError('');
  };

  const handleClearRateLimits = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/clear-rate-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Show success message (authenticated users have no rate limits anyway)
        alert('Rate limits cleared for all IPs. Note: As an authenticated user, you have no rate limits.');
        setError(''); // Clear any existing errors
      } else {
        setError('Failed to clear rate limits');
      }
    } catch (error) {
      setError('Failed to clear rate limits');
    }
  };

  if (!authenticated) {
    return (
      <>
        <button
          onClick={() => setShowLoginModal(true)}
          className="uber-button-secondary p-2"
          title="Admin Login"
        >
          <Lock size={16} />
        </button>

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9998]">
            <div className="glass-card p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Admin Login</h2>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="input-uber pr-10"
                      placeholder="Enter admin password"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !loginPassword}
                  className="uber-button w-full disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Login'}
                </button>
              </form>

            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        <span className="text-green-400 text-xs">Admin</span>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="uber-button p-2 bg-green-500/20 hover:bg-green-500/30 border-green-500/50"
          title="Admin Settings"
        >
          <Settings size={16} />
        </button>
        
        <button
          onClick={handleLogout}
          className="uber-button-secondary p-2 hover:bg-red-500/20 hover:border-red-500/50"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9997]">
          <div className="glass-card p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-uber"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-uber"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-uber"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="uber-button flex-1 disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="uber-button-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="glass-card p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto relative z-[99999]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Admin Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {/* Import Workflows */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center space-x-2">
                  <Upload size={18} />
                  <span>Import</span>
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">OpenAI API Key</label>
                    <div className="flex space-x-1">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="input-uber flex-1 text-xs py-1"
                      />
                      <button onClick={handleSaveApiKey} className="uber-button-secondary text-xs px-2 py-1">Save</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Tag</label>
                    <input
                      type="text"
                      value={importTag}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
                        setImportTag(value);
                        localStorage.setItem('import-tag', value);
                      }}
                      placeholder="internetsourced"
                      className="input-uber w-full text-xs py-1"
                      maxLength={20}
                    />
                  </div>

                  <FileUpload
                    onFilesSelected={handleFilesSelected}
                    onError={setError}
                  />
                </div>
              </div>

              {/* Security Section */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center space-x-2">
                  <Key size={18} />
                  <span>Security</span>
                </h3>
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setShowPasswordModal(true);
                  }}
                  className="uber-button-secondary flex items-center space-x-2 w-full justify-center text-sm"
                >
                  <Key size={14} />
                  <span>Change Password</span>
                </button>
              </div>

              {/* System Status */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center space-x-2">
                  <Database size={18} />
                  <span>System</span>
                </h3>
                <div className="space-y-2 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Environment</span>
                    <span className="text-white">Production</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Auth</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Scraping</span>
                    <span className="text-green-400">Protected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rate Limit</span>
                    <span className="text-green-400">None (Auth)</span>
                  </div>
                </div>
                <button
                  onClick={handleClearRateLimits}
                  className="uber-button-secondary w-full text-xs py-2"
                  title="Clear rate limits for all IPs. Note: You have no rate limits as an authenticated user."
                >
                  Clear All Rate Limits
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}