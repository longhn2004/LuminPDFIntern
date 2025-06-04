'use client';

import React, { useState, useEffect } from 'react';
import { FaLink, FaCopy, FaTrash, FaEye, FaEdit, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { useAppTranslations } from '@/hooks/useTranslations';

interface ShareableLink {
  id: string;
  role: 'viewer' | 'editor';
  token: string;
  url: string;
  enabled: boolean;
  createdAt: string;
}

interface ShareableLinkManagerProps {
  fileId: string;
  shareableLinkEnabled: boolean;
  onToggleFeature: (enabled: boolean) => void;
  className?: string;
}

const ShareableLinkManager: React.FC<ShareableLinkManagerProps> = ({
  fileId,
  shareableLinkEnabled,
  onToggleFeature,
  className = ''
}) => {
  const translations = useAppTranslations();
  const [links, setLinks] = useState<ShareableLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Load shareable links
  const loadShareableLinks = async () => {
    if (!shareableLinkEnabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/file/${fileId}/shareable-links`, {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || translations.sharing('shareableLinks.failedToLoad'));
      }
      
      setLinks(data);
    } catch (err: any) {
      console.error('Error loading shareable links:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create shareable link
  const createShareableLink = async (role: 'viewer' | 'editor') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/file/shareable-link/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, role }),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || translations.sharing('shareableLinks.failedToCreate'));
      }
      
      // Reload links to get updated list
      await loadShareableLinks();
    } catch (err: any) {
      console.error('Error creating shareable link:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete shareable link
  const deleteShareableLink = async (linkId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/file/shareable-link/${linkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || translations.sharing('shareableLinks.failedToDelete'));
      }
      
      // Remove link from local state
      setLinks(prev => prev.filter(link => link.id !== linkId));
    } catch (err: any) {
      console.error('Error deleting shareable link:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (url: string, token: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Toggle shareable link feature
  const handleToggleFeature = async (enabled: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/file/shareable-link/toggle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, enabled }),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || translations.sharing('shareableLinks.failedToToggle'));
      }
      
      onToggleFeature(enabled);
      
      if (enabled) {
        await loadShareableLinks();
      } else {
        setLinks([]);
      }
    } catch (err: any) {
      console.error('Error toggling shareable link feature:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load links when component mounts or when feature is enabled
  useEffect(() => {
    if (shareableLinkEnabled) {
      loadShareableLinks();
    }
  }, [fileId, shareableLinkEnabled]);

  const getRoleIcon = (role: string) => {
    return role === 'editor' ? <FaEdit className="text-gray-700" /> : <FaEye className="text-gray-600" />;
  };

  const getRoleColor = (role: string) => {
    return role === 'editor' ? 'text-gray-800' : 'text-gray-700';
  };

  const getRoleBackgroundColor = (role: string) => {
    return role === 'editor' ? 'bg-gray-200' : 'bg-gray-100';
  };

  const getRoleHoverColor = (role: string) => {
    return role === 'editor' ? 'hover:bg-gray-300' : 'hover:bg-gray-200';
  };

  const getExistingLink = (role: 'viewer' | 'editor') => {
    return links.find(link => link.role === role);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Feature Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3">
          <FaLink className="text-gray-600" />
          <div>
            <h3 className="font-medium text-gray-900">{translations.sharing('shareableLinks.title')}</h3>
            <p className="text-sm text-gray-600">{translations.sharing('shareableLinks.description')}</p>
          </div>
        </div>
        <button
          onClick={() => handleToggleFeature(!shareableLinkEnabled)}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
            shareableLinkEnabled 
              ? 'bg-gray-800 text-white hover:bg-black' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          {shareableLinkEnabled ? <FaToggleOn size={18} /> : <FaToggleOff size={18} />}
          <span className="text-sm font-medium">
            {shareableLinkEnabled ? translations.sharing('shareableLinks.enabled') : translations.sharing('shareableLinks.disabled')}
          </span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-sm text-gray-800">{error}</p>
        </div>
      )}

      {/* Shareable Links Section */}
      {shareableLinkEnabled && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">{translations.sharing('shareableLinks.createTitle')}</h4>
          
          {/* Create Link Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {(['viewer', 'editor'] as const).map((role) => {
              const existingLink = getExistingLink(role);
              
              return (
                <div key={role} className="space-y-2">
                  {existingLink ? (
                    <div className="p-3 border border-gray-300 rounded-lg bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role)}
                          <span className={`text-sm font-medium capitalize ${getRoleColor(role)}`}>
                            {translations.sharing(`roles.${role}`)}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteShareableLink(existingLink.id)}
                          disabled={loading}
                          className="text-gray-500 hover:text-gray-800 transition-colors"
                          title={translations.sharing('shareableLinks.deleteLink')}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 truncate">
                            {existingLink.url}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(existingLink.url, existingLink.token)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            copiedToken === existingLink.token
                              ? 'bg-gray-800 text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                          title={translations.sharing('shareableLinks.copyLink')}
                        >
                          <FaCopy size={10} />
                        </button>
                      </div>
                      
                      <div className="text-xs text-gray-400 mt-1">
                        {translations.sharing('shareableLinks.created')} {new Date(existingLink.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => createShareableLink(role)}
                      disabled={loading}
                      className={`w-full p-3 border-2 border-dashed border-gray-300 rounded-lg transition-colors text-gray-600 hover:border-gray-400 hover:bg-gray-50`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {getRoleIcon(role)}
                        <span className="text-sm font-medium capitalize">
                          {translations.sharing(`shareableLinks.create${role.charAt(0).toUpperCase() + role.slice(1)}Link`)}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShareableLinkManager; 