// components/Rules.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, DollarSign, Clock, PieChart, Award, Heart } from 'lucide-react';

const Rules = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center mb-6 text-gray-400 hover:text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">How to Play Fermi Poker</h1>
          <p className="text-xl text-gray-300">A numerical estimation poker game</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col items-center text-center">
            <PieChart size={48} className="text-blue-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Estimation</h3>
            <p className="text-gray-300">Make numerical estimates to questions and bet on your confidence</p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col items-center text-center">
            <DollarSign size={48} className="text-green-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Betting</h3>
            <p className="text-gray-300">Bet chips on your estimates through multiple rounds as hints are revealed</p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col items-center text-center">
            <Award size={48} className="text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Winning</h3>
            <p className="text-gray-300">The player with the closest estimate to the correct answer wins the pot</p>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden mb-12">
          <div className="bg-gray-700 p-4 flex items-center">
            <HelpCircle size={24} className="text-yellow-400 mr-3" />
            <h2 className="text-2xl font-bold">Game Overview</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <p>
              Fermi Poker is a card-less variant of poker where players estimate numerical answers to trivia questions. Instead of cards, your "hand" is your numerical estimate to a question, and your goal is to have the closest answer to the correct value.
            </p>
            
            <p>
              The game combines numerical reasoning, critical thinking, and traditional poker betting strategies. You'll need to adjust your confidence as new hints are revealed, deciding whether to continue betting or fold based on how accurate you think your estimate is.
            </p>
            
            <p>
              Questions can cover a wide range of topics including science, geography, economics, history, and more. The best players combine domain knowledge with estimation skills and strategic betting.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden mb-12">
          <div className="bg-gray-700 p-4 flex items-center">
            <Clock size={24} className="text-yellow-400 mr-3" />
            <h2 className="text-2xl font-bold">How a Round Works</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-bold mb-2">1. Question Phase</h3>
              <p className="text-gray-300">
                A question is displayed and all players have 60 seconds to submit their numerical answers secretly. The first two players place small and big blinds.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-bold mb-2">2. First Betting Round</h3>
              <p className="text-gray-300">
                Players bet based on their confidence in their answer. You can fold, call, or raise just like in traditional poker.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-bold mb-2">3. First Hint</h3>
              <p className="text-gray-300">
                Additional information is revealed that helps narrow down the correct answer.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-bold mb-2">4. Second Betting Round</h3>
              <p className="text-gray-300">
                Players adjust their bets based on the new information. Some might become more confident, others less so.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-bold mb-2">5. Second Hint</h3>
              <p className="text-gray-300">
                A final piece of information is revealed to further help with estimation.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-bold mb-2">6. Third Betting Round</h3>
              <p className="text-gray-300">
                The final betting round before the correct answer is revealed.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-bold mb-2">7. Reveal & Final Betting</h3>
              <p className="text-gray-300">
                The correct answer is revealed, followed by one last betting round.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-bold mb-2">8. Resolution</h3>
              <p className="text-gray-300">
                All player answers are revealed. The player with the estimate closest to the correct answer wins the pot!
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden mb-12">
          <div className="bg-gray-700 p-4 flex items-center">
            <DollarSign size={24} className="text-yellow-400 mr-3" />
            <h2 className="text-2xl font-bold">Betting Options</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-2 text-red-400">Fold</h3>
                <p className="text-gray-300">
                  Withdraw from the round. You forfeit any chips you've already bet, but don't have to put in more.
                </p>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-2 text-blue-400">Call / Check</h3>
                <p className="text-gray-300">
                  Match the current bet (call) or pass if no bet has been made (check).
                </p>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-2 text-green-400">Raise</h3>
                <p className="text-gray-300">
                  Increase the current bet, forcing other players to match your bet to stay in.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden mb-12">
          <div className="bg-gray-700 p-4 flex items-center">
            <Heart size={24} className="text-yellow-400 mr-3" />
            <h2 className="text-2xl font-bold">Tips for Success</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong className="text-yellow-400">Embrace Fermi estimation:</strong> Break down complex questions into simpler parts you can estimate.
              </li>
              <li>
                <strong className="text-yellow-400">Know when to fold:</strong> If hints suggest your estimate is far off, it might be better to fold early.
              </li>
              <li>
                <strong className="text-yellow-400">Watch other players:</strong> If someone bets aggressively, they may be confident in their answer.
              </li>
              <li>
                <strong className="text-yellow-400">Manage your chips:</strong> Don't go all-in unless you're very confident in your answer.
              </li>
              <li>
                <strong className="text-yellow-400">Learn from each round:</strong> Pay attention to the correct answers to improve your estimation skills.
              </li>
              <li>
                <strong className="text-yellow-400">Don't be afraid to bluff:</strong> Sometimes betting confidently can make others fold even if your estimate isn't the best.
              </li>
            </ul>
          </div>
        </div>
        
        <div className="text-center">
          <Link
            to="/create-room"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-lg font-medium"
          >
            Create a Game
          </Link>
          <p className="mt-4 text-gray-400">
            Ready to test your estimation skills? Create a room and invite friends to play!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Rules;
