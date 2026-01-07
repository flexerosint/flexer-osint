
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, OSINTTool, ADMIN_TELEGRAM } from '../types';
import { analyzeOSINTResult } from '../services/geminiService';

interface UserDashboardProps {
  profile: UserProfile;
  onLogout: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ profile, onLogout }) => {
  const [tools, setTools] = useState<OSINTTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<OSINTTool | null>(null);
  const [lookupValue, setLookupValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile.isApproved) return;

    const unsubscribe = onSnapshot(collection(db, 'tools'), 
      (snapshot) => {
        const toolList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OSINTTool));
        setTools(toolList);
      },
      (err) => {
        console.error("Tools Access Error:", err);
        setError("Permission denied when fetching tools. Ensure your Firestore rules allow approved users to read the 'tools' collection.");
      }
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
      const response = await fetch(selectedTool.apiUrl.replace('{query}', encodeURIComponent(lookupValue)));
      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      
      const data = await response.json();
      setResult(data);

      const analysis = await analyzeOSINTResult(data);
      setAiAnalysis(analysis);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data from OSINT provider.");
    } finally {
      setLoading(false);
    }
  };

  if (!profile.isApproved) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-[#111] p-10 rounded-3xl border border-gray-800 shadow-2xl text-center">
          <div className="mb-6 inline-block p-4 rounded-full bg-yellow-500/10 border border-yellow-500/30">
            <i className="fas fa-clock text-4xl text-yellow-500"></i>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Pending Approval</h2>
          <p className="text-gray-400 text-lg mb-8">
            Your access request is currently being reviewed by the administration.
            Operative status is required to use the OSINT tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`https://t.me/${ADMIN_TELEGRAM}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#24A1DE] hover:bg-[#1f8aba] text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center transition"
            >
              <i className="fab fa-telegram-plane mr-2 text-xl"></i>
              CONTACT ADMIN
            </a>
            <button
              onClick={onLogout}
              className="bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 font-bold py-3 px-8 rounded-xl transition"
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-satellite-dish text-blue-500 text-xl"></i>
            <span className="font-bold text-xl tracking-tight text-white">FLEXER<span className="text-blue-500">OSINT</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">{profile.email}</span>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white transition p-2"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Tool Selection */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-toolbox text-blue-500"></i>
                Intelligence Tools
              </h3>
              <div className="space-y-2">
                {tools.length === 0 && <p className="text-gray-600 text-sm">No tools configured yet.</p>}
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setSelectedTool(tool);
                      setResult(null);
                      setAiAnalysis('');
                      setError('');
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedTool?.id === tool.id 
                        ? 'bg-blue-600/10 border-blue-600/50 text-blue-400' 
                        : 'bg-[#0a0a0a] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">{tool.name}</div>
                    <div className="text-xs opacity-60 mt-1">{tool.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedTool && (
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl animate-in fade-in duration-500">
                <h3 className="text-lg font-bold text-white mb-4">Run Lookup</h3>
                <form onSubmit={handleLookup} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-2">Identifier (Phone, Email, IP, etc.)</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition"
                      placeholder="Enter search term..."
                      value={lookupValue}
                      onChange={(e) => setLookupValue(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <i className="fas fa-search"></i>
                        EXECUTE LOOKUP
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Result Display */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedTool && !result && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[#111] border border-gray-800 border-dashed rounded-3xl opacity-50">
                <i className="fas fa-terminal text-6xl mb-6 text-gray-700"></i>
                <h3 className="text-2xl font-bold text-gray-500 mb-2">Awaiting Selection</h3>
                <p className="text-gray-600 max-w-sm">Select an intelligence tool from the sidebar to begin reconnaissance operations.</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-2xl text-red-400 flex items-start gap-3">
                <i className="fas fa-circle-exclamation mt-1"></i>
                <div>
                  <div className="font-bold">System Error</div>
                  <div className="text-sm opacity-80">{error}</div>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                {/* AI Analysis Section */}
                {aiAnalysis && (
                  <div className="bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-blue-500/30 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold">
                      <i className="fas fa-brain"></i>
                      GEMINI INTELLIGENCE SUMMARY
                    </div>
                    <div className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                      {aiAnalysis}
                    </div>
                  </div>
                )}

                {/* Raw JSON Section */}
                <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="bg-[#1a1a1a] px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <span className="font-bold text-gray-400 text-sm uppercase tracking-widest">Raw Response Data</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                      className="text-xs text-gray-500 hover:text-white transition flex items-center gap-1"
                    >
                      <i className="fas fa-copy"></i>
                      COPY JSON
                    </button>
                  </div>
                  <div className="p-6 overflow-x-auto">
                    <pre className="text-green-500 font-mono text-xs leading-relaxed">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {loading && !result && (
              <div className="space-y-4 animate-pulse">
                <div className="h-32 bg-gray-800/20 rounded-2xl"></div>
                <div className="h-64 bg-gray-800/10 rounded-2xl"></div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
