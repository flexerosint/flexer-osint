
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, OSINTTool } from '../types';

interface AdminPanelProps {
  profile: UserProfile;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ profile, onLogout }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tools, setTools] = useState<OSINTTool[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'tools'>('users');
  const [error, setError] = useState<string | null>(null);
  
  // Tool Editor State
  const [editingTool, setEditingTool] = useState<Partial<OSINTTool> | null>(null);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);

  useEffect(() => {
    setError(null);

    const unsubUsers = onSnapshot(collection(db, 'users'), 
      (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
      },
      (err) => {
        console.error("Admin Users Error:", err);
        if (err.code === 'permission-denied') {
          setError("Access Denied: You do not have permission to view the user list. Ensure your Firestore rules allow administrators to list the 'users' collection.");
        }
      }
    );

    const unsubTools = onSnapshot(collection(db, 'tools'), 
      (snapshot) => {
        setTools(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OSINTTool)));
      },
      (err) => {
        console.error("Admin Tools Error:", err);
        if (err.code === 'permission-denied') {
          setError("Access Denied: You do not have permission to view tools.");
        }
      }
    );

    return () => {
      unsubUsers();
      unsubTools();
    };
  }, []);

  const handleToggleApproval = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: !currentStatus });
    } catch (err) {
      alert("Failed to update user: Permissions might be insufficient.");
    }
  };

  const handleSaveTool = async () => {
    if (!editingTool?.name || !editingTool?.apiUrl) {
      alert("Name and API URL are required");
      return;
    }

    try {
      if (editingTool.id) {
        const { id, ...rest } = editingTool;
        await updateDoc(doc(db, 'tools', id), rest);
      } else {
        await addDoc(collection(db, 'tools'), {
          ...editingTool,
          description: editingTool.description || "",
          icon: editingTool.icon || "fas fa-search"
        });
      }
      setIsToolModalOpen(false);
      setEditingTool(null);
    } catch (err) {
      alert("Failed to save tool: Permissions might be insufficient.");
    }
  };

  const handleDeleteTool = async (id: string) => {
    if (confirm("Delete this tool?")) {
      try {
        await deleteDoc(doc(db, 'tools', id));
      } catch (err) {
        alert("Delete failed: Permissions might be insufficient.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="bg-[#111] border-b border-gray-800 p-6 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <i className="fas fa-user-shield text-blue-500"></i>
            Control Center
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Admin Operations</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'tools' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            Tools
          </button>
          <button onClick={onLogout} className="p-2 text-gray-400 hover:text-white">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400 flex items-start gap-3">
             <i className="fas fa-exclamation-circle mt-1"></i>
             <p className="text-sm">{error}</p>
          </div>
        )}

        {activeTab === 'users' && !error && (
          <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#1a1a1a] text-gray-400 text-sm border-b border-gray-800">
                  <th className="p-4">Operative</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Session</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-gray-800/20 transition">
                    <td className="p-4">
                      <div className="font-bold text-white">{u.email}</div>
                      <div className="text-xs text-gray-600">{u.uid}</div>
                    </td>
                    <td className="p-4">
                      {u.isApproved ? (
                        <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded border border-green-500/20">ACTIVE</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded border border-yellow-500/20">PENDING</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-mono text-gray-500 truncate max-w-[150px]">{u.lastSessionId}</div>
                    </td>
                    <td className="p-4 text-right">
                      {!u.isAdmin && (
                        <button
                          onClick={() => handleToggleApproval(u.uid, u.isApproved)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                            u.isApproved ? 'bg-red-900/20 text-red-500 hover:bg-red-900/40' : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {u.isApproved ? 'Suspend' : 'Approve'}
                        </button>
                      )}
                      {u.isAdmin && <span className="text-blue-500 text-sm font-bold">MASTER ADMIN</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tools' && !error && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Lookup Capabilities</h2>
              <button 
                onClick={() => {
                  setEditingTool({});
                  setIsToolModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-blue-900/20"
              >
                <i className="fas fa-plus"></i> Add Tool
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map(tool => (
                <div key={tool.id} className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-600/30">
                      <i className={`${tool.icon || 'fas fa-search'} text-blue-500`}></i>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingTool(tool);
                          setIsToolModalOpen(true);
                        }}
                        className="text-gray-500 hover:text-white p-2"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={() => handleDeleteTool(tool.id)}
                        className="text-gray-500 hover:text-red-500 p-2"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{tool.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{tool.description}</p>
                  <div className="bg-[#0a0a0a] border border-gray-800 p-2 rounded-lg text-[10px] font-mono text-gray-600 truncate">
                    {tool.apiUrl}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Tool Modal */}
      {isToolModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#111] border border-gray-800 w-full max-w-xl rounded-3xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingTool?.id ? 'Modify Tool' : 'Initialize New Tool'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">Display Name</label>
                <input
                  type="text"
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-3 text-white"
                  value={editingTool?.name || ''}
                  onChange={e => setEditingTool({...editingTool, name: e.target.value})}
                  placeholder="e.g., Global Phone Tracer"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">API Endpoint URL (Use {'{query}'} as placeholder)</label>
                <input
                  type="text"
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-3 text-white font-mono text-sm"
                  value={editingTool?.apiUrl || ''}
                  onChange={e => setEditingTool({...editingTool, apiUrl: e.target.value})}
                  placeholder="https://api.osint.com/v1/lookup?id={query}"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">System Description</label>
                <textarea
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-3 text-white h-24"
                  value={editingTool?.description || ''}
                  onChange={e => setEditingTool({...editingTool, description: e.target.value})}
                  placeholder="Detailed breakdown of tool capabilities..."
                ></textarea>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button 
                onClick={handleSaveTool}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
              >
                DEPLOY SYSTEM
              </button>
              <button 
                onClick={() => setIsToolModalOpen(false)}
                className="flex-1 bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800 font-bold py-3 rounded-xl transition"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
