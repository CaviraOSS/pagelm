import { makeModels } from './models'

const { llm, embeddings } = makeModels()

export default llm
export { embeddings }