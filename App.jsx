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

// Initialize Supabase client - replace with your own Supabase URL and anon key
const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseKey = 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route
            path="/"
            element={session ? <Home session={session} supabase={supabase} /> : <Navigate to="/login" />}
          />
          <Route 
            path="/login" 
            element={!session ? <Login supabase={supabase} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/register" 
            element={!session ? <Register supabase={supabase} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/create-room" 
            element={session ? <CreateRoom session={session} supabase={supabase} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/join-room" 
            element={session ? <JoinRoom session={session} supabase={supabase} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/lobby/:roomId" 
            element={session ? <Lobby session={session} supabase={supabase} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/game/:roomId" 
            element={session ? <GameRoom session={session} supabase={supabase} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
