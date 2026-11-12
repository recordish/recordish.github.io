import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { deleteAccount, isEmailUser, logout } from '../services/authService'
import { defaultName, NAME_MAX, updateName, validateName } from '../services/profileService'
import { getBlocked, unblockUser } from '../services/safetyService'
import { fullDateTime } from '../utils/relativeTime'

const formatDate = (value) => (value ? fullDateTime(new Date(value).getTime()) : '-')

// 마이페이지: 내 정보, 이름(공개 메모 작성자) 확인·수정, 가입일·마지막 접속·접속 횟수, 차단한 사용자, 로그아웃, 계정 삭제
export default function AccountPage() {
  const { user, profile, setProfile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // 차단한 사용자 (null = 불러오는 중)
  const [blocked, setBlocked] = useState(null)
  useEffect(() => {
    if (!user) return
    getBlocked(user)
      .then(setBlocked)
      .catch(() => setBlocked([]))
  }, [user])

  const handleUnblock = async (b) => {
    if (!confirm(`${b.name || '이 사용자'} 님의 차단을 해제할까요?`)) return
    try {
      setBlocked(await unblockUser(user, b.uid))
    } catch (e) {
      alert(`해제하지 못했습니다.\n${e.message}`)
    }
  }

  if (!user) return <p className="empty">로컬 모드에서는 마이페이지가 없습니다.</p>

  const fallback = defaultName(user)
  const currentName = profile?.name || fallback

  const startEdit = () => {
    setDraft(currentName)
    setNameError('')
    setEditing(true)
  }

  const saveName = async (name) => {
    setSaving(true)
    try {
      setProfile(await updateName(user, name))
      setEditing(false)
    } catch (e) {
      setNameError(`저장하지 못했습니다: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    const { name, error } = validateName(draft)
    if (error) return setNameError(error)
    // 기본값(가입 일시 숫자)과 같으면 따로 저장하지 않고 기본값으로 둡니다
    saveName(name === fallback ? null : name)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const handleDelete = async () => {
    const ok = confirm('정말 계정을 삭제할까요?\n\n공개·비공개 메모를 포함한 모든 데이터가 바로 삭제되며 되돌릴 수 없습니다.')
    if (!ok) return
    setDeleting(true)
    try {
      await deleteAccount()
      alert('계정이 삭제되었습니다. 그동안 이용해 주셔서 감사합니다.')
      navigate('/', { replace: true })
    } catch (e) {
      alert(`계정을 삭제하지 못했습니다.\n${e.message}`)
      setDeleting(false)
    }
  }

  return (
    <div className="mypage">
      <h2 className="page-title">마이페이지</h2>

      <section className="card">
        <h3>내 정보</h3>
        <dl className="info-list">
          <dt>로그인 계정</dt>
          <dd>{user.email}</dd>
          <dt>로그인 방법</dt>
          <dd>{isEmailUser(user) ? '이메일 (초대 코드 가입)' : 'Google'}</dd>
        </dl>
      </section>

      <section className="card">
        <h3>이름</h3>
        <p className="hint">공개 메모에 작성자로 표시됩니다. 기본값은 자동으로 정해진 영어 이름이에요 (예: Running Wolf).</p>
        {editing ? (
          <form className="name-form" onSubmit={handleSave}>
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setNameError('')
              }}
              maxLength={NAME_MAX + 10}
              aria-label="새 이름"
              aria-invalid={Boolean(nameError)}
              aria-describedby="name-help"
              autoFocus
            />
            <div className="actions">
              <button type="button" onClick={() => setEditing(false)} disabled={saving}>취소</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
            </div>
            <p id="name-help" className={nameError ? 'error' : 'hint'}>
              {nameError || `${draft.trim().length} / ${NAME_MAX}자`}
            </p>
          </form>
        ) : (
          <div className="name-row">
            <strong className="name-value">{currentName}</strong>
            {!profile?.name && <span className="hint">(기본값)</span>}
            <span className="name-actions">
              <button type="button" onClick={startEdit} disabled={!profile}>수정</button>
              {profile?.name && (
                <button type="button" onClick={() => saveName(null)} disabled={saving}>기본값으로</button>
              )}
            </span>
          </div>
        )}
        {!profile && <p className="hint">프로필을 불러오는 중이에요…</p>}
      </section>

      <section className="card">
        <h3>이용 기록</h3>
        <dl className="info-list">
          <dt>가입일</dt>
          <dd>{formatDate(user.metadata.creationTime)}</dd>
          <dt>마지막 접속</dt>
          <dd>{profile ? (profile.prevVisitAt ? formatDate(profile.prevVisitAt) : '이번이 첫 접속이에요') : '-'}</dd>
          <dt>접속 횟수</dt>
          <dd>{profile ? `${(profile.visitCount ?? 0).toLocaleString()}회` : '-'}</dd>
        </dl>
      </section>

      <section className="card">
        <h3>차단한 사용자</h3>
        {blocked === null ? (
          <p className="hint">불러오는 중…</p>
        ) : blocked.length === 0 ? (
          <p className="hint">차단한 사용자가 없어요. 공개 메모의 ⋮ 메뉴에서 차단할 수 있어요.</p>
        ) : (
          <ul className="blocked-list">
            {blocked.map((b) => (
              <li key={b.uid}>
                <span>{b.name || '이름 없음'}</span>
                <button type="button" onClick={() => handleUnblock(b)}>해제</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" onClick={handleLogout}>로그아웃</button>

      {/* 계정 삭제는 눈에 띄지 않게 하단 링크 옆에 둡니다 (누르면 확인창이 한 번 더 뜸) */}
      <p className="links footer-links">
        <a href="/terms.html">이용약관</a>
        <span aria-hidden="true">·</span>
        <a href="/privacy.html">개인정보처리방침</a>
        <span aria-hidden="true">·</span>
        <button type="button" className="link-button" onClick={handleDelete} disabled={deleting}>
          {deleting ? '계정 삭제 중…' : '계정 삭제'}
        </button>
      </p>
    </div>
  )
}
