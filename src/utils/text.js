// 글자 수 세기. Firestore 보안 규칙의 string.size() 와 같은 기준(UTF-16)입니다.
// 한글·영어·숫자는 1자, 대부분의 이모지(😀 등)는 2자로 셉니다.
export const charCount = (s) => (s ?? '').length

export const DAILY_CHAR_LIMIT = 10000

// 하루에 공개할 수 있는 메모 수 (공개로 새로 쓰기 + 비공개→공개 바꾸기)
export const DAILY_PUBLIC_LIMIT = 2
