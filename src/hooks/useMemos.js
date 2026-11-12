import { useCallback, useEffect, useMemo, useState } from 'react'
import { friendlySaveError } from '../utils/updateCheck'
import { useAuth } from '../contexts/AuthContext'
import * as memoService from '../services/memoService'
import * as safety from '../services/safetyService'

// 화면별 메모 목록
// mode: 'all'    → 나와 다른 사람의 공개 메모 (공개메모 전체, /feed)    — 20개씩 "더 보기"
//       'mine'   → 내가 쓴 비공개 메모 (나만보기, /mine)  — 한 번에
//       'public' → 내가 쓴 공개 메모 (내가 쓴 공개메모, /public)  — 한 번에
export function useFeed(mode) {
  const { user } = useAuth()
  const isFeed = mode === 'all'

  const [publicMemos, setPublicMemos] = useState([])
  const [privateMemos, setPrivateMemos] = useState([])
  const [next, setNext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  // 전체 화면에서 숨길 것: 내가 차단한 사용자의 메모, 내가 신고한 메모
  const [filter, setFilter] = useState({ blockedUids: new Set(), reportedIds: new Set() })

  // 첫 페이지 불러오기 (화면 진입, 로그인/로그아웃, 작성·수정·삭제 후)
  const fetchFirst = useCallback(
    () =>
      Promise.all([
        isFeed ? memoService.getPublicMemos() : { memos: [], next: null },
        isFeed ? [] : memoService.getMyMemos(user, mode === 'public'),
        // 차단·신고 목록을 못 불러와도 목록은 보여줍니다
        isFeed ? safety.getFeedFilter(user).catch(() => null) : null,
      ]),
    [user, isFeed, mode],
  )
  const apply = ([page, mine, nextFilter]) => {
    if (nextFilter) setFilter(nextFilter)
    setPublicMemos(page.memos)
    setNext(page.next)
    setPrivateMemos(mine)
    setError('')
  }
  const reload = async () => apply(await fetchFirst())

  useEffect(() => {
    let active = true
    fetchFirst()
      .then((data) => active && apply(data))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [fetchFirst])

  const loadMore = useCallback(async () => {
    if (!next || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await memoService.getPublicMemos(next)
      // 그사이 수정되어 순서가 바뀐 메모가 두 번 나오지 않도록 걸러냅니다.
      setPublicMemos((prev) => {
        const seen = new Set(prev.map((m) => m.id))
        return [...prev, ...page.memos.filter((m) => !seen.has(m.id))]
      })
      setNext(page.next)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingMore(false)
    }
  }, [next, loadingMore])

  const memos = useMemo(() => {
    // 전체 화면은 공개 메모 목록, 나머지는 내 메모 목록 (둘 중 하나만 채워집니다)
    // 작성 시각 기준 최신순 (수정해도 순서가 바뀌지 않음)
    const created = (m) => m.createdAt ?? m.updatedAt ?? 0
    const shown = publicMemos.filter((m) => !filter.blockedUids.has(m.uid) && !filter.reportedIds.has(m.id))
    return [...shown, ...privateMemos].sort((a, b) => created(b) - created(a))
  }, [publicMemos, privateMemos, filter])

  // 저장 공간 초과, 내부 제한, 네트워크 오류 등으로 실패하면 알리고 false 를 돌려줍니다.
  const run = async (action) => {
    try {
      await action()
      await reload()
      return true
    } catch (e) {
      alert(`저장하지 못했습니다.\n${friendlySaveError(e)}`)
      return false
    }
  }

  return {
    memos,
    loading,
    loadingMore,
    error,
    hasMore: Boolean(next),
    loadMore,
    addMemo: (data) => run(() => memoService.createMemo(user, data)),
    editMemo: (id, data) => run(() => memoService.updateMemo(user, id, data)),
    removeMemo: (id) => run(() => memoService.deleteMemo(user, id)),
    // 신고하면 내 화면에서 그 메모를 바로 숨깁니다
    reportMemo: async (memo, reason) => {
      await safety.reportMemo(user, memo, reason)
      setFilter((f) => ({ ...f, reportedIds: new Set([...f.reportedIds, memo.id]) }))
    },
    // 차단하면 그 사람의 공개 메모를 모두 숨깁니다
    blockUser: async (memo) => {
      await safety.blockUser(user, { uid: memo.uid, name: memo.authorName })
      setFilter((f) => ({ ...f, blockedUids: new Set([...f.blockedUids, memo.uid]) }))
    },
  }
}
