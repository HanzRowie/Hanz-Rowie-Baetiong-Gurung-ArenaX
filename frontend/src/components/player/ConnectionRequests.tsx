import React, { useState } from 'react';
import {
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  MessageCircle,
  Eye,
  Check,
  X,
  Users,
  Calendar,
  Star,
  Trophy,
  MapPin,
  Activity,
  Send,
  Undo,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';

export interface ConnectionRequest {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerLocation: string;
  playerSkillRating: number;
  playerSkillLevel: string;
  playerWinRate: number;
  type: 'sent' | 'received';
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  message?: string;
  sentAt: string;
  respondedAt?: string;
  mutualConnections: number;
  compatibilityScore?: number;
  commonSports: string[];
  recentActivity: string;
  isOnline: boolean;
}

interface ConnectionRequestsProps {
  sentRequests: ConnectionRequest[];
  receivedRequests: ConnectionRequest[];
  onAcceptRequest: (requestId: string, message?: string) => void;
  onRejectRequest: (requestId: string) => void;
  onWithdrawRequest: (requestId: string) => void;
  onViewProfile: (playerId: string) => void;
  onMessagePlayer: (playerId: string) => void;
  loading?: boolean;
}

export default function ConnectionRequests({
  sentRequests,
  receivedRequests,
  onAcceptRequest,
  onRejectRequest,
  onWithdrawRequest,
  onViewProfile,
  onMessagePlayer,
  loading = false
}: ConnectionRequestsProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [responseMessages, setResponseMessages] = useState<Record<string, string>>({});
  const [showMessageInput, setShowMessageInput] = useState<string | null>(null);

  const handleAction = async (action: string, requestId: string, message?: string) => {
    setActionLoading(requestId);
    try {
      switch (action) {
        case 'accept':
          await onAcceptRequest(requestId, message);
          break;
        case 'reject':
          await onRejectRequest(requestId);
          break;
        case 'withdraw':
          await onWithdrawRequest(requestId);
          break;
      }
      setShowMessageInput(null);
      setResponseMessages(prev => ({ ...prev, [requestId]: '' }));
    } finally {
      setActionLoading(null);
    }
  };

  const updateResponseMessage = (requestId: string, message: string) => {
    setResponseMessages(prev => ({ ...prev, [requestId]: message }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'accepted': return 'text-emerald-600 bg-emerald-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'withdrawn': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <UserCheck className="h-4 w-4" />;
      case 'rejected': return <UserX className="h-4 w-4" />;
      case 'withdrawn': return <Undo className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const pendingReceivedRequests = receivedRequests.filter(req => req.status === 'pending');
  const pendingSentRequests = sentRequests.filter(req => req.status === 'pending');
  const allReceivedRequests = receivedRequests.sort((a, b) => 
    new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );
  const allSentRequests = sentRequests.sort((a, b) => 
    new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );

  const tabs = [
    { 
      id: 'received', 
      label: 'Received', 
      count: pendingReceivedRequests.length,
      total: receivedRequests.length 
    },
    { 
      id: 'sent', 
      label: 'Sent', 
      count: pendingSentRequests.length,
      total: sentRequests.length 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Connection Requests</h2>
            <p className="text-gray-600">Manage your player connections and network</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{pendingReceivedRequests.length}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{pendingSentRequests.length}</div>
              <div className="text-sm text-gray-600">Sent</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              )}
              <span className="text-gray-400">({tab.total})</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'received' && (
        <div className="space-y-4">
          {allReceivedRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <UserPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Connection Requests</h3>
              <p className="text-gray-600">
                You haven't received any connection requests yet. Start connecting with other players!
              </p>
            </Card>
          ) : (
            allReceivedRequests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-start gap-6">
                  {/* Player Avatar */}
                  <div className="relative flex-shrink-0">
                    {request.playerAvatar ? (
                      <img
                        src={request.playerAvatar}
                        alt={request.playerName}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {request.playerName.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    {request.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{request.playerName}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{request.playerLocation}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span>{request.playerSkillRating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3 text-amber-500" />
                            <span>{request.playerWinRate}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1 capitalize">{request.status}</span>
                        </span>
                        <span className="text-sm text-gray-500">{formatTimeAgo(request.sentAt)}</span>
                      </div>
                    </div>

                    {/* Player Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{request.mutualConnections} mutual connections</span>
                      </div>
                      
                      {request.compatibilityScore && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Activity className="h-4 w-4 text-emerald-500" />
                          <span>{request.compatibilityScore}% compatibility</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        <span>{request.recentActivity}</span>
                      </div>
                    </div>

                    {/* Common Sports */}
                    {request.commonSports.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm text-gray-600 mb-2">Common sports:</div>
                        <div className="flex flex-wrap gap-2">
                          {request.commonSports.map((sport, index) => (
                            <span key={index} className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                              {sport}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    {request.message && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Message:</div>
                        <p className="text-sm text-gray-900">{request.message}</p>
                      </div>
                    )}

                    {/* Response Message Input */}
                    {showMessageInput === request.id && request.status === 'pending' && (
                      <div className="mb-4">
                        <Input
                          placeholder="Add a message (optional)"
                          value={responseMessages[request.id] || ''}
                          onChange={(e) => updateResponseMessage(request.id, e.target.value)}
                          className="mb-2"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {request.status === 'pending' ? (
                        <>
                          <Button
                            onClick={() => {
                              if (showMessageInput === request.id) {
                                handleAction('accept', request.id, responseMessages[request.id]);
                              } else {
                                setShowMessageInput(request.id);
                              }
                            }}
                            disabled={actionLoading === request.id}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {showMessageInput === request.id ? 'Confirm Accept' : 'Accept'}
                          </Button>
                          
                          <Button
                            variant="secondary"
                            onClick={() => handleAction('reject', request.id)}
                            disabled={actionLoading === request.id}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                          
                          {showMessageInput === request.id && (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setShowMessageInput(null);
                                setResponseMessages(prev => ({ ...prev, [request.id]: '' }));
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {request.status === 'accepted' && 'Connection accepted'}
                          {request.status === 'rejected' && 'Connection declined'}
                          {request.respondedAt && ` on ${new Date(request.respondedAt).toLocaleDateString()}`}
                        </div>
                      )}
                      
                      <Button
                        variant="secondary"
                        onClick={() => onViewProfile(request.playerId)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                      
                      <Button
                        variant="secondary"
                        onClick={() => onMessagePlayer(request.playerId)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'sent' && (
        <div className="space-y-4">
          {allSentRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sent Requests</h3>
              <p className="text-gray-600">
                You haven't sent any connection requests yet. Start building your network!
              </p>
            </Card>
          ) : (
            allSentRequests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-start gap-6">
                  {/* Player Avatar */}
                  <div className="relative flex-shrink-0">
                    {request.playerAvatar ? (
                      <img
                        src={request.playerAvatar}
                        alt={request.playerName}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {request.playerName.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    {request.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{request.playerName}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{request.playerLocation}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span>{request.playerSkillRating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3 text-amber-500" />
                            <span>{request.playerWinRate}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1 capitalize">{request.status}</span>
                        </span>
                        <span className="text-sm text-gray-500">{formatTimeAgo(request.sentAt)}</span>
                      </div>
                    </div>

                    {/* Your Message */}
                    {request.message && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-600 mb-1">Your message:</div>
                        <p className="text-sm text-gray-900">{request.message}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {request.status === 'pending' ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleAction('withdraw', request.id)}
                          disabled={actionLoading === request.id}
                        >
                          <Undo className="h-4 w-4 mr-2" />
                          Withdraw
                        </Button>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {request.status === 'accepted' && 'Connection accepted'}
                          {request.status === 'rejected' && 'Connection declined'}
                          {request.status === 'withdrawn' && 'Request withdrawn'}
                          {request.respondedAt && ` on ${new Date(request.respondedAt).toLocaleDateString()}`}
                        </div>
                      )}
                      
                      <Button
                        variant="secondary"
                        onClick={() => onViewProfile(request.playerId)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                      
                      <Button
                        variant="secondary"
                        onClick={() => onMessagePlayer(request.playerId)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}