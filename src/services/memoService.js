// 메모 데이터 접근 계층
// - Firebase가 설정된 경우: Firestore
//     memos/{memoId}  { uid, authorName, content, isPublic, createdAt, updatedAt }
//     usage/{uid}     { day: 20261102, chars: 1234, pubs: 1 }  ← 오늘(한국 시간) 쓴 글자 수, 공개한 메모 수
//   · 모두의 공개 메모(공개메모 전체, /feed): isPublic == true, 작성 시각 최신순 20개씩 (복합 색인 필요: isPublic + createdAt desc)
//   · 내 비공개 메모(나만보기, /mine), 내 공개 메모(공개메모, /public):
//     uid == 내 uid && isPublic == false/true (전부 불러와 브라우저에서 정렬)
//   · 하루 글자 제한: 새 메모는 글자 수 전체, 수정은 늘어난 글자 수만큼 오늘 사용량에 더합니다.
//   · 하루 공개 제한: 공개로 새로 쓰거나, 비공개를 공개로 바꿀 때마다 1씩 더합니다 (하루 2개까지, 지워도 줄지 않음)
//     보안 규칙(firestore.rules)이 서버에서도 같은 계산을 검사합니다.
// - 그 외(로컬 모드): 브라우저 localStorage (글자 제한 없음)
//
// 첫 화면을 빠르게 띄우려고 가벼운 Firestore Lite 를 씁니다 (오프라인 저장·실시간 갱신 없음).
// 실시간 갱신(onSnapshot)이 필요해지면 'firebase/firestore' 로 되돌리면 됩니다.
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore/lite'
import { db } from '../firebase/config'
import { getAuthorName, profileRef } from './profileService'
import { deleteMySafetyData } from './safetyService'
import { charCount, DAILY_CHAR_LIMIT, DAILY_PUBLIC_LIMIT } from '../utils/text'

export const PAGE_SIZE = 20

const isCloud = (user) => Boolean(db && user)
const memosCol = () => collection(db, 'memos')
const usageRef = (uid) => doc(db, 'usage', uid)
// 정렬은 작성 시각 기준 (수정해도 순서가 바뀌지 않음)
const createdOf = (m) => m.createdAt ?? m.updatedAt ?? 0
const byNewest = (a, b) => createdOf(b) - createdOf(a)
// 공개 메모의 작성자 이름: 마이페이지에서 정한 이름, 없으면 "Running Wolf" 같은 기본 영어 이름
const authorNameOf = (user) => getAuthorName(user)

// 오늘 날짜(한국 시간)를 20261102 같은 숫자로. 보안 규칙의 today() 와 같은 계산입니다.
export function todayKey(now = Date.now()) {
  const kst = new Date(now + 9 * 60 * 60 * 1000)
  return kst.getUTCFullYear() * 10000 + (kst.getUTCMonth() + 1) * 100 + kst.getUTCDate()
}

// ---------- localStorage ----------
const STORAGE_KEY = 'memo-app:memos'

function readAll() {
  try {
    const memos = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
    return memos.map(fromLegacy)
  } catch {
    return []
  }
}

// 예전 형식의 메모를 현재 형식으로 맞춥니다.
// (제목이 있으면 내용 첫 줄로 합치고, 공개 여부가 없으면 비공개)
function fromLegacy({ title, ...memo }) {
  const content = title ? (memo.content ? `${title}\n${memo.content}` : title) : memo.content
  return { ...memo, content, isPublic: memo.isPublic === true }
}

function writeAll(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos))
}

// ---------- 하루 사용량 (글자 수, 공개 메모 수) ----------
// 오늘 이미 쓴 글자 수와 공개한 메모 수 (날짜가 바뀌면 0)
async function getUsedToday(user) {
  const snap = await getDoc(usageRef(user.uid))
  const data = snap.exists() ? snap.data() : null
  if (!data || data.day !== todayKey()) return { chars: 0, pubs: 0 }
  return { chars: data.chars ?? 0, pubs: data.pubs ?? 0 }
}

// 오늘 공개한 메모 수 (로그인 전·로컬 모드는 0)
export async function getPublicCountToday(user) {
  if (!isCloud(user)) return 0
  return (await getUsedToday(user)).pubs
}

// 다음 날 0시(한국 시간)까지 남은 시간(ms). 공개 수는 그때 0으로 돌아갑니다.
export function msUntilReset(now = Date.now()) {
  const kst = new Date(now + 9 * 60 * 60 * 1000)
  const nextMidnightKst = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + 1) - 9 * 60 * 60 * 1000
  return nextMidnightKst - now
}

class DailyLimitError extends Error {}

// 오늘 사용량에 더한 새 값을 계산합니다. 바뀔 게 없으면 null, 한도를 넘으면 오류를 냅니다.
// addedChars: 늘어난 글자 수 (줄어든 건 0으로 침) / addedPubs: 새로 공개되는 메모 수 (0 또는 1)
async function chargeUsage(user, addedChars, addedPubs) {
  const chars = Math.max(addedChars, 0)
  if (chars === 0 && addedPubs === 0) return null
  const used = await getUsedToday(user)
  if (used.pubs + addedPubs > DAILY_PUBLIC_LIMIT) {
    throw new DailyLimitError(`공개 메모는 하루 ${DAILY_PUBLIC_LIMIT}개까지 쓸 수 있어요. 비공개로 저장하거나 내일 공개해 주세요.`)
  }
  if (used.chars + chars > DAILY_CHAR_LIMIT) {
    // 하루 글자 한도는 사용자에게 숫자나 존재를 밝히지 않습니다 (남용 방지용 내부 제한)
    throw new DailyLimitError('지금은 이 메모를 저장할 수 없어요. 나중에 다시 시도해 주세요.')
  }
  return { day: todayKey(), chars: used.chars + chars, pubs: used.pubs + addedPubs }
}

// 작성자 이름이 지금 내 이름(마이페이지 이름 또는 기본 영어 이름)과 다른 메모를 맞춥니다.
// 수정 시각(updatedAt)은 그대로 둡니다. 실패해도 목록은 계속 보여줍니다.
async function syncAuthorName(user, memos) {
  const name = await authorNameOf(user)
  const stale = memos.filter((m) => m.authorName !== name)
  await Promise.all(
    stale.map((m) =>
      updateDoc(doc(memosCol(), m.id), { authorName: name })
        .then(() => (m.authorName = name))
        .catch((e) => console.warn('작성자 이름 갱신 실패:', e)),
    ),
  )
}

// ---------- 공개 함수 ----------
// 내 메모 중 공개(isPublic=true) 또는 비공개(false) 전부 (최신순)
// uid·isPublic 같음 조건 두 개라 따로 색인이 필요 없습니다.
export async function getMyMemos(user, isPublic) {
  if (isCloud(user)) {
    const snap = await getDocs(query(memosCol(), where('uid', '==', user.uid), where('isPublic', '==', isPublic)))
    const memos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    await syncAuthorName(user, memos)
    return memos.sort(byNewest)
  }
  if (db) return [] // Firebase 모드인데 로그인 전
  return readAll().filter((m) => m.isPublic === isPublic).sort(byNewest)
}

// 공개 메모를 작성 시각 최신순으로 PAGE_SIZE 개씩 가져옵니다.
// cursor: 이전 페이지가 돌려준 next 값 (첫 페이지는 생략)
// 반환: { memos, next }  next 가 null 이면 더 없음
export async function getPublicMemos(cursor = null) {
  if (db) {
    const parts = [where('isPublic', '==', true), orderBy('createdAt', 'desc')]
    if (cursor) parts.push(startAfter(cursor))
    parts.push(limit(PAGE_SIZE + 1)) // 하나 더 읽어서 다음 페이지가 있는지 확인
    const snap = await getDocs(query(memosCol(), ...parts))
    const docs = snap.docs.slice(0, PAGE_SIZE)
    return {
      memos: docs.map((d) => ({ id: d.id, ...d.data() })),
      next: snap.docs.length > PAGE_SIZE ? docs[docs.length - 1] : null,
    }
  }
  const all = readAll().filter((m) => m.isPublic).sort(byNewest)
  const start = cursor ?? 0
  return {
    memos: all.slice(start, start + PAGE_SIZE),
    next: all.length > start + PAGE_SIZE ? start + PAGE_SIZE : null,
  }
}

export async function createMemo(user, { content, isPublic = false }) {
  const now = Date.now()
  const id = crypto.randomUUID()
  if (isCloud(user)) {
    const usage = await chargeUsage(user, charCount(content), isPublic ? 1 : 0)
    const batch = writeBatch(db)
    batch.set(doc(memosCol(), id), {
      uid: user.uid,
      authorName: await authorNameOf(user),
      content,
      isPublic,
      createdAt: now,
      updatedAt: now,
    })
    if (usage) batch.set(usageRef(user.uid), usage)
    await batch.commit()
    return
  }
  writeAll([{ id, content, isPublic, createdAt: now, updatedAt: now }, ...readAll()])
}

export async function updateMemo(user, id, { content, isPublic }) {
  const updatedAt = Date.now()
  if (isCloud(user)) {
    const ref = doc(memosCol(), id)
    const before = await getDoc(ref)
    const added = charCount(content) - charCount(before.data()?.content)
    // 비공개였던 메모를 공개로 바꿀 때만 공개 수에 1을 더합니다
    const nowPublic = isPublic && before.data()?.isPublic !== true ? 1 : 0
    const usage = await chargeUsage(user, added, nowPublic)
    const batch = writeBatch(db)
    batch.update(ref, { content, isPublic, authorName: await authorNameOf(user), updatedAt })
    if (usage) batch.set(usageRef(user.uid), usage)
    await batch.commit()
    return
  }
  writeAll(readAll().map((m) => (m.id === id ? { ...m, content, isPublic, updatedAt } : m)))
}

export async function deleteMemo(user, id) {
  if (isCloud(user)) {
    await deleteDoc(doc(memosCol(), id))
    return
  }
  writeAll(readAll().filter((m) => m.id !== id))
}

// 회원 탈퇴용: 내 메모(공개·비공개 전부), 하루 사용량, 프로필, 신고 기록, 차단 목록, 예전 위치의 메모를 모두 지웁니다.
// 한 번에 지울 수 있는 개수(500)를 넘지 않도록 나눠서 지웁니다.
export async function deleteAllMyData(user) {
  if (!isCloud(user)) return
  await deleteMySafetyData(user) // 내 신고 기록, 차단 목록·규칙 동의
  const refs = [
    ...(await getDocs(query(memosCol(), where('uid', '==', user.uid)))).docs.map((d) => d.ref),
    ...(await getDocs(collection(db, 'users', user.uid, 'memos'))).docs.map((d) => d.ref),
    usageRef(user.uid),
    profileRef(user.uid),
    doc(db, 'members', user.uid),
  ]
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db)
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}
