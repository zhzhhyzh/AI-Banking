import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth
export async function login(username: string, password: string) {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
}

export async function register(username: string, email: string, password: string, phone?: string) {
  const { data } = await api.post('/auth/register', { username, email, password, phone });
  return data;
}

export async function sendVerification(email: string) {
  const { data } = await api.post('/auth/send-verification', { email });
  return data;
}

export async function verifyEmail(email: string, code: string) {
  const { data } = await api.post('/auth/verify-email', { email, code });
  return data;
}

// Chat
export async function sendMessage(message: string, sessionId: string) {
  const { data } = await api.post('/chat', { message, session_id: sessionId });
  return data;
}

export default api;
