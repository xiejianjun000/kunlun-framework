import { useMemo } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useChatStore } from '@/hooks/useChatStore'
import type { Message } from '@/types'
import styles from './MessageItem.module.css'

interface MessageItemProps {
  message: Message
}

export default function MessageItem({ message }: MessageItemProps) {
  const currentAgent = useChatStore((state) => state.currentAgent)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // 格式化时间
  const formattedTime = useMemo(() => {
    return format(new Date(message.timestamp), 'HH:mm', { locale: zhCN })
  }, [message.timestamp])

  // 渲染消息内容（支持Markdown）
  const renderContent = (content: string) => {
    // 简单的文本处理，实际项目中可使用 marked 库
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      {/* 头像 */}
      <div className={styles.avatar}>
        {isUser ? (
          <div className={styles.userAvatar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        ) : (
          <div className={styles.agentAvatar}>
            {currentAgent?.avatar ? (
              <img src={currentAgent.avatar} alt={currentAgent.name} />
            ) : (
              <span>{currentAgent?.name?.charAt(0) || 'A'}</span>
            )}
          </div>
        )}
      </div>

      {/* 消息内容 */}
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.sender}>
            {isUser ? '你' : currentAgent?.name || '智能体'}
          </span>
          <span className={styles.time}>{formattedTime}</span>
        </div>
        <div
          className={styles.bubble}
          dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
        />
        {message.status === 'sending' && (
          <span className={styles.sendingStatus}>发送中...</span>
        )}
        {message.status === 'error' && (
          <span className={styles.errorStatus}>发送失败</span>
        )}
      </div>
    </div>
  )
}
