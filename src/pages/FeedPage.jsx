import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import MemoEditor from '../components/MemoEditor'
import MemoList from '../components/MemoList'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../firebase/config'
import { useFeed } from '../hooks/useMemos'
import { useNow } from '../hooks/useNow'
import { getPublicCountToday, msUntilReset } from '../services/memoService'
import { DAILY_PUBLIC_LIMIT } from '../utils/text'

// hasEditor: 메모 입력창을 보여줄지 (공개메모 화면은 목록만)
const PAGES = {
// subtabs: 공개메모 메뉴 안의 '전체 / 내가 쓴 공개메모' 선택 (제목 대신 보여줌)
  all: { title: '공개메모 전체', subtabs: true, hasEditor: true, empty: '아직 공개된 메모가 없습니다.' },
  mine: { title: '🔒 나만보기', hideTitle: true, hasEditor: true, empty: '아직 나만 보는 메모가 없습니다.' },
  public: { title: '내가 쓴 공개메모', subtabs: true, hasEditor: false, empty: '아직 공개한 메모가 없습니다.' },
}

// mode: 'all' (공개메모 전체, /feed) | 'mine' (나만보기, /mine) | 'public' (내가 쓴 공개메모, /public)
export default function FeedPage({ mode }) {
  const { memos, loading, loadingMore, error, hasMore, loadMore, addMemo, editMemo, removeMemo } = useFeed(mode)
  const { user, loading: authLoading } = useAuth()
  const isGuest = isFirebaseConfigured && !authLoading && !user
  const canWrite = !isFirebaseConfigured || Boolean(user)
  const page = PAGES[mode]
  const navigate = useNavigate()
  // 나만보기는 옆 사람이 볼 수 있으니 처음에는 목록을 숨기고 "더보기"를 눌러야 보여줍니다 (화면에 들어올 때마다 다시 숨김)
  const [revealed, setRevealed] = useState(mode !== 'mine')
  // 공개메모 전체 화면: 오늘 공개 한도(2개)를 다 썼으면 입력창을 잠그고 언제 다시 쓸 수 있는지 알려줍니다
  const [pubsToday, setPubsToday] = useState(0)
  useEffect(() => {
    if (mode !== 'all' || !user) return
    let active = true
    getPublicCountToday(user)
      .then((n) => active && setPubsToday(n))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [mode, user])
  const now = useNow(60000)
  const locked = mode === 'all' && pubsToday >= DAILY_PUBLIC_LIMIT
  const lockedText = locked ? publicLimitText(msUntilReset(now)) : ''

  // 메모를 쓰면 그 메모가 모이는 화면으로 이동합니다 (비공개 → 나만보기, 공개 → 공개메모)
  const handleAdd = async (data) => {
    const ok = await addMemo(data)
    if (ok && data.isPublic) setPubsToday((n) => n + 1)
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
          <NavLink to="/feed" className="subtab">전체</NavLink>
          <NavLink to={isGuest ? '/login' : '/public'} className="subtab">내가 쓴 공개메모</NavLink>
        </nav>
      )}
      {canWrite && page.hasEditor && (
        // 공개메모 화면의 입력창은 '공개'가 기본, 나만보기는 '비공개'가 기본
        <MemoEditor key={mode} initial={{ content: '', isPublic: mode !== 'mine' }} onSubmit={handleAdd} submitLabel="추가" lockedText={lockedText} />
      )}
      {/* 화면 제목은 상단 아이콘·선택 버튼이 대신하므로 눈에 안 보이게(화면 읽기 프로그램에는 읽히게) 둡니다 */}
      <h2 className={page.subtabs || page.hideTitle ? 'sr-only' : 'page-title'}>{page.title}</h2>
      {error && <p className="error">메모를 불러오지 못했습니다: {error}</p>}
      {!revealed ? (
        <div className="more">
          <button type="button" onClick={() => setRevealed(true)}>더보기</button>
        </div>
      ) : loading ? (
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

// "공개 메모는 하루 2개까지 쓸 수 있어요. 5시간 20분 후에 다시 쓸 수 있어요." (한국 시간 0시에 다시 열림)
function publicLimitText(ms) {
  const mins = Math.max(1, Math.ceil(ms / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const left = h > 0 ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`
  return `공개 메모는 하루 ${DAILY_PUBLIC_LIMIT}개까지 쓸 수 있어요. (지워도 다시 늘어나지 않아요)\n${left} 후(자정)에 다시 쓸 수 있어요.`
}
