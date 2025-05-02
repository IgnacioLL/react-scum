// ./App.jsx
import React, { Component } from 'react';
import './App.css';
import './Scum.css';

// Import components
import Player from './components/players/Player';
import TablePile from './components/cards/TablePile';
import Spinner from './Spinner';
import Leaderboard from './components/Leaderboard';

import GameControls from "./components/GameControls";

const API_URL = 'http://83.42.20.189:5000'; // Replace with your actual API URL if different

class App extends Component {
  state = {
    // Game Phases: 'nameInput', 'loading', 'playing', 'roundOver', 'gameOver', 'error'
    gamePhase: 'nameInput', // Start with name input
    loading: false, // More specific loading control
    players: [],
    cardsOnTable: [],
    currentPlayerIndex: -1,
    gameMessage: 'Enter your name to start',
    selectedCards: [],
    humanPlayerId: 'player-0', // Remains the ID for logic
    humanPlayerName: '', // Store the entered name
    playerNameInput: '', // Controlled input for name form
    error: null,
    aiTurnTimerId: null,
    activePlayerCount: 0,
    playerAnimationSwitchboard: {},
    aiTurnDelay: 1500,
    gameId: null, // Store the current game ID
    leaderboardData: [], // Store leaderboard results
    leaderboardLoading: false,
    showLeaderboard: false, // Control leaderboard visibility
    isTransitioning: false, // Add this to control transitions and prevent flashing
    showRules: false, // New state for showing the rules
  };

  componentDidMount() {
    // Fetch leaderboard on initial load
    this.fetchLeaderboard();
  }

  componentWillUnmount() {
      if (this.state.aiTurnTimerId) {
          clearTimeout(this.state.aiTurnTimerId);
      }
  }

  // --- Normalization Helper (Frontend) ---
  normalizeName = (name) => {
    return name.toLowerCase().trim();
  }

  // --- API Fetching ---
  fetchApi = async (endpoint, method = 'GET', body = null) => {
    // Keep loading true only for specific actions if needed, or manage globally
    // this.setState({ loading: true, error: null }); // Reset error on new request
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(`${API_URL}${endpoint}`, options);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }
        throw new Error(errorData?.error || errorData?.message || `HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      // this.setState({ loading: false }); // Turn off loading after success
      return data;
    } catch (error) {
      console.error("API Error:", error);
      this.setState({
          error: error.message,
          loading: false, // Ensure loading is off on error
          // Decide how to handle game phase on general API error
          // gamePhase: 'error', // Could revert to error screen
          gameMessage: `Error: ${error.message}`,
          aiTurnTimerId: null,
          leaderboardLoading: false, // Also turn off leaderboard loading on error
      });
      if (this.state.aiTurnTimerId) clearTimeout(this.state.aiTurnTimerId);
      return null;
    }
  };

  // --- State Update Logic ---
  updateStateFromApi = (gameState) => {
    if (!gameState) {
      return;
    }

    if (this.state.aiTurnTimerId) {
        clearTimeout(this.state.aiTurnTimerId);
    }

    const prevPlayerIndex = this.state.currentPlayerIndex;
    const prevPlayers = this.state.players;

    // Use players directly from gameState, names are now included from backend
    const players = gameState.players || [];
    const humanPlayerIndex = players.findIndex(p => p.id === this.state.humanPlayerId);
     if (humanPlayerIndex !== -1 && players[humanPlayerIndex]?.hand) {
         players[humanPlayerIndex].hand.sort((a, b) => a.value - b.value);
     }

    const activePlayerCount = players.filter(p => p.isStillInRound === true).length;

    let newSwitchboard = { ...this.state.playerAnimationSwitchboard };
    Object.keys(newSwitchboard).forEach(key => {
        newSwitchboard[key] = { ...newSwitchboard[key], isAnimating: false };
    });

    const previousPlayer = prevPlayers[prevPlayerIndex];
    const updatedPreviousPlayer = players[prevPlayerIndex];

    if (previousPlayer && updatedPreviousPlayer &&
        prevPlayerIndex !== gameState.currentPlayerIndex &&
        previousPlayer.isStillInRound === true &&
        updatedPreviousPlayer.isStillInRound === false &&
        updatedPreviousPlayer.hand?.length > 0
       ) {
           console.log(`Player ${prevPlayerIndex} (${previousPlayer.name}) likely passed.`);
           newSwitchboard[prevPlayerIndex] = { isAnimating: true, content: 'Passed' };
    }

    const currentPhase = gameState.gamePhase || 'playing';

    // Create a new state object with all the updates
    const newState = {
      loading: false,
      gamePhase: currentPhase,
      players,
      cardsOnTable: gameState.cardsOnTable || [],
      currentPlayerIndex: gameState.currentPlayerIndex ?? -1,
      gameMessage: gameState.gameMessage || '',
      selectedCards: [],
      error: null,
      aiTurnTimerId: null,
      activePlayerCount,
      playerAnimationSwitchboard: newSwitchboard,
      gameId: gameState.gameId || this.state.gameId,
    };

    // Update state in a single batch to prevent multiple re-renders
    this.setState(newState, () => {
      // Schedule AI Turn if needed
      const { gamePhase, players, currentPlayerIndex, humanPlayerId, aiTurnDelay } = this.state;
      if (gamePhase === 'playing' && currentPlayerIndex !== -1) {
        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer && currentPlayer.id !== humanPlayerId && currentPlayer.isStillInRound) {
          console.log(`Scheduling AI turn for ${currentPlayer.name} (ID: ${currentPlayer.id}) in ${aiTurnDelay}ms`);
          const timerId = setTimeout(this.triggerAiTurn, aiTurnDelay);
          this.setState({ aiTurnTimerId: timerId });
        }
      } else if (gamePhase === 'roundOver' || gamePhase === 'gameOver') {
        this.fetchLeaderboard();
      }
    });
  };

  // --- Game Lifecycle ---

  handleNameInputChange = (event) => {
    this.setState({ playerNameInput: event.target.value });
  };

  handleNameSubmit = (event) => {
    event.preventDefault();
    const normalizedName = this.normalizeName(this.state.playerNameInput);
    if (!normalizedName) {
        this.setState({ error: "Please enter a valid name." });
        return;
    }
    this.setState({ humanPlayerName: normalizedName, error: null }, () => {
        this.startGame(); // Call startGame after name is set
    });
  };

  startGame = async () => {
    console.log(`--- Requesting New Game for ${this.state.humanPlayerName} ---`);
    if (this.state.aiTurnTimerId) clearTimeout(this.state.aiTurnTimerId);
    this.setState({
        loading: true,
        gamePhase: 'loading',
        error: null,
        gameMessage: 'Starting new game...',
        aiTurnTimerId: null,
        players: [], // Clear previous game data
        cardsOnTable: [],
        currentPlayerIndex: -1,
        selectedCards: [],
        gameId: null,
        activePlayerCount: 0,
        playerAnimationSwitchboard: {},
        showLeaderboard: false, // Hide leaderboard when starting game
        showRules: false, // Hide rules when starting a game
    });

    const startData = { playerName: this.state.humanPlayerName };
    const initialState = await this.fetchApi('/game/start', 'POST', startData);

    if (initialState) {
        console.log("--- Game Started (Received Initial State) ---", initialState);
        // updateStateFromApi will set loading to false
        this.updateStateFromApi(initialState);
    } else {
        console.error("Failed to start game from API");
        // fetchApi handles setting error state, maybe revert phase
        this.setState({ loading: false, gamePhase: 'error' }); // Revert to error phase
    }
  };

  // --- AI Turn Logic (mostly unchanged) ---
  triggerAiTurn = async () => {
      if (!this.state.aiTurnTimerId) {
          console.log("triggerAiTurn called, but aiTurnTimerId is null. Aborting.");
          return;
      }

      const { players, currentPlayerIndex, humanPlayerId, gamePhase, gameId } = this.state; // Added gameId

      if (gamePhase !== 'playing' || currentPlayerIndex === -1 || !gameId) { // Check gameId
          console.warn("triggerAiTurn called, but game not in correct state or gameId missing.");
          this.setState({ aiTurnTimerId: null });
          return;
      }
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id === humanPlayerId || !currentPlayer.isStillInRound) {
          console.warn("triggerAiTurn called, but it's not AI's turn or AI is out of round.");
           this.setState({ aiTurnTimerId: null });
          return;
      }

      console.log(`--- Triggering AI Turn for ${currentPlayer.name} ---`);
      this.setState({ loading: true, gameMessage: `${currentPlayer.name} is thinking...`, aiTurnTimerId: null });

      const actionData = {
        gameId: gameId, // Use gameId from state
        action_type: 'ai_turn'
      };
      const newState = await this.fetchApi('/game/action', 'POST', actionData);

      if (newState) {
          console.log(`--- Received State after AI ${currentPlayer.name} ---`, newState);
          this.updateStateFromApi(newState); // Will set loading: false
      } else {
          console.error(`Failed to process AI turn for ${currentPlayer.name}`);
          // fetchApi handles error state, loading is already false from fetchApi error handling
          this.setState({ loading: false }); // Ensure loading is off
      }
  };

  // --- Player Actions (mostly unchanged, ensure gameId is used) ---
  handleCardClick = (card) => {
    const { players, currentPlayerIndex, gamePhase, humanPlayerId, loading } = this.state;
    const currentPlayer = players[currentPlayerIndex];

    if (gamePhase !== 'playing' || !currentPlayer || currentPlayer.id !== humanPlayerId || loading) {
      return;
    }

    const { selectedCards } = this.state;
    const alreadySelected = selectedCards.some(c => c.id === card.id);
    let newSelectedCards;

    if (alreadySelected) {
      newSelectedCards = selectedCards.filter(c => c.id !== card.id);
    } else {
      if (selectedCards.length > 0 && card.value !== selectedCards[0].value) {
          console.log("Cannot select cards of different ranks. Resetting selection.");
          newSelectedCards = [card];
      } else {
          newSelectedCards = [...selectedCards, card];
      }
    }
    newSelectedCards.sort((a, b) => a.value - b.value);
    this.setState({ selectedCards: newSelectedCards });
  };

  handlePlayCards = async () => {
    const { selectedCards, players, currentPlayerIndex, humanPlayerId, loading, gameId } = this.state; // Added gameId
    const currentPlayer = players[currentPlayerIndex];

    if (!currentPlayer || currentPlayer.id !== humanPlayerId || selectedCards.length === 0 || loading || !gameId) { // Check gameId
      console.warn("Play button clicked inappropriately or gameId missing.");
      return;
    }
    if (this.state.aiTurnTimerId) clearTimeout(this.state.aiTurnTimerId);

    console.log("--- Sending Play Action ---", selectedCards);
    this.setState({ loading: true, gameMessage: 'Playing cards...', aiTurnTimerId: null });
    const actionData = {
        gameId: gameId, // Use gameId from state
        action_type: 'play',
        cards: selectedCards.map(c => ({ id: c.id, cardFace: c.cardFace, suit: c.suit, value: c.value })),
    };

    const newState = await this.fetchApi('/game/action', 'POST', actionData);
    if (newState) {
        console.log("--- Received State after Play ---", newState);
        this.updateStateFromApi(newState); // Will set loading: false
    } else {
        console.error("Failed to process play action via API");
        this.setState({ loading: false }); // Ensure loading is off
    }
  };

  handlePass = async () => {
     const { players, currentPlayerIndex, humanPlayerId, loading, gameId } = this.state; // Added gameId
     const currentPlayer = players[currentPlayerIndex];

     if (!currentPlayer || currentPlayer.id !== humanPlayerId || loading || !gameId) { // Check gameId
       console.warn("Pass button clicked inappropriately or gameId missing.");
       return;
     }
     if (this.state.aiTurnTimerId) clearTimeout(this.state.aiTurnTimerId);

     console.log("--- Sending Pass Action ---");
     this.setState({ loading: true, gameMessage: 'Passing turn...', aiTurnTimerId: null });
     const actionData = {
      gameId: gameId, // Use gameId from state
      action_type: 'pass',
    };

     const newState = await this.fetchApi('/game/action', 'POST', actionData);
     if (newState) {
         console.log("--- Received State after Pass ---", newState);
         this.updateStateFromApi(newState); // Will set loading: false
     } else {
         console.error("Failed to process pass action via API");
         this.setState({ loading: false }); // Ensure loading is off
     }
  };

  // --- AI Speed Slider (unchanged) ---
  handleDelayChange = (event) => {
    const newDelay = parseInt(event.target.value, 10);
    if (this.state.aiTurnTimerId) {
        clearTimeout(this.state.aiTurnTimerId);
    }
    this.setState({ aiTurnDelay: newDelay, aiTurnTimerId: null }, () => {
        const { gamePhase, players, currentPlayerIndex, humanPlayerId, aiTurnTimerId } = this.state;
        if (gamePhase === 'playing' && currentPlayerIndex !== -1 && !aiTurnTimerId) {
            const currentPlayer = players[currentPlayerIndex];
            if (currentPlayer && currentPlayer.id !== humanPlayerId && currentPlayer.isStillInRound) {
                 console.log(`Rescheduling AI turn for ${currentPlayer.name} with new delay ${newDelay}ms`);
                 const newTimerId = setTimeout(this.triggerAiTurn, newDelay);
                 this.setState(prevState => ({ ...prevState, aiTurnTimerId: newTimerId }));
            }
        }
    });
  };

  // --- Leaderboard Logic ---
  fetchLeaderboard = async () => {
    console.log("--- Fetching Leaderboard ---");
    this.setState({ leaderboardLoading: true });
    const data = await this.fetchApi('/leaderboard');
    if (data) {
        this.setState({ leaderboardData: data, leaderboardLoading: false });
    } else {
        // Error handled by fetchApi, just turn off loading
        this.setState({ leaderboardLoading: false });
    }
  };

  toggleLeaderboard = () => {
    this.setState(prevState => ({ showLeaderboard: !prevState.showLeaderboard }));
    // Optionally refresh leaderboard when opening it
    if (!this.state.showLeaderboard) {
        this.fetchLeaderboard();
    }
  };

  // --- Animation Handler (unchanged) ---
  handleEndTransition = (playerIndex) => {
    this.setState(prevState => {
        const newSwitchboard = { ...prevState.playerAnimationSwitchboard };
        if (newSwitchboard[playerIndex]) {
            newSwitchboard[playerIndex] = { ...newSwitchboard[playerIndex], isAnimating: false };
        }
        return { playerAnimationSwitchboard: newSwitchboard };
    });
  };

  toggleRules = () => {
      this.setState(prevState => ({ showRules: !prevState.showRules }));
  };


  // --- Render Methods ---

  renderPlayers = () => {
    const { players, currentPlayerIndex, selectedCards, gamePhase, humanPlayerId, loading, playerAnimationSwitchboard } = this.state;
    if (!players || players.length === 0) return null;

    return players.map((player, index) => (
      <Player
        key={player.id || `player-${index}`}
        arrayIndex={index}
        player={{ // Player object now includes name from backend
            ...player,
            hand: player.hand || [],
            isHuman: player.id === humanPlayerId
        }}
        isCurrentPlayer={index === currentPlayerIndex && gamePhase === 'playing'}
        isStillInRound={player.isStillInRound === true}
        onCardClick={this.handleCardClick}
        selectedCards={player.id === humanPlayerId ? selectedCards : []}
        disabled={!(index === currentPlayerIndex && player.id === humanPlayerId && gamePhase === 'playing' && !loading)}
        playerAnimationSwitchboard={playerAnimationSwitchboard}
        endTransition={this.handleEndTransition}
      />
    ));
  };

  renderGameControls = () => {
    const { players, currentPlayerIndex, gamePhase, selectedCards, humanPlayerId, loading } = this.state;
    if (gamePhase !== 'playing' || !players.length) return null;

    const currentPlayer = players[currentPlayerIndex];
    // Allow controls rendering even if loading=true, but disable buttons via props
    if (!currentPlayer || currentPlayer.id !== humanPlayerId) return null;

    const canPlay = selectedCards.length > 0;
    const canPass = true;

    return (
      <GameControls
        onPlayClick={this.handlePlayCards}
        onPassClick={this.handlePass}
        canPlay={canPlay}
        canPass={canPass}
        disabled={loading} // Disable buttons when loading
        playText={selectedCards.length > 0 ? `Play ${selectedCards.length}` : "Play"}
        highlightPass={true}
      />
    );
  };

  // --- Main Render Logic ---
  render() {
    const {
        loading, gamePhase, cardsOnTable, gameMessage, error, players,
        activePlayerCount, aiTurnDelay, playerNameInput, humanPlayerName,
        leaderboardData, leaderboardLoading, showLeaderboard, showRules
    } = this.state;
    const totalPlayerCount = players.length;

    // --- Name Input Phase ---
    if (gamePhase === 'nameInput') {
        return (
            <div className="App">
                <div className='poker-table--wrapper name-input-wrapper'>
                    <h1>Welcome to Scum!</h1>
                    <form onSubmit={this.handleNameSubmit} className="name-input-form">
                        <label htmlFor="playerName">Enter Your Name:</label>
                        <input
                            type="text"
                            id="playerName"
                            value={playerNameInput}
                            onChange={this.handleNameInputChange}
                            maxLength={20} // Optional: limit name length
                            required
                        />
                        <button type="submit" disabled={loading || !playerNameInput.trim()}>
                            {loading ? 'Starting...' : 'Play'}
                        </button>
                        {error && <p className="error-message">{error}</p>}
                    </form>

                    {/* Rules Toggle Button */}
                    <button onClick={this.toggleRules} className="rules-toggle-button" disabled={loading}>
                        {showRules ? 'Hide Rules' : 'Show Rules'}
                    </button>

                    {/* Rules Display */}
                    {showRules && (
                      <div className="rules-container">
                        <h2>Scum Rules</h2>
                        <p>The goal is to be the first player to get rid of all your cards.</p>
                        <ul>
                            <li>The game is played with a standard deck of 52 cards, distributed as evenly as possible among players.</li>
                            <li>Players take turns playing cards in ascending order, matching or exceeding the value of the last played card.</li>
                            <li>Cards can be played as singles, pairs, triples, or more, but must match the quantity of the previous play.</li>
                            <li>If a player cannot or does not want to play, they must pass.</li>
                            <li>The round ends when all players pass consecutively, and the last player to play starts a new round.</li>
                            <li>Special rules:
                                <ul>
                                    <li><b>2 of hearts:</b> Resets the pile, allowing the player to start fresh with any card.</li>
                                    <li><b>7:</b> Makes the next player play a 7 or 8.</li>    
                                    <li><b>10:</b> The next card played must be lower or another 10.</li>                            </ul>
                            </li>
                        </ul>
                    </div>
                    )}

                     {/* Leaderboard Toggle Button */}
                     <button onClick={this.toggleLeaderboard} className="leaderboard-toggle-button" disabled={leaderboardLoading}>
                        {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
                        {leaderboardLoading && '...'}
                    </button>
                    {/* Leaderboard Display */}
                    {showLeaderboard && (
                        <Leaderboard data={leaderboardData} loading={leaderboardLoading} />
                    )}
                </div>
            </div>
        );
    }

    // --- Loading Phase (Initial Game Load) ---
     if (gamePhase === 'loading' && loading && !players.length) {
        return <Spinner message="Starting game..." />;
     }

    // --- Error Phase ---
    if (gamePhase === 'error') {
        return (
            <div className="App">
                <div className='poker-table--wrapper error-container'>
                    <div style={{ color: 'red', backgroundColor: 'white', padding: '20px', borderRadius: '5px', textAlign: 'center', margin: 'auto' }}>
                        <h2>Error</h2>
                        <p>{error || 'An unknown error occurred.'}</p>
                        {/* Provide option to go back to name input */}
                        <button onClick={() => this.setState({ gamePhase: 'nameInput', error: null, loading: false })} disabled={this.state.loading}>
                            {this.state.loading ? 'Loading...' : 'Back to Menu'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Round/Game Over Phase ---
    if (gamePhase === 'roundOver' || gamePhase === 'gameOver') {
        // Sort players by rank using the data received from the backend
        const rankedPlayers = [...players].sort((a, b) => (a.finishedRank ?? 999) - (b.finishedRank ?? 999));
        const isGameOver = gamePhase === 'gameOver'; // Assuming 'gameOver' phase exists

        return (
            <div className="App">
                <div className='poker-table--wrapper showdown-wrapper'>
                     {loading && <div className="loading-overlay"><Spinner /></div>}
                    <div className="showdown-container--wrapper" style={{ filter: loading ? 'blur(2px)' : 'none' }}>
                        <h1>{isGameOver ? 'Game Over!' : 'Round Over!'}</h1>
                        <p>{gameMessage}</p>
                        <h3>Results:</h3>
                        <ol style={{ listStylePosition: 'inside', paddingLeft: 0, textAlign: 'left', display: 'inline-block' }}>
                            {rankedPlayers.map(p => (
                                <li key={p.id}>
                                    {p.name} {/* Display name from player object */}
                                    {p.finishedRank ? ` - Rank ${p.finishedRank}` : ' - DNF'}
                                    {p.role && ` (${p.role})`} {/* Display role if available */}
                                </li>
                            ))}
                        </ol>
                        {/* Button to go back to name input / main menu */}
                        <button onClick={() => this.setState({ gamePhase: 'nameInput', error: null, loading: false })} disabled={loading} style={{marginTop: '15px'}}>
                            {loading ? 'Loading...' : 'Main Menu'}
                        </button>
                         {/* Leaderboard Toggle Button */}
                         <button onClick={this.toggleLeaderboard} className="leaderboard-toggle-button" disabled={leaderboardLoading} style={{marginLeft: '10px'}}>
                            {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
                            {leaderboardLoading && '...'}
                        </button>
                        {/* Leaderboard Display */}
                        {showLeaderboard && (
                            <Leaderboard data={leaderboardData} loading={leaderboardLoading} />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- Main Game Render (Playing Phase) ---
    return (
      <div className="App">
        <div className='poker-table--wrapper'>
           {/* More subtle loading indicator for in-game actions */}
           {loading && <div className="loading-overlay subtle"><Spinner size="small" /></div>}

          <div className="poker-table--container">
            {this.renderPlayers()}
            <div className='community-card-container'>
              <TablePile cardsOnTable={cardsOnTable} />
            </div>
            <div className='game-message-container'>
              <div>{gameMessage}</div>
              {gamePhase === 'playing' && totalPlayerCount > 0 && (
                <div className='game-message-subtext'>
                  {activePlayerCount} / {totalPlayerCount} players active
                </div>
              )}
            </div>
          </div> {/* End poker-table--container */}

          {/* --- Controls Area --- */}
          {gamePhase === 'playing' && (
            <div className='game-controls-area'>
                <div className='game-action-bar'>
                   {this.renderGameControls()}
                </div>
                <div className='ai-speed-slider-container'>
                  <label htmlFor="aiSpeed">AI Speed:</label>
                  <input
                    type="range" id="aiSpeed" name="aiSpeed" min="10" max="5000" step="10"
                    value={aiTurnDelay} onChange={this.handleDelayChange} disabled={loading}
                  />
                  <span>{aiTurnDelay} ms</span>
                </div>
                 {/* Leaderboard Toggle Button (optional during game) */}
                 <button onClick={this.toggleLeaderboard} className="leaderboard-toggle-button small" disabled={leaderboardLoading}>
                    {showLeaderboard ? 'Hide Leaderboard' : 'Leaderboard'}
                    {leaderboardLoading && '...'}
                </button>
            </div>
           )} {/* End game-controls-area */}

            {/* Leaderboard Display (Modal or separate section) */}
            {showLeaderboard && gamePhase === 'playing' && (
                <div className="leaderboard-overlay"> {/* Style this as a modal */}
                    <Leaderboard data={leaderboardData} loading={leaderboardLoading} />
                    <button onClick={this.toggleLeaderboard}>Close</button>
                </div>
            )}

        </div> {/* End poker-table--wrapper */}
      </div>
    );
  }
}

export default App;