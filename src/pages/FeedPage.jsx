import { useEffect, useState } from 'react'
import { friendlySaveError } from '../utils/updateCheck'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import MemoEditor from '../components/MemoEditor'
import MemoList from '../components/MemoList'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../firebase/config'
import { useDialog } from '../hooks/useDialog'
import { useFeed } from '../hooks/useMemos'
import { getPublicCountToday } from '../services/memoService'
import { agreeTerms, hasAgreedTerms, REPORT_REASONS } from '../services/safetyService'
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
  const { memos, loading, loadingMore, error, hasMore, loadMore, addMemo, editMemo, removeMemo, reportMemo, blockUser } = useFeed(mode)
  const { user, loading: authLoading } = useAuth()
  const isGuest = isFirebaseConfigured && !authLoading && !user
  const canWrite = !isFirebaseConfigured || Boolean(user)
  const page = PAGES[mode]
  const navigate = useNavigate()
  const [dialog, ask] = useDialog()

  // 공개 메모를 처음 쓸 때(공개로 새로 쓰기, 비공개→공개) 커뮤니티 규칙 동의를 한 번 받습니다
  const ensureTerms = async () => {
    try {
      if (await hasAgreedTerms(user)) return true
      const answer = await ask({
        title: '커뮤니티 규칙',
        body: (
          <>
            <p>공개 메모는 누구나 볼 수 있어요. 아래 글은 쓸 수 없고, 신고되면 삭제되거나 이용이 제한될 수 있어요.</p>
            <ul>
              <li>스팸·광고, 욕설·혐오·괴롭힘</li>
              <li>성적인 내용, 폭력적이거나 불법적인 내용</li>
              <li>나나 다른 사람의 개인정보(전화번호, 주소 등)</li>
            </ul>
            <p><a href="/terms.html" target="_blank" rel="noopener noreferrer">이용약관 전체 보기</a></p>
          </>
        ),
        actions: [
          { value: 'no', label: '취소' },
          { value: 'yes', label: '동의하고 공개', primary: true },
        ],
      })
      if (answer !== 'yes') return false
      await agreeTerms(user)
      return true
    } catch (e) {
      alert(`저장하지 못했습니다.\n${friendlySaveError(e)}`)
      return false
    }
  }

  // 남의 공개 메모 신고 (이유 고르기)
  const handleReport = async (memo) => {
    const answer = await ask({
      title: '이 메모를 신고할까요?',
      body: <p>운영자가 확인한 뒤 처리해요. 신고한 메모는 내 화면에서 바로 숨겨져요.</p>,
      choices: REPORT_REASONS,
      actions: [
        { value: 'no', label: '취소' },
        { value: 'yes', label: '신고', primary: true },
      ],
    })
    if (answer?.action !== 'yes') return
    try {
      await reportMemo(memo, answer.choice)
      alert('신고했어요. 확인 후 처리할게요.')
    } catch (e) {
      alert(`신고하지 못했습니다.\n${friendlySaveError(e)}`)
    }
  }

  // 사용자 차단 (그 사람의 공개 메모가 더 이상 안 보임, 마이페이지에서 해제)
  const handleBlock = async (memo) => {
    const answer = await ask({
      title: `${memo.authorName || '이 사용자'} 님을 차단할까요?`,
      body: <p>이 사람의 공개 메모가 더 이상 보이지 않아요. 상대방에게는 알리지 않고, 마이페이지에서 언제든 해제할 수 있어요.</p>,
      actions: [
        { value: 'no', label: '취소' },
        { value: 'yes', label: '차단', primary: true },
      ],
    })
    if (answer !== 'yes') return
    try {
      await blockUser(memo)
    } catch (e) {
      alert(`차단하지 못했습니다.\n${friendlySaveError(e)}`)
    }
  }

  // 비공개였던 내 메모를 공개로 바꿀 때도 규칙 동의를 받습니다
  const handleEdit = async (id, data) => {
    const before = memos.find((m) => m.id === id)
    if (data.isPublic && !before?.isPublic && !(await ensureTerms())) return false
    return editMemo(id, data)
  }
  // 나만보기는 옆 사람이 볼 수 있으니 처음에는 목록을 숨기고 "더보기"를 눌러야 보여줍니다 (화면에 들어올 때마다 다시 숨김)
  const [revealed, setRevealed] = useState(mode !== 'mine')
  // 공개메모 전체 화면: 오늘 공개 한도(2개)를 다 썼으면 입력창을 잠그고 안내 문구를 보여줍니다
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
  const locked = mode === 'all' && pubsToday >= DAILY_PUBLIC_LIMIT
  const lockedText = locked ? `공개메모는 하루에 ${DAILY_PUBLIC_LIMIT}개까지만 작성가능합니다` : ''

  // 메모를 쓰면 그 메모가 모이는 화면으로 이동합니다 (비공개 → 나만보기, 공개 → 공개메모)
  const handleAdd = async (data) => {
    if (data.isPublic && !(await ensureTerms())) return false
    const ok = await addMemo(data)
    if (ok && data.isPublic) setPubsToday((n) => n + 1)
    const target = data.isPublic ? '/public' : '/mine'
    if (ok && target !== `/${mode}`) navigate(target)
    return ok
  }

  return (
    <>
      {dialog}
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
            onUpdate={handleEdit}
            onDelete={removeMemo}
            // 로그인한 사람만 남의 공개 메모를 신고·차단할 수 있습니다
            onReport={user ? handleReport : undefined}
            onBlock={user ? handleBlock : undefined}
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
