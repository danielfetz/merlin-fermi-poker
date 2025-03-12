// App.jsx
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import GameRoom from './components/GameRoom';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import Lobby from './components/Lobby';

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestUser, setGuestUser] = useState(null);

  useEffect(() => {
    const checkGuestUser = () => {
      const storedGuestUser = sessionStorage.getItem('guestUser');
      if (storedGuestUser) {
        try {
          const parsedGuestUser = JSON.parse(storedGuestUser);
          setGuestUser(parsedGuestUser);
        } catch (e) {
          console.error("Error parsing guest user data:", e);
          sessionStorage.removeItem('guestUser');
        }
      }
    };

    // Check for guest user in session storage
    checkGuestUser();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Set up auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Clear guest user if we have a real session
      if (session) {
        sessionStorage.removeItem('guestUser');
        sessionStorage.removeItem('guestId');
        setGuestUser(null);
      }
    });

    // Also listen for storage events to handle guest login in another tab
    const handleStorageChange = () => {
      checkGuestUser();
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Consider the user authenticated if they have a session OR are a guest
  const isAuthenticated = !!session || !!guestUser;

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Home session={session} guestUser={guestUser} supabase={supabase} /> : <Navigate to="/login" />}
          />
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login supabase={supabase} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <Register supabase={supabase} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/create-room" 
            element={isAuthenticated ? <CreateRoom session={session} guestUser={guestUser} supabase={supabase} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/join-room" 
            element={isAuthenticated ? <JoinRoom session={session} guestUser={guestUser} supabase={supabase} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/lobby/:roomId" 
            element={isAuthenticated ? <Lobby session={session} guestUser={guestUser} supabase={supabase} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/game/:roomId" 
            element={isAuthenticated ? <GameRoom session={session} guestUser={guestUser} supabase={supabase} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
