import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Users, ArrowLeft, Search } from 'lucide-react';
import { chatService } from '@/services/chatService';
import { api } from '@/services/api';
import type {
  PrivateMessage,
  Conversation
} from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  full_name: string;
  profile_picture?: string;
}

interface ChatProps {
  isOpen: boolean;
  onToggle: () => void;
}

type ChatView = 'list' | 'conversation';

export default function Chat({ isOpen, onToggle }: ChatProps) {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<ChatView>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations when opened
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadConversations();
    }
  }, [isOpen, isAuthenticated]);

  const loadConversations = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await chatService.getConversations();
      setConversations(response.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversationMessages = async (otherUserId: string) => {
    setIsLoading(true);
    try {
      const response = await chatService.getMessagesForConversation(otherUserId);
      setMessages(response.messages);

      // Connect to private WebSocket
      chatService.connectToPrivateChat(otherUserId);
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setCurrentView('conversation');
    // Important: Clear any existing messages first, then load fresh from backend
    setMessages([]);
    loadConversationMessages(conversation.user.id);

    // Set up WebSocket callbacks
    chatService.onPrivateMessage((message) => {
      setMessages(prev => {
        // Check if this message replaces a temporary one (compare content and time)
        const tempMessageIndex = prev.findIndex(
          msg => msg.id.startsWith('temp-') &&
                 msg.content === message.content &&
                 msg.is_from_me === message.is_from_me &&
                 !prev.some(existing => existing.id === message.id)
        );

        if (tempMessageIndex !== -1) {
          // Replace temporary message with real one
          const newMessages = [...prev];
          newMessages[tempMessageIndex] = message;
          return newMessages;
        } else if (!prev.some(m => m.id === message.id)) {
          // Add new message (from other user)
          return [...prev, message];
        }

        return prev;
      });
    });

    chatService.onConnection(setIsConnected);

    chatService.onError((error) => {
      console.error('Chat error:', error);
    });
  };

  const goBackToList = () => {
    setCurrentView('list');
    setSelectedConversation(null);
    setMessages([]);
    chatService.disconnect();
  };

  const sendMessage = async () => {
    console.log('sendMessage called');
    if (!messageInput.trim() || !isAuthenticated || !selectedConversation) {
      console.log('sendMessage blocked:', { messageInput: messageInput.trim(), isAuthenticated, selectedConversation });
      return;
    }

    const content = messageInput.trim();
    console.log('Sending message:', content);
    setMessageInput('');

    // Optimistically add the message to UI immediately
    const tempMessage = {
      id: `temp-${Date.now()}`, // Temporary ID for optimistic update
      content: content,
      timestamp: new Date().toISOString(),
      is_from_me: true,
      read: false
    };

    setMessages(prev => {
      const newMessages = [...prev, tempMessage];
      console.log('Added temporary message to UI:', tempMessage, 'Total messages:', newMessages.length);
      return newMessages;
    });

    try {
      // Send via REST API (primary method) or WebSocket if connected
      if (isConnected && chatService.sendMessage(content)) {
        // WebSocket send successful, message will be replaced when received back
        console.log('Message sent via WebSocket');
      } else {
        // Send via REST API as fallback or when WebSocket not connected
        console.log('Sending via REST API');
        const sentMessage = await chatService.sendPrivateMessage(selectedConversation.user.id, content);

        // Update the temporary message with real data
        setMessages(prev => prev.map(msg =>
          msg.id === tempMessage.id ? { ...sentMessage, is_from_me: true } : msg
        ));

        // Refresh conversations to show new conversation in list
        await loadConversations();

        console.log('Message sent via REST API');
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // Remove the failed message from UI
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));

      // Re-show the message in input if sending failed
      setMessageInput(content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.players || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const startNewConversation = (user: UserProfile) => {
    // Create a conversation-like structure to start chatting
    const newConversation: Conversation = {
      user: {
        id: user.id,
        username: '', // We'll get this from the API
        full_name: user.full_name,
        profile_picture: user.profile_picture
      },
      latest_message: {
        content: '',
        timestamp: new Date().toISOString(),
        is_from_me: false
      }
    };

    selectConversation(newConversation);
  };

  if (!isAuthenticated) return null;

  const renderConversationList = () => (
    <div className="flex-1">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users to start conversation..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : searchQuery ? (
          /* Search Results */
          searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startNewConversation(user)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      {user.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <MessageCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">Start conversation</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : conversations.length === 0 ? (
          /* No Conversations State */
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm mb-4">No conversations yet</p>
            <p className="text-xs">Use the search bar above to find users and start chatting!</p>
          </div>
        ) : (
          /* Conversation List */
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <button
                key={conversation.user.id}
                onClick={() => selectConversation(conversation)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    {conversation.user.profile_picture ? (
                      <img
                        src={conversation.user.profile_picture}
                        alt={conversation.user.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.user.full_name}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.latest_message.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.latest_message.is_from_me ? 'You: ' : ''}
                      {conversation.latest_message.content || 'Send a message...'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderConversation = () => (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_from_me ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 ${
                  message.is_from_me
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <span className={`text-xs mt-1 block ${
                  message.is_from_me ? 'text-purple-200' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            maxLength={1000}
          />
          <button
            onClick={sendMessage}
            disabled={!messageInput.trim() || !selectedConversation}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`fixed right-4 bottom-4 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50 transition-all duration-300 ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-600 text-white rounded-t-lg">
        {currentView === 'conversation' && selectedConversation ? (
          <>
            <div className="flex items-center space-x-2">
              <button
                onClick={goBackToList}
                className="hover:bg-purple-700 rounded-full p-1 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center space-x-2">
                {selectedConversation.user.profile_picture ? (
                  <img
                    src={selectedConversation.user.profile_picture}
                    alt={selectedConversation.user.full_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <Users className="h-5 w-5" />
                )}
                <h3 className="font-semibold text-sm truncate max-w-32">
                  {selectedConversation.user.full_name}
                </h3>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <button
                onClick={onToggle}
                className="hover:bg-purple-700 rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Messages</h3>
            </div>
            <button
              onClick={onToggle}
              className="hover:bg-purple-700 rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {currentView === 'list' ? renderConversationList() : renderConversation()}
    </div>
  );
}
