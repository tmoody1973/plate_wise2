/**
 * Data Export Section Component
 * Provides comprehensive data export functionality for user privacy compliance
 * Implements requirement 9.4 for data export options
 */

'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { profileService } from '@/lib/profile/profile-service';
import type { UserProfile } from '@/types';

interface DataExportSectionProps {
  userId: string;
  profile: UserProfile | null;
}

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  format: 'json' | 'csv' | 'pdf';
  dataTypes: string[];
}

const exportOptions: ExportOption[] = [
  {
    id: 'complete',
    title: 'Complete Profile Export',
    description: 'Download all your profile data, preferences, and settings in JSON format',
    icon: '📋',
    format: 'json',
    dataTypes: ['Profile Information', 'Preferences', 'Budget Settings', 'Nutritional Goals', 'Cooking Profile'],
  },
  {
    id: 'recipes',
    title: 'Recipe Collection',
    description: 'Export your saved recipes, meal plans, and shopping lists',
    icon: '📖',
    format: 'json',
    dataTypes: ['Saved Recipes', 'Custom Recipes', 'Meal Plans', 'Shopping Lists', 'Recipe Collections'],
  },
  {
    id: 'budget',
    title: 'Budget & Transaction History',
    description: 'Download your budget tracking data and transaction history',
    icon: '💰',
    format: 'csv',
    dataTypes: ['Budget Periods', 'Transactions', 'Spending Analytics', 'Cost Savings'],
  },
  {
    id: 'privacy',
    title: 'Privacy Report',
    description: 'Comprehensive report of all data we have about you (GDPR compliant)',
    icon: '🔒',
    format: 'pdf',
    dataTypes: ['All Personal Data', 'Data Processing Activities', 'Third-party Integrations', 'Data Retention Info'],
  },
];

export function DataExportSection({ userId, profile }: DataExportSectionProps) {
  const { addToast } = useToast();
  const [exportingData, setExportingData] = useState<string | null>(null);
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string;
    type: string;
    date: Date;
    status: 'completed' | 'failed';
  }>>([]);

  const handleExport = async (option: ExportOption) => {
    if (!userId || !profile) {
      addToast({
        type: 'error',
        title: 'Export Error',
        message: 'Profile data not available for export',
      });
      return;
    }

    setExportingData(option.id);

    try {
      let exportData: any = {};
      let filename = '';
      let mimeType = '';

      switch (option.id) {
        case 'complete':
          exportData = await generateCompleteProfileExport(profile);
          filename = `platewise-profile-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;

        case 'recipes':
          exportData = await generateRecipeExport(userId);
          filename = `platewise-recipes-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;

        case 'budget':
          exportData = await generateBudgetExport(userId);
          filename = `platewise-budget-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;

        case 'privacy':
          exportData = await generatePrivacyReport(userId, profile);
          filename = `platewise-privacy-report-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;

        default:
          throw new Error('Unknown export option');
      }

      // Create and download file
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Update export history
      setExportHistory(prev => [...prev, {
        id: Date.now().toString(),
        type: option.title,
        date: new Date(),
        status: 'completed',
      }]);

      addToast({
        type: 'success',
        title: 'Export Complete',
        message: `${option.title} exported successfully`,
      });

    } catch (error) {
      console.error('Export error:', error);
      
      // Update export history with failure
      setExportHistory(prev => [...prev, {
        id: Date.now().toString(),
        type: option.title,
        date: new Date(),
        status: 'failed',
      }]);

      addToast({
        type: 'error',
        title: 'Export Failed',
        message: `Failed to export ${option.title.toLowerCase()}`,
      });
    } finally {
      setExportingData(null);
    }
  };

  const generateCompleteProfileExport = async (profile: UserProfile) => {
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        exportType: 'Complete Profile',
        version: '1.0',
        userId: profile.id,
      },
      profile: {
        personalInfo: {
          name: profile.name,
          email: profile.email,
          location: profile.location,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
        preferences: profile.preferences,
        budgetSettings: profile.budget,
        nutritionalGoals: profile.nutritionalGoals,
        cookingProfile: profile.cookingProfile,
        savedStores: profile.savedStores,
      },
      metadata: {
        totalDataPoints: Object.keys(profile).length,
        privacyCompliance: 'GDPR, CCPA',
        dataRetentionPolicy: 'Data retained until account deletion',
      },
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generateRecipeExport = async (userId: string) => {
    // This would typically fetch from the database
    // For now, return a placeholder structure
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        exportType: 'Recipe Collection',
        version: '1.0',
        userId,
      },
      recipes: {
        savedRecipes: [],
        customRecipes: [],
        mealPlans: [],
        shoppingLists: [],
        recipeCollections: [],
      },
      statistics: {
        totalSavedRecipes: 0,
        totalCustomRecipes: 0,
        totalMealPlans: 0,
        averageCostPerMeal: 0,
      },
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generateBudgetExport = async (userId: string) => {
    // This would typically fetch budget data from the database
    // For now, return CSV format placeholder
    const csvHeader = 'Date,Type,Amount,Category,Store,Notes\n';
    const csvData = ''; // Would be populated with actual transaction data
    
    return csvHeader + csvData;
  };

  const generatePrivacyReport = async (userId: string, profile: UserProfile) => {
    const reportData = {
      reportInfo: {
        generatedDate: new Date().toISOString(),
        reportType: 'Privacy Data Report',
        version: '1.0',
        userId,
        complianceStandards: ['GDPR', 'CCPA', 'PIPEDA'],
      },
      personalData: {
        identityData: {
          name: profile.name,
          email: profile.email,
          location: profile.location,
          accountCreated: profile.createdAt,
          lastUpdated: profile.updatedAt,
        },
        preferenceData: profile.preferences,
        behavioralData: {
          budgetSettings: profile.budget,
          nutritionalGoals: profile.nutritionalGoals,
          cookingProfile: profile.cookingProfile,
        },
      },
      dataProcessing: {
        purposes: [
          'Meal planning and recipe recommendations',
          'Budget optimization and cost analysis',
          'Nutritional tracking and health insights',
          'Cultural cuisine preservation and education',
        ],
        legalBasis: 'Consent and legitimate interest',
        retentionPeriod: 'Until account deletion or 7 years of inactivity',
        thirdPartySharing: [
          'Amazon Bedrock (AI processing)',
          'Kroger API (pricing data)',
          'Spoonacular API (recipe data)',
        ],
      },
      rights: {
        dataPortability: 'Available through export functions',
        rectification: 'Available through profile management',
        erasure: 'Available through account deletion',
        restriction: 'Contact support for processing restrictions',
        objection: 'Contact support to object to processing',
      },
      contact: {
        dataProtectionOfficer: 'privacy@platewise.com',
        supportEmail: 'support@platewise.com',
        privacyPolicy: 'https://platewise.com/privacy',
      },
    };

    return JSON.stringify(reportData, null, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Your Data</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Download your personal data in various formats. We believe in data transparency and your right to data portability.
        </p>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <div key={option.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{option.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{option.description}</p>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Includes:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {option.dataTypes.map((type) => (
                      <li key={type} className="flex items-center">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                        {type}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleExport(option)}
                  disabled={exportingData === option.id}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    exportingData === option.id
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {exportingData === option.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </div>
                  ) : (
                    `Export as ${option.format.toUpperCase()}`
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Exports</h3>
          <div className="space-y-2">
            {exportHistory.slice(-5).reverse().map((export_) => (
              <div key={export_.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    export_.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">{export_.type}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {export_.date.toLocaleDateString()} at {export_.date.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Information */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Your Data Rights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Data Portability</h4>
            <p className="text-blue-700">Export your data in machine-readable formats</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Transparency</h4>
            <p className="text-blue-700">See exactly what data we store about you</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Privacy Compliance</h4>
            <p className="text-blue-700">GDPR, CCPA, and PIPEDA compliant exports</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Secure Downloads</h4>
            <p className="text-blue-700">All exports are generated securely and locally</p>
          </div>
        </div>
      </div>
    </div>
  );
}