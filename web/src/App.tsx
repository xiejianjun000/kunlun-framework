import { useEffect } from 'react'
import { useChatStore } from './hooks/useChatStore'
import Layout from './components/Layout'
import './styles/global.css'

function App() {
  const initialize = useChatStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return <Layout />
}

export default App
