// components/QuestionManagement.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash, Check, X, Search } from 'lucide-react';

const QuestionManagement = ({ session, supabase }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    question_text: '',
    hint1: '',
    hint2: '',
    correct_answer: '',
    category: '',
    difficulty: 3
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        
        // Check if user is admin
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) throw profileError;
        setIsAdmin(profileData.is_admin === true);
        
        // Fetch questions
        let query = supabase
          .from('questions')
          .select('*');
          
        // If not admin, only show approved questions or user's own questions
        if (!profileData.is_admin) {
          query = query.or(`is_approved.eq.true,created_by.eq.${session.user.id}`);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        setQuestions(data);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(q => q.category))].filter(Boolean);
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Error fetching questions:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [session, supabase]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'difficulty' ? parseInt(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const questionData = {
        ...formData,
        created_by: session.user.id,
        is_approved: isAdmin // Auto-approve if admin
      };
      
      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);
          
        if (error) throw error;
      } else {
        // Insert new question
        const { error } = await supabase
          .from('questions')
          .insert([questionData]);
          
        if (error) throw error;
      }
      
      // Reset form and refresh questions
      setFormData({
        question_text: '',
        hint1: '',
        hint2: '',
        correct_answer: '',
        category: '',
        difficulty: 3
      });
      setShowAddForm(false);
      setEditingQuestion(null);
      
      // Refetch questions
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setQuestions(data);
      
      // Update categories
      const uniqueCategories = [...new Set(data.map(q => q.category))].filter(Boolean);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error saving question:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question) => {
    setFormData({
      question_text: question.question_text,
      hint1: question.hint1,
      hint2: question.hint2,
      correct_answer: question.correct_answer,
      category: question.category || '',
      difficulty: question.difficulty || 3
    });
    setEditingQuestion(question);
    setShowAddForm(true);
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);
        
      if (error) throw error;
      
      // Remove from local state
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (error) {
      console.error('Error deleting question:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (questionId, currentStatus) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('questions')
        .update({ is_approved: !currentStatus })
        .eq('id', questionId);
        
      if (error) throw error;
      
      // Update local state
      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, is_approved: !currentStatus } : q
      ));
    } catch (error) {
      console.error('Error approving question:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      question_text: '',
      hint1: '',
      hint2: '',
      correct_answer: '',
      category: '',
      difficulty: 3
    });
    setEditingQuestion(null);
    setShowAddForm(false);
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          question.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || question.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container p-4 mx-auto">
        <Link to="/" className="inline-flex items-center mb-6 text-gray-400 hover:text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Link>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-400">Question Management</h1>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus size={20} className="mr-2" />
              Add New Question
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {showAddForm ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingQuestion ? 'Edit Question' : 'Add New Question'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="question_text" className="block mb-1 text-sm font-medium text-gray-300">
                  Question Text
                </label>
                <textarea
                  id="question_text"
                  name="question_text"
                  value={formData.question_text}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What is the distance between Earth and Mars in kilometers?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="hint1" className="block mb-1 text-sm font-medium text-gray-300">
                    First Hint
                  </label>
                  <textarea
                    id="hint1"
                    name="hint1"
                    value={formData.hint1}
                    onChange={handleInputChange}
                    required
                    rows={2}
                    className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Earth is 1 AU (149.6 million km) from the Sun"
                  />
                </div>
                <div>
                  <label htmlFor="hint2" className="block mb-1 text-sm font-medium text-gray-300">
                    Second Hint
                  </label>
                  <textarea
                    id="hint2"
                    name="hint2"
                    value={formData.hint2}
                    onChange={handleInputChange}
                    required
                    rows={2}
                    className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mars is 1.52 AU from the Sun"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="correct_answer" className="block mb-1 text-sm font-medium text-gray-300">
                    Correct Answer
                  </label>
                  <input
                    id="correct_answer"
                    name="correct_answer"
                    type="number"
                    step="any"
                    value={formData.correct_answer}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="225000000"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block mb-1 text-sm font-medium text-gray-300">
                    Category
                  </label>
                  <input
                    id="category"
                    name="category"
                    type="text"
                    list="categories"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Astronomy"
                  />
                  <datalist id="categories">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="difficulty" className="block mb-1 text-sm font-medium text-gray-300">
                    Difficulty (1-5)
                  </label>
                  <select
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 - Very Easy</option>
                    <option value={2}>2 - Easy</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - Hard</option>
                    <option value={5}>5 - Very Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {loading ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full pl-10 pr-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
              </div>
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="py-8 text-center text-gray-400">Loading questions...</div>
              ) : filteredQuestions.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  No questions found. {!showAddForm && <button onClick={() => setShowAddForm(true)} className="text-blue-400 hover:underline">Add one</button>}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Question
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Difficulty
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredQuestions.map((question) => (
                      <tr key={question.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{question.question_text.length > 80 ? `${question.question_text.substring(0, 80)}...` : question.question_text}</div>
                          <div className="text-sm text-gray-400">Answer: {question.correct_answer}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{question.category || 'Uncategorized'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {Array(question.difficulty || 3).fill('★').join('')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {question.is_approved ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-300">
                              Approved
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-900 text-yellow-300">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {isAdmin && (
                              <button
                                onClick={() => handleApprove(question.id, question.is_approved)}
                                className={`p-1.5 rounded ${question.is_approved ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                                title={question.is_approved ? 'Unapprove' : 'Approve'}
                              >
                                {question.is_approved ? <X size={16} /> : <Check size={16} />}
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(question)}
                              className="p-1.5 bg-blue-600 rounded hover:bg-blue-700"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            {(isAdmin || question.created_by === session.user.id) && (
                              <button
                                onClick={() => handleDelete(question.id)}
                                className="p-1.5 bg-red-600 rounded hover:bg-red-700"
                                title="Delete"
                              >
                                <Trash size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuestionManagement;
