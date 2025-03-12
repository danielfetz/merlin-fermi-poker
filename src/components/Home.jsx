// components/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, LogOut, Award, DollarSign, Clock } from 'lucide-react';
import NavBar from './NavBar';

const Home = ({ session, guestUser, supabase }) => {
  const [user, setUser] = useState(null);
  const [activeRooms, setActiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If using guest mode, set user from guestUser
        if (guestUser) {
          setUser(guestUser);
        } 
        // Otherwise fetch user profile from supabase
        else if (session) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;
          setUser(data);
        }

        // Fetch active rooms - without trying to join with profiles
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select('*')
          .eq('status', 'waiting')
          .order('created_at', { ascending: false })
          .limit(5);

        if (roomsError) throw roomsError;
        
        // Fetch host usernames separately for each room
        const roomsWithHostnames = await Promise.all(roomsData.map(async (room) => {
          // Check if it's a guest host
          if (room.is_guest_host) {
            // For guest hosts, we need to get the username from room_players
            const { data: playerData } = await supabase
              .from('room_players')
              .select('metadata')
              .eq('room_id', room.id)
              .eq('user_id', room.host_id)
              .single();
              
            const hostUsername = playerData?.metadata?.username || 'Guest Host';
            return {
              ...room,
              host_username: hostUsername
            };
          } else {
            // For regular users, get username from profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', room.host_id)
              .single();
              
            return {
              ...room,
              host_username: profileData?.username || 'Unknown Host'
            };
          }
        }));
        
        setActiveRooms(roomsWithHostnames);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up subscription for real-time updates to rooms
    const roomsSubscription = supabase
      .channel('public:rooms')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms' 
      }, payload => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsSubscription);
    };
  }, [session, guestUser, supabase]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, profiles(username)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setActiveRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

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
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <NavBar session={session} supabase={supabase} user={user} guestUser={guestUser} />

      <main className="container p-4 mx-auto mt-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Game actions */}
          <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Play Now</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                to="/create-room"
                className="flex items-center justify-center p-4 space-x-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <Plus size={20} />
                <span>Create Room</span>
              </Link>
              <Link
                to="/join-room"
                className="flex items-center justify-center p-4 space-x-2 text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <Users size={20} />
                <span>Join Room</span>
              </Link>
            </div>
          </div>

          {/* User stats */}
          <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Your Stats</h2>
            {user && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Award size={20} className="text-yellow-400" />
                    <span className="text-sm text-gray-300">Games Won</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{user.games_won || 0}</p>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock size={20} className="text-blue-400" />
                    <span className="text-sm text-gray-300">Games Played</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{user.games_played || 0}</p>
                </div>
              </div>
            )}
            {guestUser && (
              <div className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-yellow-400 font-bold">Guest Mode</span>
                </div>
                <p className="mt-1 text-sm text-gray-300">
                  You're playing as a guest. Your progress won't be saved.
                </p>
                <Link to="/register" className="mt-2 text-sm text-blue-400 hover:underline inline-block">
                  Create an account to save your progress
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Active rooms */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Available Rooms</h2>
          {loading ? (
            <p className="text-gray-400">Loading rooms...</p>
          ) : activeRooms.length > 0 ? (
            <div className="overflow-hidden bg-gray-800 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-300 uppercase">
                      Room Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-300 uppercase">
                      Host
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-300 uppercase">
                      Players
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-300 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {activeRooms.map((room) => (
                    <tr key={room.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{room.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{room.profiles?.username || "Guest Host"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{room.current_players}/{room.max_players}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/lobby/${room.id}`)}
                          className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                          Join
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center bg-gray-800 rounded-lg">
              <p className="text-gray-400">No active rooms available. Create one to start playing!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
