// ./App.jsx
import React, { Component } from 'react';
import './App.css';
import './Scum.css';

import Spinner from './Spinner';
import Player from "./components/players/Player";
import TablePile from "./components/cards/TablePile";
import GameControls from "./components/GameControls"; // Assuming GameControls has styling for the pass button now

const API_URL = 'http://localhost:5000';
const AI_TURN_DELAY = 500; // Milliseconds delay for AI turns (adjust as needed)

class App extends Component {
  state = {
    loading: true,
    gamePhase: 'loading',
    players: [],
    cardsOnTable: [],
    currentPlayerIndex: -1,
    gameMessage: 'Initializing...',
    selectedCards: [],
    humanPlayerId: 'player-0',
    error: null,
    aiTurnTimerId: null,
    activePlayerCount: 0,
    playerAnimationSwitchboard: {},
  };

  componentDidMount() {
    this.startGame();
  }

  componentWillUnmount() {
      if (this.state.aiTurnTimerId) {
          clearTimeout(this.state.aiTurnTimerId);
      }
  }
  fetchApi = async (endpoint, method = 'GET', body = null) => {
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
      // Check if response is empty before parsing JSON
      const text = await response.text();
      const data = text ? JSON.parse(text) : {}; // Handle empty response
      return data;
    } catch (error) {
      console.error("API Error:", error);
      this.setState({
          error: error.message,
          loading: false,
          gamePhase: 'error',
          gameMessage: `Error: ${error.message}`,
          aiTurnTimerId: null
      });
      if (this.state.aiTurnTimerId) clearTimeout(this.state.aiTurnTimerId);
      return null;
    }
  };

  updateStateFromApi = (gameState) => {
    if (!gameState) {
      if (this.state.loading) this.setState({ loading: false });
      return;
    }

    if (this.state.aiTurnTimerId) {
        clearTimeout(this.state.aiTurnTimerId);
        // Setting timerId to null here might be premature if setState below schedules a new one
        // this.setState({ aiTurnTimerId: null }); // Let the setState callback handle it
    }

    const prevPlayerIndex = this.state.currentPlayerIndex; // Store previous index
    const prevPlayers = this.state.players; // Store previous players state

    const players = gameState.players || [];
    const humanPlayerIndex = players.findIndex(p => p.id === this.state.humanPlayerId);
     if (humanPlayerIndex !== -1 && players[humanPlayerIndex]?.hand) {
         players[humanPlayerIndex].hand.sort((a, b) => a.value - b.value);
     }

    // **ASSUMPTION:** Backend adds `isStillInRound: boolean` to each player object.
    // This flag should be true if the player hasn't finished the game AND hasn't passed in the current play sequence.
    const activePlayerCount = players.filter(p => p.isStillInRound === true).length;

    // --- Pass Notification Logic ---
    let newSwitchboard = { ...this.state.playerAnimationSwitchboard };
    // Reset previous animations (optional, keeps only one active)
    Object.keys(newSwitchboard).forEach(key => {
        newSwitchboard[key] = { ...newSwitchboard[key], isAnimating: false };
    });

    // Check if the previous player passed
    // **ASSUMPTION:** The backend indicates a pass, maybe via gameMessage or a specific action field.
    // We'll check if the previous player exists and is *no longer* the current player,
    // and if their `isStillInRound` status changed to false (or a specific message exists).
    const previousPlayer = prevPlayers[prevPlayerIndex];
    const updatedPreviousPlayer = players[prevPlayerIndex];

    if (previousPlayer && updatedPreviousPlayer && // Ensure player exists in both states
        prevPlayerIndex !== gameState.currentPlayerIndex && // Ensure turn actually changed
        previousPlayer.isStillInRound === true && // They were active before
        updatedPreviousPlayer.isStillInRound === false && // They are not active now
        updatedPreviousPlayer.hand?.length > 0 // And they still have cards (didn't just finish)
       ) {
           console.log(`Player ${prevPlayerIndex} (${previousPlayer.name}) likely passed.`);
           newSwitchboard[prevPlayerIndex] = { isAnimating: true, content: 'Passed' };
    }
    // --- End Pass Notification Logic ---


    this.setState({
      loading: false,
      gamePhase: gameState.gamePhase || 'playing',
      players: players,
      cardsOnTable: gameState.cardsOnTable || [], // Assume this is the full pile now
      currentPlayerIndex: gameState.currentPlayerIndex ?? -1,
      gameMessage: gameState.gameMessage || '',
      selectedCards: [], // Clear selection after action
      humanPlayerId: gameState.humanPlayerId || this.state.humanPlayerId,
      error: null,
      aiTurnTimerId: null, // Reset timer ID initially
      activePlayerCount: activePlayerCount,
      playerAnimationSwitchboard: newSwitchboard, // Update animation state
    }, () => {
        // Schedule AI turn in the callback AFTER state is updated
        const { gamePhase, players, currentPlayerIndex, humanPlayerId } = this.state;
        if (gamePhase === 'playing' && currentPlayerIndex !== -1) {
            const currentPlayer = players[currentPlayerIndex];
            // Check if it's AI's turn AND they are still in the round
            if (currentPlayer && currentPlayer.id !== humanPlayerId && currentPlayer.isStillInRound) {
                console.log(`Scheduling AI turn for Player ${currentPlayerIndex} (ID: ${currentPlayer.id}) in ${AI_TURN_DELAY}ms`);
                const timerId = setTimeout(this.triggerAiTurn, AI_TURN_DELAY);
                // Use functional setState to safely update timerId without race conditions
                this.setState(prevState => ({ ...prevState, aiTurnTimerId: timerId }));
            } else {
                 console.log("Next turn is Human, AI has passed/finished, or game not playing.");
            }
        } else {
             console.log(`Game phase is ${gamePhase}, not scheduling AI turn.`);
        }
    });
  };

  // --- NEW: Handler for animation end ---
  handleEndTransition = (playerIndex) => {
    this.setState(prevState => {
        const newSwitchboard = { ...prevState.playerAnimationSwitchboard };
        if (newSwitchboard[playerIndex]) {
            newSwitchboard[playerIndex] = { ...newSwitchboard[playerIndex], isAnimating: false };
        }
        return { playerAnimationSwitchboard: newSwitchboard };
    });
  };


  // --- Game Lifecycle ---
  startGame = async () => {
    console.log("--- Requesting New Game ---");
    if (this.state.aiTurnTimerId) clearTimeout(this.state.aiTurnTimerId);
    this.setState({ loading: true, gamePhase: 'loading', error: null, gameMessage: 'Starting new game...', aiTurnTimerId: null });
    const initialState = await this.fetchApi('/game/start', 'POST');
    if (initialState) {
        console.log("--- Game Started (Received Initial State) ---", initialState);
        this.updateStateFromApi(initialState);
    } else {
        console.error("Failed to start game from API");
    }
  };

  // --- Trigger AI Turn ---
  triggerAiTurn = async () => {
      const { players, currentPlayerIndex, humanPlayerId, gamePhase } = this.state;

      if (gamePhase !== 'playing' || currentPlayerIndex === -1) {
          console.warn("triggerAiTurn called, but game not in correct state.");
          return;
      }
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id === humanPlayerId) {
          console.warn("triggerAiTurn called, but it's not AI's turn according to current state.");
          return;
      }

      console.log(`--- Triggering AI Turn for Player ${currentPlayerIndex} ---`);
      this.setState({ loading: true, gameMessage: `${currentPlayer.name} is thinking...`, aiTurnTimerId: null });

      const actionData = { action_type: 'ai_turn' };
      const newState = await this.fetchApi('/game/action', 'POST', actionData);

      if (newState) {
          console.log(`--- Received State after AI Player ${currentPlayerIndex} ---`, newState);
          this.updateStateFromApi(newState);
      } else {
          console.error(`Failed to process AI turn for Player ${currentPlayerIndex}`);
      }
  };


  // --- Player Action Handlers ---
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
          newSelectedCards = [card]; // Start new selection
      } else {
          newSelectedCards = [...selectedCards, card];
      }
    }
    newSelectedCards.sort((a, b) => a.value - b.value);
    this.setState({ selectedCards: newSelectedCards });
  };

  handlePlayCards = async () => {
    const { selectedCards, players, currentPlayerIndex, humanPlayerId, loading } = this.state;
    const currentPlayer = players[currentPlayerIndex];

    if (!currentPlayer || currentPlayer.id !== humanPlayerId || selectedCards.length === 0 || loading) {
      console.warn("Play button clicked inappropriately.");
      return;
    }

    console.log("--- Sending Play Action ---", selectedCards);
    this.setState({ loading: true, gameMessage: 'Playing cards...' });
    const actionData = {
        action_type: 'play',
        cards: selectedCards.map(c => ({ id: c.id, cardFace: c.cardFace, suit: c.suit, value: c.value }))
    };

    const newState = await this.fetchApi('/game/action', 'POST', actionData);
    if (newState) {
        console.log("--- Received State after Play ---", newState);
        this.updateStateFromApi(newState);
    } else {
        console.error("Failed to process play action via API");
    }
  };

  handlePass = async () => {
     const { players, currentPlayerIndex, humanPlayerId, loading } = this.state;
     const currentPlayer = players[currentPlayerIndex];

     if (!currentPlayer || currentPlayer.id !== humanPlayerId || loading) {
       console.warn("Pass button clicked inappropriately.");
       return;
     }

     console.log("--- Sending Pass Action ---");
     this.setState({ loading: true, gameMessage: 'Passing turn...' });
     const actionData = { action_type: 'pass' };

     const newState = await this.fetchApi('/game/action', 'POST', actionData);
     if (newState) {
         console.log("--- Received State after Pass ---", newState);
         this.updateStateFromApi(newState);
     } else {
         console.error("Failed to process pass action via API");
     }
  };

  // --- Render Methods ---

  renderPlayers = () => {
    const { players, currentPlayerIndex, selectedCards, gamePhase, humanPlayerId, loading } = this.state;
    if (!players || players.length === 0) return null;

    return players.map((player, index) => (
      <Player
        key={player.id || `player-${index}`}
        arrayIndex={index}
        player={{
            ...player,
            hand: player.hand || [],
            isHuman: player.id === humanPlayerId
        }}
        isCurrentPlayer={index === currentPlayerIndex && gamePhase === 'playing'}
        onCardClick={this.handleCardClick}
        selectedCards={player.id === humanPlayerId ? selectedCards : []}
        disabled={!(index === currentPlayerIndex && player.id === humanPlayerId && gamePhase === 'playing' && !loading)}
      />
    ));
  };

  renderGameControls = () => {
    const { players, currentPlayerIndex, gamePhase, selectedCards, humanPlayerId, loading } = this.state;
    if (gamePhase !== 'playing' || !players.length) return null;

    const currentPlayer = players[currentPlayerIndex];
    // Show controls only if it's human's turn AND not currently loading
    if (!currentPlayer || currentPlayer.id !== humanPlayerId || loading) return null;

    const canPlay = selectedCards.length > 0;
    const canPass = true; // Backend validates if pass is allowed

    return (
      <GameControls
        onPlayClick={this.handlePlayCards}
        onPassClick={this.handlePass}
        canPlay={canPlay}
        canPass={canPass} // Always true when controls are visible
        playText={selectedCards.length > 0 ? `Play ${selectedCards.length}` : "Play"}
        // Add a prop to tell GameControls to highlight Pass, or handle in GameControls CSS
        highlightPass={true}
      />
    );
  };
  renderPlayers = () => {
    const { players, currentPlayerIndex, selectedCards, gamePhase, humanPlayerId, loading, playerAnimationSwitchboard } = this.state;
    if (!players || players.length === 0) return null;

    return players.map((player, index) => (
      <Player
        key={player.id || `player-${index}`}
        arrayIndex={index}
        player={{
            ...player,
            hand: player.hand || [],
            isHuman: player.id === humanPlayerId
        }}
        isCurrentPlayer={index === currentPlayerIndex && gamePhase === 'playing'}
        // Pass the new prop - **ASSUMES backend provides player.isStillInRound**
        isStillInRound={player.isStillInRound === true}
        onCardClick={this.handleCardClick}
        selectedCards={player.id === humanPlayerId ? selectedCards : []}
        disabled={!(index === currentPlayerIndex && player.id === humanPlayerId && gamePhase === 'playing' && !loading)}
        // Pass animation state and handler
        playerAnimationSwitchboard={playerAnimationSwitchboard}
        endTransition={this.handleEndTransition}
      />
    ));
  };

  // ... (renderGameControls, render - unchanged structure, but Player rendering is updated) ...

  // Make sure render passes the necessary props down if they weren't already
  render() {
    const { loading, gamePhase, cardsOnTable, gameMessage, error, players, activePlayerCount } = this.state;
    const totalPlayerCount = players.length;

     if (gamePhase === 'loading' && loading && !players.length) {
        return <Spinner />;
     }

    if (gamePhase === 'error') {
        return (
            <div className="App">
                <div className='poker-table--wrapper'>
                    <div style={{ color: 'red', backgroundColor: 'white', padding: '20px', borderRadius: '5px', textAlign: 'center', margin: 'auto' }}>
                        <h2>Error</h2>
                        <p>{error || 'An unknown error occurred.'}</p>
                        <button onClick={this.startGame} disabled={this.state.loading}>
                            {this.state.loading ? 'Restarting...' : 'Try Again'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (gamePhase === 'roundOver' || gamePhase === 'gameOver') {
        const rankedPlayers = [...players].sort((a, b) => (a.finishedRank ?? 999) - (b.finishedRank ?? 999));
        const isRoundOver = gamePhase === 'roundOver';
        const isGameOver = gamePhase === 'gameOver';

        return (
            <div className="App">
                <div className='poker-table--wrapper'>
                     {loading && <div className="loading-overlay"><Spinner /></div>}
                    <div className="showdown-container--wrapper" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'white', backgroundColor: 'rgba(0,0,0,0.85)', padding: '20px', borderRadius: '10px', filter: loading ? 'blur(2px)' : 'none' }}>
                        <h1>{isGameOver ? 'Game Over!' : 'Round Over!'}</h1>
                        <p>{gameMessage}</p>
                        <h3>Results:</h3>
                        <ol style={{ listStylePosition: 'inside', paddingLeft: 0, textAlign: 'left', display: 'inline-block' }}>
                            {rankedPlayers.map(p => (
                                <li key={p.id}>
                                    {p.name} - Rank {p.finishedRank ?? 'N/A'}
                                    {p.role && ` (${p.role})`}
                                </li>
                            ))}
                        </ol>
                        {(isRoundOver || isGameOver) && (
                            <button onClick={this.startGame} disabled={loading} style={{marginTop: '15px'}}>
                                {loading ? 'Loading...' : (isGameOver ? 'Play Again' : 'Start Next Round')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
      <div className="App">
        <div className='poker-table--wrapper'>
           {loading && <div className="loading-overlay"><Spinner /></div>}
          <div className="poker-table--container" style={{ filter: loading ? 'blur(2px)' : 'none', transition: 'filter 0.2s ease-out' }}>

            {/* RenderPlayers now passes the needed props */}
            {this.renderPlayers()}

            <div className='community-card-container' style={{ top: 'calc(50% - 35px)', height: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
              {/* TablePile assumes backend sends full pile */}
              <TablePile cardsOnTable={cardsOnTable} />
            </div>

            <div className='game-message-container' style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', padding: '8px 15px', borderRadius: '5px', zIndex: 50, textAlign: 'center', minWidth: '250px' }}>
              <div>{gameMessage}</div>
              {gamePhase === 'playing' && totalPlayerCount > 0 && (
                <div style={{ fontSize: '0.9em', marginTop: '4px', opacity: 0.9 }}>
                  {activePlayerCount} / {totalPlayerCount} players active in round
                </div>
              )}
            </div>

          </div>

          <div className='game-action-bar'>
             {this.renderGameControls()}
          </div>
        </div>
      </div>
    );
  }
}

export default App;