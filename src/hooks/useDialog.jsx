import { useCallback, useRef, useState } from 'react'
import Dialog from '../components/Dialog'

// 화면 가운데 뜨는 확인 창. useDialog() 로 열고, 누른 버튼의 값을 Promise 로 돌려받습니다.
//   const [dialog, ask] = useDialog()
//   const answer = await ask({ title, body, choices: [{ value, label }], actions: [{ value, label, primary }] })
// - choices 가 있으면 하나를 고르는 목록을 보여주고, 고른 값을 { action, choice } 로 돌려줍니다
// - 바깥(어두운 곳)을 누르거나 Esc 를 누르면 null
export function useDialog() {
  const [config, setConfig] = useState(null)
  const resolver = useRef(null)

  const ask = useCallback(
    (next) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setConfig(next)
      }),
    [],
  )
  const close = useCallback((value) => {
    resolver.current?.(value)
    resolver.current = null
    setConfig(null)
  }, [])

  return [config ? <Dialog key={config.title} {...config} onClose={close} /> : null, ask]
}
