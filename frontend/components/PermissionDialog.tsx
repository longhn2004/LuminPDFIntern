import { FaTimes, FaUser, FaUsers, FaShare, FaSpinner } from "react-icons/fa";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

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
  }>({ valid: false });
  
  // Loading states
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchListUsers();
    }
  }, [isOpen, fetchListUsers]);

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

    // Only proceed with API call if email format is valid
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
      alert("Invalid email address");
      return;
    }
    if (email.trim() === "") {
      return;
    }
    if (invitedUsers.includes(email)) {
      return;
    }
    if (listUsers.some(user => user.email === email)) {
      return;
    }

    setInvitedUsers([...invitedUsers, email]);
    setEmail("");
    setRole("viewer");
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

  if (!isOpen) return null;

  return (
    <div className="fixed w-screen h-screen inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaShare className="text-xl" />
              <div>
                <h2 className="text-xl font-semibold">Share "{fileName}"</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Email Input Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite people by email
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="Enter email address..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 placeholder-gray-400"
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
                  }
                }}
              />
              {email && (
                <button
                  onClick={() => setEmail("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              )}
            </div>

            {/* Email Status */}
            {(emailStatus.valid || isAddingUser || email !== "" || isCheckingEmail) && (
              <div className={`border rounded-lg p-3 ${
                isCheckingEmail 
                  ? 'bg-blue-50 border-blue-200' 
                  : emailStatus.valid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
              }`}>
                {isCheckingEmail ? (
                  <div className="flex items-center gap-2 text-blue-700">
                    <FaSpinner className="animate-spin" size={14} />
                    <span className="text-sm">Checking email...</span>
                  </div>
                ) : emailStatus.user ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <FaUser size={14} />
                    <span className="font-medium">{emailStatus.user.name}</span>
                    <span className="text-green-600">({emailStatus.user.email})</span>
                  </div>
                ) : emailStatus.message ? (
                  <p className={`text-sm ${emailStatus.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {emailStatus.message}
                  </p>
                ) : null}
              </div>
            )}

            {/* Invited Users Tags */}
            {invitedUsers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Pending invitations:</p>
                <div className="flex flex-wrap gap-2">
                  {invitedUsers.map((user, index) => (
                    <div key={index} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-sm">
                      <span className="text-blue-700 font-medium">{user}</span>
                      <button
                        onClick={() => handleRemoveInvitedUser(user)}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-200 rounded-full p-0.5 transition-all"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current Users List */}
          {!isAddingUser && invitedUsers.length === 0 && email === "" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <FaUsers className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">People with access</h3>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                {listUsers.map((user, index) => (
                  <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
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
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permission Level Selection */}
          {(isAddingUser || invitedUsers.length > 0 || email !== "") && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaUsers className="text-gray-600" />
                  <span className="font-medium text-gray-700">Permission level for new invitations</span>
                </div>
                <select
                  className="border-2 border-gray-200 rounded-lg px-3 py-2 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="viewer">Can view</option>
                  <option value="editor">Can edit</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          {(isAddingUser || invitedUsers.length > 0 || email !== "") ? (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                disabled={isSendingInvitations}
                className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitShare}
                disabled={isSendingInvitations || invitedUsers.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600 flex items-center gap-2"
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
          ) : (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                disabled={isSavingChanges}
                className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoleChanges}
                disabled={isSavingChanges || pendingRoleChanges.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-emerald-600 flex items-center gap-2"
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
