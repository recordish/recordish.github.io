import { useEffect, useRef, useState } from 'react'

// 메모 본문: 3줄이 넘으면 3줄까지만 보여주고, 3번째 줄 끝에 "… 더보기", 펼치면 마지막 줄 끝에 "접기"를 붙입니다.
// 화면 폭이 바뀌면 다시 계산합니다.
export default function MemoContent({ content }) {
  const ref = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    // 줄여서 보여줄 때 실제 내용이 더 길면 버튼을 보여줍니다 (처음 한 번 + 크기가 바뀔 때마다)
    const observer = new ResizeObserver(() => setOverflowing(el.scrollHeight > el.clientHeight + 1))
    observer.observe(el)
    return () => observer.disconnect()
  }, [content, expanded])

  const toggle = () => setExpanded((v) => !v)
  return (
    <div className="memo-body">
      <p ref={ref} className={`memo-content ${expanded ? '' : 'clamped'}`}>
        {content}
        {/* 펼쳤을 때: 마지막 줄 끝에 "접기" */}
        {overflowing && expanded && (
          <button type="button" className="inline-toggle" aria-expanded="true" onClick={toggle}>접기</button>
        )}
      </p>
      {/* 줄였을 때: 3번째 줄 맨 끝에 "… 더보기" (말줄임 위에 겹쳐 놓음) */}
      {overflowing && !expanded && (
        <button type="button" className="inline-toggle more-at-end" aria-expanded="false" onClick={toggle}>… 더보기</button>
      )}
    </div>
  )
}
