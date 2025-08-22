import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, Clock, DollarSign, Calendar, ChefHat, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { useAuth } from '../App';

const API_BASE = import.meta.env.VITE_API_URL;

const Generate = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [overrides, setOverrides] = useState({
    days: '',
    preferences: {
      dietary_preferences: '',
      budget: '',
      meal_types: '',
      custom_preferences: ''
    }
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE}/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setMessage({ type: '', text: '' });

    try {
      // Prepare the request body
      const requestBody = {};

      if (overrides.days) {
        requestBody.days = parseInt(overrides.days);
      }

      // Only include non-empty preference overrides
      const prefOverrides = {};
      Object.keys(overrides.preferences).forEach(key => {
        if (overrides.preferences[key]) {
          prefOverrides[key] = overrides.preferences[key];
        }
      });

      if (Object.keys(prefOverrides).length > 0) {
        requestBody.preferences = prefOverrides;
      }

      const response = await fetch(`${API_BASE}/generate_mealplan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Meal plan generated successfully! Redirecting to your meal plans...'
        });

        // Redirect after a short delay
        setTimeout(() => {
          navigate('/meal-plans');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate meal plan' });
      }
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setGenerating(false);
    }
  };

  const getCurrentSettings = () => {
    if (!preferences) return null;

    return {
      dietary: overrides.preferences.dietary_preferences || preferences.dietary_preferences || 'Not set',
      budget: overrides.preferences.budget || preferences.budget || 'No limit',
      days: overrides.days || preferences.days || 3,
      mealTypes: (overrides.preferences.meal_types || preferences.meal_types || '').split(',').filter(t => t.trim()),
      custom: overrides.preferences.custom_preferences || preferences.custom_preferences || ''
    };
  };

  const currentSettings = getCurrentSettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="px-8 py-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Wand2 className="h-8 w-8 mr-3 text-green-600" />
            Generate Meal Plan
          </h1>
          <p className="text-gray-600 mt-2">
            Create a personalized meal plan using AI based on your preferences
          </p>
        </div>

        <div className="p-8">
          {/* Message Display */}
          {message.text && (
            <div className={`p-4 rounded-lg flex items-center space-x-2 mb-6 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Current Settings Display */}
          {currentSettings && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Current Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <ChefHat className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Dietary Preference</p>
                      <p className="font-medium text-gray-900">{currentSettings.dietary}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Budget</p>
                      <p className="font-medium text-gray-900">
                        {currentSettings.budget === 'No limit' ? currentSettings.budget : `RM${currentSettings.budget}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">{currentSettings.days} days</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Meal Types</p>
                      <p className="font-medium text-gray-900">
                        {currentSettings.mealTypes.length > 0 ? currentSettings.mealTypes.join(', ') : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {currentSettings.custom && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Custom Preferences & Allergies</p>
                  <p className="font-medium text-gray-900 mt-1">{currentSettings.custom}</p>
                </div>
              )}
            </div>
          )}

          {/* Override Form */}
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-blue-800">
                  <h4 className="font-medium mb-1">Quick Overrides (Optional)</h4>
                  <p className="text-sm">
                    You can temporarily override your saved preferences for this generation only.
                    Leave fields empty to use your saved preferences.
                  </p>
                </div>
              </div>
            </div>

            {/* Days Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Plan Duration
              </label>
              <select
                value={overrides.days}
                onChange={(e) => setOverrides(prev => ({
                  ...prev,
                  days: e.target.value
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Use saved preference ({preferences?.days || 3} days)</option>
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <option key={day} value={day}>
                    {day} day{day > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dietary Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Dietary Preference
              </label>
              <input
                type="text"
                placeholder={`Leave empty to use: ${preferences?.dietary_preferences || 'your saved preference'}`}
                value={overrides.preferences.dietary_preferences}
                onChange={(e) => setOverrides(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    dietary_preferences: e.target.value
                  }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Budget Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">RM</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Leave empty to use saved budget${preferences?.budget ? ` (RM${preferences.budget})` : ''}`}
                  value={overrides.preferences.budget}
                  onChange={(e) => setOverrides(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      budget: e.target.value
                    }
                  }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Custom Preferences Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Custom Preferences
              </label>
              <textarea
                rows={3}
                placeholder="Add temporary custom requirements for this generation only..."
                value={overrides.preferences.custom_preferences}
                onChange={(e) => setOverrides(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    custom_preferences: e.target.value
                  }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={generating || !preferences}
                className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold text-lg rounded-xl hover:from-green-700 hover:to-blue-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
              >
                <Wand2 className={`h-6 w-6 ${generating ? 'animate-spin' : ''}`} />
                <span>
                  {generating ? 'Generating Your Meal Plan...' : 'Generate Meal Plan'}
                </span>
              </button>
            </div>

            {generating && (
              <div className="text-center mt-4">
                <p className="text-gray-600">
                  This may take a few moments while our AI creates your personalized meal plan...
                </p>
              </div>
            )}
          </form>

          {/* No Preferences Warning */}
          {!preferences && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-yellow-800">
                  <h4 className="font-medium mb-1">No preferences set</h4>
                  <p className="text-sm mb-3">
                    You haven't set up your dietary preferences yet. We recommend setting them up first for better results.
                  </p>
                  <button
                    onClick={() => navigate('/preferences')}
                    className="text-sm bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 transition-colors"
                  >
                    Set Preferences Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Generate;