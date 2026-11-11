import { Link, NavLink, useNavigate } from 'react-router-dom'
import MemoEditor from '../components/MemoEditor'
import MemoList from '../components/MemoList'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../firebase/config'
import { useFeed } from '../hooks/useMemos'

// hasEditor: 메모 입력창을 보여줄지 (공개메모 화면은 목록만)
const PAGES = {
// subtabs: 공개메모 메뉴 안의 '전체 / 내가 쓴 공개메모' 선택 (제목 대신 보여줌)
  all: { title: '공개메모 전체', subtabs: true, hasEditor: true, empty: '아직 공개된 메모가 없습니다.' },
  mine: { title: '🔒 나만보기', hasEditor: true, empty: '아직 나만 보는 메모가 없습니다.' },
  public: { title: '내가 쓴 공개메모', subtabs: true, hasEditor: false, empty: '아직 공개한 메모가 없습니다.' },
}

// mode: 'all' (공개메모 전체, /) | 'mine' (나만보기, /mine) | 'public' (내가 쓴 공개메모, /public)
export default function FeedPage({ mode }) {
  const { memos, loading, loadingMore, error, hasMore, loadMore, addMemo, editMemo, removeMemo } = useFeed(mode)
  const { user, loading: authLoading } = useAuth()
  const isGuest = isFirebaseConfigured && !authLoading && !user
  const canWrite = !isFirebaseConfigured || Boolean(user)
  const page = PAGES[mode]
  const navigate = useNavigate()

  // 메모를 쓰면 그 메모가 모이는 화면으로 이동합니다 (비공개 → 나만보기, 공개 → 공개메모)
  const handleAdd = async (data) => {
    const ok = await addMemo(data)
    const target = data.isPublic ? '/public' : '/mine'
    if (ok && target !== `/${mode}`) navigate(target)
    return ok
  }

  return (
    <>
      {isGuest && (
        <p className="notice">
          <Link to="/login">Google로 로그인</Link>하면 나만의 메모를 쓰고, 원하는 메모를 공개할 수 있어요.
        </p>
      )}
      {page.subtabs && (
        <nav className="subtabs" aria-label="공개메모 보기">
          <NavLink to="/" end className="subtab">전체</NavLink>
          <NavLink to={isGuest ? '/login' : '/public'} className="subtab">내가 쓴 공개메모</NavLink>
        </nav>
      )}
      {canWrite && page.hasEditor && <MemoEditor key={mode} onSubmit={handleAdd} submitLabel="추가" />}
      {/* 공개메모 화면은 위 선택 버튼이 제목 역할이라, 제목은 눈에 안 보이게(화면 읽기 프로그램에는 읽히게) 둡니다 */}
      <h2 className={page.subtabs ? 'sr-only' : 'page-title'}>{page.title}</h2>
      {error && <p className="error">메모를 불러오지 못했습니다: {error}</p>}
      {loading ? (
        <p className="empty">불러오는 중…</p>
      ) : (
        <>
          <MemoList
            memos={memos}
            emptyText={page.empty}
            // 로컬 모드에서는 모든 메모가 내 메모입니다.
            isOwn={(memo) => !isFirebaseConfigured || memo.uid === user?.uid}
            // 작성자 이름은 여러 사람의 메모가 섞이는 '전체' 화면에서만 보여줍니다
            showAuthor={mode === 'all'}
            onUpdate={editMemo}
            onDelete={removeMemo}
          />
          {hasMore && (
            <div className="more">
              <button onClick={loadMore} disabled={loadingMore}>{loadingMore ? '불러오는 중…' : '더 보기'}</button>
            </div>
          )}
        </>
      )}
    </>
  )
}
