/**
 * Chat System Type Definitions
 * 
 * Comprehensive type definitions for the multi-user chat system including:
 * - Core entity types (User, Message, Conversation, GroupChat)
 * - API response types (ConversationListResponse, MessageListResponse, etc.)
 * - WebSocket message types
 * - Enums for message types, status, and user roles
 * 
 * Requirements: 3.1-3.6 (Role-Based Chat Interface), 9.1-9.7 (Conversation Management)
 */

// ============================================================================
// ENUMS (as const objects and union types for erasableSyntaxOnly compatibility)
// ============================================================================

/**
 * User roles in the system
 */
export const UserRole = {
  PLAYER: 'PLAYER',
  ORGANIZER: 'ORGANIZER',
  REFEREE: 'REFEREE',
  VENUE_OWNER: 'VENUE_OWNER',
  ADMIN: 'ADMIN'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

/**
 * Message types supported by the chat system
 */
export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  DOCUMENT: 'DOCUMENT',
  VOICE: 'VOICE'
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

/**
 * Message delivery and read status
 */
export const MessageStatus = {
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED'
} as const;

export type MessageStatus = typeof MessageStatus[keyof typeof MessageStatus];

/**
 * Conversation types
 */
export const ConversationType = {
  DIRECT: 'DIRECT',
  GROUP: 'GROUP'
} as const;

export type ConversationType = typeof ConversationType[keyof typeof ConversationType];

/**
 * WebSocket message types
 */
export const WebSocketMessageType = {
  // Chat messages
  MESSAGE: 'message',
  CHAT_MESSAGE: 'chat_message',
  GROUP_MESSAGE: 'group_message',
  
  // Typing indicators
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  
  // Status updates
  STATUS_UPDATE: 'status_update',
  MARK_DELIVERED: 'mark_delivered',
  MARK_READ: 'mark_read',
  
  // Presence
  PRESENCE: 'presence',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  
  // Connection
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error'
} as const;

export type WebSocketMessageType = typeof WebSocketMessageType[keyof typeof WebSocketMessageType];

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

/**
 * User information in chat context
 */
export interface ChatUser {
  id: string;
  username: string;
  full_name: string;
  profile_picture?: string;
  role?: UserRole;
}

/**
 * Direct message between two users
 */
export interface Message {
  id: string;
  content: string;
  message_type: MessageType;
  status: MessageStatus;
  timestamp: string;
  delivered_at?: string;
  read_at?: string;
  read: boolean;
  edited: boolean;
  edited_at?: string;
  deleted: boolean;
  deleted_at?: string;
  is_from_me: boolean;
  sender: ChatUser;
  receiver: ChatUser;
  reply_to?: string;
}

/**
 * Group message in team chat
 */
export interface GroupMessage {
  id: string;
  content: string;
  message_type: MessageType;
  status: MessageStatus;
  timestamp: string;
  edited: boolean;
  edited_at?: string;
  deleted: boolean;
  deleted_at?: string;
  sender: ChatUser;
  reply_to?: string;
  read_by?: string[]; // Array of user IDs who have read the message
}

/**
 * Conversation metadata
 */
export interface Conversation {
  user: ChatUser;
  latest_message: {
    id: string;
    content: string;
    timestamp: string;
    is_from_me: boolean;
    status?: MessageStatus;
  };
  unread_count: number;
  conversation_type?: ConversationType;
  is_archived?: boolean;
  is_muted?: boolean;
  is_pinned?: boolean;
}

// Runtime placeholder export for Conversation to satisfy modules that import it as a value.
// The actual structure is defined by the Conversation interface above and used purely as a type.
export const Conversation = {} as Conversation;

/**
 * Group chat entity
 */
export interface GroupChat {
  id: string;
  team: {
    id: string;
    name: string;
    logo?: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * User presence status
 */
export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen?: string;
  last_activity?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Response for GET /api/chat/conversations/
 * Lists all conversations for the current user with optional role filtering
 * Requirements: 3.1-3.6, 9.1-9.7
 */
export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
}

/**
 * Response for GET /api/chat/messages/
 * Returns paginated messages for a conversation
 * Requirements: 9.1-9.7
 */
export interface MessageListResponse {
  messages: Message[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  other_user?: ChatUser;
}

/**
 * Response for GET /api/chat/groups/<team_id>/
 * Returns group chat information with recent messages
 * Requirements: 5.1-5.9
 */
export interface GroupChatResponse {
  group_chat: GroupChat;
  recent_messages: GroupMessage[];
  members?: ChatUser[];
  unread_count?: number;
}

/**
 * Response for GET /api/chat/groups/<team_id>/messages/
 * Returns paginated group messages
 */
export interface GroupMessageListResponse {
  messages: GroupMessage[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/**
 * Response for GET /api/chat/presence/<user_id>/
 * Returns user presence status
 * Requirements: 6.5, 6.6
 */
export interface PresenceResponse {
  user_id: string;
  is_online: boolean;
  last_seen?: string;
  last_activity?: string;
}

/**
 * Response for GET /api/chat/presence/bulk/
 * Returns presence status for multiple users
 */
export interface BulkPresenceResponse {
  presences: UserPresence[];
}

/**
 * Response for conversation creation
 */
export interface ConversationCreateResponse {
  conversation: Conversation;
  message?: string;
}

/**
 * Response for message send operations
 */
export interface MessageSendResponse {
  message: Message;
  conversation?: Conversation;
}

/**
 * Response for group message send operations
 */
export interface GroupMessageSendResponse {
  message: GroupMessage;
}

/**
 * Response for conversation deletion
 */
export interface ConversationDeleteResponse {
  message: string;
  success: boolean;
}

/**
 * Response for message operations (edit, delete)
 */
export interface MessageOperationResponse {
  message: string;
  success: boolean;
  updated_message?: Message;
}

/**
 * Response for unread count queries
 */
export interface UnreadCountResponse {
  unread_count: number;
  unread_conversations: number;
}

/**
 * Response for mark as read operations
 */
export interface MarkReadResponse {
  message: string;
  unread_count: number;
  updated_count?: number;
}

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  [key: string]: any;
}

/**
 * WebSocket message for new chat message
 */
export interface WSChatMessage extends WebSocketMessage {
  type: typeof WebSocketMessageType.MESSAGE | typeof WebSocketMessageType.CHAT_MESSAGE;
  message: Message;
}

/**
 * WebSocket message for new group message
 */
export interface WSGroupMessage extends WebSocketMessage {
  type: typeof WebSocketMessageType.GROUP_MESSAGE;
  message: GroupMessage;
}

/**
 * WebSocket message for typing indicator
 */
export interface WSTypingMessage extends WebSocketMessage {
  type: typeof WebSocketMessageType.TYPING | typeof WebSocketMessageType.STOP_TYPING;
  user_id: string;
  user_name?: string;
  is_typing?: boolean;
}

/**
 * WebSocket message for presence update
 */
export interface WSPresenceMessage extends WebSocketMessage {
  type: typeof WebSocketMessageType.PRESENCE;
  user_id: string;
  is_online: boolean;
  last_seen?: string;
}

/**
 * WebSocket message for status update
 */
export interface WSStatusUpdateMessage extends WebSocketMessage {
  type: typeof WebSocketMessageType.STATUS_UPDATE;
  message_id: string;
  status: MessageStatus;
  delivered_at?: string;
  read_at?: string;
}

/**
 * WebSocket message for user joined/left events
 */
export interface WSUserEventMessage extends WebSocketMessage {
  type: typeof WebSocketMessageType.USER_JOINED | typeof WebSocketMessageType.USER_LEFT;
  user_id: string;
  user_name?: string;
}

/**
 * WebSocket error message
 */
export interface WSErrorMessage extends WebSocketMessage {
  type: typeof WebSocketMessageType.ERROR;
  error: string;
  details?: any;
}

/**
 * WebSocket message to send
 */
export interface WSSendMessage {
  type: WebSocketMessageType;
  message?: string;
  content?: string;
  receiver_id?: string;
  message_id?: string;
  message_type?: MessageType;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Request body for creating a conversation
 */
export interface CreateConversationRequest {
  recipient_id: string;
}

/**
 * Request body for sending a message
 */
export interface SendMessageRequest {
  receiver_id: string;
  content: string;
  message_type?: MessageType;
  reply_to?: string;
}

/**
 * Request body for sending a group message
 */
export interface SendGroupMessageRequest {
  content: string;
  message_type?: MessageType;
  reply_to?: string;
}

/**
 * Request body for editing a message
 */
export interface EditMessageRequest {
  content: string;
}

/**
 * Request body for marking messages as read
 */
export interface MarkReadRequest {
  message_id?: string;
  message_ids?: string[];
}

/**
 * Request body for bulk operations
 */
export interface BulkMessageRequest {
  message_ids: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
}

/**
 * Conversation filter parameters
 */
export interface ConversationFilterParams extends PaginationParams {
  role_filter?: UserRole;
  search?: string;
  archived?: boolean;
}

/**
 * Message filter parameters
 */
export interface MessageFilterParams extends PaginationParams {
  other_user_id?: string;
  before?: string;
  after?: string;
}

/**
 * WebSocket connection handlers
 */
export interface WebSocketHandlers {
  onOpen?: () => void;
  onMessage?: (data: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (code?: number, reason?: string) => void;
  onAuthError?: () => void;
  onConnectionError?: () => void;
  onTyping?: (userId: string, userName: string, isTyping: boolean) => void;
  onPresence?: (userId: string, isOnline: boolean, lastSeen?: string) => void;
  onStatusUpdate?: (messageId: string, status: MessageStatus) => void;
}

/**
 * Chat service configuration
 */
export interface ChatServiceConfig {
  wsBaseUrl?: string;
  apiBaseUrl?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  typingTimeout?: number;
}

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use Message instead
 */
export interface PrivateMessage extends Message {}

/**
 * @deprecated Use Message instead
 */
export interface ChatMessage {
  id: string;
  sender: string;
  sender_name: string;
  sender_username: string;
  content: string;
  timestamp: string;
}

/**
 * @deprecated Use ConversationListResponse instead
 */
export interface ConversationsResponse extends ConversationListResponse {}

/**
 * @deprecated Use MessageListResponse instead
 */
export interface ConversationMessagesResponse {
  messages: Message[];
  other_user: ChatUser;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a message is a WebSocket chat message
 */
export function isWSChatMessage(msg: WebSocketMessage): msg is WSChatMessage {
  return msg.type === WebSocketMessageType.MESSAGE || msg.type === WebSocketMessageType.CHAT_MESSAGE;
}

/**
 * Type guard to check if a message is a WebSocket group message
 */
export function isWSGroupMessage(msg: WebSocketMessage): msg is WSGroupMessage {
  return msg.type === WebSocketMessageType.GROUP_MESSAGE;
}

/**
 * Type guard to check if a message is a typing indicator
 */
export function isWSTypingMessage(msg: WebSocketMessage): msg is WSTypingMessage {
  return msg.type === WebSocketMessageType.TYPING || msg.type === WebSocketMessageType.STOP_TYPING;
}

/**
 * Type guard to check if a message is a presence update
 */
export function isWSPresenceMessage(msg: WebSocketMessage): msg is WSPresenceMessage {
  return msg.type === WebSocketMessageType.PRESENCE;
}

/**
 * Type guard to check if a message is a status update
 */
export function isWSStatusUpdateMessage(msg: WebSocketMessage): msg is WSStatusUpdateMessage {
  return msg.type === WebSocketMessageType.STATUS_UPDATE;
}

/**
 * Type guard to check if a message is an error
 */
export function isWSErrorMessage(msg: WebSocketMessage): msg is WSErrorMessage {
  return msg.type === WebSocketMessageType.ERROR;
}
