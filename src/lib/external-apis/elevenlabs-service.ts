/**
 * ElevenLabs API Integration
 * Provides text-to-speech, voice synthesis, and multilingual voice features
 */

// Types for ElevenLabs API integration
export interface Voice {
  voice_id: string;
  name: string;
  samples: VoiceSample[];
  category: string;
  fine_tuning: {
    language?: string;
    is_allowed_to_fine_tune: boolean;
    finetuning_requested: boolean;
    finetuning_state: string;
    verification_attempts: any[];
    verification_failures: string[];
    verification_attempts_count: number;
    slice_ids: string[];
    manual_verification: any;
    manual_verification_requested: boolean;
  };
  labels: Record<string, string>;
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: VoiceSettings;
  sharing: {
    status: string;
    history_item_sample_id: string;
    original_voice_id: string;
    public_owner_id: string;
    liked_by_count: number;
    cloned_by_count: number;
    name: string;
    description: string;
    labels: Record<string, string>;
    review_status: string;
    review_message: string;
    enabled_in_library: boolean;
  };
  high_quality_base_model_ids: string[];
}

export interface VoiceSample {
  sample_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface GenerationConfig {
  chunk_length_schedule?: number[];
  use_speaker_boost?: boolean;
}

export interface TTSRequest {
  text: string;
  voice_id?: string;
  model_id?: string;
  voice_settings?: VoiceSettings;
  generation_config?: GenerationConfig;
  seed?: number;
  previous_text?: string;
  next_text?: string;
  previous_request_ids?: string[];
  next_request_ids?: string[];
}

export interface VoiceCloneRequest {
  name: string;
  description?: string;
  files: File[];
  labels?: Record<string, string>;
}

export interface HistoryItem {
  history_item_id: string;
  request_id: string;
  voice_id: string;
  voice_name: string;
  voice_category: string;
  text: string;
  date_unix: number;
  character_count_change_from: number;
  character_count_change_to: number;
  content_type: string;
  state: string;
  settings: VoiceSettings;
  feedback: {
    thumbs_up: boolean;
    feedback: string;
    emotions: boolean;
    inaccurate_clone: boolean;
    glitches: boolean;
    audio_quality: boolean;
    other: boolean;
    review_status: string;
  };
  share_link_id: string;
  source: string;
}

export interface UserSubscription {
  tier: string;
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
  voice_limit: number;
  max_voice_add_edits: number;
  voice_add_edit_counter: number;
  professional_voice_limit: number;
  can_extend_voice_limit: boolean;
  can_use_instant_voice_cloning: boolean;
  can_use_professional_voice_cloning: boolean;
  currency: string;
  status: string;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface VoiceCommand {
  intent: 'search_recipe' | 'add_ingredient' | 'start_cooking' | 'set_timer' | 'navigate' | 'help' | 'unknown';
  parameters: Record<string, any>;
  confidence: number;
  originalText: string;
  language: string;
}

export interface CulturalVoiceProfile {
  language: string;
  region: string;
  voiceId: string;
  voiceName: string;
  culturalContext: string;
  pronunciationGuides: Record<string, string>;
  commonPhrases: Record<string, string>;
}

/**
 * ElevenLabs Voice Service
 * Handles text-to-speech, voice commands, and multilingual voice features
 */
export class ElevenLabsService {
  private baseURL = 'https://api.elevenlabs.io/v1';
  private apiKey: string;
  private requestCount = 0;
  private characterCount = 0;
  private monthlyLimit = 10000; // Free tier character limit
  private lastResetDate = new Date().toDateString();

  // Predefined voice mappings for different languages and cultural contexts
  private culturalVoices: Record<string, CulturalVoiceProfile> = {
    'en-US': {
      language: 'en',
      region: 'US',
      voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
      voiceName: 'Adam',
      culturalContext: 'American English',
      pronunciationGuides: {},
      commonPhrases: {
        'welcome': 'Welcome to PlateWise',
        'cooking_time': 'Cooking time',
        'ingredients': 'Ingredients',
        'instructions': 'Instructions',
      },
    },
    'es-ES': {
      language: 'es',
      region: 'ES',
      voiceId: 'VR6AewLTigWG4xSOukaG', // Arnold
      voiceName: 'Arnold',
      culturalContext: 'Spanish',
      pronunciationGuides: {
        'quinoa': 'KEE-no-ah',
        'jalapeño': 'ha-la-PEH-nyo',
      },
      commonPhrases: {
        'welcome': 'Bienvenido a PlateWise',
        'cooking_time': 'Tiempo de cocción',
        'ingredients': 'Ingredientes',
        'instructions': 'Instrucciones',
      },
    },
    'fr-FR': {
      language: 'fr',
      region: 'FR',
      voiceId: 'rNtGKTTMq6GQlzROqNyQ', // Bella
      voiceName: 'Bella',
      culturalContext: 'French',
      pronunciationGuides: {
        'roux': 'roo',
        'bouquet garni': 'boo-KAY gar-NEE',
      },
      commonPhrases: {
        'welcome': 'Bienvenue à PlateWise',
        'cooking_time': 'Temps de cuisson',
        'ingredients': 'Ingrédients',
        'instructions': 'Instructions',
      },
    },
    'de-DE': {
      language: 'de',
      region: 'DE',
      voiceId: 'yoZ06aMxZJJ28mfd3POQ', // Sam
      voiceName: 'Sam',
      culturalContext: 'German',
      pronunciationGuides: {},
      commonPhrases: {
        'welcome': 'Willkommen bei PlateWise',
        'cooking_time': 'Kochzeit',
        'ingredients': 'Zutaten',
        'instructions': 'Anweisungen',
      },
    },
    'it-IT': {
      language: 'it',
      region: 'IT',
      voiceId: 'AZnzlk1XvdvUeBnXmlld', // Domi
      voiceName: 'Domi',
      culturalContext: 'Italian',
      pronunciationGuides: {
        'bruschetta': 'broo-SKET-tah',
        'gnocchi': 'NYOH-kee',
      },
      commonPhrases: {
        'welcome': 'Benvenuto a PlateWise',
        'cooking_time': 'Tempo di cottura',
        'ingredients': 'Ingredienti',
        'instructions': 'Istruzioni',
      },
    },
    'zh-CN': {
      language: 'zh',
      region: 'CN',
      voiceId: 'XrExE9yKIg1WjnnlVkGX', // Matilda
      voiceName: 'Matilda',
      culturalContext: 'Mandarin Chinese',
      pronunciationGuides: {},
      commonPhrases: {
        'welcome': '欢迎来到PlateWise',
        'cooking_time': '烹饪时间',
        'ingredients': '配料',
        'instructions': '说明',
      },
    },
  };

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }
  }

  /**
   * Check usage limits before making requests
   */
  private checkUsageLimits(textLength: number): void {
    const today = new Date().toDateString();
    
    if (today !== this.lastResetDate) {
      this.requestCount = 0;
      this.characterCount = 0;
      this.lastResetDate = today;
    }
    
    if (this.characterCount + textLength > this.monthlyLimit) {
      throw new Error(`Monthly character limit reached for ElevenLabs (${this.monthlyLimit} characters)`);
    }
    
    this.requestCount++;
    this.characterCount += textLength;
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'xi-api-key': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Handle binary responses (audio)
      if (response.headers.get('content-type')?.includes('audio')) {
        return response.arrayBuffer() as Promise<T>;
      }

      return await response.json();
    } catch (error) {
      console.error(`ElevenLabs API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Convert text to speech with cultural voice selection
   */
  async textToSpeech(
    text: string,
    language: string = 'en-US',
    voiceSettings?: Partial<VoiceSettings>
  ): Promise<ArrayBuffer> {
    this.checkUsageLimits(text.length);

    const culturalVoice = this.culturalVoices[language] || this.culturalVoices['en-US'];
    const voiceId = culturalVoice?.voiceId || 'pNInz6obpgDQGcFmaJgB'; // Default voice

    const request: TTSRequest = {
      text: this.preprocessTextForCulture(text, language),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true,
        ...voiceSettings,
      },
    };

    try {
      return await this.makeRequest<ArrayBuffer>(
        `/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );
    } catch (error) {
      console.error('Text-to-speech conversion failed:', error);
      throw new Error(`Failed to convert text to speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream text-to-speech for real-time playback
   */
  async streamTextToSpeech(
    text: string,
    language: string = 'en-US',
    onChunk?: (chunk: ArrayBuffer) => void
  ): Promise<void> {
    this.checkUsageLimits(text.length);

    const culturalVoice = this.culturalVoices[language] || this.culturalVoices['en-US'];
    const voiceId = culturalVoice?.voiceId || 'pNInz6obpgDQGcFmaJgB'; // Default voice

    const request: TTSRequest = {
      text: this.preprocessTextForCulture(text, language),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        use_speaker_boost: true,
      },
    };

    try {
      const response = await fetch(`${this.baseURL}/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Streaming failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (onChunk && value) {
          onChunk(value.buffer);
        }
      }
    } catch (error) {
      console.error('Streaming text-to-speech failed:', error);
      throw error;
    }
  }

  /**
   * Get available voices with cultural filtering
   */
  async getVoices(): Promise<Voice[]> {
    try {
      const response = await this.makeRequest<{ voices: Voice[] }>('/voices');
      return response.voices;
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Get voice details by ID
   */
  async getVoice(voiceId: string): Promise<Voice | null> {
    try {
      return await this.makeRequest<Voice>(`/voices/${voiceId}`);
    } catch (error) {
      console.error(`Failed to get voice ${voiceId}:`, error);
      return null;
    }
  }

  /**
   * Clone a voice from audio samples
   */
  async cloneVoice(request: VoiceCloneRequest): Promise<Voice | null> {
    try {
      const formData = new FormData();
      formData.append('name', request.name);
      
      if (request.description) {
        formData.append('description', request.description);
      }
      
      if (request.labels) {
        formData.append('labels', JSON.stringify(request.labels));
      }

      request.files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      const response = await fetch(`${this.baseURL}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Voice cloning failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Voice cloning failed:', error);
      return null;
    }
  }

  /**
   * Process voice commands with intent recognition
   */
  async processVoiceCommand(
    audioBlob: Blob,
    language: string = 'en-US'
  ): Promise<VoiceCommand> {
    try {
      // First, convert speech to text (using Web Speech API or external service)
      const transcription = await this.speechToText(audioBlob, language);
      
      // Then, analyze the text for intent
      return this.analyzeIntent(transcription.text, language);
    } catch (error) {
      console.error('Voice command processing failed:', error);
      return {
        intent: 'unknown',
        parameters: {},
        confidence: 0,
        originalText: '',
        language,
      };
    }
  }

  /**
   * Convert speech to text (simplified implementation)
   */
  async speechToText(audioBlob: Blob, language: string = 'en-US'): Promise<SpeechToTextResult> {
    // This is a simplified implementation
    // In a real application, you would use a speech-to-text service
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const result = event.results[0];
        resolve({
          text: result[0].transcript,
          confidence: result[0].confidence,
          language,
          duration: 0, // Would need to calculate from audio
        });
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      // Convert blob to audio and start recognition
      const audio = new Audio(URL.createObjectURL(audioBlob));
      recognition.start();
    });
  }

  /**
   * Analyze text for cooking-related intents
   */
  private analyzeIntent(text: string, language: string): VoiceCommand {
    const lowerText = text.toLowerCase();
    
    // Define intent patterns for different languages
    const intentPatterns = {
      'en-US': {
        search_recipe: ['find recipe', 'search for', 'look for recipe', 'recipe for'],
        add_ingredient: ['add ingredient', 'include', 'add to list'],
        start_cooking: ['start cooking', 'begin recipe', 'let\'s cook'],
        set_timer: ['set timer', 'timer for', 'remind me in'],
        navigate: ['go to', 'open', 'show me'],
        help: ['help', 'how to', 'what can you do'],
      },
      'es-ES': {
        search_recipe: ['buscar receta', 'encontrar receta', 'receta de'],
        add_ingredient: ['añadir ingrediente', 'agregar', 'incluir'],
        start_cooking: ['empezar a cocinar', 'comenzar receta'],
        set_timer: ['poner temporizador', 'cronómetro'],
        navigate: ['ir a', 'abrir', 'mostrar'],
        help: ['ayuda', 'cómo', 'qué puedes hacer'],
      },
    };

    const patterns = intentPatterns[language as keyof typeof intentPatterns] || intentPatterns['en-US'];
    
    // Check for intent matches
    for (const [intent, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return {
            intent: intent as VoiceCommand['intent'],
            parameters: this.extractParameters(text, intent),
            confidence: 0.8,
            originalText: text,
            language,
          };
        }
      }
    }

    return {
      intent: 'unknown',
      parameters: {},
      confidence: 0.1,
      originalText: text,
      language,
    };
  }

  /**
   * Extract parameters from voice command text
   */
  private extractParameters(text: string, intent: string): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    switch (intent) {
      case 'search_recipe':
        // Extract recipe name or cuisine
        const recipeMatch = text.match(/(?:recipe for|find|search for)\s+(.+)/i);
        if (recipeMatch && recipeMatch[1]) {
          parameters.query = recipeMatch[1].trim();
        }
        break;
        
      case 'add_ingredient':
        // Extract ingredient name
        const ingredientMatch = text.match(/(?:add|include)\s+(.+?)(?:\s+to|$)/i);
        if (ingredientMatch && ingredientMatch[1]) {
          parameters.ingredient = ingredientMatch[1].trim();
        }
        break;
        
      case 'set_timer':
        // Extract time duration
        const timeMatch = text.match(/(\d+)\s*(minute|minutes|hour|hours|second|seconds)/i);
        if (timeMatch && timeMatch[1] && timeMatch[2]) {
          parameters.duration = parseInt(timeMatch[1]);
          parameters.unit = timeMatch[2].toLowerCase();
        }
        break;
        
      case 'navigate':
        // Extract destination
        const navMatch = text.match(/(?:go to|open|show me)\s+(.+)/i);
        if (navMatch && navMatch[1]) {
          parameters.destination = navMatch[1].trim();
        }
        break;
    }
    
    return parameters;
  }

  /**
   * Preprocess text for cultural pronunciation
   */
  private preprocessTextForCulture(text: string, language: string): string {
    const culturalVoice = this.culturalVoices[language];
    if (!culturalVoice) return text;

    let processedText = text;

    // Apply pronunciation guides
    Object.entries(culturalVoice.pronunciationGuides).forEach(([word, pronunciation]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processedText = processedText.replace(regex, pronunciation);
    });

    // Add pauses for better speech rhythm
    processedText = processedText.replace(/[,;]/g, ', <break time="0.3s"/>');
    processedText = processedText.replace(/[.!?]/g, '. <break time="0.5s"/>');

    return processedText;
  }

  /**
   * Get cultural voice profile for language
   */
  getCulturalVoiceProfile(language: string): CulturalVoiceProfile | null {
    return this.culturalVoices[language] || null;
  }

  /**
   * Add custom cultural voice profile
   */
  addCulturalVoiceProfile(language: string, profile: CulturalVoiceProfile): void {
    this.culturalVoices[language] = profile;
  }

  /**
   * Get pronunciation guide for ingredient in specific language
   */
  getIngredientPronunciation(ingredient: string, language: string): string {
    const culturalVoice = this.culturalVoices[language];
    if (!culturalVoice) return ingredient;

    return culturalVoice.pronunciationGuides[ingredient.toLowerCase()] || ingredient;
  }

  /**
   * Generate cooking instruction audio with cultural context
   */
  async generateCookingInstructionAudio(
    instruction: string,
    language: string = 'en-US',
    culturalContext?: string
  ): Promise<ArrayBuffer> {
    let enhancedInstruction = instruction;

    // Add cultural context if provided
    if (culturalContext) {
      const culturalVoice = this.culturalVoices[language];
      if (culturalVoice && culturalVoice.commonPhrases[culturalContext]) {
        enhancedInstruction = `${culturalVoice.commonPhrases[culturalContext]}. ${instruction}`;
      }
    }

    return this.textToSpeech(enhancedInstruction, language, {
      stability: 0.7, // More stable for instructions
      similarity_boost: 0.6,
      style: 0.2, // Slight style for engagement
    });
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    requestCount: number;
    characterCount: number;
    monthlyLimit: number;
    remaining: number;
  } {
    return {
      requestCount: this.requestCount,
      characterCount: this.characterCount,
      monthlyLimit: this.monthlyLimit,
      remaining: this.monthlyLimit - this.characterCount,
    };
  }

  /**
   * Get user subscription information
   */
  async getUserSubscription(): Promise<UserSubscription | null> {
    try {
      return await this.makeRequest<UserSubscription>('/user/subscription');
    } catch (error) {
      console.error('Failed to get user subscription:', error);
      return null;
    }
  }

  /**
   * Get generation history
   */
  async getHistory(pageSize: number = 100): Promise<HistoryItem[]> {
    try {
      const response = await this.makeRequest<{ history: HistoryItem[] }>(
        `/history?page_size=${pageSize}`
      );
      return response.history;
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }
}

/**
 * Singleton instance of ElevenLabsService
 */
export const elevenLabsService = new ElevenLabsService();