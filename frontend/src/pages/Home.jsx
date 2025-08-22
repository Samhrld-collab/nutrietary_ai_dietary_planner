import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Settings, Plus, BookOpen, Clock, Users } from 'lucide-react';
import { useAuth } from '../App';

const API_BASE = import.meta.env.VITE_API_URL;

const Home = () => {
  const { user, token } = useAuth();
  const [recentPlans, setRecentPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlans: 0,
    thisWeek: 0
  });

  useEffect(() => {
    fetchRecentPlans();
  }, []);

  const fetchRecentPlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/mealplans?per_page=3`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentPlans(data.plans || []);
        setStats({
          totalPlans: data.total || 0,
          thisWeek: data.plans?.filter(plan => {
            const planDate = new Date(plan.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return planDate >= weekAgo;
          }).length || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch recent plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Generate New Plan',
      description: 'Create a personalized meal plan with AI',
      icon: Plus,
      link: '/generate',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'View All Plans',
      description: 'Browse your meal planning history',
      icon: BookOpen,
      link: '/meal-plans',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Update Preferences',
      description: 'Modify your dietary preferences',
      icon: Settings,
      link: '/preferences',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center space-x-4 mb-4">
          <ChefHat className="h-12 w-12" />
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.username}!</h1>
            <p className="text-green-100 mt-2">
              Ready to plan some delicious and healthy meals?
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Plans</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalPlans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Clock className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.thisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">AI Generated</p>
              <p className="text-2xl font-semibold text-gray-900">100%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 group"
              >
                <div className={`inline-flex p-3 rounded-lg text-white ${action.color} group-hover:scale-110 transition-transform`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-4 group-hover:text-green-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-gray-600 mt-2">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Meal Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Meal Plans</h2>
          <Link
            to="/meal-plans"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : recentPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {plan.title || 'Untitled Meal Plan'}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {formatDate(plan.created_at)}
                  </span>
                </div>

                {plan.plan && typeof plan.plan === 'object' && plan.plan.days ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {plan.plan.days.length} days planned
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {plan.plan.days.slice(0, 2).map((day, dayIndex) => (
                        <div key={dayIndex}>
                          {day.meals?.slice(0, 2).map((meal, mealIndex) => (
                            <span
                              key={mealIndex}
                              className="inline-block text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mr-1 mb-1"
                            >
                              {meal.name}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Plan details unavailable</p>
                )}

                <Link
                  to={`/meal-plans`}
                  className="mt-4 inline-block text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No meal plans yet</h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first AI-powered meal plan!
            </p>
            <Link
              to="/generate"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Generate Your First Plan
            </Link>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Pro Tips</h3>
        <ul className="space-y-2 text-blue-800">
          <li>• Update your preferences regularly to get better meal suggestions</li>
          <li>• Include specific allergies in your custom preferences for safer meal plans</li>
          <li>• Try different budget ranges to discover new meal options</li>
          <li>• Save your favorite meal plans for easy reference</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;