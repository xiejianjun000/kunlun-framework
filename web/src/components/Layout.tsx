import { useChatStore } from '@/hooks/useChatStore'
import AgentSelector from './AgentSelector'
import ChatSidebar from './ChatSidebar'
import ChatWindow from './ChatWindow'
import Header from './Header'
import styles from './Layout.module.css'

export default function Layout() {
  const currentAgent = useChatStore((state) => state.currentAgent)
  const currentConversation = useChatStore((state) => state.currentConversation)

  return (
    <div className={styles.layout}>
      {/* 左侧边栏 - 智能体选择器 */}
      <aside className={styles.sidebar}>
        <AgentSelector />
      </aside>

      {/* 中间边栏 - 会话列表 */}
      <aside className={styles.conversations}>
        <ChatSidebar />
      </aside>

      {/* 主聊天区域 */}
      <main className={styles.main}>
        <Header />
        <ChatWindow />
      </main>
    </div>
  )
}
