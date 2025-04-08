// OpenAI function definitions for tool-calling . Think about some low level MCP tools

export function getOpenAiFunctions() {
  return [
    // Function for retrieving account balance information
    {
      name: 'get_account_balance',
      description: 'Get the current balance for the user\'s account(s)',
      parameters: {
        type: 'object',
        properties: {
          account_type: {
            type: 'string',
            enum: ['checking', 'savings', 'credit', 'all'],
            description: 'Type of account to retrieve balance for, or "all" for all accounts'
          },
          include_pending: {
            type: 'boolean',
            description: 'Whether to include pending transactions in the balance'
          }
        },
        required: ['account_type']
      }
    },
    
    // Function for retrieving transaction status and history
    {
      name: 'get_transaction_status',
      description: 'Get status or information about recent transactions',
      parameters: {
        type: 'object',
        properties: {
          transaction_id: {
            type: 'string',
            description: 'Specific transaction ID to query, if available'
          },
          transaction_type: {
            type: 'string',
            enum: ['payment', 'deposit', 'withdrawal', 'transfer', 'purchase', 'all'],
            description: 'Filter by transaction type'
          },
          time_period: {
            type: 'string',
            enum: ['today', 'this_week', 'this_month', 'last_month', 'recent'],
            description: 'Time period to search for transactions'
          },
          recipient: {
            type: 'string',
            description: 'Filter by recipient name or keyword'
          }
        }
      }
    },
    
    // Function for retrieving FAQ information
    {
      name: 'get_faq_answer',
      description: 'Get answers to common banking questions from the knowledge base',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The user\'s question or topic'
          },
          category: {
            type: 'string',
            enum: ['accounts', 'payments', 'transfers', 'fees', 'cards', 'security', 'loans', 'general'],
            description: 'Category of information to search within'
          }
        },
        required: ['query']
      }
    },
    
    // Function for explaining financial concepts
    {
      name: 'explain_financial_concept',
      description: 'Explain a financial term or concept to the user',
      parameters: {
        type: 'object',
        properties: {
          concept: {
            type: 'string',
            description: 'The financial concept to explain'
          },
          detail_level: {
            type: 'string',
            enum: ['basic', 'detailed', 'advanced'],
            description: 'Level of detail for the explanation'
          }
        },
        required: ['concept']
      }
    },
    
    // Function for explaining bank products
    {
      name: 'provide_product_information',
      description: 'Provide information about banking products and services',
      parameters: {
        type: 'object',
        properties: {
          product_type: {
            type: 'string',
            enum: ['checking', 'savings', 'credit', 'loans', 'mortgages', 'investing', 'retirement'],
            description: 'Type of product to get information about'
          },
          specific_product: {
            type: 'string',
            description: 'Specific product name if known'
          },
          information_needed: {
            type: 'string',
            enum: ['features', 'fees', 'rates', 'requirements', 'comparison', 'general'],
            description: 'Type of information needed about the product'
          }
        },
        required: ['product_type']
      }
    },
    
    // Function for escalating to a human agent
    {
      name: 'escalate_to_human',
      description: 'Transfer the conversation to a human agent for complex issues that require human intervention',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for escalation to include in the handoff'
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Urgency level of the issue'
          },
          category: {
            type: 'string',
            enum: ['account_issue', 'technical_problem', 'complaint', 'fraud', 'dispute', 'complex_request'],
            description: 'Category of issue for routing to appropriate team'
          }
        },
        required: ['reason']
      }
    }
  ];
}