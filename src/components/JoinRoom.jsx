// components/JoinRoom.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const JoinRoom = ({ session, guestUser, supabase }) => {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Find the room with the given code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (roomError) {
        throw new Error('Room not found or no longer accepting players');
      }

      // Check if the room is full
      if (room.current_players >= room.max_players) {
        throw new Error('Room is full');
      }

      // Determine user ID and username
      let userId, username;
      
      if (session && session.user) {
        // Regular authenticated user
        userId = session.user.id;
        username = session.user.user_metadata?.username || "User";
      } else {
        // Guest user
        const guestId = sessionStorage.getItem('guestId');
        const guestUserData = sessionStorage.getItem('guestUser') ? 
                            JSON.parse(sessionStorage.getItem('guestUser')) : null;
        
        if (!guestId || !guestUserData) {
          throw new Error('Guest session expired. Please log in again.');
        }
        
        userId = `guest-${guestId}`;
        username = guestUserData.username;
      }

      // Check if the user is already in the room
      const { data: existingPlayer, error: playerCheckError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single();

      if (!playerCheckError && existingPlayer) {
        // User is already in the room, just navigate there
        navigate(`/lobby/${room.id}`);
        return;
      }

      // Get the next available seat position
      const { data: occupiedSeats, error: seatsError } = await supabase
        .from('room_players')
        .select('seat_position')
        .eq('room_id', room.id)
        .order('seat_position', { ascending: true });

      if (seatsError) throw seatsError;

      const takenPositions = occupiedSeats.map(p => p.seat_position);
      let nextPosition = 0;
      while (takenPositions.includes(nextPosition)) {
        nextPosition++;
      }

      // Prepare player data
      const playerData = {
        room_id: room.id,
        user_id: userId,
        chips: room.initial_chips,
        seat_position: nextPosition,
        is_host: false,
        status: 'waiting'
      };
      
      // If this is a guest user, add metadata
      if (guestUser) {
        playerData.metadata = {
          username: username,
          isGuest: true
        };
        
        // Also store room info in session storage
        const guestRooms = JSON.parse(sessionStorage.getItem('guestRooms') || '[]');
        guestRooms.push({
          id: room.id,
          isHost: false
        });
        sessionStorage.setItem('guestRooms', JSON.stringify(guestRooms));
      }

      // Add the user as a player in the room
      const { error: joinError } = await supabase
        .from('room_players')
        .insert([playerData]);

      if (joinError) throw joinError;

      // Update the room's current player count
      const { error: updateRoomError } = await supabase
        .from('rooms')
        .update({ current_players: room.current_players + 1 })
        .eq('id', room.id);

      if (updateRoomError) throw updateRoomError;

      // Redirect to the lobby
      navigate(`/lobby/${room.id}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container p-4 mx-auto">
        <Link to="/" className="inline-flex items-center mb-6 text-gray-400 hover:text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Link>

        <div className="max-w-md p-6 mx-auto bg-gray-800 rounded-lg shadow-lg">
          <h1 className="mb-6 text-2xl font-bold text-center text-yellow-400">Join Game Room</h1>
          
          {error && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label htmlFor="roomCode" className="block mb-1 text-sm font-medium text-gray-300">
                Room Code
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                required
                placeholder="Enter 6-digit room code"
                className="w-full px-4 py-2 text-white uppercase bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Enter the 6-digit code provided by the room host
              </p>
            </div>
            
            {guestUser && (
              <div className="p-3 bg-yellow-900 bg-opacity-50 rounded text-sm text-yellow-200">
                <b>Note:</b> You're playing as a guest. Your game progress will only be available during this session.
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 mt-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Joining Room...' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
