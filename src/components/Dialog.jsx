import { useEffect, useRef, useState } from 'react'

// 화면 가운데 뜨는 확인 창 (여는 방법은 hooks/useDialog.jsx)
export default function Dialog({ title, body, choices, actions, onClose }) {
  const [choice, setChoice] = useState(null)
  const boxRef = useRef(null)

  useEffect(() => {
    boxRef.current?.querySelector('input, button.primary, button')?.focus()
    const onKeyDown = (e) => e.key === 'Escape' && onClose(null)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose(null)}>
      <div className="dialog-box" role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={boxRef}>
        <h3 id="dialog-title">{title}</h3>
        {body && <div className="dialog-body">{body}</div>}
        {choices && (
          <div className="dialog-choices" role="radiogroup" aria-label={title}>
            {choices.map((c) => (
              <label key={c.value} className={choice === c.value ? 'on' : ''}>
                <input type="radio" name="dialog-choice" value={c.value} checked={choice === c.value} onChange={() => setChoice(c.value)} />
                {c.label}
              </label>
            ))}
          </div>
        )}
        <div className="dialog-actions">
          {actions.map((a) => (
            <button
              key={a.value}
              type="button"
              className={a.primary ? 'primary' : ''}
              disabled={a.primary && choices && !choice}
              onClick={() => onClose(choices ? { action: a.value, choice } : a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
