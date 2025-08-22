import React, {useState, useEffect} from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  ChefHat,
  ShoppingCart,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import {useAuth} from '../App';

const API_BASE = import.meta.env.VITE_API_URL;

const MealPlans = () => {
  const {token} = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(10);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, [page]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/mealplans?page=${page}&per_page=${perPage}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    setDeletingPlan(planId);

    try {
      const response = await fetch(`${API_BASE}/mealplans/${planId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove the deleted plan from state
        setPlans(prevPlans => prevPlans.filter(plan => plan.id !== planId));
        setTotal(prevTotal => prevTotal - 1);

        // If we deleted the expanded plan, close the expansion
        if (expandedPlan === planId) {
          setExpandedPlan(null);
        }

        // If this was the last plan on the current page and we're not on page 1, go back a page
        if (plans.length === 1 && page > 1) {
          setPage(page - 1);
        }
      } else {
        const data = await response.json();
        console.error('Failed to delete meal plan:', data.error);
      }
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
    } finally {
      setDeletingPlan(null);
      setShowDeleteModal(false);
      setPlanToDelete(null);
    }
  };

  const openDeleteModal = (plan) => {
    setPlanToDelete(plan);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPlanToDelete(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const togglePlanExpansion = (planId) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  const totalPages = Math.ceil(total / perPage);

  // Delete Confirmation Modal
  const DeleteModal = () => {
    if (!showDeleteModal || !planToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600"/>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Meal Plan</h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete this meal plan?
              </p>
              <p className="font-medium text-gray-900 mt-2">
                "{planToDelete.title || 'Untitled Meal Plan'}"
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={closeDeleteModal}
                disabled={deletingPlan === planToDelete.id}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePlan(planToDelete.id)}
                disabled={deletingPlan === planToDelete.id}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deletingPlan === planToDelete.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4"/>
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Meal Plan Card Component
  const MealPlanCard = ({plan}) => {
    const isExpanded = expandedPlan === plan.id;
    const planData = typeof plan.plan === 'object' ? plan.plan : null;
    const groceryData = typeof plan.grocery_list === 'object' ? plan.grocery_list : null;

    return (
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {plan.title || 'Untitled Meal Plan'}
              </h3>
              <p className="text-gray-600 flex items-center">
                <Calendar className="h-4 w-4 mr-1"/>
                Created on {formatDate(plan.created_at)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openDeleteModal(plan)}
                disabled={deletingPlan === plan.id}
                className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium rounded-lg transition-colors disabled:opacity-50"
                title="Delete meal plan"
              >
                {deletingPlan === plan.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <Trash2 className="h-4 w-4"/>
                )}
              </button>
              <button
                onClick={() => togglePlanExpansion(plan.id)}
                className="flex items-center space-x-2 px-4 py-2 text-green-600 hover:text-green-700 font-medium rounded-lg hover:bg-green-50 transition-colors"
              >
                <span>{isExpanded ? 'Collapse' : 'View Details'}</span>
                {isExpanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {planData && planData.days && (
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1"/>
                {planData.days.length} days
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <ChefHat className="h-4 w-4 mr-1"/>
                {planData.days.reduce((total, day) => total + (day.meals ? day.meals.length : 0), 0)} meals
              </div>
              {groceryData && (
                <div className="flex items-center text-sm text-gray-600">
                  <ShoppingCart className="h-4 w-4 mr-1"/>
                  {groceryData.length} grocery items
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-6">
            {planData && planData.days ? (
              <div className="space-y-6">
                {/* Meal Plan Days */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2"/>
                    Meal Plan
                  </h4>

                  <div className="space-y-6">
                    {planData.days.map((day, dayIndex) => (
                      <div key={dayIndex} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-3">{day.day}</h5>

                        {day.meals && day.meals.length > 0 ? (
                          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                            {day.meals.map((meal, mealIndex) => (
                              <div key={mealIndex} className="bg-white rounded-md p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full uppercase">
                                    {meal.type}
                                  </span>
                                  {meal.servings && (
                                    <span className="text-xs text-gray-500 flex items-center">
                                      <Users className="h-3 w-3 mr-1"/>
                                      {meal.servings} servings
                                    </span>
                                  )}
                                </div>

                                <h6 className="font-medium text-gray-900 mb-2">{meal.name}</h6>

                                {meal.approx_prep_time_minutes && (
                                  <p className="text-xs text-gray-500 mb-2 flex items-center">
                                    <Clock className="h-3 w-3 mr-1"/>
                                    ~{meal.approx_prep_time_minutes} minutes
                                  </p>
                                )}

                                {/* Ingredients */}
                                {meal.ingredients && meal.ingredients.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-xs font-medium text-gray-700 mb-1">Ingredients:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {meal.ingredients.slice(0, 4).map((ingredient, ingIndex) => (
                                        <span key={ingIndex}
                                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                          {ingredient.name} {ingredient.qty && `(${ingredient.qty})`}
                                        </span>
                                      ))}
                                      {meal.ingredients.length > 4 && (
                                        <span className="text-xs text-gray-500">
                                          +{meal.ingredients.length - 4} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Recipe */}
                                {meal.recipe && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-700 mb-1">Recipe:</p>
                                    <p className="text-xs text-gray-600 line-clamp-3">
                                      {meal.recipe}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No meals planned for this day</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grocery List */}
                {groceryData && groceryData.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2"/>
                      Grocery List
                    </h4>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groceryData.map((item, index) => (
                          <div key={index}
                               className="flex items-center space-x-3 bg-white rounded-md p-3 border border-gray-200">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.item}</p>
                              {item.qty && (
                                <p className="text-sm text-gray-600">Quantity: {item.qty}</p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-gray-500">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4"/>
                <p className="text-gray-500">Plan details are not available or could not be parsed.</p>
                <p className="text-sm text-gray-400 mt-2">
                  This might be due to an incomplete generation or parsing error.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Meal Plans</h1>
        </div>

        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-28"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delete Modal */}
      <DeleteModal/>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Meal Plans</h1>
          <p className="text-gray-600 mt-2">
            {total > 0 ? `${total} meal plan${total > 1 ? 's' : ''} generated` : 'No meal plans yet'}
          </p>
        </div>

        {total > 0 && (
          <div className="text-sm text-gray-500">
            Showing {((page - 1) * perPage) + 1}-{Math.min(page * perPage, total)} of {total}
          </div>
        )}
      </div>

      {/* Meal Plans List */}
      {plans.length > 0 ? (
        <div className="space-y-6">
          {plans.map((plan) => (
            <MealPlanCard key={plan.id} plan={plan}/>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-6">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex space-x-1">
                {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        page === pageNum
                          ? 'bg-green-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4"/>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No meal plans yet</h3>
          <p className="text-gray-600 mb-6">
            You haven't generated any meal plans yet. Create your first AI-powered meal plan to get started!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#/generate"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <ChefHat className="h-5 w-5 mr-2"/>
              Generate Your First Plan
            </a>
            <a
              href="#/preferences"
              className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Set Up Preferences
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlans;