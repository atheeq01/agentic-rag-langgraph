import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, CheckCircle2, Loader2, Plus, MessageSquare, X, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

type Message = { id: string; role: 'user' | 'agent'; content: string; timestamp: string; citations?: string[]; authUrl?: string; requiresGoogleAuth?: boolean };

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'agent',
  content: 'Hello! I am the AI HR Agent. How can I assist you with company policies, leave, or general HR inquiries today?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function AIChatPage() {
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pendingAuthUrl, setPendingAuthUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Responsive State Tracker
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingHistory]);

  const handleGoogleConnect = async () => {
    try {
      const response = await api.get('/auth/google/login');
      const authUrl = response.data.auth_url;
      
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        authUrl, 
        "Google OAuth", 
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        console.log("Gmail connected successfully!");
        // Send a specific resume message so the router recognises this as a
        // leave-agent continuation (not a generic "yes" that falls to HR_AGENT)
        chatMutation.mutate("Gmail connected. Please proceed and submit my leave request now.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Fetch all sessions for sidebar
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['ai-sessions'],
    queryFn: () => api.get('/ai/sessions').then(res => res.data)
  });

  // Load a session's message history
  const loadSessionMessages = useCallback(async (sid: string) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/ai/sessions/${sid}/messages`);
      const history: Message[] = (res.data || []).map((m: any) => ({
        id: m.id || Math.random().toString(),
        role: (m.role === 'human' || m.role === 'user') ? 'user' : 'agent',
        content: m.content,
        timestamp: m.created_at
          ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
        citations: m.citations || []
      }));
      setMessages(history.length > 0 ? history : [WELCOME_MSG]);
    } catch {
      setMessages([WELCOME_MSG]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // When clicking a session in the sidebar
  const handleSelectSession = (sid: string) => {
    setSessionId(sid);
    loadSessionMessages(sid);
  };

  // "+ New Chat" — create a fresh session immediately
  const newChatMutation = useMutation({
    mutationFn: () => api.post('/ai/sessions'),
    onSuccess: async (res) => {
      const newId = res.data.id || res.data.session_id;
      setSessionId(newId);
      setMessages([WELCOME_MSG]);
      await queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
    }
  });

  // Send message
  const chatMutation = useMutation({
    mutationFn: async (content: string) => {
      let currentSessionId = sessionId;

      // Auto-create session if none exists yet
      if (!currentSessionId) {
        const sessionRes = await api.post('/ai/sessions');
        currentSessionId = sessionRes.data.id || sessionRes.data.session_id;
        setSessionId(currentSessionId);
        // Refresh sidebar immediately
        await queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
      }

      const res = await api.post('/ai/messages', {
        session_id: currentSessionId,
        role: 'user',
        content
      });
      return res.data;
    },
    onSuccess: async (data) => {
      const aiContent = data.content || "I have processed your request.";
      
      if (aiContent.includes("GOOGLE_AUTH_REQUIRED")) {
        setMessages(prev => [...prev, {
          id: data.id || Date.now().toString(),
          role: 'agent',
          content: "To proceed, I need secure access to your Google account. Please click the button below to connect your Gmail account. Once connected, your request will automatically resume.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: data.citations || [],
          requiresGoogleAuth: true
        }]);
        return;
      }

      setMessages(prev => [...prev, {
        id: data.id || Date.now().toString(),
        role: 'agent',
        content: aiContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || []
      }]);
      await queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'agent',
        content: "I'm having trouble connecting to my knowledge base right now. Please try again later.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsgContent = input;
    lastUserMessageRef.current = userMsgContent;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userMsgContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    chatMutation.mutate(userMsgContent);
  };

  // Shared Sidebar Content Render Function
  const renderSidebarContent = () => (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Chat History</span>
        {!isDesktop && (
          <button onClick={() => setIsHistoryOpen(false)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-2 overflow-y-auto flex-1 space-y-1 custom-scrollbar">
        {loadingSessions && (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        )}
        {sessions?.map((s: any, idx: number) => (
          <div
            key={s.id || idx}
            onClick={() => { handleSelectSession(s.id); if (!isDesktop) setIsHistoryOpen(false); }}
            className={cn(
              "p-3 rounded-xl cursor-pointer transition-all border",
              sessionId === s.id ? 'bg-primary/10 border-primary/20' : 'border-transparent hover:bg-secondary'
            )}
          >
            <h4 className={cn("text-xs font-semibold truncate mb-0.5", sessionId === s.id ? 'text-primary' : 'text-foreground')}>
              {s.title || `Session ${idx + 1}`}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Active'}
            </p>
          </div>
        ))}
        {!loadingSessions && (!sessions || sessions.length === 0) && (
          <div className="py-12 text-center">
            <Bot className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No conversations yet.</p>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border">
        <button
          onClick={() => newChatMutation.mutate()}
          disabled={newChatMutation.isPending}
          className="btn-primary w-full py-2.5 text-sm disabled:opacity-60"
        >
          {newChatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New conversation
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)] relative">
      {/* Mobile History Toggle */}
      <div className="lg:hidden flex items-center justify-between mb-2">
         <button onClick={() => setIsHistoryOpen(true)}
           className="flex items-center gap-2 px-3 py-2 card text-xs font-medium text-primary">
           <MessageSquare className="w-4 h-4" /> History
         </button>
         <button onClick={() => newChatMutation.mutate()} className="btn-primary py-2" title="New Chat">
            <Plus className="w-4 h-4" /> New
         </button>
      </div>

      {/* Desktop Sidebar */}
      {isDesktop && (
        <div className="card hidden lg:flex flex-col overflow-hidden w-60 flex-shrink-0">
          {renderSidebarContent()}
        </div>
      )}

      {/* Mobile Sidebar (Portaled to document.body to escape stacking contexts) */}
      {!isDesktop && createPortal(
        <AnimatePresence>
          {isHistoryOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsHistoryOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
              />
              
              {/* Drawer */}
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                className="fixed inset-y-0 left-0 w-72 m-4 card flex flex-col overflow-hidden shadow-2xl z-[101]"
              >
                {renderSidebarContent()}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Main Chat Area */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        <div className="h-14 border-b border-border flex items-center px-4 justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Apex AI Assistant</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
              </p>
            </div>
          </div>
          <button
            onClick={() => setMessages([{ ...WELCOME_MSG, content: 'Session reset. How can I help you?', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])}
            className="btn-ghost text-xs py-1.5"
          >
            Reset
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
          {loadingHistory ? (
            <div className="flex-1 flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse">
                   <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Retrieving Logs...</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={cn(
                  "flex gap-3 md:gap-4 max-w-[95%] sm:max-w-[85%]",
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {msg.role === 'agent' ? (
                    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className={cn("flex flex-col gap-1", msg.role === 'user' ? 'items-end' : '')}>
                  <div className={cn(
                    "px-4 py-3 max-w-[680px]",
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-2xl rounded-tr-sm shadow-sm'
                      : 'bg-secondary border border-border rounded-2xl rounded-tl-sm'
                  )}>
                    <div className={cn(
                      "text-sm leading-relaxed prose prose-sm max-w-none break-words",
                      msg.role === 'user' ? 'prose-invert text-white' : 'text-foreground prose-slate',
                      "prose-p:leading-relaxed prose-pre:bg-secondary prose-pre:text-foreground"
                    )}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Google Auth Connect Button */}
                    {(msg.authUrl || msg.requiresGoogleAuth) && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <button
                          onClick={handleGoogleConnect}
                          className="inline-flex items-center gap-2.5 mt-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                          </svg>
                          Connect with Google
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </button>
                        <p className="text-[10px] text-slate-400 font-semibold mt-2 italic">Click above to connect your Google account.</p>
                      </div>
                    )}

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Reference Sources:</p>
                        <div className="flex gap-2 flex-wrap">
                          {msg.citations.map((c, i) => (
                            <span key={i} className="text-[10px] font-bold bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-600 flex items-center gap-2 hover:bg-slate-100 transition-colors">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.timestamp && (
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic px-2">{msg.timestamp}</span>
                  )}
                </div>
              </motion.div>
            ))
          )}

          {chatMutation.isPending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white flex-shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-secondary border border-border px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{animationDelay:'150ms'}}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{animationDelay:'300ms'}}></span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 md:p-4 border-t border-border flex-shrink-0">
          <div className="relative flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              disabled={chatMutation.isPending}
              placeholder="Ask anything about HR policies, leaves, complaints…"
              className="flex-1 input resize-none custom-scrollbar pr-4"
              style={{ minHeight: '48px', maxHeight: '160px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              className="btn-primary p-3 flex-shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
