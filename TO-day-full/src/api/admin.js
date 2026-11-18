import api from './client'

export async function getAdminQuestions(params = {}) {
  const res = await api.get('/admin/questions', { params })
  return res.data // { questions }
}

export async function updateAdminQuestion(id, payload) {
  const res = await api.put(`/admin/questions/${id}`, payload)
  return res.data // { question }
}
