import { useState } from 'react'
import { useChatStore } from '@/hooks/useChatStore'
import type { Agent } from '@/types'
import styles from './AgentSelector.module.css'

export default function AgentSelector() {
  const agents = useChatStore((state) => state.agents)
  const currentAgent = useChatStore((state) => state.currentAgent)
  const selectAgent = useChatStore((state) => state.selectAgent)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusColors: Record<Agent['status'], string> = {
    online: 'var(--status-online)',
    offline: 'var(--status-offline)',
    busy: 'var(--status-busy)',
  }

  const statusLabels: Record<Agent['status'], string> = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
  }

  return (
    <div className={styles.container}>
      {/* 标题 */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>智能体</span>
        </div>
        <span className={styles.version}>v1.0</span>
      </div>

      {/* 搜索框 */}
      <div className={styles.searchWrapper}>
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="搜索智能体..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* 智能体列表 */}
      <div className={styles.list}>
        <div className={styles.sectionTitle}>选择智能体</div>
        {filteredAgents.length === 0 ? (
          <div className={styles.empty}>未找到匹配的智能体</div>
        ) : (
          filteredAgents.map((agent) => (
            <button
              key={agent.id}
              className={`${styles.agentCard} ${
                currentAgent?.id === agent.id ? styles.active : ''
              }`}
              onClick={() => selectAgent(agent.id)}
            >
              <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>
                  {agent.avatar ? (
                    <img src={agent.avatar} alt={agent.name} />
                  ) : (
                    <span>{agent.name.charAt(0)}</span>
                  )}
                </div>
                <span
                  className={styles.status}
                  style={{ backgroundColor: statusColors[agent.status] }}
                  title={statusLabels[agent.status]}
                />
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{agent.name}</div>
                <div className={styles.desc}>{agent.description}</div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* 底部信息 */}
      <div className={styles.footer}>
        <div className={styles.onlineCount}>
          <span className={styles.dot} />
          {agents.filter((a) => a.status === 'online').length} 个智能体在线
        </div>
      </div>
    </div>
  )
}
