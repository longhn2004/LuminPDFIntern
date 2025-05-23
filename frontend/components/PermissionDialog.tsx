import { FaTimes } from "react-icons/fa";
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
  const [emailStatus, setEmailStatus] = useState<{
    valid: boolean;
    user?: { name: string; email: string };
    message?: string;
  }>({ valid: false });

  const handleCheckEmail = async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isValidEmail.test(email)) {
      setEmailStatus({ valid: false, message: "Invalid email address" });
      return false;
    }
    const response = await fetch(`/api/auth/user-by-email?email=${email}`);
    const data = await response.json();
    
    if (data.name) {
      setEmailStatus({ valid: true, user: { name: data.name, email: data.email } });
    } else {
      setEmailStatus({ valid: true, message: "[Unregistered User]" });
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

  const handleChangeRole = async (userId: string, email: string, role: string) => {
    const response = await fetch(`/api/file/change-role`, {
      method: "POST",
      body: JSON.stringify({ fileId: pdfId, email, role }),
    });
    await response.json();
    await fetchListUsers();
  };

  const handleSubmitShare = async () => {
    const response = await fetch(`/api/file/invite`, {
      method: "POST",
      body: JSON.stringify({ fileId: pdfId, emails: invitedUsers, role }),
    });
    
    if (response.ok) {
      toast.success("Users invited successfully!");
      await fetchListUsers();
      resetForm();
    } else {
      toast.error("Failed to invite users.");
    }
  };

  const handleSaveUser = async () => {
    await fetchListUsers();
    toast.success("User role updated successfully!");
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setEmail("");
    setInvitedUsers([]);
    setRole("viewer");
    setEmailStatus({ valid: false });
    setIsAddingUser(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed w-screen h-screen inset-0 z-2 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg w-1/2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share "{fileName}"</h2>
        </div>
        
        <div className="w-full relative flex items-center">
          <input
            type="email"
            placeholder="Email"
            className="border w-full border-gray-300 rounded-md p-2"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              handleCheckEmail(e.target.value);
            }}
            onFocus={() => {
              setIsAddingUser(true);
            }}
            onBlur={() => {
              setIsAddingUser(false);
              setEmailStatus({ valid: false });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUser(e);
              }
            }}
          />
          <button
            onClick={() => setEmail("")}
            className="text-gray-600 hover:text-gray-800 absolute right-2 top-1/2 -translate-y-1/2"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {(emailStatus.valid || isAddingUser || email !== "") && (
          <div className="text-green-500">
            {emailStatus.user ? (
              <p>
                {emailStatus.user.name} - {emailStatus.user.email}
              </p>
            ) : (
              <p>{emailStatus.message}</p>
            )}
          </div>
        )}

        {(isAddingUser || invitedUsers.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {invitedUsers.map((user, index) => (
              <div key={index} className="flex border border-gray-300 rounded-full p-2 gap-2">
                <p>{user}</p>
                <button
                  onClick={() => handleRemoveInvitedUser(user)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!isAddingUser && invitedUsers.length === 0 && email === "" && (
          <div className="w-full border border-gray-300 rounded-md p-2">
            {listUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="">
                  <p>{user.name}</p>
                  <p>{user.email}</p>
                </div>
                {user.role !== "owner" && (
                  <select
                    disabled={user.role === "none"}
                    className="border border-gray-300 rounded-md p-2 disabled:bg-gray-200"
                    value={user.role}
                    onChange={(e) => handleChangeRole(user.id, user.email, e.target.value)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="none">Remove</option>
                  </select>
                )}
                {user.role === "owner" && <p className="text-gray-600">Owner</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            People Invited
            <select
              className="border border-gray-300 rounded-md p-2"
              onChange={(e) => {
                setRole(e.target.value);
              }}
            >
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
          </div>

          {(isAddingUser || invitedUsers.length > 0 || email !== "") && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmitShare}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-300 active:scale-95"
              >
                Add User
              </button>

              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-300 active:scale-95"
              >
                Cancel
              </button>
            </div>
          )}

          {!isAddingUser && invitedUsers.length === 0 && email === "" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-300 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors duration-300 active:scale-95"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
