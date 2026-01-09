import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { UserProfile, OSINTTool, SessionMetadata } from '../types';
import ReactQuill from 'react-quill';

interface AdminPanelProps {
  profile: UserProfile;
  onLogout: () => void;
  onViewLive: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ profile, onLogout, onViewLive }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tools, setTools] = useState<OSINTTool[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'tools' | 'security' | 'devices'>('users');
  const [error, setError] = useState<string | null>(null);
  
  const [editingTool, setEditingTool] = useState<Partial<OSINTTool> | null>(null);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), 
      (snapshot) => setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile))),
      () => setError("Access denied.")
    );

    const unsubTools = onSnapshot(collection(db, 'tools'), 
      (snapshot) => setTools(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OSINTTool))),
      () => setError("Tools access denied.")
    );

    return () => { unsubUsers(); unsubTools(); };
  }, []);

  const handleToggleApproval = async (uid: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'users', uid), { isApproved: !currentStatus });
  };

  const handleToggleAdmin = async (targetUser: UserProfile) => {
    if (!profile.isOwner) {
      alert("Only the main owner can change Admin roles.");
      return;
    }
    if (targetUser.isOwner) return;
    await updateDoc(doc(db, 'users', targetUser.uid), { isAdmin: !targetUser.isAdmin });
  };

  const handleAuthorizeSession = async (user: UserProfile) => {
    if (!user.pendingSessionId) return;
    await updateDoc(doc(db, 'users', user.uid), {
      lastSessionId: user.pendingSessionId,
      pendingSessionId: null,
      pendingSessionMetadata: null
    });
  };

  const handleRevokeDevice = async (sid: string) => {
    if (confirm("Sign out this device?")) {
      const updatedSessions = profile.authorizedSessions?.filter(s => s.sid !== sid) || [];
      await updateDoc(doc(db, 'users', profile.uid), {
        authorizedSessions: updatedSessions
      });
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.isOwner) return;
    if (confirm(`Delete user ${user.email}?`)) {
      await deleteDoc(doc(db, 'users', user.uid));
    }
  };

  const handleDeleteTool = async (toolId: string, toolName: string) => {
    if (window.confirm(`Delete the tool "${toolName}"?`)) {
      try {
        await deleteDoc(doc(db, 'tools', toolId));
      } catch (err) {
        alert("Failed to delete tool.");
      }
    }
  };

  const handleSaveTool = async () => {
    if (!editingTool?.name || !editingTool?.apiUrl) {
      alert("Please fill in the tool name and URL.");
      return;
    }
    const toolData = {
      name: editingTool.name,
      apiUrl: editingTool.apiUrl,
      description: editingTool.description || "",
      icon: editingTool.icon || "fas fa-search",
      useProxy: !!editingTool.useProxy
    };
    if (editingTool.id) await updateDoc(doc(db, 'tools', editingTool.id), toolData);
    else await addDoc(collection(db, 'tools'), toolData);
    setIsToolModalOpen(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Password updated!");
        setIsPasswordModalOpen(false);
        setNewPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update. Try logging in again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const securityRequests = users.filter(u => u.pendingSessionId);
  const currentSid = localStorage.getItem('flexer_sid');

  const quillModules = {
    toolbar: [[{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']]
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-10">
      <header className="bg-[#111] border-b border-gray-800 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-bold flex items-center justify-center md:justify-start gap-3 text-white">
            <i className={`fas ${profile.isOwner ? 'fa-crown text-yellow-500' : 'fa-user-shield text-blue-500'}`}></i>
            {profile.isOwner ? 'Owner Dashboard' : 'Admin Panel'}
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Flexer OSINT</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-gray-800 overflow-x-auto whitespace-nowrap scrollbar-hide flex-grow md:flex-grow-0">
            {[
              { id: 'users', label: 'Users' },
              { id: 'tools', label: 'Tools' },
              { id: 'security', label: 'Requests' },
              { id: 'devices', label: 'Devices' }
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex-shrink-0 ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                {tab.label}
                {tab.id === 'security' && securityRequests.length > 0 && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full inline-block"></span>}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={onViewLive} className="p-3 bg-gray-800/50 rounded-xl text-gray-400 hover:text-green-500 transition" title="View Site"><i className="fas fa-eye"></i></button>
            <button onClick={() => setIsPasswordModalOpen(true)} className="p-3 bg-gray-800/50 rounded-xl text-gray-400 hover:text-blue-500 transition" title="Password"><i className="fas fa-lock"></i></button>
            <button onClick={onLogout} className="p-3 bg-gray-800/50 rounded-xl text-gray-400 hover:text-red-500 transition" title="Logout"><i className="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Manage Users</h2>
            {/* Desktop Table */}
            <div className="hidden md:block bg-[#111] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left">
                <thead className="bg-[#1a1a1a] text-gray-500 text-xs uppercase font-bold border-b border-gray-800">
                  <tr>
                    <th className="p-6">Email</th>
                    <th className="p-6 text-center">Admin?</th>
                    <th className="p-6 text-center">Approved?</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map(u => (
                    <tr key={u.uid} className="hover:bg-gray-800/20 transition group">
                      <td className="p-6">
                        <div className="font-bold text-white text-sm">{u.email}</div>
                        <div className="text-[10px] text-gray-600 font-mono mt-0.5">{u.uid}</div>
                      </td>
                      <td className="p-6 text-center">
                        <button 
                          onClick={() => handleToggleAdmin(u)} 
                          disabled={!profile.isOwner || u.isOwner} 
                          className={`text-xs font-bold px-3 py-1 rounded-lg border transition ${u.isAdmin ? 'border-blue-500 text-blue-500 bg-blue-500/5' : 'border-gray-700 text-gray-600 hover:text-gray-400'}`}
                        >
                          {u.isAdmin ? 'YES' : 'NO'}
                        </button>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${u.isApproved ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                          {u.isApproved ? 'VERIFIED' : 'AWAITING'}
                        </span>
                      </td>
                      <td className="p-6 text-right space-x-2">
                        {!u.isOwner && (
                          <>
                            <button onClick={() => handleToggleApproval(u.uid, u.isApproved)} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${u.isApproved ? 'bg-red-900/10 text-red-500' : 'bg-green-600 text-white'}`}>
                              {u.isApproved ? 'DISABLE' : 'APPROVE'}
                            </button>
                            <button onClick={() => handleDeleteUser(u)} className="p-2 text-gray-700 hover:text-red-500 transition"><i className="fas fa-trash"></i></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {users.map(u => (
                <div key={u.uid} className="bg-[#111] border border-gray-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="max-w-[70%]">
                      <div className="text-sm font-bold text-white truncate">{u.email}</div>
                      <div className={`text-[10px] font-bold mt-1 ${u.isAdmin ? 'text-blue-500' : 'text-gray-500'}`}>
                        {u.isAdmin ? 'ADMIN' : 'MEMBER'}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.isApproved ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                      {u.isApproved ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                  {!u.isOwner && (
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleApproval(u.uid, u.isApproved)} className={`flex-1 py-3 rounded-xl text-xs font-bold ${u.isApproved ? 'bg-red-900/10 text-red-500' : 'bg-green-600 text-white'}`}>
                        {u.isApproved ? 'Deactivate' : 'Approve'}
                      </button>
                      <button onClick={() => handleDeleteUser(u)} className="p-3 bg-gray-800/50 text-gray-400 rounded-xl"><i className="fas fa-trash"></i></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">OSINT Tools</h2>
              <button onClick={() => { setEditingTool({ useProxy: false }); setIsToolModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition">
                <i className="fas fa-plus mr-2"></i>New Tool
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tools.map(tool => (
                <div key={tool.id} className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col hover:border-blue-500/30 transition group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                      <i className={tool.icon || 'fas fa-search'}></i>
                    </div>
                    <div className="flex gap-1 text-gray-600">
                      <button onClick={() => { setEditingTool(tool); setIsToolModalOpen(true); }} className="hover:text-white p-2"><i className="fas fa-edit"></i></button>
                      <button onClick={() => handleDeleteTool(tool.id, tool.name)} className="hover:text-red-500 p-2"><i className="fas fa-trash-alt"></i></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-white mb-2">{tool.name}</h3>
                  <div className="text-gray-500 text-xs flex-grow overflow-hidden line-clamp-3 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: tool.description }}></div>
                  {tool.useProxy && <span className="text-[9px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1"><i className="fas fa-shield-alt"></i> Proxy Enabled</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Login Requests</h2>
            {securityRequests.length === 0 ? (
              <div className="py-20 text-center opacity-40">
                <i className="fas fa-check-circle text-4xl mb-4"></i>
                <p className="text-sm font-bold uppercase tracking-widest">Everything is secure</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {securityRequests.map(u => (
                  <div key={u.uid} className="bg-[#111] border border-blue-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <div className="font-bold text-white">{u.email}</div>
                      <div className="text-xs text-gray-500 mt-1">Device: {u.pendingSessionMetadata?.deviceName}</div>
                    </div>
                    <button onClick={() => handleAuthorizeSession(u)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-bold transition">ALLOW LOGIN</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">My Devices</h2>
            <div className="grid gap-4">
              {profile.authorizedSessions?.map(s => (
                <div key={s.sid} className={`bg-[#111] border ${s.sid === currentSid ? 'border-blue-500/50' : 'border-gray-800'} rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                      <i className={`fas ${s.deviceName.toLowerCase().includes('mobile') ? 'fa-mobile-alt' : 'fa-laptop'}`}></i>
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">
                        {s.deviceName} {s.sid === currentSid && <span className="text-[10px] bg-blue-600 px-1.5 py-0.5 rounded-full ml-2">Active</span>}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">{new Date(s.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  {s.sid !== currentSid && (
                    <button onClick={() => handleRevokeDevice(s.sid)} className="w-full sm:w-auto text-red-500 text-xs font-bold uppercase border border-red-900/20 px-4 py-2 rounded-xl hover:bg-red-500/10 transition">Disconnect</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Tool Modal */}
      {isToolModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#111] border border-gray-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Tool Configuration</h3>
              <button onClick={() => setIsToolModalOpen(false)} className="text-gray-500 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Tool Name</label>
                <input type="text" className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-3.5 text-white focus:border-blue-500 outline-none transition" placeholder="e.g. Phone Lookup" value={editingTool?.name || ''} onChange={e => setEditingTool({...editingTool, name: e.target.value})}/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">API Endpoint URL</label>
                <input type="text" className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-3.5 text-white font-mono text-sm focus:border-blue-500 outline-none transition" placeholder="https://api.site.com/{query}" value={editingTool?.apiUrl || ''} onChange={e => setEditingTool({...editingTool, apiUrl: e.target.value})}/>
                <p className="text-[10px] text-gray-600 mt-1.5 ml-1">Use {'{query}'} as the placeholder for user input.</p>
              </div>

              <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Use Security Proxy</div>
                  <div className="text-[10px] text-gray-500">Enable this if the API has CORS restrictions.</div>
                </div>
                <button 
                  onClick={() => setEditingTool({...editingTool, useProxy: !editingTool?.useProxy})}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editingTool?.useProxy ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingTool?.useProxy ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="flex-grow">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Description</label>
                <div className="h-[200px] mb-12 md:mb-10">
                  <ReactQuill theme="snow" value={editingTool?.description || ''} onChange={val => setEditingTool({...editingTool, description: val})} modules={quillModules} className="h-full bg-[#0a0a0a] rounded-xl"/>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-800">
              <button onClick={handleSaveTool} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition">Save Tool</button>
              <button onClick={() => setIsToolModalOpen(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] border border-gray-800 w-full max-w-md rounded-2xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><i className="fas fa-lock text-blue-500"></i> Change Password</h3>
            {passwordError && <div className="p-3 mb-4 bg-red-900/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{passwordError}</div>}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input type="password" required className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-3.5 text-white focus:border-blue-500 outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min. 6)"/>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={passwordLoading} className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 text-xs uppercase tracking-widest">
                  {passwordLoading ? 'Updating...' : 'Update'}
                </button>
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 bg-gray-800 text-gray-500 font-bold py-3.5 rounded-xl transition text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;