// 인증 계층
// - 일반 사용자: Google 로그인
// - 테스터: 초대 코드로 가입한 이메일·비밀번호 계정 (#/invite)
//   초대 코드: invites/{코드} = { maxUses, uses }  ← 운영자가 Firebase 콘솔에서 만듭니다
//   가입 증명: members/{uid} = { code, joinedAt }   ← 가입할 때 코드 사용 횟수와 함께 기록
//   보안 규칙이 "Google 로그인 또는 members 문서가 있는 계정"만 쓰기를 허용합니다.
// Firebase가 설정되지 않았으면 로그인 없이 쓸 수 있도록 null 사용자를 돌려줍니다.
import { Capacitor } from '@capacitor/core'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, increment, writeBatch } from 'firebase/firestore/lite'
import { auth, db } from '../firebase/config'
import { deleteAllMyData } from './memoService'
import { clearProfileCache } from './profileService'
import { clearSafetyCache } from './safetyService'

const memberRef = (uid) => doc(db, 'members', uid)
const inviteRef = (code) => doc(db, 'invites', code)
export const isEmailUser = (user) => user?.providerData?.some((p) => p.providerId === 'password') ?? false

// 가입 중에는 아직 members 문서가 없으므로, 가입이 끝날 때까지 로그인 상태 변화를 화면에 알리지 않습니다
let signingUp = false
const listeners = new Set()

export function subscribeAuth(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  listeners.add(callback)
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (signingUp) return
    // 초대 코드 없이 만든 이메일 계정은 로그인시키지 않습니다 (데이터는 규칙이 따로 막음)
    if (user && isEmailUser(user)) {
      const member = await getDoc(memberRef(user.uid)).catch(() => null)
      if (!member?.exists()) {
        await signOut(auth)
        return
      }
    }
    callback(user)
  })
  return () => {
    listeners.delete(callback)
    unsubscribe()
  }
}

// 안드로이드 앱(Capacitor) 안에서는 웹 팝업 대신 폰의 Google 계정 선택 창으로 로그인합니다.
// 웹 클라이언트 ID: Firebase 콘솔 → Authentication → 로그인 방법 → Google → 웹 SDK 구성
const isApp = Capacitor.isNativePlatform()
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID
let socialLoginReady = null

async function nativeGoogleIdToken() {
  if (!GOOGLE_WEB_CLIENT_ID) throw new Error('앱 로그인 설정(웹 클라이언트 ID)이 아직 없어요. 운영자에게 알려 주세요.')
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  socialLoginReady ??= SocialLogin.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID } })
  await socialLoginReady
  // scopes 는 넘기지 않습니다: 기본값이 이미 email·profile·openid 이고, 넘기면 MainActivity 를 바꿔야 한다는 오류가 납니다
  const res = await SocialLogin.login({ provider: 'google', options: {} })
  const idToken = res?.result?.idToken
  if (!idToken) throw new Error('Google 로그인을 마치지 못했어요. 다시 시도해 주세요.')
  return idToken
}

function nativeGoogleLogout() {
  if (!isApp) return
  import('@capgo/capacitor-social-login')
    .then(({ SocialLogin }) => SocialLogin.logout({ provider: 'google' }))
    .catch(() => {})
}

export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase가 아직 설정되지 않았습니다. .env.local을 확인하세요.')
  if (isApp) return signInWithCredential(auth, GoogleAuthProvider.credential(await nativeGoogleIdToken()))
  return signInWithPopup(auth, new GoogleAuthProvider())
}

// Firebase 오류를 알기 쉬운 문장으로
function friendly(e) {
  const messages = {
    'auth/email-already-in-use': '이미 가입된 이메일이에요. "이메일 로그인"으로 들어가 주세요.',
    'auth/invalid-email': '이메일 주소 형식이 올바르지 않아요.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/wrong-password': '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/user-not-found': '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 해 주세요.',
    'auth/operation-not-allowed': '이메일 로그인이 아직 켜져 있지 않아요. 운영자에게 알려 주세요.',
  }
  return new Error(messages[e.code] ?? e.message)
}

export const normalizeCode = (code) => code.trim().toUpperCase()

// 초대 코드로 가입: 코드 확인 → 계정 만들기 → (members 기록 + 코드 사용 횟수 +1)을 한 번에 저장
// 저장이 실패하면 방금 만든 계정을 지워서, 코드 없는 계정이 남지 않게 합니다.
export async function signUpWithInvite(rawCode, email, password) {
  const code = normalizeCode(rawCode)
  if (!code) throw new Error('초대 코드를 입력해 주세요.')
  signingUp = true
  let user = null
  try {
    try {
      user = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user
    } catch (e) {
      throw friendly(e)
    }
    const invite = await getDoc(inviteRef(code)).catch(() => null)
    if (!invite?.exists()) throw new Error('초대 코드가 올바르지 않아요.')
    const { uses = 0, maxUses = 0 } = invite.data()
    if (uses >= maxUses) throw new Error('이미 모두 사용된 초대 코드예요.')
    const batch = writeBatch(db)
    batch.set(memberRef(user.uid), { code, joinedAt: Date.now() })
    batch.update(inviteRef(code), { uses: increment(1) })
    await batch.commit()
    // 가입이 끝났으니 이제 화면에 로그인 상태를 알립니다
    signingUp = false
    listeners.forEach((cb) => cb(auth.currentUser))
  } catch (e) {
    if (user) await deleteUser(user).catch(() => {})
    throw e.code?.startsWith?.('permission') ? new Error('초대 코드를 사용할 수 없어요.') : e
  } finally {
    signingUp = false
  }
}

export async function loginWithEmail(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
    const member = await getDoc(memberRef(user.uid)).catch(() => null)
    if (!member?.exists()) throw new Error('초대 코드로 가입한 계정이 아니에요.')
    return user
  } catch (e) {
    throw e.code ? friendly(e) : e
  }
}

export async function logout() {
  clearProfileCache()
  clearSafetyCache()
  nativeGoogleLogout()
  if (auth) await signOut(auth)
}

// 회원 탈퇴: 내 데이터를 모두 지운 뒤 로그인 계정을 삭제합니다.
// 로그인한 지 오래되어 Firebase가 다시 로그인을 요구하면 한 번 더 확인합니다
// (Google 계정은 Google 로그인 창, 이메일 계정은 비밀번호 입력).
export async function deleteAccount() {
  const user = auth?.currentUser
  if (!user) throw new Error('로그인한 상태에서만 탈퇴할 수 있습니다.')
  await deleteAllMyData(user)
  try {
    await deleteUser(user)
  } catch (e) {
    if (e.code !== 'auth/requires-recent-login') throw e
    if (isEmailUser(user)) {
      const password = prompt('보안을 위해 비밀번호를 한 번 더 입력해 주세요.')
      if (!password) throw new Error('비밀번호를 입력하지 않아 계정을 삭제하지 못했어요.')
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
    } else if (isApp) {
      await reauthenticateWithCredential(user, GoogleAuthProvider.credential(await nativeGoogleIdToken()))
    } else {
      await reauthenticateWithPopup(user, new GoogleAuthProvider())
    }
    await deleteUser(user)
  }
  clearProfileCache()
  clearSafetyCache()
  nativeGoogleLogout()
}
