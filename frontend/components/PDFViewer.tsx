"use client"
import { HTTP_STATUS } from "@/libs/constants/httpStatus";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from 'react'
import { FaArrowLeft, FaTimes, FaTrash } from "react-icons/fa";
import { FaDownload, FaUsers } from "react-icons/fa";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

declare global {
  interface Window {
    Core: any;
  }
}

async function initCore(pdfId: string) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  window.Core.setWorkerPath('/webviewer/core');

  const documentViewer = new window.Core.DocumentViewer();

  // Hook up the DocumentViewer object to your own elements
  documentViewer.setScrollViewElement(document.getElementById('scroll-view'));
  documentViewer.setViewerElement(document.getElementById('viewer'));

  // Load your document
  documentViewer.loadDocument(`/api/file/${pdfId}/download`, { l: process.env.NEXT_APP_PDFTRON_LICENSE_KEY });
}

interface PDFViewerProps {
    pdfId: string;
}

export default function Page({pdfId}: PDFViewerProps) {
  const router = useRouter();
  const [isLoadedCoreRef, setIsLoadedCoreRef] = useState(false);
  const [isLoadedWebViewer, setIsLoadedWebViewer] = useState(false);
  const [isLoadedPdfNet, setIsLoadedPdfNet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [fileName, setFileName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');

  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);

  const [listUsers, setListUsers] = useState<{ id: string, email: string, role: string, name: string }[]>([]);

  const [emailStatus, setEmailStatus] = useState<{ valid: boolean; user?: { name: string; email: string }; message?: string }>({ valid: false });


  const fetchListUsers = async () => {
    const response = await fetch(`/api/file/${pdfId}/users`);
    if (response.status === HTTP_STATUS.FORBIDDEN) {
      setIsOwner(false);
      return;
    }
    const data = await response.json();
    setIsOwner(true);
    setListUsers(data);
  }

  const fetchFileInfo = async () => {
    const response = await fetch(`/api/file/${pdfId}/info`);
    const data = await response.json();
    setFileName(data.name);
  }

  useEffect(() => {
    
    fetchFileInfo();

    
    fetchListUsers();
  }, [pdfId]);

  useEffect(() => {
    if (!isLoadedCoreRef && isLoadedWebViewer && isLoadedPdfNet) {
      setIsLoadedCoreRef(true);
      initCore(pdfId as string);
      setIsLoaded(true);
      
    }

    setIsLoadedWebViewer(true);
    setIsLoadedPdfNet(true);
  }, );

  const downloadFile = async () => {
    const downloadUrl = `/api/file/${pdfId}/download`;
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const deleteFile = async () => {
    const response = await fetch(`/api/file/${pdfId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    console.log(data);
    router.push('/dashboard/document-list');
  }

  const handleSubmitShare = async () => {
    console.log('invitedUsers: ', invitedUsers);
    console.log('data:', { fileId: pdfId, emails: invitedUsers, role });
    const response = await fetch(`/api/file/invite`, {
      method: 'POST',
      body: JSON.stringify({ fileId: pdfId, emails: invitedUsers, role }),
    });
    const data = await response.json();
    
    // Show toast notification
    if (response.ok) {
      toast.success('Users invited successfully!');
    } else {
      toast.error('Failed to invite users.');
    }

    // Fetch list users again
    const responseUsers = await fetch(`/api/file/${pdfId}/users`);
    const dataUsers = await responseUsers.json();
    if (dataUsers.length && dataUsers.length > 0) {
      setListUsers(dataUsers);
    }
    setShowPermissionDialog(false);
    setEmail('');
    setInvitedUsers([]);
    setRole('viewer');
    setEmailStatus({ valid: false });
  }

  const handleCheckEmail = async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isValidEmail.test(email)) {
      setEmailStatus({ valid: false, message: 'Invalid email address' });
      return false;
    }
    const response = await fetch(`/api/auth/user-by-email?email=${email}`);
    const data = await response.json();
    console.log('data: ', data);
    
    if (data.name) { // Assuming the API returns an 'exists' field
      setEmailStatus({ valid: true, user: { name: data.name, email: data.email } });
    } else {
      setEmailStatus({ valid: true, message: '[Unregistered User]' });
    }
  }

  const handleAddUser = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isValidEmail.test(email)) {
      alert('Invalid email address');
      return;
    }
    if (email.trim() === '') {
      return;
    }
    if (invitedUsers.includes(email)) {
      return;
    }
    if (listUsers.some(user => user.email === email)) {
      return;
    }
    
    setInvitedUsers([...invitedUsers, email]);
    setEmail('');
    setRole('viewer');
  }

  const handleRemoveInvitedUser = (email: string) => {
    setInvitedUsers(invitedUsers.filter(user => user !== email));
  }

  const handleChangeRole = async (userId: string, email: string, role: string) => {    
    setListUsers(listUsers.map(user => user.id === userId ? {...user, role} : user));    
    const response = await fetch(`/api/file/change-role`, {      
      method: 'POST',      
      body: JSON.stringify({ fileId: pdfId, email, role }),    
    });
    const data = await response.json();
    
    // Show toast notification
    
    console.log(data);
  }

  const handleSaveUser = async () => {
    fetchListUsers();
   
    toast.success('User role updated successfully!');
    setShowPermissionDialog(false);
    setEmail('');
    setInvitedUsers([]);
    setRole('viewer');
    setEmailStatus({ valid: false });
  }
  
  return (
  <div className="max-w-full text-black bg-white flex flex-col">
    <ToastContainer position="bottom-right" />
    {!isLoaded && <h1>Loading...</h1>}
    {isLoaded && <div className="h-full text-black bg-white flex flex-col">
      <Script src="/webviewer/core/webviewer-core.min.js" onLoad={() => setIsLoadedWebViewer(true)}/>
      {isLoadedWebViewer && <Script src="/webviewer/core/pdf/PDFNet.js"  onLoad={() => setIsLoadedPdfNet(true)}/>}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/dashboard/document-list')} className="text-gray-600 hover:text-gray-800">
            <FaArrowLeft size={16} />
          </button>
          <h2 className="font-medium">{fileName}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && <button onClick={deleteFile} className="h-10 px-4 flex items-center gap-2 text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors duration-300 active:scale-95">
            Delete
            <FaTrash size={16} />
          </button>}
          <button onClick={downloadFile} className="h-10 px-4 flex items-center gap-2 text-white bg-yellow-500 rounded-md hover:bg-yellow-600 transition-colors duration-300 active:scale-95">
            Download
            <FaDownload size={16} />
          </button>
          {isOwner && <button onClick={() => setShowPermissionDialog(true)} className="h-10 px-4 flex items-center gap-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors duration-300 active:scale-95">
            Share
            <FaUsers size={16} />
          </button>}
        </div>
      </div>
      <div className='webviewer' id="scroll-view" style={{ height: '84vh', width: '100%', display: 'flex', justifyContent: 'center', overflowY: 'scroll', backgroundColor: '#f0f0f0' }}>
        <div id="viewer" />
      </div>
    </div>}

    {showPermissionDialog && (
      <div className="fixed w-screen h-screen inset-0 z-2 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-4 rounded-lg w-1/2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Share "{fileName}"</h2>
            {/* <button onClick={() => setShowPermissionDialog(false)} className="text-gray-600 hover:text-gray-800">
              <FaTimes size={16} />
            </button> */}
            
          </div>
          {/* input for email */}
          <div className="w-full relative flex items-center">
            <input type="email" placeholder="Email" className="border w-full border-gray-300 rounded-md p-2" value={email} onChange={(e) => {
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
              if (e.key === 'Enter') {
                e.preventDefault();
                // handleCheckEmail(email);
                handleAddUser(e);
              }
            }} />
            {/* clear email button inside input */}
            <button onClick={() => setEmail('')} className="text-gray-600 hover:text-gray-800 absolute right-2 top-1/2 -translate-y-1/2">
              <FaTimes size={16} />
            </button>
          </div>
          {(emailStatus.valid || isAddingUser || email !== '') && (
            <div className="text-green-500">
              {emailStatus.user ? (
                <p>{emailStatus.user.name} - {emailStatus.user.email}</p>
              ) : (
                <p>{emailStatus.message}</p>
              )}
            </div>
          )}
          <div className="absolute top-0 right-0">

          </div>
          {(isAddingUser || invitedUsers.length > 0) && <div className="flex flex-wrap gap-2">
            {invitedUsers.map((user, index) => (
              <div key={index} className="flex border border-gray-300 rounded-full p-2 gap-2">
                <p>{user}</p>
                <button onClick={() => handleRemoveInvitedUser(user)} className="text-gray-600 hover:text-gray-800">
                  <FaTimes size={16} />
                </button>
              </div>
            ))}
          </div>}

          {(!isAddingUser && invitedUsers.length === 0 && email === '') && <div className="w-full border border-gray-300 rounded-md p-2">
            {listUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between">
                {/* <p>{user.email}</p>
                <p>{user.role}</p> */}
                <div className="">
                  <p>{user.name}</p>
                  <p>{user.email}</p>
                </div>
                                {user.role !== 'owner' && <select disabled={user.role === 'none'} className="border border-gray-300 rounded-md p-2 disabled:bg-gray-200" value={user.role} onChange={(e) => handleChangeRole(user.id, user.email, e.target.value)}>                  <option value="viewer">Viewer</option>                  <option value="editor">Editor</option>                  <option value="none">Remove</option>                </select>}
                {user.role === 'owner' && <p className="text-gray-600">Owner</p>}
              </div>
            ))}

          </div>}

          <div className="flex items-center justify-between"> 
            <div className="flex items-center gap-2">
              People Invited 
              <select className="border border-gray-300 rounded-md p-2" onChange={(e) => {
                console.log('e.target.value: ', e.target.value);
                setRole(e.target.value)
                }}>
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>
            </div>

            {(isAddingUser || invitedUsers.length > 0 || email !== '') && <div className="flex items-center gap-2">
              {/* Add user button */}
              <button onClick={handleSubmitShare} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-300 active:scale-95">
                Add User
              </button>

              {/* cancel button */}
              <button onClick={() => {
                setShowPermissionDialog(false)
                setEmail('')
                setRole('viewer')
                setInvitedUsers([])
                setEmailStatus({ valid: false })
                }} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-300 active:scale-95">
                Cancel
              </button>
            </div>}

            {(!isAddingUser && invitedUsers.length === 0 && email === '') && <div className="flex items-center gap-2">
              <button onClick={() => {
                setShowPermissionDialog(false)
                setEmail('')
                setRole('viewer')
                setInvitedUsers([])
                setEmailStatus({ valid: false })
                }} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-300 active:scale-95">
                Cancel
              </button>
              {/* save button */}
              <button onClick={handleSaveUser} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors duration-300 active:scale-95">
                Save
              </button>
            </div>}
          </div>
        </div>
      </div>
    )}
  </div>)
}