import React, { useEffect, useState } from 'react';
import { useAppStore } from './store';
import './socket';
import { MessageSquare, ShieldAlert, Settings, Network, ScrollText, Play, CheckCircle, XCircle, Trash2 } from 'lucide-react';

export default function App() {
  const { 
    rules, servers, tools, approvals, logs, chatHistory,
    fetchRules, fetchServers, fetchTools, fetchApprovals, initConversation, sendMessage, resolveApproval, createRule, deleteRule
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('chat');
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    initConversation();
    fetchRules();
    fetchServers();
    fetchTools();
    fetchApprovals();
  }, []);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col shadow-xl z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
            <ShieldAlert size={28} className="text-indigo-500" />
            ArmorIQ
          </h1>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest font-semibold">Security Agent</p>
        </div>
        <nav className="flex-1 mt-6">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Agent Chat' },
            { id: 'approvals', icon: CheckCircle, label: 'Pending Approvals', badge: approvals.length },
            { id: 'rules', icon: Settings, label: 'Policy Rules' },
            { id: 'mcp', icon: Network, label: 'MCP Registry' },
            { id: 'logs', icon: ScrollText, label: 'Audit Logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-6 py-4 text-left transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 border-l-4 border-indigo-400 text-white' 
                  : 'text-gray-400 hover:bg-gray-750 hover:text-gray-200 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </div>
              {tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
        <header className="h-16 border-b border-gray-700 flex items-center px-8 bg-gray-800/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-200 capitalize">
            {activeTab.replace('_', ' ')}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
              <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-4 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                    <MessageSquare size={64} className="mb-4" />
                    <p className="text-lg">Start a conversation with the ArmorIQ agent...</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-lg ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : msg.role === 'tool'
                        ? 'bg-gray-800 text-green-400 font-mono text-sm border border-gray-700 rounded-bl-none'
                        : 'bg-gray-700 text-gray-100 rounded-bl-none'
                    }`}>
                      <span className="block text-xs opacity-50 mb-1 uppercase tracking-wide">
                        {msg.role}
                      </span>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6 relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask the agent to perform an action..."
                  className="w-full bg-gray-800 border border-gray-600 text-white px-6 py-4 rounded-full shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-500"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-8 bg-indigo-500 hover:bg-indigo-400 p-2 rounded-full text-white transition-colors"
                >
                  <Play size={20} className="ml-1" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="max-w-5xl mx-auto">
              {approvals.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-32 text-gray-500">
                  <CheckCircle size={64} className="mb-4 opacity-50" />
                  <p className="text-xl">No pending approvals.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {approvals.map((app: any) => (
                    <div key={app.id} className="bg-gray-800 rounded-xl p-6 shadow-xl border border-yellow-500/30 flex justify-between items-center transition-transform hover:-translate-y-1">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            Requires Approval
                          </span>
                          <span className="text-gray-400 text-sm font-mono">{app.id}</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-1">Tool: <span className="text-indigo-400">{app.toolName}</span></h3>
                        <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 mt-3 font-mono border border-gray-700 overflow-x-auto max-w-2xl">
                          {JSON.stringify(app.args, null, 2)}
                        </pre>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[140px]">
                        <button 
                          onClick={() => resolveApproval(app.id, 'APPROVED')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg"
                        >
                          <CheckCircle size={18} /> Approve
                        </button>
                        <button 
                          onClick={() => resolveApproval(app.id, 'REJECTED')}
                          className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg"
                        >
                          <XCircle size={18} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-indigo-400">Create New Policy</h3>
                <div className="flex gap-4">
                  <select id="ruleType" className="bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="APPROVAL">Require Approval</option>
                    <option value="BLOCK">Block Tool</option>
                    <option value="VALIDATION">Input Validation (Regex)</option>
                  </select>
                  <input id="ruleTool" type="text" placeholder="Target Tool (e.g. read_file or *)" className="bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <button 
                    onClick={() => {
                      const type = (document.getElementById('ruleType') as HTMLSelectElement).value;
                      const tool = (document.getElementById('ruleTool') as HTMLInputElement).value;
                      createRule({ type, targetTool: tool, config: {} });
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-semibold shadow-lg transition-colors"
                  >
                    Add Rule
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {rules.map((r: any) => (
                  <div key={r.id} className="bg-gray-800 p-5 rounded-lg flex justify-between items-center border border-gray-700 shadow-md">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          r.type === 'BLOCK' ? 'bg-red-500/20 text-red-400' : 
                          r.type === 'APPROVAL' ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {r.type}
                        </span>
                        <span className="text-gray-400 text-sm">Target: <code className="text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded">{r.targetTool}</code></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm ${r.isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button 
                        onClick={() => deleteRule(r.id)}
                        className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <h3 className="text-lg font-semibold text-gray-300">Connected MCP Servers</h3>
              <div className="grid gap-4 grid-cols-2">
                {servers.map((s: any) => (
                  <div key={s.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md">
                    <h4 className="text-xl font-bold text-indigo-400">{s.name}</h4>
                    <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">{s.type}</p>
                    <code className="block mt-3 bg-gray-900 p-2 rounded text-xs text-gray-300 border border-gray-700">
                      {s.command || s.url}
                    </code>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold text-gray-300 mt-10">Discovered Tools Inventory</h3>
              <div className="grid gap-4">
                {tools.map((t: any) => (
                  <div key={t.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700 flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-emerald-400 font-mono">{t.name}</h4>
                    </div>
                    <p className="text-gray-300">{t.description}</p>
                    <pre className="text-xs text-gray-500 bg-gray-900 p-3 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(t.inputSchema, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm border border-gray-700 shadow-inner min-h-[600px]">
                {logs.length === 0 ? (
                  <p className="text-gray-600 text-center mt-10">No logs captured yet.</p>
                ) : (
                  logs.map((l: any, i: number) => (
                    <div key={i} className="mb-4 pb-4 border-b border-gray-800 last:border-0">
                      <div className="flex gap-4">
                        <span className="text-gray-500 shrink-0">{new Date(l.createdAt).toLocaleTimeString()}</span>
                        <span className={`font-bold shrink-0 w-40 ${
                          l.action.includes('BLOCK') ? 'text-red-400' :
                          l.action.includes('APPROVAL') ? 'text-yellow-400' :
                          'text-emerald-400'
                        }`}>[{l.action}]</span>
                        <span className="text-indigo-300 shrink-0 w-32">{l.toolName}</span>
                        <span className="text-gray-300 truncate">{l.details?.reason || JSON.stringify(l.details)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
      `}} />
    </div>
  );
}
