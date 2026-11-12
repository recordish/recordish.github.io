import { useNow } from '../hooks/useNow'
import MemoItem from './MemoItem'

// isOwn(memo): 내 메모면 ⋮(수정/삭제) 메뉴를 보여줍니다
// showAuthor: 공개 메모에 작성자 이름을 보여줄지
// onReport / onBlock: 남의 공개 메모의 ⋮(신고 / 차단) 메뉴
export default function MemoList({ memos, emptyText = '아직 메모가 없습니다.', isOwn = () => true, showAuthor = false, onUpdate, onDelete, onReport, onBlock }) {
  const now = useNow()
  if (memos.length === 0) return <p className="empty">{emptyText}</p>

  return (
    <ul className="memo-list">
      {memos.map((memo) => (
        <MemoItem
          key={memo.id}
          memo={memo}
          now={now}
          readOnly={!isOwn(memo)}
          showAuthor={showAuthor && memo.isPublic}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onReport={onReport}
          onBlock={onBlock}
        />
      ))}
    </ul>
  )
}
