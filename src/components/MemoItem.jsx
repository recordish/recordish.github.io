import { useState } from 'react'
import { fullDateTime, relativeTime } from '../utils/relativeTime'
import MemoContent from './MemoContent'
import MemoEditor from './MemoEditor'
import MoreMenu from './MoreMenu'

// readOnly: 남의 메모처럼 수정/삭제 메뉴 없이 보여줄 때
// showAuthor: 작성자 번호 표시 (공개 메모)
// onReport / onBlock: 남의 공개 메모에 ⋮(신고 / 이 사용자 차단) 메뉴를 붙일 때 (로그인했을 때만 넘겨줌)
export default function MemoItem({ memo, now, onUpdate, onDelete, onReport, onBlock, readOnly = false, showAuthor = false }) {
  const [editing, setEditing] = useState(false)
  // 시간은 작성 시각으로 보여주고, 작성 뒤 1분 넘게 지나 고친 메모에는 "수정됨"을 붙입니다
  const createdAt = memo.createdAt ?? memo.updatedAt
  const edited = memo.updatedAt - createdAt > 60 * 1000

  if (editing) {
    return (
      <li className="memo">
        <MemoEditor
          initial={memo}
          submitLabel="수정"
          onCancel={() => setEditing(false)}
          onSubmit={async (data) => {
            const ok = await onUpdate(memo.id, data)
            if (ok) setEditing(false)
            return ok
          }}
        />
      </li>
    )
  }

  return (
    <li className="memo">
      <MemoContent content={memo.content} />
      <div className="meta">
        <span className="info">
          {showAuthor && <span className="author">{memo.authorName || '익명'}</span>}
          {!memo.isPublic && (
            <span className="lock" role="img" aria-label="비공개" title="비공개">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <time dateTime={new Date(createdAt).toISOString()} title={`작성 ${fullDateTime(createdAt)}${edited ? `\n수정 ${fullDateTime(memo.updatedAt)}` : ''}`}>
            {relativeTime(createdAt, now)}
          </time>
          {edited && <span className="edited">· 수정됨</span>}
        </span>
        {!readOnly && (
          <MoreMenu
            label="메모 메뉴"
            items={[
              { label: '수정', onSelect: () => setEditing(true) },
              { label: '삭제', danger: true, onSelect: () => confirm('삭제할까요?') && onDelete(memo.id) },
            ]}
          />
        )}
        {readOnly && memo.isPublic && onReport && (
          <MoreMenu
            label="메모 메뉴"
            items={[
              { label: '신고', danger: true, onSelect: () => onReport(memo) },
              { label: '이 사용자 차단', onSelect: () => onBlock(memo) },
            ]}
          />
        )}
      </div>
    </li>
  )
}
