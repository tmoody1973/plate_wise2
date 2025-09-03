import { authHelpers } from '../auth-helpers'

// Mock the Supabase client
jest.mock('@/lib/supabase/client')

describe('AuthHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('signUp', () => {
    it('should handle successful sign up', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null
          })
        }
      }

      // Mock the createClient function
      require('@/lib/supabase/client').createClient = jest.fn().mockReturnValue(mockSupabase)

      const result = await authHelpers.signUp({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('should handle sign up error', async () => {
      const mockError = { message: 'Email already exists' }
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: null },
            error: mockError
          })
        }
      }

      require('@/lib/supabase/client').createClient = jest.fn().mockReturnValue(mockSupabase)

      const result = await authHelpers.signUp({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })

      expect(result.success).toBe(false)
      expect(result.error).toEqual(mockError)
    })
  })

  describe('signIn', () => {
    it('should handle successful sign in', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null
          })
        }
      }

      require('@/lib/supabase/client').createClient = jest.fn().mockReturnValue(mockSupabase)

      const result = await authHelpers.signIn({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
    })
  })
})