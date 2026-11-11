import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { isFirebaseConfigured } from './firebase/config'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import FeedPage from './pages/FeedPage'
import InvitePage from './pages/InvitePage'

// 첫 화면(#/): 로그인했으면 나만보기, 로그인 전이면 공개메모 전체
function Home() {
  const { user, loading } = useAuth()
  if (loading) return <p className="empty">불러오는 중…</p>
  return <Navigate to={!isFirebaseConfigured || user ? '/mine' : '/feed'} replace />
}

// GitHub Pages는 SPA 라우팅(새로고침 시 404)을 지원하지 않아서 HashRouter를 씁니다.
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Header />
        <main className="container">
          <Routes>
            {/* 나만보기: 내 비공개 (로그인 필요) / 공개메모 전체: 나와 다른 사람의 공개 / 내가 쓴 공개메모 (로그인 필요) */}
            <Route path="/" element={<Home />} />
            <Route path="/feed" element={<FeedPage key="all" mode="all" />} />
            <Route path="/mine" element={<ProtectedRoute><FeedPage key="mine" mode="mine" /></ProtectedRoute>} />
            <Route path="/public" element={<ProtectedRoute><FeedPage key="public" mode="public" /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/login" element={<LoginPage />} />
            {/* 테스터용 숨은 화면: 초대 코드 가입 / 이메일 로그인 (메뉴에 없음) */}
            <Route path="/invite" element={<InvitePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </HashRouter>
    </AuthProvider>
  )
}
