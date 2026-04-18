import { useState } from 'react'
import { useChatStore } from '@/hooks/useChatStore'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import styles from './ChatSidebar.module.css'

export default function ChatSidebar() {
  const conversations = useChatStore((state) => state.conversations)
  const currentConversation = useChatStore((state) => state.currentConversation)
  const currentAgent = useChatStore((state) => state.currentAgent)
  const selectConversation = useChatStore((state) => state.selectConversation)
  const deleteConversation = useChatStore((state) => state.deleteConversation)
  const createConversation = useChatStore((state) => state.createConversation)

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleNewChat = async () => {
    if (currentAgent) {
      await createConversation(currentAgent.id)
    }
  }

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
    if (confirm('确定要删除这个会话吗？')) {
      await deleteConversation(conversationId)
    }
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return format(d, 'HH:mm', { locale: zhCN })
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return format(d, 'EEEE', { locale: zhCN })
    } else {
      return format(d, 'MM/dd', { locale: zhCN })
    }
  }

  return (
    <div className={styles.container}>
      {/* 新建会话按钮 */}
      <div className={styles.header}>
        <button
          className={styles.newChatBtn}
          onClick={handleNewChat}
          disabled={!currentAgent}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建对话
        </button>
      </div>

      {/* 会话列表 */}
      <div className={styles.list}>
        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>暂无对话记录</p>
            <span>选择一个智能体开始对话</span>
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`${styles.conversationItem} ${
                currentConversation?.id === conversation.id ? styles.active : ''
              }`}
              onClick={() => selectConversation(conversation.id)}
              onMouseEnter={() => setHoveredId(conversation.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className={styles.conversationContent}>
                <div className={styles.conversationTitle}>{conversation.title}</div>
                <div className={styles.conversationMeta}>
                  <span className={styles.messageCount}>
                    {conversation.messages.length} 条消息
                  </span>
                  <span className={styles.dot}>·</span>
                  <span className={styles.date}>
                    {formatDate(conversation.updatedAt)}
                  </span>
                </div>
              </div>
              {hoveredId === conversation.id && (
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(e, conversation.id)}
                  title="删除会话"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </button>
          ))
        )}
      </div>

      {/* 底部设置 */}
      <div className={styles.footer}>
        <button className={styles.settingBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          设置
        </button>
      </div>
    </div>
  )
}
