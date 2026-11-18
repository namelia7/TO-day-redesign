import { useCallback, useEffect, useState } from 'react'
import { getAdminQuestions, updateAdminQuestion } from '../api/admin'
import { apiErrorMessage } from '../api/client'
import { SUBTESTS } from '../api/tryouts'

function toDraft(question) {
  const choices = Array.isArray(question.choices) ? question.choices : null
  return {
    id: question.id,
    subtest: question.subtest_code,
    stem: question.stem,
    choices,
    answer: choices ? String(question.answer) : String(question.answer ?? ''),
    explain: question.explain,
    tryoutCount: question.tryout_count,
  }
}

function preview(text, max = 150) {
  const value = String(text ?? '')
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState([])
  const [filterSubtest, setFilterSubtest] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminQuestions({
        ...(filterSubtest ? { subtest: filterSubtest } : {}),
        ...(search.trim() ? { q: search.trim() } : {}),
      })
      setQuestions(data.questions || [])
    } catch (err) {
      setQuestions([])
      setError(apiErrorMessage(err, 'Gagal memuat bank soal.'))
    } finally {
      setLoading(false)
    }
  }, [filterSubtest, search])

  useEffect(() => {
    const timer = setTimeout(() => { load() }, 250)
    return () => clearTimeout(timer)
  }, [load])

  const openEdit = (question) => {
    setDraft(toDraft(question))
    setFormError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setField = (key, value) => {
    setDraft(prev => (prev ? { ...prev, [key]: value } : prev))
  }

  const setType = (type) => {
    setDraft(prev => {
      if (!prev) return prev
      if (type === 'pg') {
        const choices = prev.choices && prev.choices.length >= 2 ? prev.choices : ['', '', '', '']
        const index = prev.choices ? Math.min(Number(prev.answer) || 0, choices.length - 1) : 0
        return { ...prev, choices, answer: String(index) }
      }
      return { ...prev, choices: null, answer: '' }
    })
  }

  const setChoice = (index, value) => {
    setDraft(prev => {
      if (!prev || !prev.choices) return prev
      const choices = prev.choices.map((choice, i) => (i === index ? value : choice))
      return { ...prev, choices }
    })
  }

  const addChoice = () => {
    setDraft(prev => {
      if (!prev || !prev.choices || prev.choices.length >= 6) return prev
      return { ...prev, choices: [...prev.choices, ''] }
    })
  }

  const removeChoice = (index) => {
    setDraft(prev => {
      if (!prev || !prev.choices || prev.choices.length <= 2) return prev
      const choices = prev.choices.filter((_, i) => i !== index)
      let answer = prev.answer
      if (Number(answer) === index) answer = '0'
      else if (Number(answer) > index) answer = String(Number(answer) - 1)
      return { ...prev, choices, answer }
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const data = await updateAdminQuestion(draft.id, {
        subtest: draft.subtest,
        stem: draft.stem,
        choices: draft.choices,
        answer: draft.answer,
        explain: draft.explain,
      })
      const saved = data.question
      setQuestions(prev => prev.map(q => (
        q.id === saved.id
          ? { ...q, ...saved, tryout_count: q.tryout_count }
          : q
      )))
      setDraft(null)
      setMessage(`Soal ${saved.id} berhasil disimpan.`)
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Gagal menyimpan soal.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {message && <div className="saved" role="status" style={{ marginBottom: 12 }}>{message}</div>}

      {draft && (
        <div className="glass-card panel q-editor">
          <div className="panel-head">
            <h2>Edit soal {draft.id}</h2>
            <span className="hint" style={{ marginTop: 0 }}>
              Dipakai di {draft.tryoutCount ?? 0} tryout
            </span>
          </div>

          <form onSubmit={save} className="q-form">
            <label htmlFor="q-subtest">Subtes</label>
            <select id="q-subtest" value={draft.subtest} onChange={e => setField('subtest', e.target.value)}>
              {Object.entries(SUBTESTS).map(([code, name]) => (
                <option key={code} value={code}>{code} - {name}</option>
              ))}
            </select>

            <label htmlFor="q-stem">Pertanyaan</label>
            <textarea
              id="q-stem"
              rows={5}
              value={draft.stem}
              onChange={e => setField('stem', e.target.value)}
              required
            />

            <label htmlFor="q-type">Tipe soal</label>
            <select id="q-type" value={draft.choices ? 'pg' : 'isian'} onChange={e => setType(e.target.value)}>
              <option value="pg">Pilihan ganda</option>
              <option value="isian">Isian singkat</option>
            </select>

            {draft.choices ? (
              <div className="q-choices">
                <span className="q-label">Pilihan jawaban (pilih radio untuk kunci)</span>
                {draft.choices.map((choice, index) => (
                  <div className="q-choice-row" key={index}>
                    <input
                      type="radio"
                      name="q-answer"
                      checked={String(draft.answer) === String(index)}
                      onChange={() => setField('answer', String(index))}
                      aria-label={`Kunci jawaban ${String.fromCharCode(65 + index)}`}
                    />
                    <span className="q-choice-key">{String.fromCharCode(65 + index)}</span>
                    <input
                      type="text"
                      value={choice}
                      onChange={e => setChoice(index, e.target.value)}
                      placeholder={`Pilihan ${String.fromCharCode(65 + index)}`}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeChoice(index)}
                      disabled={draft.choices.length <= 2}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-glass"
                  onClick={addChoice}
                  disabled={draft.choices.length >= 6}
                >
                  Tambah pilihan
                </button>
              </div>
            ) : (
              <>
                <label htmlFor="q-answer">Kunci jawaban (isian)</label>
                <input
                  id="q-answer"
                  type="text"
                  value={draft.answer}
                  onChange={e => setField('answer', e.target.value)}
                  required
                />
              </>
            )}

            <label htmlFor="q-explain">Pembahasan</label>
            <textarea
              id="q-explain"
              rows={4}
              value={draft.explain}
              onChange={e => setField('explain', e.target.value)}
              required
            />

            {formError && <div className="error" role="alert">{formError}</div>}

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan perubahan'}
              </button>
              <button type="button" className="btn btn-glass" onClick={() => setDraft(null)}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card panel">
        <div className="q-toolbar">
          <select
            aria-label="Filter subtes"
            value={filterSubtest}
            onChange={e => setFilterSubtest(e.target.value)}
          >
            <option value="">Semua subtes</option>
            {Object.entries(SUBTESTS).map(([code, name]) => (
              <option key={code} value={code}>{code} - {name}</option>
            ))}
          </select>
          <input
            type="search"
            className="q-search"
            placeholder="Cari teks soal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-glass" onClick={load} disabled={loading}>
            {loading ? 'Memuat...' : 'Muat ulang'}
          </button>
        </div>

        {error && <div className="error" role="alert">{error}</div>}

        {questions.length === 0 ? (
          <p className="admin-empty">{loading ? 'Memuat soal...' : 'Tidak ada soal yang cocok.'}</p>
        ) : (
          <>
            <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
              {questions.length} soal ditemukan.
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Subtes</th>
                    <th>Soal</th>
                    <th>Tipe</th>
                    <th>Dipakai</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map(q => (
                    <tr key={q.id}>
                      <td><strong>{q.id}</strong></td>
                      <td>{SUBTESTS[q.subtest_code] || q.subtest_code}</td>
                      <td className="q-stem-cell">{preview(q.stem)}</td>
                      <td>{q.choices ? 'Pilihan ganda' : 'Isian'}</td>
                      <td>{q.tryout_count} tryout</td>
                      <td>
                        <button className="btn btn-glass" type="button" onClick={() => openEdit(q)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
