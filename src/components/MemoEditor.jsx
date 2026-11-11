import { useState } from 'react'
import VisibilityToggle from './VisibilityToggle'

export default function MemoEditor({ initial = { content: '', isPublic: false }, onSubmit, onCancel, submitLabel = '저장' }) {
  const [content, setContent] = useState(initial.content)
  const [isPublic, setIsPublic] = useState(initial.isPublic === true)
  const [saving, setSaving] = useState(false)
  const isNew = !onCancel

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || saving) return
    const draft = { content, isPublic }
    // 새 메모는 바로 입력창을 비워서 다음 메모를 쓸 수 있게 하고(공개 여부는 그 화면의 기본값으로 되돌림),
    // 저장에 실패하면 입력했던 내용을 되돌려 놓습니다.
    if (isNew) {
      setContent('')
      setIsPublic(initial.isPublic === true)
    }
    setSaving(true)
    const ok = await onSubmit(draft)
    setSaving(false)
    if (ok === false && isNew) {
      setContent(draft.content)
      setIsPublic(draft.isPublic)
    }
  }

  return (
    <form className="editor" onSubmit={handleSubmit}>
      <textarea placeholder="메모를 입력하세요" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
      <div className="editor-footer">
        <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />
        <div className="actions">
          {onCancel && <button type="button" onClick={onCancel}>취소</button>}
          <button type="submit" className="primary" disabled={saving}>{saving ? '저장 중…' : submitLabel}</button>
        </div>
      </div>
    </form>
  )
}
