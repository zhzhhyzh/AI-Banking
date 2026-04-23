import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendMessage } from '../services/api';
import { ActionCardRenderer } from '../components/ActionCards';
import { Send, Bot, User, Landmark, LogOut, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'agent';
  content: string;
  actionCards?: Array<{ type: string; data: any }>;
}

export default function ChatPage() {
  const { username, logout, sessionId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      content: `Welcome to JavaBank, ${username}! I'm your AI Relationship Manager. I can help you:\n\n- Open new bank accounts (Checking, Savings, High-Yield Savings)\n- View your account balances\n- Transfer money between accounts\n- Assess transaction risk\n\nHow can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const data = await sendMessage(userMessage, sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: data.response,
          actionCards: data.action_cards,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionCardResult = (result: string) => {
    setMessages((prev) => [...prev, { role: 'agent', content: result }]);
  };

  return (
    <div className="h-screen flex flex-col bg-bank-dark">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-bank-border bg-bank-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/20">
            <Landmark className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">JavaBank</h1>
            <p className="text-xs text-gray-400">AI-Managed Banking</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Signed in as <span className="text-white font-medium">{username}</span>
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-bank-border hover:border-gray-500 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'agent' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-bank-card border border-bank-border text-gray-200 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.actionCards?.map((card, j) => (
                  <ActionCardRenderer key={j} card={card} onAction={handleActionCardResult} />
                ))}
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-bank-card border border-bank-border">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-bank-border bg-bank-card/50 backdrop-blur-sm px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your banking..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-bank-dark border border-bank-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
