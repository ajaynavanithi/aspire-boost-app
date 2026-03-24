import React, { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { getUserResumes } from '@/lib/supabase';
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Play,
  StopCircle,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-interview`;

async function streamInterview({
  messages,
  resumeContext,
  interviewType,
  difficulty,
  onDelta,
  onDone,
  signal,
}: {
  messages: Message[];
  resumeContext: string;
  interviewType: string;
  difficulty: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, resumeContext, interviewType, difficulty }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({ error: 'Stream failed' }));
    throw new Error(err.error || 'Failed to start interview stream');
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }
  onDone();
}

export const InterviewPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [resumeContext, setResumeContext] = useState('');
  const [loadingResume, setLoadingResume] = useState(true);
  const [interviewType, setInterviewType] = useState('mixed');
  const [difficulty, setDifficulty] = useState('intermediate');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchResume = async () => {
      if (!user) return;
      try {
        const data = await getUserResumes(user.id);
        const completed = data?.find((r: any) => r.status === 'completed');
        if (completed) {
          const analysis = completed.resume_analysis?.[0];
          const skills = analysis?.extracted_skills || [];
          const experience = analysis?.experience || [];
          const education = analysis?.education || [];
          const context = `Skills: ${(Array.isArray(skills) ? skills.map((s: any) => typeof s === 'string' ? s : s?.name || '').filter(Boolean) : []).join(', ')}
Experience: ${(Array.isArray(experience) ? experience.map((e: any) => typeof e === 'string' ? e : `${e?.title || ''} at ${e?.company || ''}`).filter(Boolean) : []).join('; ')}
Education: ${(Array.isArray(education) ? education.map((e: any) => typeof e === 'string' ? e : `${e?.degree || e?.title || ''} from ${e?.institution || e?.school || ''}`).filter(Boolean) : []).join('; ')}`;
          setResumeContext(context);
        }
      } catch (e) {
        console.error('Error fetching resume:', e);
      } finally {
        setLoadingResume(false);
      }
    };
    fetchResume();
  }, [user]);

  const startInterview = async () => {
    setInterviewStarted(true);
    setMessages([]);
    setIsStreaming(true);

    const initMsg: Message[] = [{ role: 'user', content: 'Start the interview. Greet me and ask your first question.' }];
    let assistantText = '';

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamInterview({
        messages: initMsg,
        resumeContext,
        interviewType,
        difficulty,
        onDelta: (chunk) => {
          assistantText += chunk;
          setMessages([{ role: 'assistant', content: assistantText }]);
        },
        onDone: () => setIsStreaming(false),
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages([{ role: 'assistant', content: `Error: ${e.message}` }]);
      }
      setIsStreaming(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    let assistantText = '';
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamInterview({
        messages: updatedMessages,
        resumeContext,
        interviewType,
        difficulty,
        onDelta: (chunk) => {
          assistantText += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
            }
            return [...prev, { role: 'assistant', content: assistantText }];
          });
        },
        onDone: () => setIsStreaming(false),
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
      }
      setIsStreaming(false);
    }
  };

  const endInterview = () => {
    abortRef.current?.abort();
    setInterviewStarted(false);
    setMessages([]);
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loadingResume) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              AI Mock Interview
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Practice with an AI interviewer tailored to your profile
            </p>
          </div>
          {interviewStarted && (
            <Button variant="destructive" size="sm" onClick={endInterview}>
              <StopCircle className="w-4 h-4 mr-1" /> End Interview
            </Button>
          )}
        </div>

        {!interviewStarted ? (
          /* Setup Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md w-full space-y-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Ready for your mock interview?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {resumeContext ? 'Questions will be tailored to your resume.' : 'Upload a resume first for personalized questions.'}
                </p>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-1 mb-1.5">
                    <Settings2 className="w-3.5 h-3.5" /> Interview Type
                  </label>
                  <div className="flex gap-2">
                    {['mixed', 'technical', 'hr'].map(t => (
                      <Button
                        key={t}
                        variant={interviewType === t ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInterviewType(t)}
                        className="flex-1 capitalize"
                      >
                        {t === 'hr' ? 'Behavioral' : t}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Difficulty</label>
                  <div className="flex gap-2">
                    {['beginner', 'intermediate', 'advanced'].map(d => (
                      <Button
                        key={d}
                        variant={difficulty === d ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDifficulty(d)}
                        className="flex-1 capitalize"
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Button size="lg" className="w-full" onClick={startInterview}>
                <Play className="w-5 h-5 mr-2" /> Start Interview
              </Button>
            </div>
          </div>
        ) : (
          /* Chat Area */
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-3 max-w-[85%]',
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    msg.role === 'assistant' ? 'bg-primary/10' : 'bg-accent/10'
                  )}>
                    {msg.role === 'assistant' ? (
                      <Bot className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className={cn(
                    'rounded-2xl px-4 py-3 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card border border-border text-foreground rounded-bl-md'
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border pt-3">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
                  className="min-h-[44px] max-h-32 resize-none"
                  disabled={isStreaming}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  size="icon"
                  className="h-11 w-11 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Type "end interview" for a performance summary
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InterviewPage;
