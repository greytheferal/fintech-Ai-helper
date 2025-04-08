import OpenAI from 'openai';
import { findRelevantFAQs, initializeFaqEmbeddings } from './faqService.js';
import { getOpenAiFunctions } from './functionDefinitions.js';
import { getSchemaInfo } from '../database/databaseService.js';
import { getEnhancedSystemPrompt } from './enhancedSystemPrompt.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Make sure the API key is loaded
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(' FATAL (Houston we have a problem): OPENAI_API_KEY not found in environment variables!');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
  maxRetries: 3,
  timeout: 30000,
});

// Helper to format schema info for the prompt
function formatSchemaForPrompt(schemaInfo) {
    let schemaString = "Database Schema Overview:\n";
    for (const tableName in schemaInfo) {
        schemaString += `Table: ${tableName}\nColumns:\n`;
        schemaInfo[tableName].forEach(columnDesc => {
            schemaString += `  - ${columnDesc}\n`;
        });
        schemaString += "\n";
    }
    return schemaString.trim();
}

// Process a user message using GPT-4 with schema

export async function processUserMessage(message) {
  try {
    const startTime = Date.now();

    const schemaInfoPromise = getSchemaInfo();

    const relevantFAQsPromise = findRelevantFAQs(message);

    const [schemaInfo, relevantFAQs] = await Promise.all([schemaInfoPromise, relevantFAQsPromise]);
    console.log(`Retrieved schema for ${Object.keys(schemaInfo).length} tables and ${relevantFAQs.length} relevant FAQs`);

    const faqContext = relevantFAQs.length > 0
      ? `Potentially relevant FAQs (use if helpful):\n${relevantFAQs.map((faq, index) =>
          `FAQ #${index + 1} (Similarity: ${(faq.score * 100).toFixed(0)}%)\nQ: ${faq.question}\nA: ${faq.answer}`
        ).join('\n---\n')}`
      : 'No highly relevant FAQs found in the knowledge base for this specific query.';

    const schemaContext = Object.keys(schemaInfo).length > 0
        ? formatSchemaForPrompt(schemaInfo)
        : 'Database schema information is currently unavailable.';

    const systemPrompt = getEnhancedSystemPrompt(schemaContext, faqContext);


    const functions = getOpenAiFunctions();
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    console.log(`[OpenAI Request] Sending prompt (User: "${message.substring(0, 50)}...") with schema and FAQ context.`);

    let completion;
    let retryCount = 0;
    const maxRetries = 3;
    const initialDelay = 1000;
    
    while (retryCount <= maxRetries) {
      try {
        completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: messages,
          temperature: 0.2,
          functions: functions,
          function_call: 'auto',
        });
        

        break;
      } catch (error) {
        if (error.status === 429 || error.status === 500 || error.status === 503) {
          retryCount++;
          
          if (retryCount <= maxRetries) {
            const delay = initialDelay * Math.pow(2, retryCount - 1);
            console.warn(`OpenAI API error (${error.status}), retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.error(`Failed after ${maxRetries} retries:`, error);
            throw error;
          }
        } else {
          console.error('Non-retryable OpenAI API error:', error);
          throw error;
        }
      }
    }

    const responseMessage = completion.choices[0].message;
    const processingTime = Date.now() - startTime;

    const metadata = {
      model: completion.model,
      usage: completion.usage,
      finish_reason: completion.choices[0].finish_reason,
      processing_time_ms: processingTime,
      faq_matches: relevantFAQs.length
    };
    console.log(`[OpenAI Response] Finish Reason: ${metadata.finish_reason}, Time: ${processingTime}ms, Tokens: ${metadata.usage?.total_tokens}`);

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      let functionArgs = {};
      try {
           functionArgs = JSON.parse(responseMessage.function_call.arguments);
           console.log(`[OpenAI Response] Function Call: ${functionName} with args:`, functionArgs);
      } catch (parseError) {
           console.error(`[OpenAI Response] Error parsing function arguments: ${parseError}. Arguments: ${responseMessage.function_call.arguments}`);
           return { intent: 'error', response: "I had trouble understanding the details needed for your request. Could you please rephrase?", needsData: false, metadata, error: `Argument parse error: ${parseError.message}` };
      }

      let intent = 'unknown_function';
      let needsData = true;
      let templateResponse = `Okay, I need to look up information using the ${functionName} function.`;

      switch (functionName) {
        case 'get_account_balance':
          intent = 'balance_inquiry';
          templateResponse = `Okay, retrieving balance for account type: ${functionArgs.account_type || 'default'}.`;
          break;
        case 'get_transaction_status':
          intent = 'transaction_status';
          templateResponse = `Okay, looking up transaction status based on your criteria.`;
          break;
        case 'get_faq_answer':
          intent = 'faq_query';
           needsData = false; // LLM handles this directly
           templateResponse = `Let me check our knowledge base for information about "${functionArgs.query}".`;
           if (relevantFAQs.length > 0) {
               if (!responseMessage.content) {
                   templateResponse = relevantFAQs[0].answer + "\n\nIs there anything else I can clarify?";
               } else {
                   templateResponse = responseMessage.content;
               }
           } else if (responseMessage.content) {
                // No FAQs, but LLM content is available
                templateResponse = responseMessage.content;
           } else {
               // No FAQs, no LLM content, function called but likely needs escalation or generic response
               templateResponse = "I couldn't find a specific answer in our FAQs for that. Would you like to speak to an agent?";
               intent = 'escalation_needed';
           }
          break;
        case 'explain_financial_concept':
           intent = 'financial_education';
           needsData = false;
           templateResponse = responseMessage.content || `Let me explain "${functionArgs.concept}".`;
           break;
         case 'provide_product_information':
             intent = 'product_information';
             needsData = false;
             
             if (!responseMessage.content) {
               const productType = functionArgs.product_type.toLowerCase();
               const infoNeeded = functionArgs.information_needed || 'general';
               
               try {
                 const followUpCompletion = await openai.chat.completions.create({
                   model: 'gpt-4',
                   messages: [
                     { role: 'system', content: 'You are a helpful financial assistant. Provide clear, accurate information about banking products and services.' },
                     { role: 'user', content: `Please provide ${infoNeeded} information about ${productType} accounts or products.` }
                   ],
                   temperature: 0.3,
                 });
                 
                 templateResponse = followUpCompletion.choices[0].message.content ||
                   `I'd be happy to provide information about ${productType} products, but I'm having trouble retrieving the specific details. Would you like to ask about a different product or service?`;
               } catch (openaiError) {
                 console.error('Error making follow-up request to OpenAI for product info:', openaiError);
                 templateResponse = `I'd like to tell you about our ${productType} products, but I'm currently experiencing technical difficulties. Can I help with something else?`;
               }
             } else {
               templateResponse = responseMessage.content;
             }
             break;
        case 'escalate_to_human':
          intent = 'escalation_request';
          needsData = false;
          templateResponse = `Okay, I understand. Based on your request about "${functionArgs.reason}", I will connect you with a human agent. Please wait a moment.`;
          break;
        default:
            console.warn(`[OpenAI Service] Unknown function called: ${functionName}`);
            intent = 'unknown_function_call';
            needsData = false;
            templateResponse = responseMessage.content || "I'm not sure how to handle that specific function call, but I'll try my best based on your message.";
      }

      return {
          intent,
          response: templateResponse,
          needsData,
          functionCall: { name: functionName, arguments: functionArgs },
          metadata
      };

    } else {
      // No function call, use direct LLM response
      console.log("[OpenAI Response] Direct text response provided.");
      return {
        intent: determineIntentFromText(message),
        response: responseMessage.content || "I understand. Is there anything else I can help you with?",
        needsData: false,
        metadata
      };
    }

  } catch (error) {
    console.error(' Error in processUserMessage:', error);
    let statusCode = 500;
    let errorCode = 'AI_SERVICE_ERROR';
    if (error.status === 401) {
        statusCode = 500;
        errorCode = 'AI_AUTH_ERROR';
        console.error(" OpenAI API Key is invalid or missing!");
    } else if (error.status === 429) {
        statusCode = 503;
        errorCode = 'AI_RATE_LIMIT';
    }

    return {
      intent: 'error',
      response: 'I apologize, but I encountered a technical issue processing your request. Please try again later.',
      needsData: false,
      error: { message: error.message, code: errorCode, status: statusCode },
      metadata: { processing_time_ms: Date.now() - (startTime || Date.now()) }
    };
  }
}

// Simple fallback intent detection
function determineIntentFromText(text) {
  const lowerText = text.toLowerCase();
  if (/\b(balance|how much|funds|money in my)\b/i.test(lowerText)) return 'balance_inquiry';
  if (/\b(transaction|payment|transfer|charge|spent|deposit|withdrawal)\b/i.test(lowerText)) return 'transaction_status';
  if (/\b(help|agent|human|confused|talk to someone|issue)\b/i.test(lowerText)) return 'escalation_request';
  if (/\b(hello|hi|hey|greetings)\b/i.test(lowerText)) return 'greeting';
  if (/\b(bye|goodbye|thank|later)\b/i.test(lowerText)) return 'farewell';
  if (/\b(fee|cost|charge)\b/i.test(lowerText)) return 'faq_query';
  if (/\b(rate|apy|apr|interest)\b/i.test(lowerText)) return 'faq_query';
  return 'general';
}