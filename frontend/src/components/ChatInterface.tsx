import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Info,
  Search,
  ArrowLeft,
  User,
  Circle,
  Check,
  CheckCheck,
  Image as ImageIcon,
  File,
  Download,
  Play,
  Pause
} from 'lucide-react';
import { chatService, type PrivateMessage } from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';

interface ChatInterfaceProps {
  otherUser: {
    id: string;
    full_name: string;
    profile_picture?: string;
    is_online?: boolean;
    last_seen?: string;
  };
  onBack?: () => void;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  otherUser,
  onBack,
  className = ''
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    connectToChat();

    return () => {
      chatService.disconnect();
    };
  }, [otherUser.id]);

  const loadMessages = async () => {
    try {
      const response = await chatService.getMessagesForConversation(otherUser.id);
      setMessages(response.messages);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const connectToChat = () => {
    chatService.connectToPrivateChat(otherUser.id);
    chatService.onPrivateMessage((message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });
    chatService.onStatusUpdate((messageId, status) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: status as any, read: status === 'READ' } : m));
    });
  };

  useEffect(() => {
    if (messages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              const message = messages.find(m => m.id === messageId);
              if (message && !message.is_from_me && !message.read) {
                chatService.markMessageRead(messageId);
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
              }
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const messageElements = document.querySelectorAll('.chatinterface-message-bubble');
    messageElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      if (chatService.isConnected()) {
        chatService.sendMessage(messageContent);
      } else {
        const message = await chatService.sendPrivateMessage(otherUser.id, messageContent);
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageContent);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Handle file upload logic here
    console.log('File selected:', file);
    setShowAttachmentMenu(false);
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
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🔥', '💯', '🎉'];

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}

          <div className="relative">
            {otherUser.profile_picture ? (
              <img
                src={otherUser.profile_picture}
                alt={otherUser.full_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
            {otherUser.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">{otherUser.full_name}</h3>
            <p className="text-sm text-gray-500">
              {otherUser.is_online ? 'Online' : otherUser.last_seen ? `Last seen ${otherUser.last_seen}` : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Search className="h-5 w-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Phone className="h-5 w-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="h-5 w-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((message, index) => {
          const showDate = index === 0 ||
            formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);
          const isFromMe = message.is_from_me;
          const showAvatar = !isFromMe && (
            index === messages.length - 1 ||
            messages[index + 1]?.is_from_me !== message.is_from_me
          );

          return (
            <div key={message.id}>
              {showDate && (
                <div className="flex justify-center my-6">
                  <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                    {formatDate(message.timestamp)}
                  </span>
                </div>
              )}

              <div
                className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} items-end gap-2 chatinterface-message-bubble`}
                data-message-id={message.id}
              >
                {!isFromMe && (
                  <div className="flex-shrink-0">
                    {showAvatar ? (
                      otherUser.profile_picture ? (
                        <img
                          src={otherUser.profile_picture}
                          alt={otherUser.full_name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-xs text-white font-medium">
                            {otherUser.full_name.charAt(0)}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="h-6 w-6"></div>
                    )}
                  </div>
                )}

                <div className={`group max-w-xs lg:max-w-md ${isFromMe ? 'order-1' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm ${isFromMe
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-md'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                      }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>

                  <div className={`flex items-center gap-1 mt-1 px-1 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                    {isFromMe && (
                      <div className="flex items-center">
                        {(message.status === 'READ' || message.read) ? (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        ) : message.status === 'DELIVERED' ? (
                          <CheckCheck className="h-3 w-3 text-gray-400" />
                        ) : (
                          <Check className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start items-end gap-2">
            <div className="flex-shrink-0">
              {otherUser.profile_picture ? (
                <img
                  src={otherUser.profile_picture}
                  alt={otherUser.full_name}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {otherUser.full_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="grid grid-cols-6 gap-2">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  setNewMessage(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-2 text-xl hover:bg-gray-100 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Menu */}
      {showAttachmentMenu && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-full">
                <ImageIcon className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Photo</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-full">
                <File className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Document</span>
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
              <button
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <Paperclip className="h-4 w-4 text-gray-600" />
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
              />

              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <Smile className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt"
      />
      <input
        ref={imageInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
};

export default ChatInterface;