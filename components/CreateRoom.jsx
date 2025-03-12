// components/CreateRoom.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CreateRoom = ({ session, supabase }) => {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [initialChips, setInitialChips] = useState(500);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate a unique room code for joining
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Insert the room record
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert([
          {
            name: roomName,
            host_id: session.user.id,
            max_players: maxPlayers,
            initial_chips: initialChips,
            small_blind: smallBlind,
            big_blind: bigBlind,
            status: 'waiting',
            is_private: isPrivate,
            room_code: roomCode,
            current_players: 1
          }
        ])
        .select()
        .single();

      if (roomError) throw roomError;

      // Add the creator as a player in the room
      const { error: playerError } = await supabase
        .from('room_players')
        .insert([
          {
            room_id: room.id,
            user_id: session.user.id,
            chips: initialChips,
            seat_position: 0, // Host takes first position
            is_host: true,
            status: 'waiting'
          }
        ]);

      if (playerError) throw playerError;

      // Redirect to the lobby
      navigate(`/lobby/${room.id}`);
    } catch (error) {
      console.error('Error creating room:', error);
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
          <h1 className="mb-6 text-2xl font-bold text-center text-yellow-400">Create Game Room</h1>
          
          {error && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label htmlFor="roomName" className="block mb-1 text-sm font-medium text-gray-300">
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
                placeholder="My Poker Room"
                className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxPlayers" className="block mb-1 text-sm font-medium text-gray-300">
                  Max Players
                </label>
                <select
                  id="maxPlayers"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="initialChips" className="block mb-1 text-sm font-medium text-gray-300">
                  Starting Chips
                </label>
                <input
                  id="initialChips"
                  type="number"
                  min="100"
                  step="100"
                  value={initialChips}
                  onChange={(e) => setInitialChips(parseInt(e.target.value))}
                  required
                  className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="smallBlind" className="block mb-1 text-sm font-medium text-gray-300">
                  Small Blind
                </label>
                <input
                  id="smallBlind"
                  type="number"
                  min="1"
                  value={smallBlind}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setSmallBlind(value);
                    if (bigBlind < value * 2) {
                      setBigBlind(value * 2);
                    }
                  }}
                  required
                  className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="bigBlind" className="block mb-1 text-sm font-medium text-gray-300">
                  Big Blind
                </label>
                <input
                  id="bigBlind"
                  type="number"
                  min={smallBlind * 2}
                  value={bigBlind}
                  onChange={(e) => setBigBlind(parseInt(e.target.value))}
                  required
                  className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                id="isPrivate"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-600 rounded bg-gray-700 focus:ring-blue-500"
              />
              <label htmlFor="isPrivate" className="ml-2 text-sm font-medium text-gray-300">
                Private Room (invite only)
              </label>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 mt-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating Room...' : 'Create Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRoom;
