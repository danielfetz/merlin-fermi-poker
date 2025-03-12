// components/GameRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer, Users, DollarSign, Award, PlusCircle, MinusCircle, Send, ArrowLeft, MessageCircle } from 'lucide-react';

const GameRoom = ({ session, supabase }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  
  // Room and players state
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentUserPlayer, setCurrentUserPlayer] = useState(null);
  const [isHost, setIsHost] = useState(false);
  
  // Game state
  const [gameState, setGameState] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [userAnswer, setUserAnswer] = useState('');
  const [betAmount, setBetAmount] = useState(10);
  const [chat, setChat] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("GameRoom component mounted with roomId:", roomId);

  // Debug function to identify the current player
  const debugCurrentPlayer = () => {
    if (!gameState || gameState.current_player_index === undefined || !players || players.length === 0) {
      console.log("Cannot debug current player - missing data");
      return;
    }
    
    const currentPlayerIndex = gameState.current_player_index;
    console.log("Current player index:", currentPlayerIndex);
    
    if (currentPlayerIndex >= players.length) {
      console.error("Invalid player index - exceeds players array length");
      return;
    }
    
    const currentPlayer = players[currentPlayerIndex];
    console.log("Current player:", currentPlayer);
    
    // Get current user ID
    const currentUserId = session?.user?.id || sessionStorage.getItem('guestId');
    console.log("Current user ID:", currentUserId);
    console.log("Is current user's turn:", currentPlayer?.user_id === currentUserId);
    
    // Log all players for comparison
    console.log("All players:", players.map(p => ({
      id: p.id,
      user_id: p.user_id,
      username: p.profiles?.username,
      is_current: p.user_id === currentUserId
    })));
  };

  // Fetch initial data and set up subscriptions
  const fetchGameData = async () => {
    try {
      console.log("Fetching game data for room:", roomId);
      
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
      
      console.log("Room data:", roomData);
      setRoom(roomData);
      setBetAmount(roomData.small_blind);

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
        .eq('room_id', roomId)
        .order('seat_position', { ascending: true });

      if (playersError) {
        console.error("Players error:", playersError);
        throw playersError;
      }
      
      console.log("Players data:", playersData);
      
      // Process player data - fetch profile data separately for each player
      const processedPlayers = await Promise.all(playersData.map(async (player) => {
        // If player has metadata with username (guest), use that
        if (player.metadata && player.metadata.username) {
          console.log("Player is a guest:", player.metadata);
          return {
            ...player,
            profiles: { username: player.metadata.username }
          };
        } 
        // Otherwise fetch username from profiles table
        else {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', player.user_id)
              .single();
              
            return {
              ...player,
              profiles: { username: profileData?.username || 'Unknown User' }
            };
          } catch (e) {
            console.error("Error fetching profile:", e);
            return {
              ...player,
              profiles: { username: 'Unknown User' }
            };
          }
        }
      }));
      
      console.log("Processed players:", processedPlayers);
      setPlayers(processedPlayers);

      // Find current user's player data
      console.log("Looking for current user in players list");
      const userPlayer = processedPlayers.find(player => {
        console.log("Comparing player ID:", player.user_id, "with user ID:", userId);
        return player.user_id === userId;
      });
      
      if (userPlayer) {
        console.log("Found current user player:", userPlayer);
        setCurrentUserPlayer(userPlayer);
        setIsHost(userPlayer.is_host);
      } else {
        console.error("User not found in this game - redirecting to home");
        // User is not in this room, redirect to home
        navigate('/');
        return;
      }

      // Get game state
      console.log("Fetching game state");
      const { data: gameStateData, error: gameStateError } = await supabase
        .from('game_states')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (gameStateError) {
        console.error("Game state error:", gameStateError);
        if (gameStateError.code !== 'PGRST116') { // Not found error
          throw gameStateError;
        }
        console.log("No game state found - waiting for initialization");
      } else {
        console.log("Game state:", gameStateData);
        setGameState(gameStateData);
        
        // If there's a current question, fetch it
        if (gameStateData.current_question_id) {
          console.log("Fetching question:", gameStateData.current_question_id);
          const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .select('*')
            .eq('id', gameStateData.current_question_id)
            .single();
            
          if (questionError) {
            console.error("Question error:", questionError);
            // Continue without a question, we'll show appropriate UI
          } else {
            console.log("Question data loaded:", questionData);
            setCurrentQuestion(questionData);
          }
        }
      }

      // Get chat messages
      console.log("Fetching chat messages");
      const { data: chatData, error: chatError } = await supabase
        .from('room_chat')
        .select('*, profiles:user_id (username)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (chatError) {
        console.error("Chat error:", chatError);
        // Continue without chat history
      } else {
        console.log("Chat data:", chatData);
        setChat(chatData);
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameData();

    // Set up real-time subscriptions
    const roomPlayersChannelName = `game-players-${roomId}`;
    console.log(`Creating player channel: ${roomPlayersChannelName}`);
    
    const roomPlayersChannel = supabase
      .channel(roomPlayersChannelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        console.log("Room players change detected:", payload);
        fetchGameData();
      })
      .subscribe((status) => {
        console.log(`Player channel status: ${status}`);
      });

    const gameStateChannelName = `game-state-${roomId}`;
    console.log(`Creating game state channel: ${gameStateChannelName}`);
    
    const gameStateChannel = supabase
      .channel(gameStateChannelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_states',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        console.log("Game state change detected:", payload);
        fetchGameData();
      })
      .subscribe((status) => {
        console.log(`Game state channel status: ${status}`);
      });

    const chatChannelName = `game-chat-${roomId}`;
    console.log(`Creating chat channel: ${chatChannelName}`);
    
    const chatChannel = supabase
      .channel(chatChannelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_chat',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        console.log("New chat message:", payload);
        fetchChatMessage(payload.new.id);
      })
      .subscribe((status) => {
        console.log(`Chat channel status: ${status}`);
      });

    // Cleanup subscriptions
    return () => {
      console.log("Cleaning up game room subscriptions");
      supabase.removeChannel(roomPlayersChannel);
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [roomId, session, supabase, navigate]);

  // Add polling for game state updates
  useEffect(() => {
    console.log("Setting up game state polling");
    
    // Poll for game state updates every 3 seconds
    const gamePollingInterval = setInterval(() => {
      if (!loading) {
        fetchGameData();
      }
    }, 3000);
    
    return () => {
      clearInterval(gamePollingInterval);
    };
  }, [loading]); // Only dependency is loading state

  // Call debugCurrentPlayer whenever game state changes
  useEffect(() => {
    if (gameState && players.length > 0) {
      debugCurrentPlayer();
    }
  }, [gameState, players]);

  // Timer effect for the question phase
  useEffect(() => {
    let interval = null;
    
    if (gameState?.current_stage === 'question' && gameState?.timer_end) {
      const calculateTimeRemaining = () => {
        const endTime = new Date(gameState.timer_end).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        
        setTimeRemaining(remaining);
        
        if (remaining === 0 && isHost) {
          moveToNextStage();
          clearInterval(interval);
        }
      };
      
      calculateTimeRemaining();
      interval = setInterval(calculateTimeRemaining, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, isHost]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat]);

  // Fetch a single chat message by ID
  const fetchChatMessage = async (messageId) => {
    try {
      const { data, error } = await supabase
        .from('room_chat')
        .select('*, profiles:user_id (username)')
        .eq('id', messageId)
        .single();
        
      if (error) throw error;
      
      setChat(prevChat => [...prevChat, data]);
    } catch (error) {
      console.error('Error fetching chat message:', error);
    }
  };

  // Send a chat message
  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    try {
      const { error } = await supabase
        .from('room_chat')
        .insert([
          {
            room_id: roomId,
            user_id: session?.user?.id || sessionStorage.getItem('guestId'),
            message: chatMessage.trim()
          }
        ]);
        
      if (error) throw error;
      
      setChatMessage('');
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  };

  // Submit an answer during the question phase
  const submitAnswer = async () => {
    if (!userAnswer || isNaN(parseFloat(userAnswer))) return;
    
    try {
      const parsedAnswer = parseFloat(userAnswer);
      
      const { error } = await supabase
        .from('room_players')
        .update({ answer: parsedAnswer })
        .eq('id', currentUserPlayer.id);
        
      if (error) throw error;
      
      setUserAnswer('');
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer');
    }
  };

  // Player actions during betting rounds
  const playerAction = async (action) => {
    console.log(`Player action: ${action} by user ${session?.user?.id || sessionStorage.getItem('guestId')}`);
    
    try {
      // Only allow the current player to act
      if (!gameState?.current_stage.includes('betting')) {
        console.log("Not in betting stage, cannot take action");
        return;
      }
      
      if (gameState.current_player_index === undefined || gameState.current_player_index >= players.length) {
        console.log("Invalid current player index");
        return;
      }
      
      const currentPlayerId = players[gameState.current_player_index]?.user_id;
      const currentUserId = session?.user?.id || sessionStorage.getItem('guestId');
      
      console.log("Current player ID:", currentPlayerId);
      console.log("Current user ID:", currentUserId);
      
      if (currentPlayerId !== currentUserId) {
        console.log("Not your turn");
        return;
      }
      
      const currentPlayer = players[gameState.current_player_index];
      console.log("Taking action as player:", currentPlayer);
      
      switch(action) {
        case 'fold':
          console.log("Folding");
          await supabase
            .from('room_players')
            .update({ folded: true })
            .eq('id', currentPlayer.id);
          break;
          
        case 'call':
          console.log("Calling");
          const callAmount = Math.min(
            currentPlayer.chips, 
            gameState.current_bet - (currentPlayer.current_bet || 0)
          );
          
          console.log(`Call amount: ${callAmount}`);
          
          await supabase
            .from('room_players')
            .update({ 
              chips: currentPlayer.chips - callAmount,
              current_bet: (currentPlayer.current_bet || 0) + callAmount
            })
            .eq('id', currentPlayer.id);
            
          await supabase
            .from('game_states')
            .update({ 
              pot: gameState.pot + callAmount
            })
            .eq('id', gameState.id);
          break;
          
        case 'raise':
          console.log("Raising");
          const totalRaise = gameState.current_bet + betAmount;
          const raiseAmount = Math.min(
            currentPlayer.chips,
            totalRaise - (currentPlayer.current_bet || 0)
          );
          
          console.log(`Raise amount: ${raiseAmount}, new bet: ${totalRaise}`);
          
          await supabase
            .from('room_players')
            .update({ 
              chips: currentPlayer.chips - raiseAmount,
              current_bet: (currentPlayer.current_bet || 0) + raiseAmount
            })
            .eq('id', currentPlayer.id);
            
          await supabase
            .from('game_states')
            .update({ 
              pot: gameState.pot + raiseAmount,
              current_bet: (currentPlayer.current_bet || 0) + raiseAmount
            })
            .eq('id', gameState.id);
          break;
          
        default:
          console.log("Unknown action");
          return;
      }
      
      // Move to next player or next stage
      console.log("Moving to next player");
      await moveToNextPlayer();
    } catch (error) {
      console.error('Error performing action:', error);
      setError('Failed to perform action');
    }
  };

  // Move to the next player in the betting round
  const moveToNextPlayer = async () => {
    console.log("moveToNextPlayer called");
    
    try {
      // Get fresh data for accuracy
      const { data: freshPlayers, error: playersError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('seat_position', { ascending: true });
        
      if (playersError) {
        console.error("Error fetching fresh player data:", playersError);
        throw playersError;
      }
      
      // Filter to active players
      const activePlayers = freshPlayers.filter(p => !p.folded);
      console.log("Active players:", activePlayers);
      
      // If only one player remains, end the round
      if (activePlayers.length <= 1) {
        console.log("Only one active player, ending round");
        await moveToNextStage();
        return;
      }
      
      // Get current bet from game state
      const { data: currentGameState, error: gameStateError } = await supabase
        .from('game_states')
        .select('current_bet')
        .eq('id', gameState.id)
        .single();
        
      if (gameStateError) {
        console.error("Error fetching current game state:", gameStateError);
        throw gameStateError;
      }
      
      const currentBet = currentGameState.current_bet;
      
      // Check if everyone has called or folded
      const everyoneActed = activePlayers.every(p => 
        p.folded || p.current_bet === currentBet
      );
      
      console.log("Current bet:", currentBet);
      console.log("Everyone acted:", everyoneActed);
      console.log("Player bets:", activePlayers.map(p => ({ 
        id: p.id, 
        username: players.find(player => player.id === p.id)?.profiles?.username,
        bet: p.current_bet 
      })));
      
      if (everyoneActed) {
        console.log("Everyone has acted, moving to next stage");
        await moveToNextStage();
        return;
      }
      
      // Find the next player who hasn't folded
      let nextPlayerIndex = (gameState.current_player_index + 1) % freshPlayers.length;
      console.log("Initial next player index:", nextPlayerIndex);
      
      // Skip folded players
      while (freshPlayers[nextPlayerIndex].folded) {
        console.log(`Player ${nextPlayerIndex} has folded, skipping`);
        nextPlayerIndex = (nextPlayerIndex + 1) % freshPlayers.length;
      }
      
      console.log("Final next player index:", nextPlayerIndex);
      
      // Update the current player
      await supabase
        .from('game_states')
        .update({ current_player_index: nextPlayerIndex })
        .eq('id', gameState.id);
        
      console.log("Updated current player index to:", nextPlayerIndex);
    } catch (error) {
      console.error('Error moving to next player:', error);
    }
  };

  // Move to the next stage of the game
  const moveToNextStage = async () => {
    if (!isHost) return;
    
    try {
      let nextStage;
      let nextTimerEnd = null;
      
      // Determine the next stage based on current stage
      switch(gameState.current_stage) {
        case 'question':
          nextStage = 'betting1';
          break;
        case 'betting1':
          nextStage = 'hint1';
          break;
        case 'hint1':
          nextStage = 'betting2';
          break;
        case 'betting2':
          nextStage = 'hint2';
          break;
        case 'hint2':
          nextStage = 'betting3';
          break;
        case 'betting3':
          nextStage = 'reveal';
          break;
        case 'reveal':
          nextStage = 'betting4';
          break;
        case 'betting4':
          nextStage = 'results';
          break;
        case 'results':
          // Start a new round
          return await startNewRound();
        default:
          nextStage = 'question';
          nextTimerEnd = new Date(Date.now() + 60000).toISOString();
      }
      
      // Reset bets for new betting rounds
      if (nextStage === 'betting1' || nextStage === 'betting2' || 
          nextStage === 'betting3' || nextStage === 'betting4') {
        // Reset current bets but keep track of folded status
        await Promise.all(players.map(player => 
          supabase
            .from('room_players')
            .update({ current_bet: 0 })
            .eq('id', player.id)
        ));
        
        // Reset current bet in game state
        await supabase
          .from('game_states')
          .update({ current_bet: 0 })
          .eq('id', gameState.id);
      }
      
      // If moving to results, determine the winner
      if (nextStage === 'results') {
        await determineWinner();
      }
      
      // Update game state to next stage
      await supabase
        .from('game_states')
        .update({ 
          current_stage: nextStage,
          timer_end: nextTimerEnd,
          current_player_index: 0 // Reset to first player for new betting rounds
        })
        .eq('id', gameState.id);
    } catch (error) {
      console.error('Error moving to next stage:', error);
      setError('Failed to advance the game');
    }
  };

  // Determine the winner at the end of the round
  const determineWinner = async () => {
    try {
      const activePlayers = players.filter(p => !p.folded);
      
      // If only one player remains, they win
      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        
        // Award pot to winner
        await supabase
          .from('room_players')
          .update({ 
            chips: winner.chips + gameState.pot,
            games_won: winner.games_won + 1
          })
          .eq('id', winner.id);
          
        // Update stats in profile
        await supabase
          .from('profiles')
          .update({ games_won: winner.profiles.games_won + 1 })
          .eq('id', winner.user_id);
      } else {
        // Find player with closest answer
        let closestPlayer = null;
        let smallestDifference = Infinity;
        
        activePlayers.forEach(player => {
          if (player.answer !== null) {
            const difference = Math.abs(player.answer - currentQuestion.correct_answer);
            if (difference < smallestDifference) {
              smallestDifference = difference;
              closestPlayer = player;
            }
          }
        });
        
        if (closestPlayer) {
          // Award pot to winner
          await supabase
            .from('room_players')
            .update({ 
              chips: closestPlayer.chips + gameState.pot,
              games_won: closestPlayer.games_won + 1
            })
            .eq('id', closestPlayer.id);
            
          // Update stats in profile
          await supabase
            .from('profiles')
            .update({ games_won: closestPlayer.profiles.games_won + 1 })
            .eq('id', closestPlayer.user_id);
        }
      }
      
      // Update game played stats for all players
      await Promise.all(players.map(player =>
        supabase
          .from('profiles')
          .update({ games_played: player.profiles.games_played + 1 })
          .eq('id', player.user_id)
      ));
    } catch (error) {
      console.error('Error determining winner:', error);
    }
  };

  // Start a new round
  const startNewRound = async () => {
    try {
      // Reset player states
      await Promise.all(players.map(player =>
        supabase
          .from('room_players')
          .update({ 
            answer: null,
            current_bet: 0,
            folded: false
          })
          .eq('id', player.id)
      ));
      
      // Select a new random question
      const { data: randomQuestion, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .order('RANDOM()')
        .limit(1)
        .single();

      if (questionError) throw questionError;
      
      // Set blinds for first two players
      const sortedPlayers = [...players].sort((a, b) => a.seat_position - b.seat_position);
      
      // Small blind
      await supabase
        .from('room_players')
        .update({ 
          chips: sortedPlayers[0].chips - room.small_blind,
          current_bet: room.small_blind
        })
        .eq('id', sortedPlayers[0].id);
      
      // Big blind
      await supabase
        .from('room_players')
        .update({ 
          chips: sortedPlayers[1].chips - room.big_blind,
          current_bet: room.big_blind
        })
        .eq('id', sortedPlayers[1].id);
      
      // Update game state for new round
      await supabase
        .from('game_states')
        .update({ 
          current_stage: 'question',
          pot: room.small_blind + room.big_blind,
          current_bet: room.big_blind,
          current_player_index: 2 % players.length,
          current_question_id: randomQuestion.id,
          timer_end: new Date(Date.now() + 60000).toISOString()
        })
        .eq('id', gameState.id);
    } catch (error) {
      console.error('Error starting new round:', error);
      setError('Failed to start new round');
    }
  };

  // Adjust bet amount
  const adjustBetAmount = (amount) => {
    const minBet = room?.small_blind || 5;
    const newAmount = Math.max(minBet, betAmount + amount);
    setBetAmount(newAmount);
  };

  // Leave the game room
  const leaveGame = async () => {
    try {
      // If host, end the game for everyone
      if (isHost) {
        await supabase
          .from('rooms')
          .update({ status: 'completed' })
          .eq('id', roomId);
      } else {
        // Just remove current player
        await supabase
          .from('room_players')
          .update({ status: 'left' })
          .eq('id', currentUserPlayer.id);
          
        // Update current players count
        await supabase
          .from('rooms')
          .update({ current_players: room.current_players - 1 })
          .eq('id', roomId);
      }
      
      navigate('/');
    } catch (error) {
      console.error('Error leaving game:', error);
    }
  };

  // Render poker table with players
  const renderPokerTable = () => {
    if (!players || players.length === 0) {
      console.log("No players available to render poker table");
      return (
        <div className="relative mb-6 p-6 bg-gray-800 rounded-lg text-center">
          <p>Loading game data...</p>
        </div>
      );
    }
    
    console.log("Rendering poker table with players:", players);
    
    // Calculate positions for players around the table
    const getPlayerPosition = (index, totalPlayers) => {
      const positions = [
        { bottom: '10px', left: '40%' },           // Bottom (player's position)
        { top: '45%', right: '10px' },             // Right
        { top: '10px', left: '40%' },              // Top
        { top: '45%', left: '10px' },              // Left
        { top: '10px', right: '20%' },             // Top-right
        { bottom: '10px', right: '20%' }           // Bottom-right
      ];
      
      // Find current user index
      const currentUserIndex = players.findIndex(p => 
        p.user_id === (session?.user?.id || sessionStorage.getItem('guestId'))
      );
      
      // Calculate relative position
      let relativeIndex = (index - currentUserIndex + totalPlayers) % totalPlayers;
      
      return positions[relativeIndex];
    };
    
    return (
      <div className="relative mb-6">
        {/* SVG Poker Table */}
        <svg viewBox="0 0 800 500" className="w-full">
          {/* Table border */}
          <ellipse cx="400" cy="250" rx="390" ry="240" fill="#8B4513" />
          
          {/* Table felt */}
          <ellipse cx="400" cy="250" rx="370" ry="220" fill="#006428" />
          
          {/* Inner border */}
          <ellipse cx="400" cy="250" rx="350" ry="200" stroke="#004d1f" strokeWidth="2" fill="none" />
          
          {/* Dealer button */}
          <circle cx="400" cy="400" r="15" fill="white" />
          <text x="400" y="405" textAnchor="middle" fill="black" fontSize="14" fontWeight="bold">D</text>
          
          {/* Pot display */}
          <rect x="350" y="180" width="100" height="40" rx="5" fill="rgba(0,0,0,0.5)" />
          <text x="400" y="205" textAnchor="middle" fill="white" fontSize="16">${gameState?.pot || 0}</text>
        </svg>
        
        {/* Game content in the center of the table */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2/3 bg-gray-800 bg-opacity-90 rounded-lg p-3 shadow-lg">
            {renderGameContent()}
          </div>
        </div>
        
        {/* Players positioned around the table */}
        {players.map((player, index) => (
          <div 
            key={player.id} 
            className="absolute"
            style={getPlayerPosition(index, players.length)}
          >
            <div className={`p-3 rounded-lg shadow-md w-64 ${
              player.folded 
                ? 'bg-gray-700 bg-opacity-70 text-gray-400' 
                : gameState?.current_player_index === index && gameState?.current_stage.includes('betting')
                  ? 'bg-blue-700 bg-opacity-90' 
                  : 'bg-gray-800 bg-opacity-90'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold flex items-center">
                    {player.user_id === (session?.user?.id || sessionStorage.getItem('guestId')) && (
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    )}
                    {player.profiles?.username || 'Unknown Player'}
                    {player.is_host && (
                      <span className="ml-2 text-xs text-yellow-400">(Host)</span>
                    )}
                  </div>
                  <div className="text-sm flex items-center">
                    <DollarSign size={14} className="mr-1 text-yellow-400" />
                    {player.chips}
                  </div>
                </div>
                <div className="text-right">
                  {player.folded && <span className="text-sm text-red-400">Folded</span>}
                  {!player.folded && player.current_bet > 0 && (
                    <div className="text-sm text-blue-300 flex items-center justify-end">
                      <span>Bet: ${player.current_bet}</span>
                    </div>
                  )}
                  {player.answer !== null && (
                    <div className="mt-1">
                      <span className="px-2 py-1 bg-green-800 text-green-200 text-xs rounded">
                        Answer Ready
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render game content based on current stage
  const renderGameContent = () => {
    if (!gameState) {
      console.log("No game state yet, showing waiting screen");
      return (
        <div className="p-4 text-center">
          <h3 className="text-xl font-bold mb-4">Game is starting...</h3>
          <p className="text-gray-300">Please wait while the host sets up the game</p>
          <div className="mt-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      );
    }
    
    if (!currentQuestion && gameState.current_question_id) {
      // If we have a question ID but no question loaded yet
      console.log("Fetching question ID:", gameState.current_question_id);
      
      // Try to fetch the question
      supabase
        .from('questions')
        .select('*')
        .eq('id', gameState.current_question_id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching question:", error);
          } else if (data) {
            console.log("Question data loaded:", data);
            setCurrentQuestion(data);
          }
        });
        
      return (
        <div className="p-4 text-center">
          <h3 className="text-xl font-bold mb-4">Loading question...</h3>
          <div className="mt-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      );
    }
    
    if (!currentQuestion) {
      console.log("No question available");
      return (
        <div className="p-4 text-center">
          <h3 className="text-xl font-bold mb-4">Waiting for the host to select a question</h3>
          <p className="text-gray-300">The game will start shortly</p>
        </div>
      );
    }
    
    switch(gameState.current_stage) {
      case 'question':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-lg">Question:</h3>
              <p className="text-white">{currentQuestion.question_text}</p>
              <div className="flex items-center justify-center mt-2">
                <Timer className="mr-2 text-red-400" size={16} />
                <span className="font-mono text-white">{timeRemaining} seconds remaining</span>
              </div>
            </div>
          </div>
        );
        
      case 'betting1':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-lg">Question:</h3>
              <p className="text-white">{currentQuestion.question_text}</p>
              <p className="mt-2 text-yellow-400 font-semibold">First betting round</p>
            </div>
          </div>
        );
        
      case 'hint1':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-lg">Question:</h3>
              <p className="text-white">{currentQuestion.question_text}</p>
              <h3 className="font-bold mt-2 text-yellow-400">First Hint:</h3>
              <p className="text-white">{currentQuestion.hint1}</p>
              {isHost && (
                <button 
                  className="mt-2 px-4 py-1 bg-blue-600 text-white rounded text-sm"
                  onClick={moveToNextStage}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        );
        
      case 'betting2':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-lg">Question:</h3>
              <p className="text-white">{currentQuestion.question_text}</p>
              <h3 className="font-bold mt-2 text-yellow-400">First Hint:</h3>
              <p className="text-white">{currentQuestion.hint1}</p>
              <p className="mt-2 text-yellow-400 font-semibold">Second betting round</p>
            </div>
          </div>
        );
        
      case 'hint2':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-lg">Question:</h3>
              <p className="text-white">{currentQuestion.question_text}</p>
              <h3 className="font-bold mt-2 text-yellow-400">First Hint:</h3>
              <p className="text-white">{currentQuestion.hint1}</p>
              <h3 className="font-bold mt-2 text-yellow-400">Second Hint:</h3>
              <p className="text-white">{currentQuestion.hint2}</p>
              {isHost && (
                <button 
                  className="mt-2 px-4 py-1 bg-blue-600 text-white rounded text-sm"
                  onClick={moveToNextStage}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        );
        
      case 'betting3':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-lg">Question:</h3>
              <p className="text-white">{currentQuestion.question_text}</p>
              <h3 className="font-bold mt-2 text-yellow-400">First Hint:</h3>
              <p className="text-white">{currentQuestion.hint1}</p>
              <h3 className="font-bold mt-2 text-yellow-400">Second Hint:</h3>
              <p className="text-white">{currentQuestion.hint2}</p>
              <p className="mt-2 text-yellow-400 font-semibold">Third betting round</p>
            </div>
          </div>
        );
        
      case 'reveal':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-lg">Question:</h3>
              <p className="text-white">{currentQuestion.question_text}</p>
              <h3 className="font-bold mt-2 text-yellow-400">First Hint:</h3>
              <p className="text-white">{currentQuestion.hint1}</p>
              <h3 className="font-bold mt-2 text-yellow-400">Second Hint:</h3>
              <p className="text-white">{currentQuestion.hint2}</p>
              <h3 className="font-bold mt-2 text-yellow-400">Correct Answer:</h3>
              <p className="text-green-400 font-bold text-2xl">{currentQuestion.correct_answer}</p>
              {isHost && (
                <button 
                  className="mt-2 px-4 py-1 bg-blue-600 text-white rounded text-sm"
                  onClick={moveToNextStage}
                >
                  Continue to Final Betting
                </button>
              )}
            </div>
          </div>
        );
        
      case 'betting4':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-lg">Question:</h3>
              <p className="text-white">{currentQuestion.question_text}</p>
              <h3 className="font-bold mt-2 text-yellow-400">Correct Answer:</h3>
              <p className="text-green-400 font-bold text-2xl">{currentQuestion.correct_answer}</p>
              <p className="mt-2 text-yellow-400 font-semibold">Final betting round</p>
            </div>
          </div>
        );
        
      case 'results':
        const activePlayers = players.filter(p => !p.folded);
        const winner = activePlayers.length === 1 
          ? activePlayers[0]
          : activePlayers.reduce((closest, player) => {
              if (player.answer === null) return closest;
              if (closest.answer === null) return player;
              const currentDiff = Math.abs(closest.answer - currentQuestion.correct_answer);
              const playerDiff = Math.abs(player.answer - currentQuestion.correct_answer);
              return playerDiff < currentDiff ? player : closest;
            }, activePlayers[0] || {});
            
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-bold text-yellow-400 text-xl">Results</h3>
              <p className="text-white"><strong className="text-yellow-400">Question:</strong> {currentQuestion.question_text}</p>
              <p className="text-white"><strong className="text-yellow-400">Correct Answer:</strong> {currentQuestion.correct_answer}</p>
              
              <div className="mt-3">
                <h4 className="font-bold text-yellow-400">Player Answers:</h4>
                <div className="space-y-1 mt-2">
                  {activePlayers.map(player => (
                    <div key={player.id} className="flex justify-between items-center">
                      <span className="text-white">{player.profiles.username}</span>
                      <span className={`${player.id === winner.id ? "font-bold text-green-400" : "text-white"}`}>
                        {player.answer !== null 
                          ? `${player.answer} (${Math.abs(player.answer - currentQuestion.correct_answer).toFixed(2)} away)`
                          : 'No answer'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-2 bg-yellow-900 bg-opacity-50 rounded-lg flex items-center justify-center mt-3">
                <Award className="text-yellow-400 mr-2" size={20} />
                <span className="font-bold text-white">
                  {winner?.profiles?.username || 'Unknown Player'} wins with the closest answer!
                </span>
              </div>
              
              {isHost && (
                <button 
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                  onClick={moveToNextStage}
                >
                  Start New Round
                </button>
              )}
            </div>
          </div>
        );
        
      default:
        return <div className="text-center text-white">Waiting for game to start...</div>;
    }
  };

  // Render chat sidebar
  const renderChat = () => {
    return (
      <div className={`fixed right-0 top-0 h-full bg-gray-900 shadow-lg transition-all duration-300 z-10 ${
        showChat ? 'w-80' : 'w-0'
      }`}>
        <div className="h-full flex flex-col">
          <div className="p-3 bg-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-white">Game Chat</h3>
            <button 
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chat.map((message) => (
              <div 
                key={message.id} 
                className={`p-2 rounded max-w-xs ${
                  message.user_id === (session?.user?.id || sessionStorage.getItem('guestId'))
                    ? 'ml-auto bg-blue-700 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <div className="text-xs opacity-75 mb-1">
                  {message.profiles?.username || 'Unknown User'}
                </div>
                <div className="text-sm">{message.message}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <div className="p-3 bg-gray-800">
            <div className="flex">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
              />
              <button
                onClick={sendChatMessage}
                className="px-3 py-2 bg-blue-600 text-white rounded-r"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      <div className="container p-4 mx-auto pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-yellow-400">{room?.name}</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex items-center px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
            >
              <MessageCircle size={18} className="mr-1" />
              Chat
            </button>
            <button
              onClick={leaveGame}
              className="px-3 py-1 text-sm bg-red-600 rounded hover:bg-red-700"
            >
              {isHost ? 'End Game' : 'Leave Game'}
            </button>
          </div>
        </div>
        
        {/* Poker Table */}
        {renderPokerTable()}
        
        {/* Player Controls */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4">
          {gameState?.current_stage === 'question' && currentUserPlayer?.answer === null && (
            <div className="flex space-x-2 max-w-md mx-auto">
              <input
                type="number"
                step="0.01"
                className="flex-1 px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none"
                placeholder="Your answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
              />
              <button
                className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
                onClick={submitAnswer}
              >
                <Send size={18} className="mr-1" />
                Submit
              </button>
            </div>
          )}
          
          {/* Add a message showing whose turn it is */}
          {gameState?.current_stage.includes('betting') && gameState?.current_player_index !== undefined && (
            <div className="text-center text-white mb-2">
              <p>
                {players[gameState.current_player_index]?.profiles?.username || 'Unknown Player'}'s turn
                {players[gameState.current_player_index]?.user_id === (session?.user?.id || sessionStorage.getItem('guestId')) && 
                  " - Your turn to bet!"}
              </p>
            </div>
          )}
          
          {/* Improved betting controls with additional debugging */}
          {gameState?.current_stage.includes('betting') && 
           gameState?.current_player_index !== undefined &&
           players.length > 0 &&
           gameState.current_player_index < players.length &&
           players[gameState.current_player_index]?.user_id === (session?.user?.id || sessionStorage.getItem('guestId')) && (
            <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Current bet: ${gameState.current_bet}</span>
                <span className="text-gray-300">Your chips: ${currentUserPlayer?.chips}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Raise amount: ${betAmount}</span>
                <div className="flex space-x-2">
                  <button 
                    className="p-1 bg-gray-700 rounded" 
                    onClick={() => adjustBetAmount(-5)}
                  >
                    <MinusCircle size={18} />
                  </button>
                  <button 
                    className="p-1 bg-gray-700 rounded"
                    onClick={() => adjustBetAmount(5)}
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button 
                  className="py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={() => playerAction('fold')}
                >
                  Fold
                </button>
                <button 
                  className="py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => playerAction('call')}
                  disabled={gameState.current_bet === 0}
                >
                  {gameState.current_bet === 0 ? 'Check' : 'Call'}
                </button>
                <button 
                  className="py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={() => playerAction('raise')}
                  disabled={currentUserPlayer?.chips <= 0}
                >
                  Raise
                </button>
              </div>
            </div>
          )}
          
          {/* Debug information - uncomment for testing */}
          {/*
          <div className="mt-4 p-2 bg-black text-xs text-gray-400 rounded">
            <p>Game stage: {gameState?.current_stage}</p>
            <p>Current player index: {gameState?.current_player_index}</p>
            <p>Current user ID: {session?.user?.id || sessionStorage.getItem('guestId')}</p>
            <p>Current player ID: {players[gameState?.current_player_index]?.user_id}</p>
            <p>Show controls: {String(
              gameState?.current_stage.includes('betting') && 
              gameState?.current_player_index !== undefined &&
              players.length > 0 &&
              gameState.current_player_index < players.length &&
              players[gameState.current_player_index]?.user_id === (session?.user?.id || sessionStorage.getItem('guestId'))
            )}</p>
          </div>
          */}
        </div>
        
        {/* Chat Sidebar */}
        {renderChat()}
      </div>
    </div>
  );
};

export default GameRoom;
