import axios, { AxiosInstance, AxiosError } from 'axios'
import type { Agent, Message, Conversation, ApiResponse, SendMessageRequest } from '@/types'

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加用户认证 token
    const token = localStorage.getItem('kunlun_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const message = error.response?.data?.error || error.message || '请求失败'
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

// API 接口
export const chatApi = {
  // 获取智能体列表
  async getAgents(): Promise<Agent[]> {
    const response = await apiClient.get<ApiResponse<Agent[]>>('/agents')
    return response.data || []
  },

  // 获取单个智能体详情
  async getAgent(agentId: string): Promise<Agent> {
    const response = await apiClient.get<ApiResponse<Agent>>(`/agents/${agentId}`)
    return response.data!
  },

  // 获取会话列表
  async getConversations(agentId?: string): Promise<Conversation[]> {
    const params = agentId ? { agentId } : {}
    const response = await apiClient.get<ApiResponse<Conversation[]>>('/conversations', { params })
    return response.data || []
  },

  // 创建新会话
  async createConversation(agentId: string, title?: string): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>('/conversations', {
      agentId,
      title: title || `与智能体对话`,
    })
    return response.data!
  },

  // 获取会话消息
  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await apiClient.get<ApiResponse<Message[]>>(
      `/conversations/${conversationId}/messages`
    )
    return response.data || []
  },

  // 发送消息
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const formData = new FormData()
    formData.append('agentId', request.agentId)
    formData.append('content', request.content)
    if (request.conversationId) {
      formData.append('conversationId', request.conversationId)
    }
    if (request.attachments) {
      request.attachments.forEach((file) => {
        formData.append('attachments', file)
      })
    }

    const response = await apiClient.post<ApiResponse<Message>>('/chat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data!
  },

  // 删除会话
  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/conversations/${conversationId}`)
  },

  // 更新会话标题
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    await apiClient.patch(`/conversations/${conversationId}`, { title })
  },
}

// WebSocket 服务
export class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Map<string, ((data: unknown) => void)[]> = new Map()

  connect(conversationId: string) {
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`
    this.ws = new WebSocket(`${wsUrl}/chat?conversationId=${conversationId}`)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.emit('status', { connected: true })
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const handlers = this.messageHandlers.get(data.type) || []
        handlers.forEach((handler) => handler(data.payload))
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.emit('status', { connected: false })
      this.attemptReconnect(conversationId)
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    }
  }

  private attemptReconnect(conversationId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`Attempting to reconnect in ${delay}ms...`)
      setTimeout(() => this.connect(conversationId), delay)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(type: string, payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }))
    }
  }

  on(type: string, handler: (data: unknown) => void) {
    const handlers = this.messageHandlers.get(type) || []
    handlers.push(handler)
    this.messageHandlers.set(type, handlers)
  }

  off(type: string, handler?: (data: unknown) => void) {
    if (handler) {
      const handlers = this.messageHandlers.get(type) || []
      const index = handlers.indexOf(handler)
      if (index > -1) handlers.splice(index, 1)
      this.messageHandlers.set(type, handlers)
    } else {
      this.messageHandlers.delete(type)
    }
  }

  private emit(type: string, data: unknown) {
    const handlers = this.messageHandlers.get(type) || []
    handlers.forEach((handler) => handler(data))
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()

export default apiClient
