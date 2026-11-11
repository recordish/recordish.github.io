// 비공개(기본) / 공개 선택 버튼 (아이콘은 글자색을 따라감: 고르면 흰색, 아니면 포인트 색)
const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
  </svg>
)

export default function VisibilityToggle({ isPublic, onChange }) {
  return (
    <div className="visibility" role="radiogroup" aria-label="공개 범위">
      <button type="button" role="radio" aria-checked={!isPublic} className={!isPublic ? 'on' : ''} onClick={() => onChange(false)}>
        <LockIcon /> 비공개
      </button>
      <button type="button" role="radio" aria-checked={isPublic} className={isPublic ? 'on' : ''} onClick={() => onChange(true)}>
        <GlobeIcon /> 공개
      </button>
    </div>
  )
}
