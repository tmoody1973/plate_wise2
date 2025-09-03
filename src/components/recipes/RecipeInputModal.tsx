'use client';

import React, { useState, useRef } from 'react';
import { X, Mic, Image as ImageIcon, Type, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { recipeAnalysisService } from '@/lib/recipes/recipe-analysis-service';
import type { RecipeParsingInput, ParsedRecipeResult } from '@/lib/recipes/recipe-analysis-service';
import type { CreateRecipeInput } from '@/lib/recipes/recipe-database-service';

interface RecipeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeParsed: (recipe: CreateRecipeInput) => void;
  language?: string;
}

type InputMethod = 'text' | 'voice' | 'image';

export function RecipeInputModal({ 
  isOpen, 
  onClose, 
  onRecipeParsed, 
  language = 'en' 
}: RecipeInputModalProps) {
  const [activeMethod, setActiveMethod] = useState<InputMethod>('text');
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParsedRecipeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset state
    setActiveMethod('text');
    setTextInput('');
    setSelectedImage(null);
    setAudioBlob(null);
    setIsRecording(false);
    setIsProcessing(false);
    setResult(null);
    setError(null);
    onClose();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setError(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processInput = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const input: RecipeParsingInput = {
        language,
      };

      switch (activeMethod) {
        case 'text':
          if (!textInput.trim()) {
            setError('Please enter recipe text');
            return;
          }
          input.text = textInput;
          break;

        case 'image':
          if (!selectedImage) {
            setError('Please select an image');
            return;
          }
          input.image = selectedImage;
          break;

        case 'voice':
          if (!audioBlob) {
            setError('Please record audio first');
            return;
          }
          input.voice = audioBlob;
          break;
      }

      const parseResult = await recipeAnalysisService.parseRecipe(input);
      setResult(parseResult);

      if (parseResult.success && parseResult.recipe) {
        // Auto-close modal and pass recipe to parent after a short delay
        setTimeout(() => {
          onRecipeParsed(parseResult.recipe!);
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to process input:', error);
      setError(error instanceof Error ? error.message : 'Failed to process input');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTextInput = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipe Text
        </label>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste or type your recipe here... Include ingredients, quantities, and instructions."
          rows={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>
      <div className="text-sm text-gray-600">
        <p className="font-medium mb-1">Tips for better parsing:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Include ingredient quantities and units</li>
          <li>Number your instructions clearly</li>
          <li>Mention cooking times and temperatures</li>
          <li>Include cultural context if relevant</li>
        </ul>
      </div>
    </div>
  );

  const renderImageInput = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipe Image
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 cursor-pointer transition-colors"
        >
          {selectedImage ? (
            <div className="space-y-2">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-gray-900">{selectedImage.name}</p>
              <p className="text-xs text-gray-500">Click to change image</p>
            </div>
          ) : (
            <div className="space-y-2">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-gray-900">Upload Recipe Image</p>
              <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Image parsing is experimental</p>
            <p>Works best with clear photos of recipe cards or printed recipes. Handwritten recipes may not parse accurately.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVoiceInput = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mb-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-orange-500 hover:bg-orange-600'
            } text-white disabled:opacity-50`}
          >
            <Mic className="w-8 h-8" />
          </button>
        </div>
        
        <div className="space-y-2">
          {isRecording ? (
            <p className="text-lg font-medium text-red-600">Recording... Click to stop</p>
          ) : audioBlob ? (
            <div className="space-y-2">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
              <p className="text-lg font-medium text-green-600">Recording complete</p>
              <button
                onClick={startRecording}
                className="text-sm text-orange-600 hover:text-orange-700"
              >
                Record again
              </button>
            </div>
          ) : (
            <p className="text-lg font-medium text-gray-600">Click to start recording</p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Voice input tips:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Speak clearly and at a moderate pace</li>
              <li>Include ingredient amounts and cooking steps</li>
              <li>Mention cooking times and temperatures</li>
              <li>Say "ingredient" before listing ingredients</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    if (result.success && result.recipe) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2" />
            <div className="flex-1">
              <h4 className="font-medium text-green-800">Recipe parsed successfully!</h4>
              <p className="text-sm text-green-700 mt-1">
                Found: {result.recipe.title}
              </p>
              {result.confidence && (
                <p className="text-xs text-green-600 mt-1">
                  Confidence: {Math.round(result.confidence * 100)}%
                </p>
              )}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-green-700">Suggestions:</p>
                  <ul className="text-xs text-green-600 list-disc list-inside">
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-green-600 mt-2">
                Redirecting to recipe form...
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Failed to parse recipe</h4>
              {result.errors && result.errors.length > 0 && (
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  const canProcess = () => {
    switch (activeMethod) {
      case 'text':
        return textInput.trim().length > 0;
      case 'image':
        return selectedImage !== null;
      case 'voice':
        return audioBlob !== null;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add Recipe</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Input Method Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Choose input method</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setActiveMethod('text')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  activeMethod === 'text'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Type className="w-8 h-8 mx-auto mb-2" />
                <span className="block font-medium">Text</span>
                <span className="text-sm text-gray-600">Type or paste recipe</span>
              </button>

              <button
                onClick={() => setActiveMethod('voice')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  activeMethod === 'voice'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Mic className="w-8 h-8 mx-auto mb-2" />
                <span className="block font-medium">Voice</span>
                <span className="text-sm text-gray-600">Record recipe</span>
              </button>

              <button
                onClick={() => setActiveMethod('image')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  activeMethod === 'image'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                <span className="block font-medium">Image</span>
                <span className="text-sm text-gray-600">Upload photo</span>
              </button>
            </div>
          </div>

          {/* Input Content */}
          <div>
            {activeMethod === 'text' && renderTextInput()}
            {activeMethod === 'image' && renderImageInput()}
            {activeMethod === 'voice' && renderVoiceInput()}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Result Display */}
          {renderResult()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={processInput}
            disabled={!canProcess() || isProcessing}
            className="inline-flex items-center px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Parse Recipe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecipeInputModal;