import { io } from 'socket.io-client';
import { useAppStore } from './store';

const socket = io('http://localhost:3000');

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
