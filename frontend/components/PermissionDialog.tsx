import { FaTimes, FaUser, FaUsers, FaShare, FaSpinner } from "react-icons/fa";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Avatar from "./Avatar";
import ShareableLinkManager from "./ShareableLinkManager";

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  pdfId: string;
  listUsers: { id: string; email: string; role: string; name: string }[];
  fetchListUsers: () => Promise<void>;
}

export default function PermissionDialog({
  isOpen,
  onClose,
  fileName,
  pdfId,
  listUsers,
  fetchListUsers
}: PermissionDialogProps) {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Array<{ email: string; role: string }>>([]);
  const [emailStatus, setEmailStatus] = useState<{
    valid: boolean;
    user?: { name: string; email: string };
    message?: string;
    isExistingUser?: boolean;
  }>({ valid: false });
  
  // Loading states
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  // Shareable link state
  const [shareableLinkEnabled, setShareableLinkEnabled] = useState(true);
  const [isLoadingFileInfo, setIsLoadingFileInfo] = useState(false);

  // Fetch file info to get shareable link status
  const fetchFileInfo = async () => {
    if (!pdfId) return;
    
    setIsLoadingFileInfo(true);
    try {
      const response = await fetch(`/api/file/${pdfId}/info`);
      if (response.ok) {
        const data = await response.json();
        setShareableLinkEnabled(data.shareableLinkEnabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching file info:', error);
    } finally {
      setIsLoadingFileInfo(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchListUsers();
      fetchFileInfo();
    }
  }, [isOpen, fetchListUsers, pdfId]);

  const handleCheckEmail = async (email: string) => {
    if (!email.trim()) {
      setEmailStatus({ valid: false });
      return false;
    }

    // Check email format first - don't show anything if format is invalid
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isValidEmail.test(email)) {
      setEmailStatus({ valid: false });
      return false;
    }

    // Check if user already has access to this file
    const existingUser = listUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      setEmailStatus({ 
        valid: true, 
        message: `${existingUser.name} already has ${existingUser.role} access to this file`,
        user: { name: existingUser.name, email: existingUser.email },
        isExistingUser: true
      });
      return false;
    }

    // Only proceed with API call if email format is valid and user doesn't already have access
    setIsCheckingEmail(true);
    try {
      const response = await fetch(`/api/auth/user-by-email?email=${email}`);
      const data = await response.json();
      
      if (data.name) {
        setEmailStatus({ valid: true, user: { name: data.name, email: data.email } });
      } else {
        setEmailStatus({ valid: true, message: "[Unregistered User]" });
      }
    } catch (error) {
      setEmailStatus({ valid: false, message: "Error checking email" });
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleAddUser = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isValidEmail.test(email)) {
      toast.error("Invalid email address");
      return;
    }
    if (email.trim() === "") {
      return;
    }
    if (invitedUsers.includes(email)) {
      toast.warning("User already added to invitation list");
      return;
    }
    if (listUsers.some(user => user.email.toLowerCase() === email.toLowerCase())) {
      toast.warning("User already has access to this file");
      return;
    }

    setInvitedUsers([...invitedUsers, email]);
    setEmail("");
    setRole("viewer");
    setEmailStatus({ valid: false });
  };

  const handleRemoveInvitedUser = (email: string) => {
    setInvitedUsers(invitedUsers.filter(user => user !== email));
  };

  const handleUserRoleChange = (userEmail: string, newRole: string) => {
    setPendingRoleChanges(prevChanges => {
      const originalUser = listUsers.find(u => u.email === userEmail);
      if (!originalUser) return prevChanges;

      let updatedChanges = prevChanges.filter(c => c.email !== userEmail);

      if (newRole !== originalUser.role) {
        updatedChanges.push({ email: userEmail, role: newRole });
      }
      return updatedChanges;
    });
  };

  const handleSubmitShare = async () => {
    if (invitedUsers.length === 0) return;
    
    setIsSendingInvitations(true);
    try {
      const response = await fetch(`/api/file/invite`, {
        method: "POST",
        body: JSON.stringify({ fileId: pdfId, emails: invitedUsers, role }),
      });
      
      if (response.ok) {
        toast.success("Users invited successfully!");
        await fetchListUsers();
        resetForm();
      } else {
        throw new Error('Failed to send invitations');
      }
    } catch (error) {
      toast.error("Failed to invite users. Please try again.");
    } finally {
      setIsSendingInvitations(false);
    }
  };

  const handleSaveRoleChanges = async () => {
    if (pendingRoleChanges.length === 0) {
      // No changes to save, can close or notify. Button should be disabled anyway.
      resetForm();
      onClose();
      return;
    }

    setIsSavingChanges(true);
    try {
      const apiPayload = {
        fileId: pdfId,
        changes: pendingRoleChanges.map(change => ({
          fileId: pdfId, // Required by the backend ChangeRoleDto
          email: change.email,
          role: change.role,
        })),
      };

      const response = await fetch(`/api/file/change-roles`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save role changes');
      }

      await response.json();
      toast.success("Changes saved successfully!");
      await fetchListUsers();
      resetForm(); // This will clear pendingRoleChanges
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes. Please try again.");
    } finally {
      setIsSavingChanges(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setInvitedUsers([]);
    setRole("viewer");
    setEmailStatus({ valid: false });
    setIsAddingUser(false);
    setPendingRoleChanges([]); // Clear pending role changes
  };

  const handleShareableLinkToggle = (enabled: boolean) => {
    setShareableLinkEnabled(enabled);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed w-screen h-screen inset-0 bg-black/60  flex items-center justify-center p-4 z-1001">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* <FaShare className="text-xl" /> */}
              <div>
                <h2 className="text-xl font-semibold">Share "{fileName}"</h2>
              </div>
            </div>
            {/* <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
            >
              <FaTimes size={18} />
            </button> */}
          </div>
        </div>

        <div className="px-6 space-y-6 ">
          {/* Shareable Links Section */}
          {!isLoadingFileInfo && (
            <ShareableLinkManager 
              fileId={pdfId}
              shareableLinkEnabled={shareableLinkEnabled}
              onToggleFeature={handleShareableLinkToggle}
              className="mb-6"
            />
          )}

          {/* Divider */}
          {!isAddingUser && invitedUsers.length === 0 && email === "" && (
            <div className="border-t border-gray-200"></div>
          )}

          {/* Email Input Section */}
          <div className="">
            {/* <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite people by email
            </label> */}
            <div className="relative">
              <input
                type="email"
                placeholder="Add people by email"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 outline-none transition-all duration-200 placeholder-gray-400"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleCheckEmail(e.target.value);
                }}
                onFocus={() => setIsAddingUser(true)}
                onBlur={() => {
                  setIsAddingUser(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUser(e);
                    setEmailStatus({ valid: false })
                  }
                }}
              />
              {email && (
                <button
                  onClick={() => {
                    setEmail("")
                    setEmailStatus({ valid: false })
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              )}
              
              {/* Email Status Popup */}
              {emailStatus.valid && (
                <div className={`absolute top-full left-0 right-0 z-[1002] mt-1 border rounded-lg p-3 shadow-lg ${
                  emailStatus.isExistingUser ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'
                }`}>
                  {isCheckingEmail ? (
                    <div className="flex items-center gap-2 text-gray-700">
                      <FaSpinner className="animate-spin" size={14} />
                      <span className="text-sm">Checking email...</span>
                    </div>
                  ) : emailStatus.user ? (
                    <div className="flex items-center gap-2">
                      <FaUser size={14} className={emailStatus.isExistingUser ? 'text-yellow-600' : 'text-gray-700'} />
                      <span className={`font-medium ${emailStatus.isExistingUser ? 'text-yellow-800' : 'text-gray-700'}`}>
                        {emailStatus.user.name}
                      </span>
                      <span className={emailStatus.isExistingUser ? 'text-yellow-600' : 'text-gray-600'}>
                        ({emailStatus.user.email})
                      </span>
                    </div>
                  ) : emailStatus.message ? (
                    <p className={`text-sm ${emailStatus.isExistingUser ? 'text-yellow-700' : 'text-gray-600'}`}>
                      {emailStatus.message}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Invited Users Tags */}
            {(isAddingUser || invitedUsers.length > 0 || email !== "") && (<div className="space-y-2 mt-2 h-40">
            {invitedUsers.length > 0 && (

                <div className="flex flex-wrap gap-2">
                  {invitedUsers.map((user, index) => (
                    <div key={index} className="flex items-center gap-2 border border-black rounded-full px-3 py-1.5 text-sm">
                      <span className="text-gray-700 font-medium">{user}</span>
                      <button
                        onClick={() => handleRemoveInvitedUser(user)}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full p-0.5 transition-all"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  ))}
                </div>
            )}
            </div>)}
          </div>

          {/* Current Users List */}
          {!isAddingUser && invitedUsers.length === 0 && email === "" && (
            <div className="max-h-[150px] overflow-y-auto">
              {/* <div className="flex items-center gap-2 mb-3">
                <FaUsers className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">People with access</h3>
              </div> */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                {listUsers.map((user, index) => (
                  <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} />
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role !== "owner" ? (
                        <div className="relative">
                          <select
                            disabled={user.role === "owner"}
                            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            value={pendingRoleChanges.find(c => c.email === user.email)?.role || user.role}
                            onChange={(e) => handleUserRoleChange(user.email, e.target.value)}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="none">Remove</option>
                          </select>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic px-3 py-2 rounded-lg text-sm font-medium">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          {(isAddingUser || invitedUsers.length > 0 || email !== "") ? (
            <div className="flex items-center justify-between">
              {/* Permission Level Selection */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">People Invited</span>
                <select
                  className="rounded-lg px-3 py-2 font-medium focus:border-gray-400 focus:ring-gray-400 focus:ring-2 transition-all"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="viewer">Can view</option>
                  <option value="editor">Can edit</option>
                </select>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  disabled={isSendingInvitations}
                  className="px-6 py-2.5 text-gray-700 bg-gray-200 border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-300 hover:border-gray-400 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitShare}
                  disabled={isSendingInvitations || invitedUsers.length === 0}
                  className="px-6 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600 flex items-center gap-2"
                >
                  {isSendingInvitations ? (
                    <>
                      <FaSpinner className="animate-spin" size={14} />
                      Sending...
                    </>
                  ) : (
                    'Send Invitations'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                disabled={isSavingChanges}
                className="px-6 py-2.5 text-gray-700 bg-gray-200 border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-300 hover:border-gray-400 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoleChanges}
                disabled={isSavingChanges || pendingRoleChanges.length === 0}
                className="px-6 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-emerald-600 flex items-center gap-2"
              >
                {isSavingChanges ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
