import { useState, useEffect, useRef } from 'react';
import { Send, User, ArrowLeft, MessageCircle, X } from 'lucide-react';
import { chatService, type Conversation, type PrivateMessage } from '@/services/chatService';
import toastService from '@/services/toastService';

interface ChatWindowProps {
  onClose: () => void;
}

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const [view, setView] = useState<'conversations' | 'chat'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    
    // Set up chat service callbacks
    chatService.onPrivateMessage((message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    chatService.onConnection((isConnected) => {
      setConnected(isConnected);
    });

    chatService.onError((error) => {
      toastService.error(`Chat error: ${error}`);
    });

    return () => {
      chatService.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await chatService.getConversations();
      setConversations(response.conversations);
    } catch {
      toastService.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    try {
      setLoading(true);
      const response = await chatService.getMessagesForConversation(conversation.user.id);
      setMessages(response.messages);
      setCurrentConversation(conversation);
      setView('chat');
      
      // Connect to WebSocket for real-time messages
      chatService.connectToPrivateChat(conversation.user.id);
      
      scrollToBottom();
    } catch {
      toastService.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      if (chatService.isConnected()) {
        // Send via WebSocket
        chatService.sendMessage(messageContent);
      } else {
        // Fallback to REST API
        const message = await chatService.sendPrivateMessage(currentConversation.user.id, messageContent);
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    } catch {
      toastService.error('Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        {view === 'chat' && (
          <button
            onClick={() => {
              setView('conversations');
              chatService.disconnect();
            }}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        
        <div className="flex items-center gap-3 flex-1">
          {view === 'conversations' ? (
            <>
              <div className="p-2 bg-white bg-opacity-20 rounded-full">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-lg">Messages</span>
                <p className="text-xs opacity-75">Stay connected with players</p>
              </div>
            </>
          ) : (
            <>
              {currentConversation?.user.profile_picture ? (
                <img
                  src={currentConversation.user.profile_picture}
                  alt={currentConversation.user.full_name}
                  className="h-10 w-10 rounded-full object-cover border-2 border-white border-opacity-30"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">{currentConversation?.user.full_name}</p>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <p className="text-xs opacity-75">
                    {connected ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'conversations' ? (
          /* Conversations List */
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start chatting with other players!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.user.id}
                    onClick={() => openConversation(conversation)}
                    className="w-full p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {conversation.user.profile_picture ? (
                        <img
                          src={conversation.user.profile_picture}
                          alt={conversation.user.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {conversation.user.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.latest_message.content}
                        </p>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        {formatTime(conversation.latest_message.timestamp)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Chat Messages */
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const showDate = index === 0 || 
                    formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);
                  
                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="text-center text-xs text-gray-500 my-2">
                          {formatDate(message.timestamp)}
                        </div>
                      )}
                      
                      <div className={`flex ${message.is_from_me ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-3 rounded-2xl shadow-sm ${
                          message.is_from_me
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-md'
                            : 'bg-gray-50 text-gray-900 rounded-bl-md border border-gray-100'
                        }`}>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p className={`text-xs mt-2 ${
                            message.is_from_me ? 'text-purple-200' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-100 p-4 bg-gray-50">
              <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 outline-none text-sm placeholder-gray-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}