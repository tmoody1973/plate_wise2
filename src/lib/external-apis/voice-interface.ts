/**
 * Voice Interface Service
 * Provides unified voice interaction capabilities for PlateWise
 */

import { elevenLabsService, type VoiceCommand, type CulturalVoiceProfile } from './elevenlabs-service';

export interface VoiceInteractionSession {
  id: string;
  userId: string;
  language: string;
  culturalContext: string;
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  commands: VoiceCommand[];
  audioQueue: AudioQueueItem[];
}

export interface AudioQueueItem {
  id: string;
  text: string;
  audioBuffer: ArrayBuffer;
  priority: 'high' | 'medium' | 'low';
  culturalContext?: string;
  createdAt: Date;
}

export interface VoiceNavigationAction {
  type: 'navigate' | 'search' | 'action' | 'feedback';
  target: string;
  parameters: Record<string, any>;
  confirmation?: string;
}

export interface CookingVoiceAssistant {
  currentRecipe?: string;
  currentStep?: number;
  timerActive: boolean;
  ingredientsList: string[];
  cookingMode: 'prep' | 'cooking' | 'finished' | 'idle';
}

export interface VoiceAccessibilityFeatures {
  screenReaderMode: boolean;
  slowSpeech: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
}

/**
 * Voice Interface Service
 * Manages voice interactions, commands, and accessibility features
 */
export class VoiceInterfaceService {
  private activeSessions = new Map<string, VoiceInteractionSession>();
  private audioContext: AudioContext | null = null;
  private currentPlayback: AudioBufferSourceNode | null = null;
  private cookingAssistant: CookingVoiceAssistant = {
    timerActive: false,
    ingredientsList: [],
    cookingMode: 'idle',
  };

  constructor() {
    this.initializeAudioContext();
  }

  /**
   * Initialize audio context for voice playback
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Handle audio context state changes
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  /**
   * Start a new voice interaction session
   */
  async startVoiceSession(
    userId: string,
    language: string = 'en-US',
    culturalContext: string = 'general'
  ): Promise<VoiceInteractionSession> {
    const sessionId = `voice_session_${userId}_${Date.now()}`;
    
    const session: VoiceInteractionSession = {
      id: sessionId,
      userId,
      language,
      culturalContext,
      isActive: true,
      startTime: new Date(),
      lastActivity: new Date(),
      commands: [],
      audioQueue: [],
    };

    this.activeSessions.set(sessionId, session);

    // Welcome message
    await this.speak(
      this.getWelcomeMessage(language, culturalContext),
      language,
      sessionId
    );

    return session;
  }

  /**
   * End voice interaction session
   */
  async endVoiceSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.isActive = false;
    
    // Goodbye message
    await this.speak(
      this.getGoodbyeMessage(session.language, session.culturalContext),
      session.language,
      sessionId
    );

    this.activeSessions.delete(sessionId);
  }

  /**
   * Process voice input and execute commands
   */
  async processVoiceInput(
    audioBlob: Blob,
    sessionId: string
  ): Promise<VoiceNavigationAction | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Invalid or inactive voice session');
    }

    try {
      // Process the voice command
      const command = await elevenLabsService.processVoiceCommand(audioBlob, session.language);
      
      // Update session
      session.commands.push(command);
      session.lastActivity = new Date();

      // Execute the command
      const action = await this.executeVoiceCommand(command, session);
      
      // Provide audio feedback
      if (action && action.confirmation) {
        await this.speak(action.confirmation, session.language, sessionId);
      }

      return action;
    } catch (error) {
      console.error('Voice input processing failed:', error);
      
      // Provide error feedback
      await this.speak(
        this.getErrorMessage(session.language),
        session.language,
        sessionId
      );
      
      return null;
    }
  }

  /**
   * Execute voice command and return navigation action
   */
  private async executeVoiceCommand(
    command: VoiceCommand,
    session: VoiceInteractionSession
  ): Promise<VoiceNavigationAction | null> {
    switch (command.intent) {
      case 'search_recipe':
        return this.handleRecipeSearch(command, session);
      
      case 'add_ingredient':
        return this.handleAddIngredient(command, session);
      
      case 'start_cooking':
        return this.handleStartCooking(command, session);
      
      case 'set_timer':
        return this.handleSetTimer(command, session);
      
      case 'navigate':
        return this.handleNavigation(command, session);
      
      case 'help':
        return this.handleHelp(command, session);
      
      default:
        return this.handleUnknownCommand(command, session);
    }
  }

  /**
   * Handle recipe search voice command
   */
  private async handleRecipeSearch(
    command: VoiceCommand,
    session: VoiceInteractionSession
  ): Promise<VoiceNavigationAction> {
    const query = command.parameters.query || '';
    
    return {
      type: 'search',
      target: '/recipes',
      parameters: {
        q: query,
        voice_search: true,
      },
      confirmation: `Searching for ${query} recipes. Here are some options for you.`,
    };
  }

  /**
   * Handle add ingredient voice command
   */
  private async handleAddIngredient(
    command: VoiceCommand,
    session: VoiceInteractionSession
  ): Promise<VoiceNavigationAction> {
    const ingredient = command.parameters.ingredient || '';
    
    if (ingredient) {
      this.cookingAssistant.ingredientsList.push(ingredient);
    }
    
    return {
      type: 'action',
      target: 'shopping_list',
      parameters: {
        action: 'add_ingredient',
        ingredient,
      },
      confirmation: `Added ${ingredient} to your shopping list.`,
    };
  }

  /**
   * Handle start cooking voice command
   */
  private async handleStartCooking(
    command: VoiceCommand,
    session: VoiceInteractionSession
  ): Promise<VoiceNavigationAction> {
    this.cookingAssistant.cookingMode = 'prep';
    this.cookingAssistant.currentStep = 1;
    
    return {
      type: 'action',
      target: 'cooking_mode',
      parameters: {
        action: 'start_cooking',
        recipe_id: command.parameters.recipe_id,
      },
      confirmation: 'Starting cooking mode. I\'ll guide you through each step.',
    };
  }

  /**
   * Handle set timer voice command
   */
  private async handleSetTimer(
    command: VoiceCommand,
    session: VoiceInteractionSession
  ): Promise<VoiceNavigationAction> {
    const duration = command.parameters.duration || 0;
    const unit = command.parameters.unit || 'minutes';
    
    this.cookingAssistant.timerActive = true;
    
    return {
      type: 'action',
      target: 'timer',
      parameters: {
        action: 'set_timer',
        duration,
        unit,
      },
      confirmation: `Timer set for ${duration} ${unit}.`,
    };
  }

  /**
   * Handle navigation voice command
   */
  private async handleNavigation(
    command: VoiceCommand,
    session: VoiceInteractionSession
  ): Promise<VoiceNavigationAction> {
    const destination = command.parameters.destination || '';
    const route = this.mapDestinationToRoute(destination);
    
    return {
      type: 'navigate',
      target: route,
      parameters: {},
      confirmation: `Navigating to ${destination}.`,
    };
  }

  /**
   * Handle help voice command
   */
  private async handleHelp(
    command: VoiceCommand,
    session: VoiceInteractionSession
  ): Promise<VoiceNavigationAction> {
    const helpText = this.getHelpText(session.language);
    
    return {
      type: 'feedback',
      target: 'help',
      parameters: {
        help_text: helpText,
      },
      confirmation: helpText,
    };
  }

  /**
   * Handle unknown voice command
   */
  private async handleUnknownCommand(
    command: VoiceCommand,
    session: VoiceInteractionSession
  ): Promise<VoiceNavigationAction> {
    return {
      type: 'feedback',
      target: 'error',
      parameters: {
        original_text: command.originalText,
      },
      confirmation: 'I didn\'t understand that. Try saying "help" to see what I can do.',
    };
  }

  /**
   * Convert text to speech and play audio
   */
  async speak(
    text: string,
    language: string = 'en-US',
    sessionId?: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    try {
      const audioBuffer = await elevenLabsService.textToSpeech(text, language);
      
      if (sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
          const queueItem: AudioQueueItem = {
            id: `audio_${Date.now()}`,
            text,
            audioBuffer,
            priority,
            culturalContext: session.culturalContext,
            createdAt: new Date(),
          };
          
          session.audioQueue.push(queueItem);
          await this.processAudioQueue(sessionId);
        }
      } else {
        await this.playAudio(audioBuffer);
      }
    } catch (error) {
      console.error('Speech synthesis failed:', error);
    }
  }

  /**
   * Process audio queue for session
   */
  private async processAudioQueue(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.audioQueue.length === 0) return;

    // Sort by priority
    session.audioQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const nextItem = session.audioQueue.shift();
    if (nextItem) {
      await this.playAudio(nextItem.audioBuffer);
      
      // Process next item after current finishes
      if (session.audioQueue.length > 0) {
        setTimeout(() => this.processAudioQueue(sessionId), 100);
      }
    }
  }

  /**
   * Play audio buffer
   */
  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    try {
      // Stop current playback
      if (this.currentPlayback) {
        this.currentPlayback.stop();
      }

      // Decode and play audio
      const decodedBuffer = await this.audioContext.decodeAudioData(audioBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(this.audioContext.destination);
      
      this.currentPlayback = source;
      source.start();

      // Clean up when finished
      source.onended = () => {
        this.currentPlayback = null;
      };
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  }

  /**
   * Stop current audio playback
   */
  stopAudio(): void {
    if (this.currentPlayback) {
      this.currentPlayback.stop();
      this.currentPlayback = null;
    }
  }

  /**
   * Read recipe instructions aloud
   */
  async readRecipeInstructions(
    instructions: string[],
    language: string = 'en-US',
    sessionId?: string
  ): Promise<void> {
    for (let i = 0; i < instructions.length; i++) {
      const stepText = `Step ${i + 1}: ${instructions[i]}`;
      await this.speak(stepText, language, sessionId, 'high');
      
      // Pause between steps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Provide cooking guidance with voice
   */
  async provideCookingGuidance(
    recipeId: string,
    currentStep: number,
    language: string = 'en-US',
    sessionId?: string
  ): Promise<void> {
    // This would integrate with recipe service to get step details
    const guidance = `Now for step ${currentStep}. Take your time and let me know when you're ready for the next step.`;
    await this.speak(guidance, language, sessionId, 'high');
  }

  /**
   * Enable accessibility features
   */
  enableAccessibilityFeatures(features: Partial<VoiceAccessibilityFeatures>): void {
    // Implementation would integrate with UI components
    console.log('Accessibility features enabled:', features);
  }

  /**
   * Get cultural voice profile for language
   */
  getCulturalVoiceProfile(language: string): CulturalVoiceProfile | null {
    return elevenLabsService.getCulturalVoiceProfile(language);
  }

  /**
   * Helper methods for message generation
   */
  private getWelcomeMessage(language: string, culturalContext: string): string {
    const messages: Record<string, string> = {
      'en-US': 'Welcome to PlateWise! I\'m your cooking assistant. You can ask me to search for recipes, add ingredients, or help with cooking.',
      'es-ES': 'Bienvenido a PlateWise! Soy tu asistente de cocina. Puedes pedirme que busque recetas, añada ingredientes o te ayude a cocinar.',
      'fr-FR': 'Bienvenue à PlateWise! Je suis votre assistant culinaire. Vous pouvez me demander de chercher des recettes, ajouter des ingrédients ou vous aider à cuisiner.',
      'de-DE': 'Willkommen bei PlateWise! Ich bin Ihr Kochassistent. Sie können mich bitten, Rezepte zu suchen, Zutaten hinzuzufügen oder beim Kochen zu helfen.',
      'it-IT': 'Benvenuto a PlateWise! Sono il tuo assistente culinario. Puoi chiedermi di cercare ricette, aggiungere ingredienti o aiutarti a cucinare.',
      'zh-CN': '欢迎来到PlateWise！我是您的烹饪助手。您可以要求我搜索食谱、添加配料或帮助烹饪。',
    };

    return messages[language] || messages['en-US']!;
  }

  private getGoodbyeMessage(language: string, culturalContext: string): string {
    const messages: Record<string, string> = {
      'en-US': 'Thank you for using PlateWise! Happy cooking!',
      'es-ES': '¡Gracias por usar PlateWise! ¡Feliz cocina!',
      'fr-FR': 'Merci d\'utiliser PlateWise! Bonne cuisine!',
      'de-DE': 'Danke, dass Sie PlateWise verwenden! Viel Spaß beim Kochen!',
      'it-IT': 'Grazie per aver usato PlateWise! Buona cucina!',
      'zh-CN': '感谢您使用PlateWise！祝您烹饪愉快！',
    };

    return messages[language] || messages['en-US']!;
  }

  private getErrorMessage(language: string): string {
    const messages: Record<string, string> = {
      'en-US': 'Sorry, I didn\'t understand that. Please try again or say "help" for assistance.',
      'es-ES': 'Lo siento, no entendí eso. Por favor intenta de nuevo o di "ayuda" para asistencia.',
      'fr-FR': 'Désolé, je n\'ai pas compris. Veuillez réessayer ou dire "aide" pour de l\'assistance.',
      'de-DE': 'Entschuldigung, das habe ich nicht verstanden. Bitte versuchen Sie es erneut oder sagen Sie "Hilfe".',
      'it-IT': 'Scusa, non ho capito. Per favore riprova o di "aiuto" per assistenza.',
      'zh-CN': '抱歉，我没有理解。请重试或说"帮助"寻求协助。',
    };

    return messages[language] || messages['en-US']!;
  }

  private getHelpText(language: string): string {
    const helpTexts: Record<string, string> = {
      'en-US': 'I can help you with: searching for recipes, adding ingredients to your shopping list, setting cooking timers, and navigating the app. Just speak naturally!',
      'es-ES': 'Puedo ayudarte con: buscar recetas, añadir ingredientes a tu lista de compras, poner temporizadores de cocina y navegar por la aplicación. ¡Solo habla naturalmente!',
      'fr-FR': 'Je peux vous aider avec: chercher des recettes, ajouter des ingrédients à votre liste de courses, régler des minuteries de cuisine et naviguer dans l\'application. Parlez naturellement!',
      'de-DE': 'Ich kann Ihnen helfen mit: Rezepte suchen, Zutaten zu Ihrer Einkaufsliste hinzufügen, Kochzeiten einstellen und in der App navigieren. Sprechen Sie einfach natürlich!',
      'it-IT': 'Posso aiutarti con: cercare ricette, aggiungere ingredienti alla tua lista della spesa, impostare timer di cottura e navigare nell\'app. Parla naturalmente!',
      'zh-CN': '我可以帮助您：搜索食谱、将配料添加到购物清单、设置烹饪计时器以及导航应用程序。请自然地说话！',
    };

    return helpTexts[language] || helpTexts['en-US']!;
  }

  private mapDestinationToRoute(destination: string): string {
    const routeMap: Record<string, string> = {
      'recipes': '/recipes',
      'shopping': '/shopping',
      'meal plans': '/meal-plans',
      'budget': '/budget',
      'profile': '/profile',
      'dashboard': '/dashboard',
      'help': '/help',
    };

    const normalizedDestination = destination.toLowerCase();
    return routeMap[normalizedDestination] || '/dashboard';
  }

  /**
   * Get active voice sessions
   */
  getActiveSessions(): VoiceInteractionSession[] {
    return Array.from(this.activeSessions.values()).filter(session => session.isActive);
  }

  /**
   * Get cooking assistant state
   */
  getCookingAssistantState(): CookingVoiceAssistant {
    return { ...this.cookingAssistant };
  }

  /**
   * Update cooking assistant state
   */
  updateCookingAssistantState(updates: Partial<CookingVoiceAssistant>): void {
    Object.assign(this.cookingAssistant, updates);
  }
}

/**
 * Singleton instance of VoiceInterfaceService
 */
export const voiceInterfaceService = new VoiceInterfaceService();