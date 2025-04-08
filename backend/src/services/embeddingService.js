// Embedding Service for RAG. What it does you may ask? (Hopely) Handles generating and comparing embeddings for semantic search


import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file with absolute path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for embeddings to reduce API calls
const embeddingCache = new Map();

// Get an embedding for text, using cache if available

export async function getEmbeddingWithCache(text) {
  const cacheKey = text.trim().toLowerCase();
  
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }
  
  try {
    const embedding = await getEmbedding(text);
    
    embeddingCache.set(cacheKey, embedding);
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    
    return new Array(1536).fill(0);
  }
}


// Generate an embedding for text using OpenAI API

async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI API error when generating embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Cosine similarity (0-1)
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find embeddings most similar to a query embedding
 * @param {number[]} queryEmbedding - Embedding of the query
 * @param {Array<{id: string, embedding: number[]}>} embeddings - Array of item embeddings
 * @param {number} limit - Maximum number of results to return
 * @returns {Array<{id: string, score: number}>} Array of similar items with scores
 */
export function findSimilarEmbeddings(queryEmbedding, embeddings, limit = 3) {
  const scoredItems = embeddings.map(item => {
    if (!item.embedding || !Array.isArray(item.embedding) || item.embedding.length === 0) {
      return { id: item.id, score: 0 };
    }
    
    return {
      id: item.id,
      score: cosineSimilarity(queryEmbedding, item.embedding)
    };
  });
  
  // Sort high to low 
  return scoredItems
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}