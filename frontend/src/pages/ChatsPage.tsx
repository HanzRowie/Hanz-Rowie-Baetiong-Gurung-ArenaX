import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  Search, MessageCircle, User, Send, ArrowLeft, Archive,
  MoreVertical, Trash2, Paperclip,
  Star, StarOff, Volume2, VolumeX, UserX, UserCheck
} from 'lucide-react';
import { chatService, type PrivateMessage } from '@/services/chatService';
import type { Conversation } from '@/types/chat.types';
import { profileService } from '@/services/profileService';
import { notificationService } from '@/services/notificationService';
import toastService from '@/services/toastService';
import { BottomNavigation } from '@/components';
import RoleTabFilter from '@/components/chat/RoleTabFilter';
import { UserRole } from '@/types/auth.types';

export default function ChatsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<'conversations' | 'chat' | 'archived'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showConversationMenu, setShowConversationMenu] = useState<string | null>(null);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const [isStarred, setIsStarred] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [isTyping, setIsTyping] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Filter conversations based on selected role and search query
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply role filter
    if (selectedRoleFilter) {
      filtered = filtered.filter(conv => conv.user.role === selectedRoleFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.user.full_name?.toLowerCase().includes(query) ||
        conv.user.username?.toLowerCase().includes(query) ||
        conv.latest_message?.content?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [conversations, selectedRoleFilter, searchQuery]);

  useEffect(() => {
    loadConversations();

    // Check if we need to start a chat with a specific user (from state or params)
    const state = location.state as { startChatWith?: string };
    const targetUserId = userId || state?.startChatWith;

    if (targetUserId) {
      startChatWithUser(targetUserId);
    }

    // Set up real-time message handling
    chatService.onPrivateMessage((message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
      
      // Reload conversations to update the list with new message
      loadConversations();
    });

    // Set up typing indicator handling with auto-cleanup
    const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
    
    chatService.onTyping((userId, userName, isTyping) => {
      if (isTyping) {
        // Clear existing timeout for this user
        const existingTimeout = typingTimeouts.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        // Add user to typing list
        setTypingUsers(prev => new Map(prev).set(userId, userName));
        
        // Auto-remove after 5 seconds (in case stop_typing is not received)
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
          typingTimeouts.delete(userId);
        }, 5000);
        
        typingTimeouts.set(userId, timeout);
      } else {
        // Clear timeout and remove user from typing list
        const existingTimeout = typingTimeouts.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeouts.delete(userId);
        }
        
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      }
    });

    return () => {
      // Clear all typing timeouts
      typingTimeouts.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.clear();
      
      chatService.disconnect();
      // Notify notification service that user left chat
      notificationService.setLeftChat();
    };
  }, [location.state, userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await chatService.getConversations();
      setConversations(response.conversations);
    } catch (error) {
      toastService.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedConversations = async () => {
    try {
      setLoading(true);
      const response = await chatService.getArchivedConversations();
      setArchivedConversations(response.conversations);
    } catch (error) {
      toastService.error('Failed to load archived conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!currentConversation || loadingMore || !hasMoreMessages) return;

    try {
      setLoadingMore(true);
      const response = await chatService.getConversationHistory(
        currentConversation.id,
        50,
        messageOffset + 50
      );

      setMessages(prev => [...response.messages.reverse(), ...prev]);
      setMessageOffset(prev => prev + 50);
      setHasMoreMessages(response.has_more);
    } catch (error) {
      toastService.error('Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  };

  const searchMessages = async (query: string) => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const response = await chatService.searchMessages(query, currentConversation?.id);
      // Handle search results - could show in a separate view or highlight in current messages
      toastService.success(`Found ${response.messages.length} messages`);
    } catch (error) {
      toastService.error('Failed to search messages');
    } finally {
      setLoading(false);
    }
  };

  const archiveConversation = async (userId: string) => {
    try {
      await chatService.archiveConversation(userId);
      toastService.success('Conversation archived');
      loadConversations();
      if (view === 'chat' && currentConversation?.id === userId) {
        setView('conversations');
      }
    } catch (error) {
      toastService.error('Failed to archive conversation');
    }
  };

  const unarchiveConversation = async (userId: string) => {
    try {
      await chatService.unarchiveConversation(userId);
      toastService.success('Conversation unarchived');
      loadArchivedConversations();
      loadConversations();
    } catch (error) {
      toastService.error('Failed to unarchive conversation');
    }
  };

  const deleteConversation = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await chatService.deleteConversation(userId);
      toastService.success('Conversation deleted');
      loadConversations();
      if (view === 'chat' && currentConversation?.id === userId) {
        setView('conversations');
      }
    } catch (error) {
      toastService.error('Failed to delete conversation');
    }
  };

  const blockUser = async (userId: string) => {
    if (!confirm('Are you sure you want to block this user? They will not be able to send you messages.')) {
      return;
    }

    try {
      await chatService.blockUser(userId);
      setIsBlocked(true);
      toastService.success('User blocked');
    } catch (error) {
      toastService.error('Failed to block user');
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      await chatService.unblockUser(userId);
      setIsBlocked(false);
      toastService.success('User unblocked');
    } catch (error) {
      toastService.error('Failed to unblock user');
    }
  };

  const markAsRead = async (userId: string) => {
    try {
      await chatService.markConversationAsRead(userId);
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    try {
      setLoading(true);
      const response = await chatService.getMessagesForConversation(conversation.user.id);
      setMessages(response.messages);
      setCurrentConversation(response.other_user);
      setView('chat');
      setMessageOffset(0);
      setHasMoreMessages(response.messages.length >= 50);

      chatService.connectToPrivateChat(conversation.user.id);
      markAsRead(conversation.user.id);

      // Notify notification service that user is viewing this chat
      notificationService.setViewingChat(conversation.user.id);

      // Auto-scroll to bottom after messages load
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      toastService.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const startChatWithUser = async (userId: string) => {
    try {
      setLoading(true);
      // Get user profile first
      const userProfile = await profileService.getUserProfile(userId);

      // Set up the conversation
      setCurrentConversation({
        id: userId,
        username: userProfile.profile.email,
        full_name: userProfile.profile.full_name,
        profile_picture: userProfile.profile.profile_picture
      });

      // Try to load existing messages
      try {
        const response = await chatService.getMessagesForConversation(userId);
        setMessages(response.messages);
        setHasMoreMessages(response.messages.length >= 50);
      } catch (error) {
        // No existing conversation, start with empty messages
        setMessages([]);
        setHasMoreMessages(false);
      }

      setView('chat');
      setMessageOffset(0);
      chatService.connectToPrivateChat(userId);

      // Notify notification service that user is viewing this chat
      notificationService.setViewingChat(userId);

      // Auto-scroll to bottom after messages load
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      toastService.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation || isBlocked) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      if (chatService.isConnected()) {
        chatService.sendMessage(messageContent);
      } else {
        const message = await chatService.sendPrivateMessage(currentConversation.id, messageContent);
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    } catch (error) {
      toastService.error('Failed to send message');
      setNewMessage(messageContent);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentConversation) return;

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toastService.error('File size must be less than 10MB');
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toastService.error('File type not supported');
      return;
    }

    try {
      // For now, we'll simulate file upload by sending a message about the file
      // In a real implementation, you'd upload the file to a server first
      const fileMessage = `📎 Shared a file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;

      if (chatService.isConnected()) {
        chatService.sendMessage(fileMessage);
      } else {
        const message = await chatService.sendPrivateMessage(currentConversation.id, fileMessage);
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }

      toastService.success('File shared successfully');
    } catch (error) {
      toastService.error('Failed to share file');
    }

    // Reset file input
    event.target.value = '';
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

  const ConversationMenu = ({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) => (
    <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-48">
      <button
        onClick={() => {
          archiveConversation(conversation.user.id);
          onClose();
        }}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
      >
        <Archive className="h-4 w-4" />
        Archive
      </button>
      <button
        onClick={() => {
          deleteConversation(conversation.user.id);
          onClose();
        }}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-red-600"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  );

  const ChatHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={() => {
            setView('conversations');
            chatService.disconnect();
            // Notify notification service that user left chat
            notificationService.setLeftChat();
          }}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {currentConversation?.profile_picture ? (
          <img
            src={currentConversation.profile_picture}
            alt={currentConversation.full_name}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
            <User className="h-4 w-4 text-purple-600" />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {currentConversation?.full_name}
          </h2>
          <p className="text-xs text-gray-500">
            {chatService.isConnected() ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMessageSearch(!showMessageSearch)}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Search messages"
        >
          <Search className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowConversationMenu(showConversationMenu ? null : 'menu')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showConversationMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-48">
              <button
                onClick={() => {
                  setIsStarred(!isStarred);
                  setShowConversationMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                {isStarred ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                {isStarred ? 'Unstar' : 'Star'}
              </button>

              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  setShowConversationMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                {isMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>

              <button
                onClick={() => {
                  archiveConversation(currentConversation.id);
                  setShowConversationMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>

              <hr className="my-1" />

              <button
                onClick={() => {
                  if (isBlocked) {
                    unblockUser(currentConversation.id);
                  } else {
                    blockUser(currentConversation.id);
                  }
                  setShowConversationMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-red-600"
              >
                {isBlocked ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                {isBlocked ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="space-y-4">
        {/* Header within content to show conversation context */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {view === 'conversations' ? (
              <>
                <MessageCircle className="h-5 w-5 text-purple-600" />
                <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
              </>
            ) : view === 'archived' ? (
              <>
                <button
                  onClick={() => setView('conversations')}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Archive className="h-5 w-5 text-purple-600" />
                <h1 className="text-lg font-semibold text-gray-900">Archived</h1>
              </>
            ) : (
              <ChatHeader />
            )}
          </div>

          {view === 'conversations' && (
            <button
              onClick={() => {
                setView('archived');
                loadArchivedConversations();
              }}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="View archived conversations"
            >
              <Archive className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Message Search Bar (shown in chat view) */}
        {view === 'chat' && showMessageSearch && (
          <div className="px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchMessages(messageSearchQuery)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1">
          {view === 'conversations' ? (
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                />
              </div>

              {/* Role-Based Filter Tabs */}
              <RoleTabFilter
                conversations={conversations}
                onRoleSelect={setSelectedRoleFilter}
              />

              {/* Conversations List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                  <p className="text-sm text-center">Start chatting with other players to see your conversations here!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => (
                    <div key={conversation.user.id} className="relative">
                      <div
                        onClick={() => openConversation(conversation)}
                        className="w-full p-4 bg-white rounded-xl hover:bg-gray-50 transition-colors text-left shadow-sm cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {conversation.user.profile_picture ? (
                            <img
                              src={conversation.user.profile_picture}
                              alt={conversation.user.full_name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="h-6 w-6 text-purple-600" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-gray-900 truncate">
                                {conversation.user.full_name}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {formatTime(conversation.latest_message.timestamp)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowConversationMenu(showConversationMenu === conversation.user.id ? null : conversation.user.id);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {conversation.latest_message.content}
                            </p>
                          </div>
                        </div>
                      </div>

                      {showConversationMenu === conversation.user.id && (
                        <ConversationMenu
                          conversation={conversation}
                          onClose={() => setShowConversationMenu(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : view === 'archived' ? (
            <div className="p-4">
              {/* Archived Conversations */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : archivedConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Archive className="h-16 w-16 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No archived conversations</h3>
                  <p className="text-sm text-center">Archived conversations will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {archivedConversations.map((conversation) => (
                    <div key={conversation.user.id} className="p-4 bg-white rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        {conversation.user.profile_picture ? (
                          <img
                            src={conversation.user.profile_picture}
                            alt={conversation.user.full_name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-purple-600" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {conversation.user.full_name}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.latest_message.content}
                          </p>
                        </div>

                        <button
                          onClick={() => unarchiveConversation(conversation.user.id)}
                          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                        >
                          Unarchive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Chat Messages */
            <div className="flex flex-col h-[calc(100vh-140px)]">
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
                onScroll={(e) => {
                  const { scrollTop } = e.currentTarget;
                  if (scrollTop === 0 && hasMoreMessages && !loadingMore) {
                    loadMoreMessages();
                  }
                }}
              >
                {loadingMore && (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const showDate = index === 0 ||
                        formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="text-center text-xs text-gray-500 my-4">
                              {formatDate(message.timestamp)}
                            </div>
                          )}

                          <div className={`flex ${message.is_from_me ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs px-4 py-3 rounded-2xl shadow-sm ${message.is_from_me
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-md'
                              : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'
                              }`}>
                              <p className="text-sm leading-relaxed">{message.content}</p>
                              <p className={`text-xs mt-2 ${message.is_from_me ? 'text-purple-200' : 'text-gray-500'
                                }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing Indicator */}
                    {typingUsers.size > 0 && (
                      <div className="flex justify-start mb-4">
                        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {Array.from(typingUsers.values())[0]} is typing...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {!isBlocked && (
                <div className="border-t border-gray-100 p-4 bg-white">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-full px-4 py-3">
                    <input
                      type="file"
                      id="file-upload"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf,.txt"
                    />
                    <label
                      htmlFor="file-upload"
                      className="p-2 hover:bg-gray-200 rounded-full cursor-pointer transition-colors"
                      title="Attach file"
                    >
                      <Paperclip className="h-4 w-4 text-gray-600" />
                    </label>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        // Send typing indicator
                        if (e.target.value.trim() && !isTyping) {
                          setIsTyping(true);
                          chatService.sendTyping();
                        } else if (!e.target.value.trim() && isTyping) {
                          setIsTyping(false);
                          chatService.sendStopTyping();
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          sendMessage();
                          if (isTyping) {
                            setIsTyping(false);
                            chatService.sendStopTyping();
                          }
                        }
                      }}
                      onBlur={() => {
                        if (isTyping) {
                          setIsTyping(false);
                          chatService.sendStopTyping();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
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
              )}

              {isBlocked && (
                <div className="border-t border-gray-100 p-4 bg-red-50">
                  <div className="text-center text-red-600 text-sm">
                    <UserX className="h-5 w-5 mx-auto mb-2" />
                    You have blocked this user. Unblock to send messages.
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <BottomNavigation />
    </div>
  );
}