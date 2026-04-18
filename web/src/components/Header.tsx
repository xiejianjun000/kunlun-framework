import { useChatStore } from '@/hooks/useChatStore'
import styles from './Header.module.css'

export default function Header() {
  const currentAgent = useChatStore((state) => state.currentAgent)
  const isConnected = useChatStore((state) => state.isConnected)
  const currentConversation = useChatStore((state) => state.currentConversation)

  const statusColors = {
    online: 'var(--status-online)',
    offline: 'var(--status-offline)',
    busy: 'var(--status-busy)',
  }

  const statusLabels = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
  }

  return (
    <header className={styles.header}>
      <div className={styles.agentInfo}>
        {currentAgent ? (
          <>
            <div className={styles.avatar}>
              {currentAgent.avatar ? (
                <img src={currentAgent.avatar} alt={currentAgent.name} />
              ) : (
                <span>{currentAgent.name.charAt(0)}</span>
              )}
              <span
                className={styles.statusDot}
                style={{ backgroundColor: statusColors[currentAgent.status] }}
              />
            </div>
            <div className={styles.details}>
              <h1 className={styles.name}>{currentAgent.name}</h1>
              <div className={styles.meta}>
                <span
                  className={styles.status}
                  style={{ color: statusColors[currentAgent.status] }}
                >
                  {statusLabels[currentAgent.status]}
                </span>
                {isConnected && (
                  <>
                    <span className={styles.separator}>·</span>
                    <span className={styles.connected}>已连接</span>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.noAgent}>
            <span>请选择一个智能体开始对话</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {currentConversation && (
          <div className={styles.conversationInfo}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{currentConversation.messages.length} 条消息</span>
          </div>
        )}
      </div>
    </header>
  )
}
