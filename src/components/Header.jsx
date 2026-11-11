import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../firebase/config'

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

// 상단: [R 로고] ··· [🔒 나만보기] [🌐 공개메모] ··· [사람 아이콘]
export default function Header() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  // 로그인하지 않은 방문자가 나만보기·마이페이지를 누르면 로그인 화면으로 갑니다.
  const needLogin = isFirebaseConfigured && !user
  // 공개메모 메뉴는 '전체'(/)와 '내가 쓴 공개메모'(/public) 두 화면에서 켜져 있습니다.
  const publicActive = pathname === '/' || pathname === '/public'

  return (
    <header className="header">
      <Link to="/" className="logo" aria-label="Recordish 처음으로" title="Recordish">R</Link>
      <nav className="menu">
        <NavLink to={needLogin ? '/login' : '/mine'} className="menu-icon" aria-label="나만보기" title="나만보기">
          <Icon>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </Icon>
        </NavLink>
        <Link to="/" className={`menu-icon${publicActive ? ' active' : ''}`} aria-label="공개메모" title="공개메모"
          aria-current={publicActive ? 'page' : undefined}>
          <Icon>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
          </Icon>
        </Link>
      </nav>
      {isFirebaseConfigured ? (
        <NavLink to={needLogin ? '/login' : '/account'} className="menu-icon"
          aria-label={needLogin ? '로그인' : '마이페이지'} title={needLogin ? '로그인' : '마이페이지'}>
          <Icon>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
          </Icon>
        </NavLink>
      ) : (
        <span className="badge">로컬</span>
      )}
    </header>
  )
}
