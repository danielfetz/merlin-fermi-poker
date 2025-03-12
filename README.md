# Fermi Poker - Multiplayer Online Game

Fermi Poker is an educational card-less variant of poker where players estimate numerical answers to trivia questions and bet on their confidence. This project implements a full-featured online multiplayer version of the game using React and Supabase.

## Features

- **User Authentication**: Sign up, login, and profile management
- **Room Management**: Create and join game rooms with custom settings
- **Real-time Gameplay**: Synchronized game state across all players
- **In-game Chat**: Communication between players during the game
- **Custom Questions**: Add, edit, and manage questions in the database
- **Betting Mechanics**: Full poker-style betting rounds
- **Leaderboards**: Track player statistics and performance

## Technologies Used

- **Frontend**: React, React Router, Tailwind CSS
- **Backend**: Supabase (Authentication, Database, Real-time subscriptions)
- **UI Components**: Lucide React (icons)
- **Styling**: Tailwind CSS

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- NPM or Yarn
- Supabase account

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. In your Supabase dashboard, go to the SQL Editor and run the SQL commands from `supabase-schema.sql`
3. Enable email authentication in Authentication → Settings
4. Copy your Supabase URL and anon key from Settings → API

### Local Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/fermi-poker.git
   cd fermi-poker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=your-supabase-url
   REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Update the Supabase configuration in `App.jsx` with your credentials:
   ```javascript
   const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
   const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
   ```

5. Start the development server:
   ```
   npm start
   ```

6. Access the application at `http://localhost:3000`

## Game Rules

### Setup
1. Players join a room and receive initial chips
2. Small and big blinds are placed by the first two players

### Gameplay
1. **Question Phase**: A question is displayed and players have 60 seconds to submit their numerical answers
2. **First Betting Round**: Players bet based on their confidence in their answer
3. **First Hint**: Additional information is revealed
4. **Second Betting Round**: Players adjust their bets based on the new information
5. **Second Hint**: More information is revealed
6. **Third Betting Round**: Players adjust bets again
7. **Reveal**: The correct answer is displayed
8. **Final Betting Round**: Last chance to bet before resolution
9. **Results**: Player answers are revealed, and the closest answer wins the pot

### Betting Options
- **Fold**: Withdraw from the round and forfeit current bets
- **Call/Check**: Match the current bet or pass if no bet
- **Raise**: Increase the current bet

## Project Structure

```
src/
├── components/
│   ├── CreateRoom.jsx        # Room creation form
│   ├── GameRoom.jsx          # Main game component
│   ├── Home.jsx              # Dashboard/landing page
│   ├── JoinRoom.jsx          # Join existing room
│   ├── Lobby.jsx             # Waiting room before game starts
│   ├── Login.jsx             # Authentication
│   ├── QuestionManagement.jsx # Question admin interface
│   └── Register.jsx          # User registration
├── App.jsx                   # Main app component with routing
└── index.js                  # Entry point
```

## Adding Custom Questions

You can add custom questions through the Question Management interface or directly in the Supabase database.

Each question requires:
- Question text
- Two hints that progressively make the answer easier
- The correct numerical answer
- Optional category and difficulty level

## Deployment

To deploy the application:

1. Build the production version:
   ```
   npm run build
   ```

2. Deploy the contents of the `build` folder to your hosting service of choice (Vercel, Netlify, etc.)

3. Make sure to configure environment variables for your Supabase credentials

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Original Fermi Poker game concept
- Supabase for the backend infrastructure
- React and Tailwind CSS communities
