import { useState, useRef, useEffect, FormEvent } from 'react'
import { useChatStore } from '@/hooks/useChatStore'
import type { Message } from '@/types'
import MessageItem from './MessageItem'
import styles from './ChatWindow.module.css'

export default function ChatWindow() {
  const messages = useChatStore((state) => state.messages)
  const currentAgent = useChatStore((state) => state.currentAgent)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const clearMessages = useChatStore((state) => state.clearMessages)

  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 处理发送
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    setIsSending(true)
    const content = inputValue.trim()
    setInputValue('')

    try {
      await sendMessage(content)
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  // 处理快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // 自动调整输入框高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }

  if (!currentAgent) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyContent}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
            <path d="M2 17L12 22L22 17" />
            <path d="M2 12L12 17L22 12" />
          </svg>
          <h2>欢迎使用昆仑框架</h2>
          <p>从左侧选择一个智能体，开始对话</p>
          <div className={styles.featureList}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🎯</span>
              <span>多智能体协作</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>💡</span>
              <span>专业领域知识</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🔒</span>
              <span>安全隐私保护</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 消息列表 */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeAvatar}>
              {currentAgent.avatar ? (
                <img src={currentAgent.avatar} alt={currentAgent.name} />
              ) : (
                <span>{currentAgent.name.charAt(0)}</span>
              )}
            </div>
            <h3>与 {currentAgent.name} 对话</h3>
            <p>{currentAgent.description}</p>
            {currentAgent.capabilities && currentAgent.capabilities.length > 0 && (
              <div className={styles.capabilities}>
                {currentAgent.capabilities.map((cap, index) => (
                  <span key={index} className={styles.capability}>
                    {cap}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <div className={styles.inputWrapper}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`向 ${currentAgent.name} 发送消息...`}
              className={styles.input}
              rows={1}
              disabled={isSending}
            />
            <div className={styles.inputActions}>
              {inputValue.trim() && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={clearMessages}
                  title="清空对话"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!inputValue.trim() || isSending}
              >
                {isSending ? (
                  <span className={styles.sending}>
                    <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className={styles.hint}>
            按 Enter 发送，Shift + Enter 换行
          </div>
        </form>
      </div>
    </div>
  )
}
