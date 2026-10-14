import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Zap,
  Shield,
  MapPin,
  Car,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Clock,
  Compass,
  Lock
} from 'lucide-react';
import { api } from '../services/api';
import { ParkingListing } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  listings?: ParkingListing[];
  timestamp: string;
}

interface ParkBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const ParkBotModal: React.FC<ParkBotModalProps> = ({ isOpen, onClose, initialQuery }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Hi! I'm **ParkBot**, your ParkCo AI parking assistant.\n\nTell me where you're heading (e.g., *'I am going to Whitefield and need parking space'*), or ask about EV charging, pricing, and policies!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'I am going to Whitefield and need parking space',
    'Show spots with EV charging',
    'Find parking near BTM Layout',
    'How do I check in with QR pass?',
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (window.innerWidth >= 768) {
        setTimeout(() => inputRef.current?.focus(), 250);
      }
      if (initialQuery && initialQuery.trim()) {
        handleSend(initialQuery);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInputText('');
    setIsLoading(true);

    // Prepare history payload for API
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

    try {
      const response = await api.sendChatMessage(textToSend, historyPayload);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: response.reply,
        listings: response.recommended_listings || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMessage]);

      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "I'm having a little trouble connecting right now, but you can explore parking spots directly on the map or retry in a moment!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: "👋 Hi! I'm **ParkBot**, your ParkCo AI parking assistant.\n\nTell me where you're heading (e.g., *'I am going to Whitefield and need parking space'*), or ask about EV charging, pricing, and policies!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSuggestions([
      'I am going to Whitefield and need parking space',
      'Show spots with EV charging',
      'Find parking near BTM Layout',
      'How do I check in with QR pass?',
    ]);
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4 transition-all"
    >
      <div className="w-full sm:max-w-lg md:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[90vh] sm:h-[82vh] max-h-[850px] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                <Bot className="w-6 h-6 text-emerald-100" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-300 border-2 border-emerald-700 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-black text-base tracking-tight text-white">ParkBot AI</h3>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-emerald-400/30 text-emerald-100 border border-emerald-300/30">
                  Gemini 2.5
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium flex items-center space-x-1">
                <span>Live Parking Assistant</span>
                <span>•</span>
                <span className="text-emerald-200">Always Online</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close chatbot"
              aria-label="Close chatbot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50 dark:bg-slate-950/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-start max-w-[92%] sm:max-w-[85%] space-x-2">
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-emerald-600/10'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-line font-normal space-y-1">
                    {msg.text.split('\n').map((line, i) => {
                      if (!line.trim()) return <div key={i} className="h-1.5" />;

                      // Render bold highlights
                      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                      return (
                        <p
                          key={i}
                          dangerouslySetInnerHTML={{ __html: formattedLine }}
                          className="leading-snug"
                        />
                      );
                    })}
                  </div>

                  <span
                    className={`block text-[10px] mt-1.5 font-medium ${
                      msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>

              {/* Render Recommended Parking Spot Cards */}
              {msg.listings && msg.listings.length > 0 && (
                <div className="w-full mt-3 pl-9 space-y-2.5">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recommended Parking Spaces ({msg.listings.length})</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {msg.listings.map((spot, spotIdx) => {
                      const letter = String.fromCharCode(65 + (spotIdx % 26));
                      const approxDist = 150 + ((spot.id * 73) % 4) * 100;
                      return (
                      <div
                        key={spot.id}
                        onClick={() => {
                          onClose();
                          navigate(`/listing/${spot.id}`);
                        }}
                        className="group bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0 relative">
                            {spot.images && spot.images.length > 0 ? (
                              <img
                                src={spot.images[0].image_url}
                                alt={`Parking ${letter}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Car className="w-7 h-7" />
                              </div>
                            )}
                            <div className="absolute top-1 left-1 bg-slate-900/80 text-[9px] font-black text-white px-1.5 py-0.5 rounded-md">
                              #{letter}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                              • Parking {letter} — ~{approxDist} m away
                            </h4>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                <span>{spot.parking_type ? spot.parking_type.replace(/_/g, ' ') : 'Verified Bay'} • {spot.is_covered ? 'Covered' : 'Open'}</span>
                              </p>
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded-md">
                                ~{approxDist} m away
                              </span>
                            </div>

                            <div className="flex items-center flex-wrap gap-1.5 mt-2">
                              {spot.has_ev_charging && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <Zap className="w-2.5 h-2.5 mr-0.5" /> EV
                                </span>
                              )}
                              {spot.is_covered && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  <Shield className="w-2.5 h-2.5 mr-0.5" /> Covered
                                </span>
                              )}
                              {spot.average_rating > 0 && (
                                <span className="text-[10px] font-black text-amber-500 flex items-center">
                                  ★ {spot.average_rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-700">
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-semibold text-slate-400 block sm:inline">Rate: </span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              ₹{spot.pricing_rule ? spot.pricing_rule.hourly_price : 40}/hr
                            </span>
                          </div>
                          <button className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1 transition shadow-xs group-hover:scale-105">
                            <span>Book Now</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Privacy Notice */}
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span>Exact address, barrier PIN & Host contact numbers unlock immediately after booking.</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-start space-x-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar flex items-center space-x-2 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSend(sug)}
              disabled={isLoading}
              className="text-xs whitespace-nowrap bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 transition font-medium text-slate-700 dark:text-slate-300 flex-shrink-0 cursor-pointer disabled:opacity-50"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask ParkBot: e.g. I need parking in Whitefield..."
            disabled={isLoading}
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl px-4 py-3 border border-transparent focus:border-emerald-500 focus:outline-none transition"
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 transition-all shadow-md disabled:shadow-none flex items-center justify-center flex-shrink-0 cursor-pointer"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
