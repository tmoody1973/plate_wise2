# Perplexity API Reference

## Base URL
```
https://api.perplexity.ai/chat/completions
```

## Authentication
```bash
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## Models
- `sonar` - Fast online model for web search
- `sonar-pro` - More capable online model with better reasoning  
- `llama-3.1-sonar-small-128k-online` - Llama-based online model
- `llama-3.1-sonar-large-128k-online` - Larger Llama-based online model

## Request Parameters

### Required
- `model` (string): Model to use
- `messages` (array): Array of message objects

### Optional
- `max_tokens` (integer): Maximum tokens in response
- `temperature` (float): Randomness (0.0-2.0, default: 0.2)
- `top_p` (float): Nucleus sampling (0.0-1.0, default: 1.0)
- `return_citations` (boolean): Include web citations (default: false)
- `return_images` (boolean): Include images (default: false)
- `return_related_questions` (boolean): Include follow-up questions (default: false)
- `search_domain_filter` (array): Domains to search within
- `search_recency_filter` (string): Time filter ("month", "week", "day", "hour")
- `top_k` (integer): Number of search results to consider (default: 0)
- `stream` (boolean): Stream responses (default: false)
- `presence_penalty` (float): Penalty for token presence (-2.0 to 2.0, default: 0)
- `frequency_penalty` (float): Penalty for token frequency (-2.0 to 2.0, default: 1)

## Example Request
```javascript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar-pro',
    messages: [
      {
        role: 'user',
        content: 'What are the latest developments in AI?'
      }
    ],
    max_tokens: 1000,
    temperature: 0.3,
    return_citations: true
  })
});
```

## Response Format
```json
{
  "id": "response_id",
  "model": "sonar-pro", 
  "object": "chat.completion",
  "created": 1234567890,
  "choices": [{
    "index": 0,
    "finish_reason": "stop",
    "message": {
      "role": "assistant",
      "content": "Response content here"
    }
  }],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  },
  "citations": [
    {
      "title": "Page Title",
      "url": "https://example.com",
      "text": "Cited text snippet"
    }
  ]
}
```

## Important Notes

### Citations
- Only returned when `return_citations: true`
- May not always be present even when requested
- URLs in citations are generally more reliable than AI-generated URLs

### Online vs Offline Models
- `sonar` and `sonar-pro` search the web
- Other models may not have web access
- Online models provide more current information

### Rate Limits
- Vary by subscription plan
- Typically measured in requests per minute/hour
- Monitor usage to avoid hitting limits

### Error Handling
- Standard HTTP status codes
- 400: Bad Request (invalid parameters)
- 401: Unauthorized (invalid API key)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

### Best Practices
- Use `sonar-pro` for better quality responses
- Set appropriate `max_tokens` to control costs
- Use `return_citations: true` for factual queries
- Handle rate limits with exponential backoff
- Validate any URLs returned by the API