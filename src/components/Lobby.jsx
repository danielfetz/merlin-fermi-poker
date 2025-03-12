// components/Lobby.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Users, DollarSign, ChevronDown, ChevronUp, PlayCircle, Share2 } from 'lucide-react';

const Lobby = ({ session, guestUser, supabase }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  console.log("Lobby component mounted with roomId:", roomId);
  console.log("Session:", session);
  console.log("Guest user:", guestUser);

  // Function to fetch room data - defined outside useEffect so it can be called from polling
  const fetchRoomData = async () => {
    console.log("Beginning fetchRoomData function");
    try {
      console.log("Fetching room data for ID:", roomId);
      
      // Get room details
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error("Room error:", roomError);
        throw roomError;
      }
      
      console.log("Room data successfully retrieved:", roomData);
      setRoom(roomData);

      // Determine user ID - regular user or guest
      let userId;
      if (session && session.user) {
        userId = session.user.id;
        console.log("Using authenticated user ID:", userId);
      } else if (sessionStorage.getItem('guestId')) {
        userId = sessionStorage.getItem('guestId'); // Use plain UUID without prefix
        console.log("Using guest user ID:", userId);
      } else {
        // Not authenticated and not a guest, redirect to login
        console.error("No user ID found - not authenticated and not guest");
        navigate('/login');
        return;
      }

      // Get players in the room
      console.log("Fetching players for room:", roomId);
      const { data: playersData, error: playersError } = await supabase
        .from('room_players')
        .select('*')  // Just select all fields without any joins
        .eq('room_id', roomId);

      if (playersError) {
        console.error("Players error:", playersError);
        throw playersError;
      }
      
      console.log("Players data successfully retrieved:", playersData);
      
      // Get usernames for each player
      const enhancedPlayers = await Promise.all(
        playersData.map(async (player) => {
          // Check if player has metadata (guest)
          if (player.metadata && player.metadata.username) {
            console.log("Player is a guest with metadata:", player.metadata);
            return {
              ...player,
              profiles: { username: player.metadata.username }
            };
          } 
          // Otherwise fetch username from profiles
          else {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', player.user_id)
                .single();
              
              if (profileError) {
                console.error("Error fetching profile for user:", player.user_id, profileError);
                return {
                  ...player,
                  profiles: { username: 'Unknown User' }
                };
              }
              
              return {
                ...player,
                profiles: { username: profileData.username }
              };
            } catch (e) {
              console.error("Error in profile fetch:", e);
              return {
                ...player,
                profiles: { username: 'Unknown User' }
              };
            }
          }
        })
      );
      
      console.log("Enhanced players data:", enhancedPlayers);
      setPlayers(enhancedPlayers);

      console.log("Current user ID:", userId);
      console.log("Looking for user in players...");
      
      // Check if current user is in this room
      const currentPlayer = enhancedPlayers.find(player => {
        console.log("Comparing player ID:", player.user_id, "with user ID:", userId);
        return player.user_id === userId;
      });
      
      if (currentPlayer) {
        console.log("Current player found:", currentPlayer);
        setIsHost(currentPlayer.is_host);
      } else {
        console.warn("User not found in room players - redirecting to home");
        // User is not in this room, redirect to home
        navigate('/');
        return;
      }

      // Check if game has already started
      if (roomData.status === 'in_progress') {
        console.log("Game in progress - redirecting to game room");
        window.location.href = `/game/${roomId}`;
      }
    } catch (error) {
      console.error('Error fetching room data:', error);
      setError(error.message);
      // Navigate back home on error
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    console.log("Lobby useEffect running");
    fetchRoomData();

    // Set up subscriptions for real-time updates
    console.log("Setting up real-time subscriptions");
    
    // Set up a better player subscription that listens to all changes on room_players table
    const playerChannelName = `lobby-players-${roomId}`;
    console.log(`Creating player channel: ${playerChannelName}`);
    
    const playerChannel = supabase
      .channel(playerChannelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        console.log("Room players change detected:", payload);
        fetchRoomData();
      })
      .subscribe((status) => {
        console.log(`Player channel status: ${status}`);
      });

    // Set up room status subscription
    const roomChannelName = `lobby-room-${roomId}`;
    console.log(`Creating room channel: ${roomChannelName}`);
    
    const roomChannel = supabase
      .channel(roomChannelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        console.log("Room data change detected:", payload);
        
        // If room status changes to in_progress, navigate to game
        if (payload.new && payload.new.status === 'in_progress') {
          console.log("Room status changed to in_progress - navigating to game");
          window.location.href = `/game/${roomId}`;
        } else {
          fetchRoomData();
        }
      })
      .subscribe((status) => {
        console.log(`Room channel status: ${status}`);
      });

    return () => {
      console.log("Cleaning up subscriptions");
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, session, supabase, navigate]);

  // Add a polling mechanism for real-time backup
  useEffect(() => {
    console.log("Setting up polling as backup for real-time updates");
    
    // Poll for room and player updates every 3 seconds
    const pollingInterval = setInterval(() => {
      if (!loading) {
        fetchRoomData();
      }
    }, 3000);
    
    return () => {
      clearInterval(pollingInterval);
    };
  }, [loading]); // Only dependency is loading state

  // Add dedicated room status checker
  useEffect(() => {
    console.log("Setting up dedicated room status checker");
    
    const checkRoomStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('status')
          .eq('id', roomId)
          .single();
          
        if (error) {
          console.error("Error checking room status:", error);
          return;
        }
        
        if (data && data.status === 'in_progress') {
          console.log("Room status is in_progress, navigating to game");
          // Use window.location for a hard redirect to ensure it works
          window.location.href = `/game/${roomId}`;
        }
      } catch (e) {
        console.error("Error in room status check:", e);
      }
    };
    
    // Check every 2 seconds
    const statusInterval = setInterval(checkRoomStatus, 2000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, [roomId]);

  const handleStartGame = async () => {
    console.log("handleStartGame called");
    if (!isHost) return;

    try {
      // Check if there are at least 2 players
      if (players.length < 2) {
        setError('Need at least 2 players to start the game');
        return;
      }

      // 1. Fetch a random question first
      console.log("Fetching a random question");
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .limit(1)
        .single();
        
      if (questionError) {
        console.error("Error fetching random question:", questionError);
        alert("Could not fetch a question. Please try again.");
        return;
      }
      
      console.log("Got question:", questionData);

      // 2. Create game state with the question
      console.log("Creating game state");
      const { data: gameStateData, error: gameStateError } = await supabase
        .from('game_states')
        .insert([
          {
            room_id: roomId,
            current_stage: 'question',
            pot: room.small_blind + room.big_blind,
            current_bet: room.big_blind,
            current_player_index: 2 % players.length,
            current_question_id: questionData.id,
            timer_end: new Date(Date.now() + 60000).toISOString() // 60 seconds
          }
        ])
        .select();

      if (gameStateError) {
        console.error("Error creating game state:", gameStateError);
        alert("Could not initialize game. Please try again.");
        return;
      }
      
      console.log("Game state created:", gameStateData);

      // 3. Update room status to in_progress
      console.log("Updating room status to in_progress");
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'in_progress' })
        .eq('id', roomId);

      if (updateError) {
        console.error("Error updating room status:", updateError);
        alert("Could not start the game. Please try again.");
        return;
      }

      // 4. Navigate to game room with a hard redirect
      console.log("Starting game - redirecting all users");
      setTimeout(() => {
        window.location.href = `/game/${roomId}`;
      }, 500);
    } catch (error) {
      console.error('Error starting game:', error);
      setError(error.message);
      alert("An error occurred while starting the game: " + error.message);
    }
  };

  const handleLeaveRoom = async () => {
    console.log("handleLeaveRoom called");
    try {
      if (isHost) {
        console.log("Host is leaving - closing room");
        // If host leaves, close the room
        const { error: closeRoomError } = await supabase
          .from('rooms')
          .update({ status: 'closed' })
          .eq('id', roomId);

        if (closeRoomError) throw closeRoomError;
      } else {
        console.log("Player is leaving - removing from room");
        // Get user ID
        let userId;
        if (session && session.user) {
          userId = session.user.id;
        } else if (sessionStorage.getItem('guestId')) {
          userId = sessionStorage.getItem('guestId');
        } else {
          throw new Error("No user ID available");
        }
        
        // Remove player from room
        const { error: removePlayerError } = await supabase
          .from('room_players')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (removePlayerError) throw removePlayerError;

        // Update the player count
        const { error: updateRoomError } = await supabase
          .from('rooms')
          .update({ 
            current_players: Math.max(1, room.current_players - 1) 
          })
          .eq('id', roomId);

        if (updateRoomError) throw updateRoomError;
      }

      console.log("Navigation back to home");
      // Navigate back to home
      navigate('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      setError(error.message);
    }
  };

  const copyRoomCode = () => {
    if (!room) return;
    
    navigator.clipboard.writeText(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    console.log("Lobby is in loading state");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading lobby...</div>
      </div>
    );
  }

  if (error) {
    console.log("Lobby has error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
        <Link to="/" className="text-blue-400 hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  console.log("Rendering full lobby UI");
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container p-4 mx-auto">
        <Link to="/" className="inline-flex items-center mb-6 text-gray-400 hover:text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Link>

        <div className="max-w-3xl p-6 mx-auto bg-gray-800 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-yellow-400">{room?.name}</h1>
            <div className="flex items-center">
              <button
                onClick={handleLeaveRoom}
                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
              >
                {isHost ? 'Close Room' : 'Leave Room'}
              </button>
            </div>
          </div>

          <div className="p-4 mb-6 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Users size={18} className="mr-2 text-blue-400" />
                <span className="font-semibold">
                  Players ({players.length}/{room?.max_players})
                </span>
              </div>
              <div className="flex items-center">
                <button
                  onClick={copyRoomCode}
                  className="flex items-center px-3 py-1 mr-2 text-sm bg-gray-600 rounded hover:bg-gray-500"
                >
                  <span className="mr-1">Code: {room?.room_code}</span>
                  <Copy size={14} />
                </button>
                {copied && (
                  <div className="absolute px-2 py-1 text-xs text-white -translate-y-8 bg-black rounded">
                    Copied!
                  </div>
                )}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center px-2 py-1 text-sm bg-gray-600 rounded hover:bg-gray-500"
                >
                  {showDetails ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
              </div>
            </div>

            {showDetails && (
              <div className="p-3 mb-4 text-sm bg-gray-800 rounded">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center">
                    <DollarSign size={14} className="mr-1 text-yellow-400" />
                    <span>Starting Chips: {room?.initial_chips}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign size={14} className="mr-1 text-yellow-400" />
                    <span>Blinds: {room?.small_blind}/{room?.big_blind}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 space-y-2">
              {players.map((player) => (
                <div
                  key={player.user_id}
                  className={`flex items-center justify-between p-2 rounded ${
                    player.is_host ? 'bg-blue-900 bg-opacity-50' : 'bg-gray-800'
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 mr-3 rounded-full flex items-center justify-center ${
                        player.is_host ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      {player.profiles.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">
                      {player.profiles.username}
                      {player.is_host && (
                        <span className="ml-2 text-xs text-blue-300">(Host)</span>
                      )}
                    </span>
                  </div>
                  <span className="px-2 py-1 text-xs bg-gray-700 rounded">
                    Seat {player.seat_position + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center mt-6">
            <p className="mb-4 text-gray-400">
              {isHost
                ? 'Wait for players to join, then start the game.'
                : 'Waiting for the host to start the game...'}
            </p>

            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={players.length < 2}
                className={`flex items-center px-6 py-3 text-white rounded ${
                  players.length < 2
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <PlayCircle size={20} className="mr-2" />
                Start Game
              </button>
            ) : (
              <div className="flex items-center p-3 bg-gray-700 rounded-lg">
                <Share2 size={18} className="mr-2 text-blue-400" />
                <span>Share the room code to invite friends: {room?.room_code}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
