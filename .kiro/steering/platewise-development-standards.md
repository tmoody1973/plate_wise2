# PlateWise Development Standards

## Cultural Sensitivity Guidelines

### Code and Content Standards
- Always use inclusive language in variable names, comments, and user-facing text
- Respect cultural food traditions and avoid stereotypes or oversimplifications
- When implementing cultural features, prioritize authenticity over convenience
- Include cultural context and significance when displaying traditional recipes
- Ensure ingredient substitutions maintain cultural authenticity when possible

### UI/UX Cultural Considerations
- Use culturally appropriate colors and patterns that respect traditions
- Avoid cultural appropriation in design elements
- Provide proper attribution for traditional recipes and cooking methods
- Support right-to-left languages for Arabic and Hebrew users
- Consider cultural dietary restrictions beyond common allergies

## Technical Standards

### Code Quality
- Use TypeScript for all new code with strict type checking
- Follow Next.js 14 best practices for app router and server components
- Implement proper error boundaries and graceful degradation
- Use Tailwind CSS utility classes consistently with the bento design system
- Write comprehensive JSDoc comments for all functions and components

### Performance Requirements
- All pages must achieve Lighthouse scores: Performance >90, Accessibility >95
- Implement proper image optimization for recipe photos
- Use React.memo and useMemo for expensive calculations
- Implement proper loading states and skeleton screens
- Cache API responses appropriately with Redis

### Security Standards
- Never expose API keys in client-side code
- Use Supabase Row Level Security (RLS) for all database operations
- Validate all user inputs on both client and server side
- Implement proper CORS policies for external API calls
- Use HTTPS for all external API communications

## AI Integration Guidelines

### Amazon Bedrock Usage
- Always include cultural context in AI prompts for meal planning
- Implement proper error handling for AI service failures
- Use structured prompts with clear instructions for consistent results
- Cache AI responses when appropriate to reduce costs
- Provide fallback options when AI services are unavailable

### Voice Feature Standards
- Support multiple languages with proper pronunciation guides
- Implement clear voice command feedback and confirmation
- Provide visual alternatives for all voice-only features
- Test voice features across different accents and speech patterns
- Ensure voice features work in noisy environments

## API Integration Standards

### External API Management
- Implement proper rate limiting and retry logic
- Use circuit breaker patterns for unreliable APIs
- Cache API responses with appropriate TTL values
- Provide meaningful error messages for API failures
- Monitor API usage and costs regularly

### Data Handling
- Normalize ingredient names across different APIs
- Handle currency conversions for international users
- Implement proper data validation for all external data
- Store API responses in consistent formats
- Handle API versioning and deprecation gracefully

## Testing Requirements

### Unit Testing
- Achieve minimum 80% code coverage for business logic
- Test all cultural authenticity scoring algorithms
- Mock external API calls in unit tests
- Test edge cases for recipe scaling and cost calculations
- Validate multi-language functionality

### Integration Testing
- Test complete user workflows from signup to meal planning
- Verify API integrations work correctly with real data
- Test cultural theme switching and persistence
- Validate voice features across different browsers
- Test accessibility features with screen readers

## Accessibility Standards

### WCAG 2.1 AA Compliance
- Ensure all interactive elements are keyboard accessible
- Provide proper ARIA labels for complex UI components
- Maintain color contrast ratios of at least 4.5:1
- Support screen readers with semantic HTML
- Provide alternative text for all images and icons

### Multi-language Accessibility
- Support screen readers in multiple languages
- Provide proper language attributes for content
- Ensure cultural patterns don't interfere with readability
- Test with assistive technologies in different languages
- Provide clear navigation for right-to-left languages