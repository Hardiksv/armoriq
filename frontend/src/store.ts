import { create } from 'zustand';
import axios from 'axios';

const API_BASE = 'https://armoriq-2l9h.onrender.com/api';

interface AppState {
  rules: any[];
  servers: any[];
  tools: any[];
  approvals: any[];
  logs: any[];
  conversationId: string | null;
  chatHistory: any[];
  
  fetchRules: () => Promise<void>;
  fetchServers: () => Promise<void>;
  fetchTools: () => Promise<void>;
  fetchApprovals: () => Promise<void>;
  
  initConversation: () => Promise<void>;
  sendMessage: (msg: string) => Promise<void>;
  fetchChatHistory: () => Promise<void>;
  
  resolveApproval: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  createRule: (rule: any) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  addLog: (log: any) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  rules: [],
  servers: [],
  tools: [],
  approvals: [],
  logs: [],
  conversationId: null,
  chatHistory: [],

  fetchRules: async () => {
    const res = await axios.get(`${API_BASE}/rules`);
    set({ rules: res.data });
  },
  
  fetchServers: async () => {
    const res = await axios.get(`${API_BASE}/mcp/servers`);
    set({ servers: res.data });
  },
  
  fetchTools: async () => {
    const res = await axios.get(`${API_BASE}/mcp/tools`);
    set({ tools: res.data });
  },
  
  fetchApprovals: async () => {
    const res = await axios.get(`${API_BASE}/approvals/pending`);
    set({ approvals: res.data });
  },
  
  initConversation: async () => {
    const res = await axios.post(`${API_BASE}/chat/init`);
    set({ conversationId: res.data.id, chatHistory: [] });
  },
  
  sendMessage: async (msg: string) => {
    const { conversationId, fetchChatHistory } = get();
    if (!conversationId) return;
    
    // Optimistic UI
    set((state) => ({
      chatHistory: [...state.chatHistory, { role: 'user', content: msg }]
    }));
    
    await axios.post(`${API_BASE}/chat/message`, { conversationId, message: msg });
    await fetchChatHistory();
  },
  
  fetchChatHistory: async () => {
    const { conversationId } = get();
    if (!conversationId) return;
    const res = await axios.get(`${API_BASE}/chat/${conversationId}`);
    set({ chatHistory: res.data });
  },
  
  resolveApproval: async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await axios.post(`${API_BASE}/approvals/${id}/resolve`, { status });
    await get().fetchApprovals();
    await get().fetchChatHistory();
  },
  
  createRule: async (rule: any) => {
    await axios.post(`${API_BASE}/rules`, rule);
    await get().fetchRules();
  },
  
  deleteRule: async (id: string) => {
    await axios.delete(`${API_BASE}/rules/${id}`);
    await get().fetchRules();
  },
  
  addLog: (log: any) => {
    set((state) => ({ logs: [log, ...state.logs].slice(0, 100) }));
  }
}));
