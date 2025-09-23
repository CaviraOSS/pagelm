import db from '../../utils/database/keyv'

export function flashcardRoutes(app: any) {
  app.post('/flashcards', async (req: any, res: any) => {
    try {
      const { question, answer, tag } = req.body
      if (!question || !answer || !tag) return res.status(400).send({ error: 'question, answer, tag required' })
      const id = crypto.randomUUID()
      const card = { id, question, answer, tag, created: Date.now() }
      let cards = await db.get('flashcards') || []
      cards.push(card)
      await db.set(`flashcard:${id}`, card)
      await db.set('flashcards', cards)
      res.send({ ok: true, flashcard: card })
    } catch (e: any) {
      res.status(500).send({ ok: false, error: e?.message || 'failed' })
    }
  })

  app.get('/flashcards', async (_: any, res: any) => {
    try {
      res.send({ ok: true, flashcards: await db.get('flashcards') || [] })
    } catch (e: any) {
      res.status(500).send({ ok: false, error: e?.message || 'failed' })
    }
  })

  app.delete('/flashcards/:id', async (req: any, res: any) => {
    try {
      const id = req.params.id
      if (!id) return res.status(400).send({ error: 'id required' })
      await db.delete(`flashcard:${id}`)
      let cards = await db.get('flashcards') || []
      cards = cards.filter((c: any) => c.id !== id)
      await db.set('flashcards', cards)
      res.send({ ok: true })
    } catch (e: any) {
      res.status(500).send({ ok: false, error: e?.message || 'failed' })
    }
  })
}