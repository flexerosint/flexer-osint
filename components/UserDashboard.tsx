import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { UserProfile, OSINTTool, ADMIN_TELEGRAM } from '../types';
import { analyzeOSINTResult } from '../services/geminiService';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface UserDashboardProps {
  profile: UserProfile;
  onLogout: () => void;
  onToggleAdmin?: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ profile, onLogout, onToggleAdmin }) => {
  const [tools, setTools] = useState<OSINTTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<OSINTTool | null>(null);
  const [lookupValue, setLookupValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [error, setError] = useState('');
  const [resultTab, setResultTab] = useState<'raw' | 'analysis'>('raw');

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!profile.isApproved) return;
    const unsubscribe = onSnapshot(collection(db, 'tools'), 
      (snapshot) => setTools(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OSINTTool))),
      () => setError("Could not load tools.")
    );
    return () => unsubscribe();
  }, [profile.isApproved]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;

    setLoading(true);
    setResult(null);
    setAiAnalysis('');
    setError('');

    try {
      let finalUrl = selectedTool.apiUrl.replace('{query}', encodeURIComponent(lookupValue));
      if (selectedTool.useProxy) {
        finalUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(finalUrl)}`;
      }
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      let data = await response.json();
      if (selectedTool.useProxy && data.contents) {
        try { data = JSON.parse(data.contents); } 
        catch { data = data.contents; }
      }
      setResult(data);
      setResultTab('raw');
      const analysis = await analyzeOSINTResult(data);
      setAiAnalysis(analysis);
    } catch (err: any) {
      setError(`Search failed: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("Too short (min. 6).");
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Updated!");
        setIsPasswordModalOpen(false);
        setNewPassword('');
      }
    } catch (err: any) {
      setPasswordError("Failed. Re-login maybe?");
    } finally {
      setPasswordLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = resultTab === 'raw' ? JSON.stringify(result, null, 2) : aiAnalysis;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard.");
  };

  if (!profile.isApproved) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-[#111] p-10 rounded-3xl border border-gray-800 shadow-2xl text-center">
          <i className="fas fa-clock text-4xl text-yellow-500 mb-6"></i>
          <h2 className="text-2xl font-bold text-white mb-3">Pending Approval</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">An admin needs to approve your account before you can use the tools.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`https://t.me/${ADMIN_TELEGRAM}`} target="_blank" rel="noopener noreferrer" className="bg-[#24A1DE] text-white font-bold py-3.5 px-8 rounded-xl flex items-center justify-center transition uppercase text-xs tracking-widest"><i className="fab fa-telegram-plane mr-2"></i> Contact Admin</a>
            <button onClick={onLogout} className="border border-gray-700 text-gray-400 py-3.5 px-8 rounded-xl font-bold hover:bg-gray-800 transition text-xs uppercase tracking-widest">Logout</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="border-b border-gray-800 bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-search text-blue-500"></i>
            <span className="font-bold text-lg text-white">Flexer <span className="text-blue-500">Intel</span></span>
          </div>
          <div className="flex items-center gap-1">
            {(profile.isAdmin || profile.isOwner) && onToggleAdmin && (
               <button onClick={onToggleAdmin} className="p-3 text-gray-500 hover:text-blue-500" title="Admin Panel"><i className="fas fa-user-shield"></i></button>
            )}
            <button onClick={() => setIsPasswordModalOpen(true)} className="p-3 text-gray-500 hover:text-blue-500" title="Password"><i className="fas fa-lock"></i></button>
            <button onClick={onLogout} className="p-3 text-gray-500 hover:text-red-500" title="Logout"><i className="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!selectedTool ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Choose a Tool</h1>
              <p className="text-gray-500 text-sm">Select a module to start your search.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tools.map(tool => (
                <button key={tool.id} onClick={() => setSelectedTool(tool)} className="group bg-[#111] border border-gray-800 rounded-3xl p-6 text-left hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col h-full shadow-lg">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-5 border border-blue-500/20 text-blue-500 group-hover:scale-105 transition"><i className={`${tool.icon || 'fas fa-search'} text-xl`}></i></div>
                  <h3 className="text-lg font-bold text-white mb-2">{tool.name}</h3>
                  <div className="text-gray-500 text-xs leading-relaxed mb-6 line-clamp-2" dangerouslySetInnerHTML={{ __html: tool.description }}></div>
                  <div className="mt-auto text-blue-500 text-[10px] font-bold uppercase tracking-widest">Use Tool <i className="fas fa-arrow-right ml-1"></i></div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-4">
              <button onClick={() => { setSelectedTool(null); setResult(null); }} className="w-full bg-[#111] border border-gray-800 p-4 rounded-2xl text-gray-400 hover:text-white flex items-center justify-center gap-3 transition font-bold text-xs uppercase tracking-widest"><i className="fas fa-arrow-left"></i> Back to Hub</button>
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6"><i className={`${selectedTool.icon} text-blue-500`}></i><h3 className="font-bold text-white">{selectedTool.name}</h3></div>
                <form onSubmit={handleLookup} className="space-y-4">
                  <input type="text" required className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 outline-none transition text-sm" placeholder="Enter search text..." value={lookupValue} onChange={e => setLookupValue(e.target.value)}/>
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                    {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Search Now'}
                  </button>
                </form>
                {selectedTool.description && (
                   <div className="mt-8 pt-6 border-t border-gray-800">
                     <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">About this tool</p>
                     <div className="text-[11px] text-gray-500 leading-relaxed space-y-2 prose prose-invert" dangerouslySetInnerHTML={{ __html: selectedTool.description }}></div>
                   </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              {error && <div className="p-5 bg-red-900/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex gap-3"><i className="fas fa-exclamation-circle mt-0.5"></i>{error}</div>}

              {result ? (
                <div className="bg-[#111] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
                  <div className="bg-[#1a1a1a] px-6 pt-6 border-b border-gray-800">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Data Feed Active</span>
                      </div>
                      <button onClick={copyToClipboard} className="text-[10px] font-bold text-blue-500 border border-blue-500/20 px-3 py-1.5 rounded-lg bg-blue-500/5 uppercase hover:bg-blue-500/10 transition">
                        <i className="fas fa-copy mr-1"></i> Copy All
                      </button>
                    </div>
                    <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-transparent">
                      <button onClick={() => setResultTab('raw')} className={`pb-4 px-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${resultTab === 'raw' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-white'}`}>Raw Data</button>
                      <button onClick={() => setResultTab('analysis')} className={`pb-4 px-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${resultTab === 'analysis' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-white'}`}>AI Summary</button>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a] min-h-[400px]">
                    {resultTab === 'raw' ? (
                      <div className="max-h-[600px] overflow-auto custom-scrollbar">
                        <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1.5rem', fontSize: '11px', backgroundColor: '#0a0a0a' }}>
                          {JSON.stringify(result, null, 2)}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <div className="p-6 md:p-8 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {aiAnalysis || <div className="py-20 text-center opacity-30"><i className="fas fa-brain text-4xl mb-3 animate-pulse"></i><p className="text-xs font-bold uppercase tracking-widest">AI is thinking...</p></div>}
                      </div>
                    )}
                  </div>
                </div>
              ) : !loading && (
                <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 bg-[#111] border border-gray-800 border-dashed rounded-3xl opacity-30">
                  <i className="fas fa-search text-5xl mb-6"></i>
                  <h3 className="text-xl font-bold mb-2 uppercase tracking-widest">Ready to Search</h3>
                  <p className="text-xs max-w-xs">Enter your query on the left to get intelligence data.</p>
                </div>
              )}
              {loading && <div className="space-y-4 animate-pulse"><div className="h-14 bg-gray-800 rounded-2xl"></div><div className="h-96 bg-gray-800 rounded-3xl"></div></div>}
            </div>
          </div>
        )}
      </main>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] border border-gray-800 w-full max-w-md rounded-2xl p-8 animate-in zoom-in-95 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><i className="fas fa-lock text-blue-500"></i> Change Password</h3>
            {passwordError && <div className="p-3 mb-4 bg-red-900/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{passwordError}</div>}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input type="password" required className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-3.5 text-white focus:border-blue-500 outline-none text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min. 6)"/>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={passwordLoading} className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 text-xs uppercase tracking-widest">Update</button>
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 bg-gray-800 text-gray-500 font-bold py-3.5 rounded-xl transition text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;