/**
 * AI Chatbot Component
 *
 * A floating chat widget that provides AI assistance.
 * Works with or without API key (falls back to pre-defined responses).
 */

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { chat, getQuickActions, ChatMessage } from "@/lib/ai/chatbot";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const welcomeSentRef = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);

  const { role, user } = useAuth();
  const location = useLocation();

  const context = {
    role: role as "vendor" | "ngo" | "admin" | undefined,
    page: location.pathname,
    userName: user?.email?.split("@")[0],
  };

  const quickActions = getQuickActions(context);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Add welcome message on first open (with ref to prevent duplicates)
  useEffect(() => {
    if (isOpen && messages.length === 0 && !welcomeSentRef.current) {
      welcomeSentRef.current = true;
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hi${context.userName ? ` ${context.userName}` : ""}! 👋 I'm the FoodBridge Assistant. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, context.userName]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    // Prevent duplicate sends of the same message
    if (pendingMessageRef.current === text) return;
    pendingMessageRef.current = text;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Convert messages to chat format
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await chat(text, history, context);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      pendingMessageRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              AI
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[360px] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary-foreground">
                    FoodBridge Assistant
                  </h3>
                  <p className="text-xs text-primary-foreground/70">
                    {isLoading ? "Thinking..." : "Online"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                        <User className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                    </div>
                    <div className="flex gap-1 rounded-2xl bg-muted px-4 py-3 rounded-bl-md">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.1s]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Quick Actions - always visible for easy access */}
              {!isLoading && (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-medium">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(action)}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="flex-1 rounded-full border-muted-foreground/30 bg-muted/50 px-4 text-sm"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 rounded-full"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                AI assistant • May occasionally make mistakes
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
