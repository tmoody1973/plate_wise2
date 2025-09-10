# Perplexity API Reference for Cursor

This document provides a comprehensive reference for using the Perplexity API, with a focus on implementation in a React environment for use in the Cursor IDE. It covers authentication, available models, pricing, and provides detailed examples for making API calls, including streaming responses and batching queries in parallel.




## 1. Perplexity API Overview

The Perplexity API provides access to Perplexity's powerful search and language models, allowing developers to integrate real-time, web-wide research and question-answering capabilities into their applications. The API is designed to be easy to use and is compatible with the OpenAI Chat Completions format, making it simple to switch from other language model APIs.

### Key Features:

*   **Real-time Web Search:** Access up-to-date information from the web to answer questions and provide current event information.
*   **Multiple Models:** Choose from a range of models optimized for different tasks, from quick and cost-effective search to in-depth research and reasoning.
*   **OpenAI Compatibility:** Use existing OpenAI client libraries to interact with the Perplexity API.
*   **Streaming Responses:** Receive results as they are generated for a more responsive user experience.
*   **Detailed Usage Information:** Get detailed cost and token usage information with each API response.




## 2. Authentication

To use the Perplexity API, you need to generate an API key from your Perplexity account. Here's how to get your key:

1.  **Navigate to the API Keys Tab:** Log in to your Perplexity account and go to the **API Keys** tab in the API Portal.
2.  **Generate a New Key:** Click the button to generate a new API key.
3.  **Store Your Key Securely:** Copy the generated key and store it in a secure location. You will need this key to authenticate your API requests.

Your API key should be included in the `Authorization` header of your API requests as a Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```




## 3. Models

Perplexity offers a family of models called **Sonar**, each designed for different use cases. Here's a breakdown of the available models and their strengths:

| Model                 | Description                                       | Best For                                                     |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| **Sonar**             | Lightweight, cost-effective search model          | Quick facts, news updates, simple Q&A, high-volume applications |
| **Sonar Pro**         | Advanced search with deeper content understanding | Complex queries, competitive analysis, detailed research     |
| **Sonar Reasoning**   | Quick problem-solving with step-by-step logic and search | Logic puzzles, math problems, transparent reasoning          |
| **Sonar Reasoning Pro** | Enhanced multi-step reasoning with web search     | Complex problem-solving, research analysis, strategic planning |
| **Sonar Deep Research** | Exhaustive research and detailed report generation with search | Academic research, market analysis, comprehensive reports    |

When making an API request, you'll need to specify which model you want to use in the `model` parameter.




## 4. Pricing

Perplexity API pricing is based on the number of tokens in your request and response, as well as a request fee for some models. Here is a summary of the token pricing:

| Model                 | Input Tokens ($/1M) | Output Tokens ($/1M) | Citation Tokens ($/1M) | Search Queries ($/1K) | Reasoning Tokens ($/1M) |
| --------------------- | ------------------- | -------------------- | ---------------------- | --------------------- | ----------------------- |
| **Sonar**             | $1                  | $1                   | -                      | -                     | -                       |
| **Sonar Pro**         | $3                  | $15                  | -                      | -                     | -                       |
| **Sonar Reasoning**   | $1                  | $5                   | -                      | -                     | -                       |
| **Sonar Reasoning Pro** | $2                  | $8                   | -                      | -                     | -                       |
| **Sonar Deep Research** | $2                  | $8                   | $2                     | $5                    | $3                      |

**Total cost per query** = Token costs + Request fee (varies by search context size, applies to Sonar, Sonar Pro, Sonar Reasoning, and Sonar Reasoning Pro models only)

For detailed and up-to-date pricing information, please refer to the official [Perplexity API Pricing page](https://docs.perplexity.ai/getting-started/pricing).




## 5. API Endpoints

The primary endpoint for the Perplexity API is the Chat Completions endpoint.

### POST /chat/completions

This endpoint generates a response from the model based on a given conversation.

**Request Body Parameters:**

| Parameter                | Type          | Required | Description                                                                                                                                                                                                                                                              |
| ------------------------ | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`                  | enum<string>  | required | The name of the model to use.                                                                                                                                                                                                                                            |
| `messages`               | array         | required | A list of messages comprising the conversation so far.                                                                                                                                                                                                                   |
| `stream`                 | boolean       | optional | Whether to stream the response incrementally. Defaults to `false`.                                                                                                                                                                                                       |
| `max_tokens`             | integer       | optional | The maximum number of completion tokens to return.                                                                                                                                                                                                                       |
| `temperature`            | number        | optional | The amount of randomness in the response, between 0 and 2.                                                                                                                                                                                                               |
| `top_p`                  | number        | optional | The nucleus sampling threshold, between 0 and 1.                                                                                                                                                                                                                         |
| `search_mode`            | enum<string>  | optional | Controls the search mode (`academic` or `web`).                                                                                                                                                                                                                          |
| `reasoning_effort`       | enum<string>  | optional | Controls the computational effort for deep research models (`low`, `medium`, `high`).                                                                                                                                                                                    |
| `search_domain_filter`   | array         | optional | A list of domains to limit search results to.                                                                                                                                                                                                                            |
| `return_images`          | boolean       | optional | Determines whether search results should include images.                                                                                                                                                                                                                 |
| `return_related_questions` | boolean       | optional | Determines whether related questions should be returned.                                                                                                                                                                                                                 |
| `disable_search`         | boolean       | optional | When set to `true`, disables web search completely.                                                                                                                                                                                                                      |

For a complete list of parameters, refer to the [official API reference](https://docs.perplexity.ai/api-reference/chat-completions-post).




## 6. React Examples

Here are some examples of how to use the Perplexity API in a React application.

### Streaming Responses in React

To get a more responsive user experience, you can stream responses from the Perplexity API. This allows you to display the response to the user as it is being generated, rather than waiting for the entire response to be completed.

To enable streaming, set the `stream` parameter to `true` in your API request. The response will be a stream of Server-Sent Events (SSE), which you can process in your React application.

Here is an example of a React component that streams a response from the Perplexity API:

```javascript
import React, { useState } from 'react';

const PerplexityStream = () => {
  const [response, setResponse] = useState('');

  const handleStream = async () => {
    const API_KEY = 'YOUR_API_KEY';
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'user', content: 'Explain the theory of relativity in a simple way' },
        ],
        stream: true,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let partialResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      partialResponse += chunk;
      setResponse(partialResponse);
    }
  };

  return (
    <div>
      <button onClick={handleStream}>Stream Response</button>
      <p>{response}</p>
    </div>
  );
};

export default PerplexityStream;
```

In this example, we use the Fetch API to make a POST request to the Perplexity API with `stream: true`. We then use a `ReadableStream` to read the response in chunks, decode each chunk to text, and update the component's state with the partial response. This will render the response on the screen as it is being received.




### Batching Queries in Parallel

If you have multiple independent requests, you can run them in parallel to reduce overall latency. This can be particularly useful when you need to get answers to multiple questions at once.

Here is an example of how to batch queries in parallel using `Promise.all()` in a React application:

```javascript
import React, { useState } from 'react';

const PerplexityBatch = () => {
  const [responses, setResponses] = useState([]);

  const handleBatch = async () => {
    const API_KEY = 'YOUR_API_KEY';
    const queries = [
      'What is the capital of France?',
      'Who wrote the book "To Kill a Mockingbird"?',
      'What is the formula for water?',
    ];

    const requests = queries.map(query =>
      fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [{ role: 'user', content: query }],
        }),
      }).then(res => res.json())
    );

    const results = await Promise.all(requests);
    setResponses(results);
  };

  return (
    <div>
      <button onClick={handleBatch}>Batch Queries</button>
      <ul>
        {responses.map((response, index) => (
          <li key={index}>{response.choices[0].message.content}</li>
        ))}
      </ul>
    </div>
  );
};

export default PerplexityBatch;
```

In this example, we have an array of queries that we want to send to the Perplexity API. We use the `map()` method to create an array of `fetch` promises, one for each query. We then use `Promise.all()` to wait for all of the promises to resolve. Once all of the requests are complete, we update the component's state with the array of responses.

This approach allows you to make multiple API requests concurrently, which can significantly improve the performance of your application when you need to process multiple queries.



### Error Handling

When working with the Perplexity API, it's important to handle errors gracefully. Here's an example of how to add error handling to your API requests:

```javascript
import React, { useState } from 'react';

const PerplexityWithErrorHandling = () => {
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = async (query) => {
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const API_KEY = 'YOUR_API_KEY';
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [{ role: 'user', content: query }],
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data.choices[0].message.content);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => handleQuery('What is artificial intelligence?')} disabled={loading}>
        {loading ? 'Loading...' : 'Ask Question'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {response && <p>{response}</p>}
    </div>
  );
};

export default PerplexityWithErrorHandling;
```

## 7. Best Practices

When using the Perplexity API in your React applications, consider the following best practices:

### Performance Optimization

1. **Use Streaming for Long Responses:** For queries that might generate long responses, use the streaming API feature to start displaying results as soon as they are generated.

2. **Batch Independent Queries:** If you have multiple independent requests, run them in parallel using `Promise.all()` to reduce overall latency.

3. **Choose the Right Model:** Select the most appropriate model for your use case. Use `sonar` for simple queries and `sonar-deep-research` for comprehensive research tasks.

4. **Implement Caching:** Cache responses when appropriate to reduce API calls and improve performance.

### Security

1. **Secure API Key Storage:** Never expose your API key in client-side code. Use environment variables or a backend proxy to keep your API key secure.

2. **Rate Limiting:** Implement rate limiting to avoid exceeding API limits and to manage costs.

### User Experience

1. **Loading States:** Always provide loading indicators when making API requests.

2. **Error Handling:** Implement comprehensive error handling to provide meaningful feedback to users.

3. **Progressive Enhancement:** Use streaming to provide immediate feedback and improve perceived performance.



## 8. Advanced Features

### Search Filters

The Perplexity API provides several search filters to help you get more targeted results:

```javascript
const advancedQuery = {
  model: 'sonar-pro',
  messages: [{ role: 'user', content: 'Latest developments in AI' }],
  search_mode: 'academic', // Use academic sources
  search_recency_filter: 'week', // Only recent results
  search_domain_filter: ['arxiv.org', 'nature.com'], // Specific domains
  return_images: true, // Include images in results
  return_related_questions: true, // Get related questions
};
```

### Custom React Hook

Here's a custom React hook that encapsulates Perplexity API functionality:

```javascript
import { useState, useCallback } from 'react';

const usePerplexity = (apiKey) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const query = useCallback(async (options) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const streamQuery = useCallback(async (options, onChunk) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...options, stream: true }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  return { query, streamQuery, loading, error };
};

export default usePerplexity;
```

## 9. Rate Limits and Usage Tiers

Perplexity API has different usage tiers with varying rate limits. Make sure to check the current rate limits in your API dashboard and implement appropriate rate limiting in your application to avoid hitting these limits.

## 10. References

1. [Perplexity API Documentation](https://docs.perplexity.ai/)
2. [Perplexity API Quickstart Guide](https://docs.perplexity.ai/getting-started/quickstart)
3. [Perplexity API Models](https://docs.perplexity.ai/getting-started/models)
4. [Perplexity API Pricing](https://docs.perplexity.ai/getting-started/pricing)
5. [Perplexity API Reference](https://docs.perplexity.ai/api-reference/chat-completions-post)

---

**Author:** Manus AI  
**Last Updated:** September 2025

This reference guide provides comprehensive information for integrating the Perplexity API into React applications with a focus on streaming responses and parallel batch processing. For the most up-to-date information, always refer to the official Perplexity API documentation.

