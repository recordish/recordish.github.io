import { useLayoutEffect, useRef, useState } from 'react'

const LINES = 3
const MORE = '더보기'

// 메모 본문: 3줄이 넘으면 3번째 줄이 "…글자 … 더보기"로 자연스럽게 끝나도록 글자 단위로 잘라 보여주고,
// 펼치면 마지막 줄 끝에 "접기"를 붙입니다. 화면 폭이 바뀌면 다시 계산합니다.
export default function MemoContent({ content }) {
  const ref = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [cut, setCut] = useState(null) // null: 3줄 안에 다 들어감 / 숫자: 앞에서부터 보여줄 글자 수

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const chars = Array.from(content) // 이모지가 반으로 잘리지 않게 글자 단위로
    let lastWidth = -1
    const measure = () => {
      const width = el.clientWidth
      if (width === lastWidth || width === 0) return
      lastWidth = width
      // 화면에 안 보이는 같은 모양의 문단에 넣어 보며 3줄에 들어가는 가장 긴 길이를 찾습니다
      const probe = document.createElement('p')
      probe.className = 'memo-content'
      Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', left: '0', top: '0', width: `${width}px` })
      el.parentNode.appendChild(probe)
      const max = parseFloat(getComputedStyle(probe).lineHeight) * LINES + 1
      const fits = (text) => {
        probe.textContent = text
        return probe.scrollHeight <= max
      }
      let result = null
      if (!fits(content)) {
        let lo = 0
        let hi = chars.length
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1
          if (fits(`${chars.slice(0, mid).join('').trimEnd()}… ${MORE}`)) lo = mid
          else hi = mid - 1
        }
        result = lo
      }
      probe.remove()
      setCut(result)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el.parentNode)
    return () => observer.disconnect()
  }, [content])

  const toggle = () => setExpanded((v) => !v)
  const short = cut !== null && !expanded

  return (
    <div className="memo-body">
      <p ref={ref} className="memo-content">
        {short ? `${Array.from(content).slice(0, cut).join('').trimEnd()}… ` : content}
        {short && (
          <button type="button" className="inline-toggle" aria-expanded="false" onClick={toggle}>{MORE}</button>
        )}
        {cut !== null && expanded && (
          <>
            {' '}
            <button type="button" className="inline-toggle" aria-expanded="true" onClick={toggle}>접기</button>
          </>
        )}
      </p>
    </div>
  )
}
