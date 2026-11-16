import { useEffect, useState } from 'react'

// 메모 내용을 복사하는 버튼 (네모 두 개가 겹친 아이콘). 복사되면 잠깐 체크 표시로 바뀝니다.
export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 클립보드 권한이 없는 브라우저·웹뷰용 예전 방식
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      if (!ok) return alert('복사하지 못했습니다. 글자를 길게 눌러 직접 복사해 주세요.')
    }
    setCopied(true)
  }

  return (
    <button type="button" className={`icon-button${copied ? ' done' : ''}`} onClick={copy} aria-label={copied ? '복사됨' : '메모 복사'} title={copied ? '복사됨' : '복사'}>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {copied ? (
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
          </>
        )}
      </svg>
      <span className="sr-only" role="status">{copied ? '복사했어요' : ''}</span>
    </button>
  )
}
