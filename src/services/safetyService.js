// 신고·차단·커뮤니티 규칙 동의 (Firebase 모드에서만 동작, 로컬 모드에서는 아무것도 하지 않음)
// - prefs/{uid}   { blocked: [{ uid, name }], termsAt }  ← 내가 차단한 사용자, 규칙 동의 시각 (본인만)
// - reports/{메모ID}_{내 uid}  { memoId, memoUid, reporterUid, reason, createdAt }  ← 운영자가 콘솔에서 확인
// - banned/{uid}  ← 운영자가 콘솔에서 만들면 그 계정은 글쓰기가 막힘 (firestore.rules 의 isMember)
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore/lite'
import { db } from '../firebase/config'

export const REPORT_REASONS = [
  { value: 'spam', label: '스팸·광고' },
  { value: 'abuse', label: '욕설·혐오·괴롭힘' },
  { value: 'sexual', label: '성적인 내용' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'other', label: '기타' },
]

const isCloud = (user) => Boolean(db && user)
const prefsRef = (uid) => doc(db, 'prefs', uid)
const reportsCol = () => collection(db, 'reports')

// 지금 로그인한 사람의 설정을 기억해 둡니다
let cache = { uid: null, data: null }

async function loadPrefs(user) {
  if (cache.uid === user.uid && cache.data) return cache.data
  const snap = await getDoc(prefsRef(user.uid))
  cache = { uid: user.uid, data: snap.exists() ? snap.data() : {} }
  return cache.data
}

async function savePrefs(user, changes) {
  const next = { ...(await loadPrefs(user)), ...changes }
  await setDoc(prefsRef(user.uid), next)
  cache = { uid: user.uid, data: next }
  return next
}

// ---------- 차단 ----------
export async function getBlocked(user) {
  if (!isCloud(user)) return []
  return (await loadPrefs(user)).blocked ?? []
}

export async function blockUser(user, { uid, name }) {
  const blocked = await getBlocked(user)
  if (blocked.some((b) => b.uid === uid)) return blocked
  if (blocked.length >= 200) throw new Error('차단은 200명까지 할 수 있어요. 마이페이지에서 정리해 주세요.')
  return (await savePrefs(user, { blocked: [...blocked, { uid, name: name || '' }] })).blocked
}

export async function unblockUser(user, uid) {
  const blocked = await getBlocked(user)
  return (await savePrefs(user, { blocked: blocked.filter((b) => b.uid !== uid) })).blocked
}

// ---------- 커뮤니티 규칙 동의 ----------
export async function hasAgreedTerms(user) {
  if (!isCloud(user)) return true
  return typeof (await loadPrefs(user)).termsAt === 'number'
}

export async function agreeTerms(user) {
  await savePrefs(user, { termsAt: Date.now() })
}

// ---------- 신고 ----------
export async function reportMemo(user, memo, reason) {
  await setDoc(doc(reportsCol(), `${memo.id}_${user.uid}`), {
    memoId: memo.id,
    memoUid: memo.uid,
    reporterUid: user.uid,
    reason,
    createdAt: Date.now(),
  })
}

// 내가 신고한 메모 ID들 (내 화면에서는 바로 숨김)
export async function getMyReportedIds(user) {
  if (!isCloud(user)) return []
  const snap = await getDocs(query(reportsCol(), where('reporterUid', '==', user.uid)))
  return snap.docs.map((d) => d.data().memoId)
}

// 공개 목록에서 숨길 것: 내가 차단한 사용자의 메모, 내가 신고한 메모
export async function getFeedFilter(user) {
  if (!isCloud(user)) return { blockedUids: new Set(), reportedIds: new Set() }
  const [blocked, reported] = await Promise.all([getBlocked(user), getMyReportedIds(user)])
  return { blockedUids: new Set(blocked.map((b) => b.uid)), reportedIds: new Set(reported) }
}

// 회원 탈퇴용: 내 신고 기록과 설정을 지웁니다
export async function deleteMySafetyData(user) {
  if (!isCloud(user)) return
  const snap = await getDocs(query(reportsCol(), where('reporterUid', '==', user.uid)))
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(prefsRef(user.uid))
  clearSafetyCache()
}

export function clearSafetyCache() {
  cache = { uid: null, data: null }
}
