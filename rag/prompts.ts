import { ChatPromptTemplate } from "@langchain/core/prompts"

export const refineQueryPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a query refinement assistant. Your job is to rewrite and decompose user queries to improve document retrieval.

Given a user query and conversation history, produce 1-3 refined search queries that will retrieve the most relevant documents.

Respond with a JSON object: {{ "queries": ["query1", "query2"] }}`,
  ],
  [
    "human",
    `Conversation history:
{conversationHistory}

User query: {query}

Produce refined search queries as JSON.`,
  ],
])

export const gradeDocumentPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a document relevance grader. Determine if a document chunk contains information that could help answer the user query.

The document may be structured data (tables, invoices, receipts, lists) — treat any chunk containing related fields, values, or entities as relevant even if the formatting is raw or unstructured.

Respond with a JSON object: {{ "relevant": true }} or {{ "relevant": false }}`,
  ],
  [
    "human",
    `Query: {query}

Document content:
{content}

Does this chunk contain information relevant to the query? When in doubt, prefer relevant: true.`,
  ],
])

export const generateResponsePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant that answers questions based on provided documents.

{instructions}

Rules:
- Answer using ONLY the provided documents
- Cite documents using [DOC_N] notation inline
- If documents don't contain enough information, say so clearly
- Be concise and accurate

Respond with a JSON object:
{{
  "answer": "your answer with [DOC_N] citations",
  "citedDocumentIds": ["id1", "id2"],
  "confidence": 0.0-1.0
}}`,
  ],
  [
    "human",
    `Documents:
{documents}

Question: {query}

Answer with citations as JSON.`,
  ],
])
