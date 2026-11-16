import api from './client'

export const SUBTESTS = {
  PU: 'Penalaran Umum',
  PM: 'Penalaran Matematika',
  BIND: 'Bahasa Indonesia',
  BING: 'Bahasa Inggris',
}

export async function listTryouts() {
  const res = await api.get('/tryouts')
  return res.data.tryouts
}

export async function getTryoutQuestions(tryoutId) {
  const res = await api.get(`/tryouts/${tryoutId}/questions`)
  return res.data // { tryout, questions }
}

export async function reportQuestion(tryoutId, questionId, reason) {
  const res = await api.post(`/tryouts/${tryoutId}/report`, { questionId, reason })
  return res.data
}

export async function submitAttempt(tryoutId, answers, timeUsed) {
  const res = await api.post('/attempts', { tryoutId, answers, timeUsed })
  return res.data // { attemptId, score, correct, total }
}

export async function getAttempt(attemptId) {
  const res = await api.get(`/attempts/${attemptId}`)
  return res.data // { attempt, isPremium, freeExplainCount, breakdown }
}

export async function listAttempts() {
  const res = await api.get('/attempts')
  return res.data.attempts
}

export async function getLeaderboard() {
  const res = await api.get('/leaderboard')
  return res.data // { board, myRank, total, isPremium }
}

export async function getStats() {
  const res = await api.get('/stats')
  return res.data // { daily, mastery, totalSessions, avgScore }
}
