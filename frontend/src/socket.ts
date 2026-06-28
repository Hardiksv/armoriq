import { io } from 'socket.io-client';
import { useAppStore } from './store';

export const socket = io('https://armoriq-2l9h.onrender.com');

socket.on('connect', () => {
  console.log('Connected to Backend WS');
});

socket.on('approval_requested', (payload) => {
  console.log('Approval requested:', payload);
  useAppStore.getState().fetchApprovals();
});

socket.on('rule_updated', (payload) => {
  console.log('Rule updated:', payload);
  useAppStore.getState().fetchRules();
});

socket.on('log_emitted', (payload) => {
  useAppStore.getState().addLog(payload);
});

export default socket;
