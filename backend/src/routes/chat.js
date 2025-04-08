import express from 'express';
import { processUserMessage } from '../services/openaiService.js';
import {
    getBalance,
    getTransactionStatus,
    getAllAccounts,
    getTransactionList
} from '../services/dataService.js';
import { DataValidationError } from '../services/dataService.js';
import { logChatInteraction } from '../services/loggingService.js';

const router = express.Router();

// Helper function to format currency)
const formatCurrency = (amount) => (amount !== null && amount !== undefined && !isNaN(amount))
  ? `$${Number(amount).toFixed(2)}`
  : 'N/A';

/**
 * Process chat messages from the client
 * @route POST /api/chat
 * @param {object} req.body - Request body
 * @param {string} req.body.userId - The ID of the user
 * @param {string} req.body.message - The user's message text
 * @param {string} [req.body.sessionId] - Optional session ID
 * @returns {object} Response containing the bot's reply
 */
router.post('/', async (req, res, next) => {
  const { userId, message, sessionId } = req.body;
  const requestId = req.requestId || 'unknown-req-id';

  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const error = new Error('Missing or invalid userId field.');
      error.status = 400;
      error.code = 'INVALID_USER_ID';
      return next(error);
    }
    if (!message || typeof message !== 'string' || message.trim() === '') {
      const error = new Error('Missing or invalid message field.');
      error.status = 400;
      error.code = 'INVALID_MESSAGE';
      return next(error);
    }

    console.log(`[${requestId}] Processing message for user: ${userId}`);

    // Process the message using OpenAI service (RAG + LLM)
    const aiResult = await processUserMessage(message);
    let { intent, response: templateResponse, needsData, metadata = {} } = aiResult;

    // Handle potential errors from the AI service itself
    if (intent === 'error') {
      console.error(`[${requestId}] OpenAI service returned an error:`, aiResult.error);
      const error = new Error(aiResult.response || 'AI service failed to process the message.');
      error.status = 503;
      error.code = 'AI_SERVICE_ERROR';
      await logChatInteraction({ /* ... log data ... */ detectedIntent: 'error', botResponse: error.message, userId, userQuery: message, requestId });
      return next(error);
    }

    // If the AI needs data, attempt to fetch it using dataService
    let finalResponse = templateResponse;
    let dataRetrievalError = null;
    let dataRetrievedSuccessfully = false;

    if (needsData) {
      console.log(`[${requestId}] AI requires data for intent: ${intent}`);
      try {
        // Data Fetching Logic based on Intent
        if (intent === 'balance_inquiry') {
          const accountType = extractAccountType(message) || 'checking';
          if (accountType === 'all') {
              const accountsData = await getAllAccounts(userId);
              // Format response using the detailed list from getAllAccounts
              finalResponse = `Here are your account balances as of ${new Date(accountsData.asOf).toLocaleTimeString()}:\n` +
                              accountsData.accountsList.map(acc =>
                                  `- ${acc.typeLabel}: ${acc.balance} (Available: ${acc.available || acc.balance})`
                              ).join('\n');
              if (accountsData.creditBalance !== null) {
                  finalResponse += `\n- Credit Card: Balance ${formatCurrency(accountsData.creditBalance)}, Available ${formatCurrency(accountsData.creditAvailable)}`;
              }
          } else {
              const balanceData = await getBalance(userId, accountType);
              finalResponse = `Your ${balanceData.accountType} account balance is ${balanceData.formattedAmount} (Available: ${balanceData.formattedAvailable}).`;
              if (accountType === 'credit') {
                  finalResponse += ` Your available credit is ${balanceData.formattedCreditAvailable}.`;
                   if(balanceData.dueDate) {
                       finalResponse += ` Next payment due ${balanceData.dueDate}, minimum payment ${balanceData.formattedMinPayment}.`;
                   }
              }
          }
          dataRetrievedSuccessfully = true;
        } else if (intent === 'transaction_status') {
          // Filter extraction needed here
          const txId = extractTransactionId(message);
          if (txId && txId !== 'latest') {
              const txData = await getTransactionStatus(userId, txId);
              if (txData) {
                  finalResponse = `Transaction ${txData.id} (${txData.description || txData.type}) for ${txData.formattedAmount} on ${txData.formattedDate} has status: ${txData.status}.`;
                  dataRetrievedSuccessfully = true;
              } else {
                  finalResponse = `Sorry, I couldn't find transaction ID "${txId}". Please check the ID.`;
                  intent = 'data_not_found';
              }
          } else {
              const filters = extractTransactionFilters(message);
              const transactions = await getTransactionList(userId, filters);
              if (transactions.length > 0) {
                  finalResponse = "Here are your recent transactions:\n" +
                                  transactions.map(tx =>
                                      `- ${tx.formattedDate}: ${tx.recipient || tx.description || tx.type} (${tx.status}) ${tx.formattedAmount}`
                                  ).join('\n');
                  dataRetrievedSuccessfully = true;
              } else {
                  finalResponse = "I couldn't find any transactions matching your request.";
                  intent = 'data_not_found';
              }
          }
        }
        // End Data Fetching Logic
      } catch (error) {
        console.error(`[${requestId}] Error during data retrieval (Intent: ${intent}):`, error);
        dataRetrievalError = error;

        // Handle specific known errors
        if (error instanceof DataValidationError || error instanceof DatabaseServiceError) {
          if (error.code === 'USER_NOT_FOUND' || error.code === 'ACCOUNT_NOT_FOUND' || error.code === 'ACCOUNTS_NOT_FOUND') {
            finalResponse = `I couldn't find the requested information. ${error.message}`;
            intent = 'data_not_found';
          } else {
            finalResponse = 'I apologize, there was a problem accessing your account details right now. Please try again in a few moments.';
          }
        } else {
          finalResponse = 'An unexpected issue occurred while fetching your data. Our technical team has been notified.';
          intent = 'system_error';
        }
        needsData = false;
      }
    }

    // Log the complete interaction details
    await logChatInteraction({
      sessionId: sessionId || 'no-session',
      requestId: requestId,
      userId,
      userQuery: message,
      detectedIntent: intent,
      botResponse: finalResponse,
      metadata: {
        ...metadata,
        dataRetrievalError: dataRetrievalError ? { code: dataRetrievalError.code, message: dataRetrievalError.message } : null,
        dataRetrievedSuccessfully: dataRetrievedSuccessfully
      }
    });

    // Send the final response back to the user / client / whoever see it
    res.json({
      success: true,
      data: {
        response: finalResponse,
        meta: {
          intent: intent,
          timestamp: new Date().toISOString(),
          request_id: requestId,
        }
      }
    });

  } catch (error) {
    console.error(`[${requestId}] UNHANDLED error in POST /api/chat:`, error);
    error.requestId = requestId;
    next(error);
  }
});

// Helper Functions but made simple

function extractAccountType(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('checking')) return 'checking';
  if (lowerMessage.includes('savings')) return 'savings';
  if (lowerMessage.includes('credit')) return 'credit';
  if (lowerMessage.includes('all') || lowerMessage.includes('every account') || lowerMessage.includes('overview')) return 'all';
  return null;
}

function extractTransactionId(message) {
    // Look for common patterns like tx-12345, transaction id 12345, #12345 etc. or standard / common parts
    const patterns = [
        /\b(tx|transaction|trans|ref|id)[-\s:]*([a-zA-Z0-9]{6,})\b/i, // tx-123, transaction 123
        /\b#([a-zA-Z0-9]{6,})\b/i // #123456
        ];
     for (const pattern of patterns) {
        const matches = message.match(pattern);
        if (matches && matches[2]) {
            return matches[2];
        }
    }
    // Check for "latest" or "last" explicitly
    if (/\b(latest|last|most recent)\b/i.test(message)) {
        return 'latest';
    }
  return null;
}

function extractTransactionFilters(message) {
  const filters = {};
  const lowerMessage = message.toLowerCase();
   // Basic time period extraction
   if (/\btoday\b/.test(lowerMessage)) filters.timePeriod = 'today';
   else if (/\bthis week\b/.test(lowerMessage)) filters.timePeriod = 'this_week';
   else if (/\bthis month\b/.test(lowerMessage)) filters.timePeriod = 'this_month';
   else if (/\blast month\b/.test(lowerMessage)) filters.timePeriod = 'last_month';

   // Basic type extraction
   if (/\b(deposit|deposited)\b/.test(lowerMessage)) filters.transactionType = 'deposit';
   else if (/\b(payment|paid)\b/.test(lowerMessage)) filters.transactionType = 'payment';
   else if (/\b(transfer|sent|received money)\b/.test(lowerMessage)) filters.transactionType = 'transfer';
   else if (/\b(purchase|bought|spent at)\b/.test(lowerMessage)) filters.transactionType = 'purchase';
   else if (/\b(withdrawal|took out)\b/.test(lowerMessage)) filters.transactionType = 'withdrawal';

   // Basic recipient extraction but very simple made for this demo
   const recipientMatch = lowerMessage.match(/(?:to|from|with|at)\s+([a-z0-9\s\-\.&']+?)(?:\s+on|\s+for|[\.,]|$)/);
   if (recipientMatch && recipientMatch[1]) {
       filters.recipient = recipientMatch[1].trim();
   }
  return filters;
}


export default router;