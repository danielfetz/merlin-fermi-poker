// components/NavBar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Award, HelpCircle, Settings } from 'lucide-react';

const NavBar = ({ session, supabase, user, guestUser }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    // If guest user, clear from session storage
    if (guestUser) {
      sessionStorage.removeItem('guestUser');
      window.location.reload();
    } 
    // Otherwise sign out through Supabase
    else {
      await supabase.auth.signOut();
    }
    navigate('/login');
  };

  const isGuest = !!guestUser;
  const displayUser = guestUser || user;

  return (
    <nav className="bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-yellow-400">Fermi Poker</h1>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Home
                </Link>
                <Link
                  to="/create-room"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Create Game
                </Link>
                <Link
                  to="/join-room"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Join Game
                </Link>
                <Link
                  to="/questions"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Questions
                </Link>
                <Link
                  to="/leaderboard"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Leaderboard
                </Link>
                <Link
                  to="/rules"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  How to Play
                </Link>
              </div>
            </div>
          </div>
          
          {displayUser && (
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="max-w-xs bg-gray-700 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {displayUser.username.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  
                  {isProfileOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                      <div className="px-4 py-2 border-b border-gray-600">
                        <p className="text-sm font-medium text-white">
                          {displayUser.username}
                          {isGuest && <span className="ml-2 text-xs text-yellow-400">(Guest)</span>}
                        </p>
                        <p className="text-xs text-gray-300 flex items-center">
                          <Award size={12} className="inline text-yellow-400 mr-1" />
                          {displayUser.games_won || 0} wins / {displayUser.games_played || 0} games
                        </p>
                        <p className="text-xs text-gray-300 flex items-center mt-1">
                          <span className="inline text-yellow-400 mr-1">$</span>
                          {displayUser.chips_balance || 1000} chips
                        </p>
                      </div>
                      
                      {!isGuest && (
                        <>
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 flex items-center"
                          >
                            <User size={16} className="mr-2" />
                            Your Profile
                          </Link>
                          <Link
                            to="/settings"
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 flex items-center"
                          >
                            <Settings size={16} className="mr-2" />
                            Settings
                          </Link>
                        </>
                      )}
                      
                      {isGuest && (
                        <Link
                          to="/register"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 flex items-center"
                        >
                          <User size={16} className="mr-2" />
                          Create Account
                        </Link>
                      )}
                      
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 flex items-center"
                      >
                        <LogOut size={16} className="mr-2" />
                        {isGuest ? 'Exit Guest Mode' : 'Sign out'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-gray-700 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/create-room"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Create Game
            </Link>
            <Link
              to="/join-room"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Join Game
            </Link>
            <Link
              to="/questions"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Questions
            </Link>
            <Link
              to="/leaderboard"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Leaderboard
            </Link>
            <Link
              to="/rules"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              How to Play
            </Link>
          </div>
          
          {displayUser && (
            <div className="pt-4 pb-3 border-t border-gray-700">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {displayUser.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium leading-none text-white">
                    {displayUser.username}
                    {isGuest && <span className="ml-2 text-xs text-yellow-400">(Guest)</span>}
                  </div>
                  <div className="text-sm font-medium leading-none text-gray-400 mt-1">
                    ${displayUser.chips_balance || 1000} chips
                  </div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                {!isGuest && (
                  <>
                    <Link
                      to="/profile"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Your Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  </>
                )}
                
                {isGuest && (
                  <Link
                    to="/register"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Create Account
                  </Link>
                )}
                
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  {isGuest ? 'Exit Guest Mode' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default NavBar;
