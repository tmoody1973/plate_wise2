'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/logo';

export function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Logo variant="primary" size="md" />
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/sign-in')}
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push('/sign-in')}
                className="bg-gray-900 text-white px-6 py-2 rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-semibold text-gray-900 mb-6 leading-tight uppercase" style={{fontWeight: 600}}>
                COOK WITH CULTURE,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
                  SAVE WITH WISDOM
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 sm:mb-12 max-w-3xl lg:max-w-none mx-auto lg:mx-0 leading-relaxed px-4 lg:px-0">
                Discover authentic recipes from your heritage while optimizing your grocery budget with AI-powered meal planning
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => router.push('/sign-in')}
                  className="bg-gradient-to-r from-rose-500 to-orange-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Start planning meals
                </button>
                <button
                  onClick={() => router.push('/sign-in')}
                  className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                >
                  Learn more
                </button>
              </div>
            </div>

            {/* Right side - Food image */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Main circular food image */}
                <div className="w-80 h-80 sm:w-96 sm:h-96 lg:w-[450px] lg:h-[450px] rounded-full overflow-hidden shadow-2xl border-8 border-white">
                  <img 
                    src="/assets/images/cultural-food-hero.png" 
                    alt="Traditional Ethiopian cuisine with injera bread and colorful dishes being shared by hands, representing cultural food traditions and community dining"
                    className="w-full h-full object-cover"
                  />
                </div>



                {/* Decorative elements */}
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-yellow-200 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute -top-8 -left-8 w-16 h-16 bg-rose-200 rounded-full opacity-40 animate-bounce"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-4000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-yellow-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-semibold text-gray-900 mb-4 uppercase" style={{fontWeight: 600}}>
              EVERYTHING YOU NEED FOR SMART MEAL PLANNING
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Combine cultural authenticity with budget optimization using our AI-powered platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cultural Recipes */}
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-1 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-rose-200 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-10 h-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-heading font-semibold text-gray-900 mb-4 leading-tight uppercase" style={{fontWeight: 600}}>CULTURAL RECIPES</h3>
              <p className="text-gray-600 leading-relaxed">
                Discover authentic recipes from Mediterranean, Asian, Latin American, African, and Middle Eastern cuisines with cultural context and traditional techniques.
              </p>
            </div>

            {/* Budget Optimization */}
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-1 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-2xl font-heading font-semibold text-gray-900 mb-4 leading-tight uppercase" style={{fontWeight: 600}}>SMART BUDGET TRACKING</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-powered budget optimization that finds the best deals, suggests cost-effective ingredients, and helps you save money without compromising on quality.
              </p>
            </div>

            {/* Meal Planning */}
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-1 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-heading font-semibold text-gray-900 mb-4 leading-tight uppercase" style={{fontWeight: 600}}>AI MEAL PLANNING</h3>
              <p className="text-gray-600 leading-relaxed">
                Personalized weekly meal plans that balance your cultural preferences, dietary restrictions, cooking skills, and budget constraints.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cultural Themes Showcase */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-semibold text-gray-900 mb-4 uppercase" style={{fontWeight: 600}}>
              CELEBRATE YOUR CULINARY HERITAGE
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from beautifully designed cultural themes that reflect your food traditions
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
            {/* Mediterranean */}
            <div className="group cursor-pointer">
              <div className="relative rounded-2xl h-32 mb-4 group-hover:scale-105 transition-transform duration-200 overflow-hidden">
                <img 
                  src="/images/cultural-themes/mediterranean-food.jpg" 
                  alt="Mediterranean cuisine with olives, lemons, and traditional ingredients"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-200"></div>
              </div>
              <h3 className="text-center font-heading font-semibold text-gray-900 uppercase" style={{fontWeight: 600}}>MEDITERRANEAN</h3>
            </div>

            {/* Asian */}
            <div className="group cursor-pointer">
              <div className="bg-gradient-to-br from-red-400 to-purple-500 rounded-2xl p-6 h-32 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                <span className="text-4xl">🥢</span>
              </div>
              <h3 className="text-center font-heading font-semibold text-gray-900 uppercase" style={{fontWeight: 600}}>ASIAN</h3>
            </div>

            {/* Latin American */}
            <div className="group cursor-pointer">
              <div className="bg-gradient-to-br from-pink-400 to-blue-500 rounded-2xl p-6 h-32 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                <span className="text-4xl">🌶️</span>
              </div>
              <h3 className="text-center font-heading font-semibold text-gray-900 uppercase" style={{fontWeight: 600}}>LATIN AMERICAN</h3>
            </div>

            {/* African */}
            <div className="group cursor-pointer">
              <div className="bg-gradient-to-br from-orange-500 to-yellow-400 rounded-2xl p-6 h-32 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                <span className="text-4xl">🌍</span>
              </div>
              <h3 className="text-center font-heading font-semibold text-gray-900 uppercase" style={{fontWeight: 600}}>AFRICAN</h3>
            </div>

            {/* Middle Eastern */}
            <div className="group cursor-pointer">
              <div className="bg-gradient-to-br from-purple-500 to-teal-500 rounded-2xl p-6 h-32 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                <span className="text-4xl">🕌</span>
              </div>
              <h3 className="text-center font-heading font-semibold text-gray-900 uppercase" style={{fontWeight: 600}}>MIDDLE EASTERN</h3>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-semibold text-gray-900 mb-4 uppercase" style={{fontWeight: 600}}>
              HOW PLATEWISE WORKS
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes and transform your meal planning experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-heading font-semibold text-gray-900 mb-4 uppercase" style={{fontWeight: 600}}>SET YOUR PREFERENCES</h3>
              <p className="text-gray-600 leading-relaxed">
                Tell us about your cultural background, dietary restrictions, cooking skills, and budget goals. Our AI learns your preferences to create personalized recommendations.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-heading font-semibold text-gray-900 mb-4 uppercase" style={{fontWeight: 600}}>GET SMART MEAL PLANS</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive weekly meal plans that balance authentic cultural recipes with your budget constraints. Each plan includes shopping lists and cost breakdowns.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-heading font-semibold text-gray-900 mb-4 uppercase" style={{fontWeight: 600}}>COOK & SAVE</h3>
              <p className="text-gray-600 leading-relaxed">
                Follow step-by-step recipes with cultural context, track your spending, and discover new ways to save money while honoring your food traditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-heading font-semibold text-gray-900 mb-6 uppercase" style={{fontWeight: 600}}>
            READY TO TRANSFORM YOUR KITCHEN?
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Join thousands of families who are saving money while celebrating their culinary heritage
          </p>
          <button
            onClick={() => router.push('/sign-in')}
            className="bg-gradient-to-r from-rose-500 to-orange-500 text-white px-12 py-4 rounded-full text-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Start your culinary journey
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Free to get started • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <Logo variant="white" size="md" />
              <p className="text-gray-400 mt-2">
                Culturally-aware meal planning and budget optimization
              </p>
            </div>
            <div className="flex space-x-8">
              <button
                onClick={() => router.push('/sign-in')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push('/sign-in')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Get started
              </button>
              <button
                onClick={() => router.push('/help')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Help
              </button>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 PlateWise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
