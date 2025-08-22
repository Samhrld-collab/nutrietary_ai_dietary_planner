import React, { useState, useEffect } from 'react';
import { Save, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../App';

const API_BASE = import.meta.env.VITE_API_URL;

const Preferences = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [maxCustomLength, setMaxCustomLength] = useState(500);

  const [preferences, setPreferences] = useState({
    dietary_preferences: '',
    budget: '',
    days: 3,
    meal_types: 'breakfast,lunch,dinner',
    custom_preferences: ''
  });

  const mealTypeOptions = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snacks' }
  ];

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Pescatarian',
    'Keto',
    'Paleo',
    'Mediterranean',
    'Low-carb',
    'Gluten-free',
    'Dairy-free',
    'No restrictions'
  ];

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
        if (data.preferences) {
          setPreferences({
            dietary_preferences: data.preferences.dietary_preferences || '',
            budget: data.preferences.budget || '',
            days: data.preferences.days || 3,
            meal_types: data.preferences.meal_types || 'breakfast,lunch,dinner',
            custom_preferences: data.preferences.custom_preferences || ''
          });
        }
        setMaxCustomLength(data.custom_preferences_max_length || 500);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save preferences' });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handleMealTypeChange = (mealType) => {
    const currentTypes = preferences.meal_types.split(',').filter(t => t.trim());
    let newTypes;

    if (currentTypes.includes(mealType)) {
      newTypes = currentTypes.filter(t => t !== mealType);
    } else {
      newTypes = [...currentTypes, mealType];
    }

    setPreferences(prev => ({
      ...prev,
      meal_types: newTypes.join(',')
    }));
  };

  const isMealTypeSelected = (mealType) => {
    return preferences.meal_types.split(',').includes(mealType);
  };

  const customPrefsLength = preferences.custom_preferences.length;
  const customPrefsRemaining = maxCustomLength - customPrefsLength;

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
          <h1 className="text-3xl font-bold text-gray-900">Dietary Preferences</h1>
          <p className="text-gray-600 mt-2">
            Configure your preferences to get personalized meal recommendations
          </p>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          {/* Message Display */}
          {message.text && (
            <div className={`p-4 rounded-lg flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <Info className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Dietary Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Dietary Preferences
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {dietaryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPreferences(prev => ({
                    ...prev,
                    dietary_preferences: prev.dietary_preferences === option ? '' : option
                  }))}
                  className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                    preferences.dietary_preferences === option
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or enter custom dietary preference..."
              value={preferences.dietary_preferences}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                dietary_preferences: e.target.value
              }))}
              className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekly Budget (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">RM</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="50.00"
                value={preferences.budget}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  budget: e.target.value
                }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Leave empty if you don't have a specific budget constraint
            </p>
          </div>

          {/* Number of Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Duration
            </label>
            <select
              value={preferences.days}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                days: parseInt(e.target.value)
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <option key={day} value={day}>
                  {day} day{day > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Meal Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Meal Types to Include
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {mealTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleMealTypeChange(option.value)}
                  className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                    isMealTypeSelected(option.value)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Select at least one meal type for your plan
            </p>
          </div>

          {/* Custom Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Preferences & Allergies
            </label>
            <textarea
              rows={4}
              placeholder="Add any specific requirements, allergies, cooking constraints, or personal preferences..."
              value={preferences.custom_preferences}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                custom_preferences: e.target.value
              }))}
              maxLength={maxCustomLength}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none ${
                customPrefsRemaining < 50 ? 'border-yellow-300' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">
                Examples: "Allergic to nuts and shellfish", "Prefer quick 30-min meals", "No spicy food"
              </p>
              <span className={`text-sm ${
                customPrefsRemaining < 50 ? 'text-yellow-600' :
                  customPrefsRemaining < 20 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {customPrefsRemaining} characters remaining
              </span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-blue-800">
                <h4 className="font-medium mb-1">How it works</h4>
                <ul className="text-sm space-y-1">
                  <li>• Your preferences guide our AI to create personalized meal plans</li>
                  <li>• Custom preferences are especially important for allergies and medical conditions</li>
                  <li>• You can update these settings anytime to refine your recommendations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving || !preferences.meal_types.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Preferences;