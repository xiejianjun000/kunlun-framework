import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Agent, Message, Conversation, ChatState } from '@/types'
import { chatApi, wsService } from '@/api/chat'

// 模拟智能体数据（实际项目中从后端获取）
const mockAgents: Agent[] = [
  {
    id: 'agent-zhongyue',
    name: '中岳',
    avatar: '/avatars/zhongyue.svg',
    description: '战略分析师，专注于长期规划和全局思维',
    status: 'online',
    capabilities: ['战略分析', '规划制定', '风险评估'],
    personality: {
      communicationStyle: '严谨专业',
      decisionMaking: '深思熟虑',
      creativity: 0.7,
    },
  },
  {
    id: 'agent-baijing',
    name: '白鲸',
    avatar: '/avatars/baijing.svg',
    description: '创意大师，擅长突破性思维和创新解决方案',
    status: 'online',
    capabilities: ['创意设计', '头脑风暴', '艺术创作'],
    personality: {
      communicationStyle: '富有想象力',
      decisionMaking: '直觉驱动',
      creativity: 0.95,
    },
  },
  {
    id: 'agent-tianlu',
    name: '天禄',
    avatar: '/avatars/tianlu.svg',
    description: '知识管家，精通各领域知识问答',
    status: 'online',
    capabilities: ['知识问答', '信息检索', '学习辅导'],
    personality: {
      communicationStyle: '博学多才',
      decisionMaking: '逻辑严谨',
      creativity: 0.6,
    },
  },
  {
    id: 'agent-shining',
    name: '闪耀',
    avatar: '/avatars/shining.svg',
    description: '效率专家，帮助用户快速完成任务',
    status: 'busy',
    capabilities: ['任务管理', '效率优化', '自动化'],
    personality: {
      communicationStyle: '简洁高效',
      decisionMaking: '快速果断',
      creativity: 0.5,
    },
  },
  {
    id: 'agent-tusita',
    name: '兜率天',
    avatar: '/avatars/tusita.svg',
    description: '慈悲导师，关注用户成长和心理健康',
    status: 'online',
    capabilities: ['心理咨询', '成长指导', '情绪支持'],
    personality: {
      communicationStyle: '温暖关怀',
      decisionMaking: '共情理解',
      creativity: 0.8,
    },
  },
  {
    id: 'agent-yuebai',
    name: '月白',
    avatar: '/avatars/yuebai.svg',
    description: '文学助手，精通诗词歌赋和文案创作',
    status: 'online',
    capabilities: ['文学创作', '文案撰写', '翻译润色'],
    personality: {
      communicationStyle: '优雅诗意',
      decisionMaking: '感性细腻',
      creativity: 0.9,
    },
  },
  {
    id: 'agent-qiankun',
    name: '乾坤',
    avatar: '/avatars/qiankun.svg',
    description: '技术专家，解决各类技术难题',
    status: 'online',
    capabilities: ['代码开发', '架构设计', '技术咨询'],
    personality: {
      communicationStyle: '技术严谨',
      decisionMaking: '务实可靠',
      creativity: 0.75,
    },
  },
  {
    id: 'agent-yinliang',
    name: '银靓',
    avatar: '/avatars/yinliang.svg',
    description: '数据分析师，从数据中发现洞察',
    status: 'offline',
    capabilities: ['数据分析', '可视化', '趋势预测'],
    personality: {
      communicationStyle: '数据驱动',
      decisionMaking: '客观理性',
      creativity: 0.65,
    },
  },
]

interface ChatActions {
  // 初始化
  initialize: () => Promise<void>
  
  // 智能体操作
  selectAgent: (agentId: string) => void
  getAgentById: (agentId: string) => Agent | undefined
  
  // 会话操作
  createConversation: (agentId: string, title?: string) => Promise<Conversation>
  selectConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => Promise<void>
  
  // 消息操作
  sendMessage: (content: string) => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  clearMessages: () => void
  
  // WebSocket
  connectWebSocket: (conversationId: string) => void
  disconnectWebSocket: () => void
  
  // 状态更新
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      // 初始状态
      agents: [],
      currentAgent: null,
      conversations: [],
      currentConversation: null,
      messages: [],
      isLoading: false,
      isConnected: false,
      error: null,

      // 初始化
      initialize: async () => {
        set({ isLoading: true, error: null })
        try {
          // 尝试从API获取智能体列表，失败时使用模拟数据
          let agents = mockAgents
          try {
            agents = await chatApi.getAgents()
          } catch {
            console.log('Using mock agents data')
          }
          set({ agents, isLoading: false })
        } catch (error) {
          set({ 
            agents: mockAgents, 
            isLoading: false, 
            error: null // 不显示错误，使用模拟数据
          })
        }
      },

      // 选择智能体
      selectAgent: (agentId: string) => {
        const agent = get().agents.find((a) => a.id === agentId)
        if (agent) {
          set({ currentAgent: agent })
        }
      },

      getAgentById: (agentId: string) => {
        return get().agents.find((a) => a.id === agentId)
      },

      // 创建会话
      createConversation: async (agentId: string, title?: string) => {
        const agent = get().getAgentById(agentId)
        if (!agent) throw new Error('智能体不存在')

        try {
          const conversation = await chatApi.createConversation(agentId, title)
          set((state) => ({
            conversations: [conversation, ...state.conversations],
            currentConversation: conversation,
          }))
          return conversation
        } catch {
          // 模拟创建会话
          const conversation: Conversation = {
            id: `conv-${Date.now()}`,
            agentId,
            title: title || `与 ${agent.name} 的对话`,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          set((state) => ({
            conversations: [conversation, ...state.conversations],
            currentConversation: conversation,
            currentAgent: agent,
          }))
          return conversation
        }
      },

      // 选择会话
      selectConversation: (conversationId: string) => {
        const conversation = get().conversations.find((c) => c.id === conversationId)
        if (conversation) {
          const agent = get().getAgentById(conversation.agentId)
          set({ currentConversation: conversation, currentAgent: agent || null })
          get().loadMessages(conversationId)
        }
      },

      // 删除会话
      deleteConversation: async (conversationId: string) => {
        try {
          await chatApi.deleteConversation(conversationId)
        } catch {
          console.log('API not available, deleting locally')
        }
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== conversationId),
          currentConversation:
            state.currentConversation?.id === conversationId ? null : state.currentConversation,
        }))
      },

      // 发送消息
      sendMessage: async (content: string) => {
        const { currentAgent, currentConversation } = get()
        if (!currentAgent || !content.trim()) return

        // 添加用户消息
        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: content.trim(),
          timestamp: new Date(),
          agentId: currentAgent.id,
          status: 'sent',
        }

        set((state) => ({
          messages: [...state.messages, userMessage],
        }))

        // 如果没有当前会话，创建一个
        let conversation = currentConversation
        if (!conversation) {
          conversation = await get().createConversation(currentAgent.id)
        }

        // 模拟AI回复
        try {
          const response = await chatApi.sendMessage({
            agentId: currentAgent.id,
            content: content.trim(),
            conversationId: conversation.id,
          })
          set((state) => ({
            messages: [...state.messages, response],
          }))
        } catch {
          // 模拟AI响应
          setTimeout(() => {
            const aiMessage: Message = {
              id: `msg-${Date.now() + 1}`,
              role: 'assistant',
              content: get().generateMockResponse(content, currentAgent),
              timestamp: new Date(),
              agentId: currentAgent.id,
              status: 'sent',
            }
            set((state) => ({
              messages: [...state.messages, aiMessage],
            }))
          }, 1000 + Math.random() * 1000)
        }
      },

      // 生成模拟回复
      generateMockResponse: (userMessage: string, agent: Agent): string => {
        const responses: Record<string, string[]> = {
          default: [
            '我理解你的问题。让我来分析一下...',
            '这是一个有趣的话题，让我们深入探讨。',
            '根据我的分析，这个问题可以从多个角度来看待。',
            '感谢你的提问！我会尽力为你提供帮助。',
          ],
          'agent-zhongyue': [
            '从战略角度来看，我们需要考虑长期影响和全局影响。',
            '让我从全局视角为你分析这个问题的各个维度。',
            '这是一个需要深思熟虑的决策，我会给出详细的战略建议。',
          ],
          'agent-baijing': [
            '哇！这个想法太棒了！让我给你一些突破性的创意！',
            '如果我们换个角度看问题，你会发现无限可能！',
            '创新往往来自于对常规的突破，让我来激发你的灵感！',
          ],
          'agent-tianlu': [
            '让我查阅一下相关知识...根据我的知识库，这个问题答案是...',
            '这是一个经典的知识问题，我来为你详细解答。',
            '知识的价值在于应用，让我帮你更好地理解这个概念。',
          ],
        }

        const agentResponses = responses[agent.id] || responses.default
        return agentResponses[Math.floor(Math.random() * agentResponses.length)]
      },

      // 加载消息
      loadMessages: async (conversationId: string) => {
        set({ isLoading: true })
        try {
          const messages = await chatApi.getMessages(conversationId)
          set({ messages, isLoading: false })
        } catch {
          // 从本地存储加载
          const stored = localStorage.getItem(`messages-${conversationId}`)
          const messages = stored ? JSON.parse(stored) : []
          set({ messages, isLoading: false })
        }
      },

      // 清除消息
      clearMessages: () => {
        set({ messages: [] })
      },

      // WebSocket连接
      connectWebSocket: (conversationId: string) => {
        wsService.connect(conversationId)
        wsService.on('status', (data: unknown) => {
          const status = data as { connected: boolean }
          set({ isConnected: status.connected })
        })
        wsService.on('message', (data: unknown) => {
          const message = data as Message
          set((state) => ({
            messages: [...state.messages, message],
          }))
        })
      },

      // WebSocket断开
      disconnectWebSocket: () => {
        wsService.off('status')
        wsService.off('message')
        wsService.disconnect()
        set({ isConnected: false })
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      // 设置错误
      setError: (error: string | null) => {
        set({ error })
      },
    }),
    {
      name: 'Taiji-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        currentAgent: state.currentAgent,
        currentConversation: state.currentConversation,
      }),
    }
  )
)
