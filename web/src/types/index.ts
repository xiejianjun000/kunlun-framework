// 智能体类型定义
export interface Agent {
  id: string
  name: string
  avatar: string
  description: string
  status: 'online' | 'offline' | 'busy'
  capabilities: string[]
  personality?: {
    communicationStyle: string
    decisionMaking: string
    creativity: number
  }
}

// 消息类型定义
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  agentId?: string
  attachments?: Attachment[]
  status?: 'sending' | 'sent' | 'error'
}

export interface Attachment {
  id: string
  type: 'image' | 'file' | 'audio'
  name: string
  url: string
  size?: number
}

// 会话类型定义
export interface Conversation {
  id: string
  agentId: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// 聊天状态
export interface ChatState {
  agents: Agent[]
  currentAgent: Agent | null
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  isConnected: boolean
  error: string | null
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 发送消息请求
export interface SendMessageRequest {
  agentId: string
  content: string
  conversationId?: string
  attachments?: File[]
}

// WebSocket 消息类型
export interface WSMessage {
  type: 'message' | 'typing' | 'status' | 'error'
  payload: unknown
  timestamp: number
}
