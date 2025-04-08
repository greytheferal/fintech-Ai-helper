// FAQService that uses vector embeddings for semantic search. Relies on databaseService for storing and retrieving FAQ/embeddings data and basically implements RAG

import { getEmbeddingWithCache, findSimilarEmbeddings } from './embeddingService.js';
import { 
  getAllStoredFaqEmbeddings, 
  getAllFaqsBasic, 
  getFaqById,
  checkFaqEmbeddingExists,
  upsertFaqEmbedding
} from '../database/databaseService.js';

console.log('Testing FAQ Service Imports:');
console.log('getAllStoredFaqEmbeddings:', getAllStoredFaqEmbeddings);
console.log('getAllFaqsBasic:', getAllFaqsBasic);

const faqEmbeddingsCache = new Map();


// Initialize the FAQ embeddings cache from the database. This should be called when the application starts.

export async function initializeFaqEmbeddings() {
  console.log('Initializing FAQ embeddings cache from database...');

  try {
    const storedEmbeddings = await getAllStoredFaqEmbeddings();
    if (storedEmbeddings.length > 0) {
      faqEmbeddingsCache.clear();
      storedEmbeddings.forEach(item => {
        faqEmbeddingsCache.set(item.id, item.embedding);
      });
      console.log(` Loaded ${faqEmbeddingsCache.size} embeddings into memory cache from database`);
    } else {
      console.log(' No valid FAQ embeddings found in the database to load into cache.');
    }

  } catch (error) {
    console.error(' Error initializing FAQ embeddings cache from database:', error.message);

  }
}


/**
 * Find FAQs relevant to a user query - semantic search
 * @param {string} query - The user's question or message
 * @param {number} [limit=2] - Maximum number of FAQs to return
 * @param {number} [minScore=0.75] - Minimum similarity score threshold
 * @returns {Promise<Array>}
 */
export async function findRelevantFAQs(query, limit = 2, minScore = 0.75) {
  try {
    if (faqEmbeddingsCache.size === 0) {
      console.warn('FAQ embedding cache is empty, attempting to initialize...');
      await initializeFaqEmbeddings();
    }

    if (faqEmbeddingsCache.size === 0) {
      console.log('⚠️ No embeddings available in cache, falling back to keyword search');
      return findRelevantFAQsByKeywords(query, limit);
    }

    const queryEmbedding = await getEmbeddingWithCache(query);

    const embeddingsArray = Array.from(faqEmbeddingsCache.entries()).map(([id, embedding]) => ({
      id,
      embedding
    }));

    const similarEmbeddings = findSimilarEmbeddings(queryEmbedding, embeddingsArray, limit * 2);

    // Fetch full FAQ details from db for the matches above the threshold
    const relevantFAQs = [];
    for (const item of similarEmbeddings) {
        if (item.score >= minScore) {
            try {
                const faqData = await getFaqById(item.id); 
                if (faqData) {
                    relevantFAQs.push({
                        id: faqData.faq_id,
                        question: faqData.question,
                        answer: faqData.answer,
                        score: item.score,
                        searchMethod: 'semantic'
                    });
                }
            } catch (dbError) {
                 console.error(` Error fetching FAQ details for ID ${item.id}:`, dbError.message);
            }
        }
       if (relevantFAQs.length >= limit) {
           break;
       }
    }

    // If there are not enough results or not results at all supplement with keyword search
    if (relevantFAQs.length < limit) {
      console.log(`⚠️ Semantic search found only ${relevantFAQs.length} results (min score ${minScore}), trying keyword search to supplement...`);
      const keywordResults = await findRelevantFAQsByKeywords(query, limit);

      // Add keyword results
      keywordResults.forEach(kwFaq => {
        if (relevantFAQs.length < limit && !relevantFAQs.some(rFaq => rFaq.id === kwFaq.id)) {
          relevantFAQs.push(kwFaq);
        }
      });
    }


    relevantFAQs.sort((a, b) => (b.score || 0) - (a.score || 0));

    console.log(` Found ${relevantFAQs.length} relevant FAQs for query using combined search.`);
    return relevantFAQs.slice(0, limit);

  } catch (error) {
    console.error(' Error finding relevant FAQs (semantic):', error.message);
    console.log('Falling back to keyword search due to error.');
    return findRelevantFAQsByKeywords(query, limit);
  }
}

/**
 * Keyword based search fallback . Fetches FAQs from db via databaseService if needed when needed.
 *
 * @param {string} query - The user's question
 * @param {number} limit - Maximum number of FAQs to return
 * @returns {Promise<Array>} Array of relevant FAQ objects
 */
async function findRelevantFAQsByKeywords(query, limit = 2) {
  console.log(`🔍 Using keyword-based search for query: "${query}"`);
  let faqList = [];

  try {
    faqList = await getAllFaqsBasic();
    if (faqList.length === 0) {
        console.warn(' No FAQs found in database for keyword search.');
        return [];
    }
  } catch (error) {
    console.error(' Error fetching FAQs from databaseService for keyword search:', error.message);
    return [];
  }

  return performKeywordSearch(query, faqList, limit);
}

/**
 * Perform the actual keyword search using weighted n-grams
 * @param {string} query - User query
 * @param {Array} faqList - List of FAQs { id, question, answer }
 * @param {number} limit - Maximum results
 * @returns {Array} - Matching FAQs with scores
 */
function performKeywordSearch(query, faqList, limit) {
  const queryTerms = {
    keywords: extractKeywords(query.toLowerCase()),
    bigrams: extractNGrams(query.toLowerCase(), 2),
    trigrams: extractNGrams(query.toLowerCase(), 3)
  };

  const totalTerms = queryTerms.keywords.length + queryTerms.bigrams.length + queryTerms.trigrams.length;
  if (totalTerms === 0) return [];

  const scoredFaqs = faqList.map(faq => {
    const faqText = (faq.question + ' ' + faq.answer).toLowerCase();
    const questionText = faq.question.toLowerCase();

    const keywordMatches = queryTerms.keywords.filter(k => faqText.includes(k)).length;
    const bigramMatches = queryTerms.bigrams.filter(b => faqText.includes(b)).length;
    const trigramMatches = queryTerms.trigrams.filter(t => faqText.includes(t)).length;

    const weightedScore = (keywordMatches * 1.0) + (bigramMatches * 2.0) + (trigramMatches * 3.0);
    const maxPossibleScore = (queryTerms.keywords.length * 1.0) + (queryTerms.bigrams.length * 2.0) + (queryTerms.trigrams.length * 3.0);
    const normalizedScore = maxPossibleScore > 0 ? weightedScore / maxPossibleScore : 0;

    const questionKeywordsMatches = queryTerms.keywords.filter(k => questionText.includes(k)).length;
    let finalScore = normalizedScore;
    if (queryTerms.keywords.length > 0 && questionKeywordsMatches >= queryTerms.keywords.length * 0.5) {
      finalScore = Math.min(1, finalScore * 1.5);
    }

    return { ...faq, score: finalScore, searchMethod: 'keyword' };
  });

  const results = scoredFaqs
    .filter(faq => faq.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

// Helper functions
function extractKeywords(query) {
  const stopwords = [ /* ... standard stopwords ... */ 'bank', 'banking', 'please', 'help', 'need', 'want', 'question', 'tell', 'know', 'get', 'find', 'looking', 'thanks', 'hello', 'hi', 'hey', 'a', 'an', 'the', 'is', 'are', 'was', 'were', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'how', 'what', 'when', 'where', 'why' ];
  const importantTerms = ['account', 'money', 'transfer', 'payment', 'card', 'fee', 'rate', 'loan', 'credit', 'debit', 'password', 'security', 'transaction', 'balance', 'deposit', 'withdraw'];
  const words = query.replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 2);
  const standardWords = words.filter(word => !stopwords.includes(word.toLowerCase()));
  const domainWords = words.filter(word => importantTerms.includes(word.toLowerCase()));
  const combinedWords = [...new Set([...standardWords, ...domainWords])];
  return combinedWords.length > 0 ? combinedWords : words.slice(0, 3);
}

function extractNGrams(text, n) {
  const cleanText = text.replace(/[^\w\s]/g, '').toLowerCase();
  const words = cleanText.split(/\s+/).filter(w => w);
  if (words.length < n) return [];
  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}