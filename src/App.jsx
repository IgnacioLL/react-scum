// ./App.jsx
import React, { Component } from 'react';
import './App.css';
import './Scum.css';

import Spinner from './Spinner';
import Player from "./components/players/Player";
import TablePile from "./components/cards/TablePile";
import GameControls from "./components/GameControls";

const API_URL = 'http://176.84.229.17:5000';
// const AI_TURN_DELAY = 1500; // REMOVE THIS CONST

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
    aiTurnDelay: 1500, // ADDED: Default AI turn delay in ms
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
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      return data;
    } catch (error) {
      console.error("API Error:", error);
      this.setState({
          error: error.message,
          loading: false,
          gamePhase: 'error',
          gameMessage: `Error: ${error.message}`,
          aiTurnTimerId: null // Clear timer on error
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

    // Clear any existing timer *before* potentially setting a new one
    if (this.state.aiTurnTimerId) {
        clearTimeout(this.state.aiTurnTimerId);
        // No need to set state here, the main setState below handles it
    }

    const prevPlayerIndex = this.state.currentPlayerIndex;
    const prevPlayers = this.state.players;

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


    this.setState({
      loading: false,
      gamePhase: gameState.gamePhase || 'playing',
      players: players,
      cardsOnTable: gameState.cardsOnTable || [],
      currentPlayerIndex: gameState.currentPlayerIndex ?? -1,
      gameMessage: gameState.gameMessage || '',
      selectedCards: [],
      humanPlayerId: gameState.humanPlayerId || this.state.humanPlayerId,
      error: null,
      aiTurnTimerId: null, // Reset timer ID before the callback potentially sets it
      activePlayerCount: activePlayerCount,
      playerAnimationSwitchboard: newSwitchboard,
    }, () => {
        // Schedule AI turn in the callback AFTER state is updated
        const { gamePhase, players, currentPlayerIndex, humanPlayerId, aiTurnDelay } = this.state; // Use aiTurnDelay from state
        if (gamePhase === 'playing' && currentPlayerIndex !== -1) {
            const currentPlayer = players[currentPlayerIndex];
            if (currentPlayer && currentPlayer.id !== humanPlayerId && currentPlayer.isStillInRound) {
                console.log(`Scheduling AI turn for Player ${currentPlayerIndex} (ID: ${currentPlayer.id}) in ${aiTurnDelay}ms`); // Use state value
                const timerId = setTimeout(this.triggerAiTurn, aiTurnDelay); // Use state value
                this.setState(prevState => ({ ...prevState, aiTurnTimerId: timerId }));
            } else {
                 console.log("Next turn is Human, AI has passed/finished, or game not playing.");
            }
        } else {
             console.log(`Game phase is ${gamePhase}, not scheduling AI turn.`);
        }
    });
  };

  handleEndTransition = (playerIndex) => {
    this.setState(prevState => {
        const newSwitchboard = { ...prevState.playerAnimationSwitchboard };
        if (newSwitchboard[playerIndex]) {
            newSwitchboard[playerIndex] = { ...newSwitchboard[playerIndex], isAnimating: false };
        }
        return { playerAnimationSwitchboard: newSwitchboard };
    });
  };

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

  triggerAiTurn = async () => {
      // Check if a timer ID still exists in state. If not, it means it was cleared
      // (e.g., by a state update, slider change, or unmount) before it could fire.
      if (!this.state.aiTurnTimerId) {
          console.log("triggerAiTurn called, but aiTurnTimerId is null. Aborting.");
          return;
      }

      const { players, currentPlayerIndex, humanPlayerId, gamePhase } = this.state;

      if (gamePhase !== 'playing' || currentPlayerIndex === -1) {
          console.warn("triggerAiTurn called, but game not in correct state.");
          this.setState({ aiTurnTimerId: null }); // Clear timer ID as it's invalid now
          return;
      }
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id === humanPlayerId || !currentPlayer.isStillInRound) {
          console.warn("triggerAiTurn called, but it's not AI's turn or AI is out of round.");
           this.setState({ aiTurnTimerId: null }); // Clear timer ID as it's invalid now
          return;
      }

      console.log(`--- Triggering AI Turn for Player ${currentPlayerIndex} ---`);
      // Clear the timer ID *before* making the API call
      this.setState({ loading: true, gameMessage: `${currentPlayer.name} is thinking...`, aiTurnTimerId: null });

      const actionData = { action_type: 'ai_turn' };
      const newState = await this.fetchApi('/game/action', 'POST', actionData);

      if (newState) {
          console.log(`--- Received State after AI Player ${currentPlayerIndex} ---`, newState);
          // updateStateFromApi will handle scheduling the *next* AI turn if applicable
          this.updateStateFromApi(newState);
      } else {
          console.error(`Failed to process AI turn for Player ${currentPlayerIndex}`);
          // Keep loading false, error state is handled by fetchApi
      }
  };


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
    const { selectedCards, players, currentPlayerIndex, humanPlayerId, loading } = this.state;
    const currentPlayer = players[currentPlayerIndex];

    if (!currentPlayer || currentPlayer.id !== humanPlayerId || selectedCards.length === 0 || loading) {
      console.warn("Play button clicked inappropriately.");
      return;
    }
    if (this.state.aiTurnTimerId) clearTimeout(this.state.aiTurnTimerId); // Clear pending AI timer if human acts

    console.log("--- Sending Play Action ---", selectedCards);
    this.setState({ loading: true, gameMessage: 'Playing cards...', aiTurnTimerId: null });
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
     if (this.state.aiTurnTimerId) clearTimeout(this.state.aiTurnTimerId); // Clear pending AI timer if human acts

     console.log("--- Sending Pass Action ---");
     this.setState({ loading: true, gameMessage: 'Passing turn...', aiTurnTimerId: null });
     const actionData = { action_type: 'pass' };

     const newState = await this.fetchApi('/game/action', 'POST', actionData);
     if (newState) {
         console.log("--- Received State after Pass ---", newState);
         this.updateStateFromApi(newState);
     } else {
         console.error("Failed to process pass action via API");
     }
  };

  // --- NEW: Handler for AI Speed Slider ---
  handleDelayChange = (event) => {
    const newDelay = parseInt(event.target.value, 10);

    // Clear any existing timer immediately
    if (this.state.aiTurnTimerId) {
        clearTimeout(this.state.aiTurnTimerId);
    }

    this.setState({ aiTurnDelay: newDelay, aiTurnTimerId: null }, () => {
        // After state is updated, check if we need to reschedule an AI turn
        const { gamePhase, players, currentPlayerIndex, humanPlayerId, aiTurnTimerId } = this.state;

        // Only reschedule if game is playing, it's currently an AI's turn,
        // that AI is still in the round, and there isn't *already* a timer running
        // (though we just cleared it, this is a safe check).
        if (gamePhase === 'playing' && currentPlayerIndex !== -1 && !aiTurnTimerId) {
            const currentPlayer = players[currentPlayerIndex];
            if (currentPlayer && currentPlayer.id !== humanPlayerId && currentPlayer.isStillInRound) {
                 console.log(`Rescheduling AI turn for Player ${currentPlayerIndex} with new delay ${newDelay}ms`);
                 const newTimerId = setTimeout(this.triggerAiTurn, newDelay);
                 // Use functional setState to safely update timerId
                 this.setState(prevState => ({ ...prevState, aiTurnTimerId: newTimerId }));
            }
        }
    });
  };


  // --- Render Methods ---

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
    if (!currentPlayer || currentPlayer.id !== humanPlayerId || loading) return null;

    const canPlay = selectedCards.length > 0;
    const canPass = true; // Assuming pass is always allowed when it's human turn

    return (
      <GameControls
        onPlayClick={this.handlePlayCards}
        onPassClick={this.handlePass}
        canPlay={canPlay}
        canPass={canPass}
        playText={selectedCards.length > 0 ? `Play ${selectedCards.length}` : "Play"}
        highlightPass={true} // Or dynamically set based on game rules if needed
      />
    );
  };

  render() {
    const { loading, gamePhase, cardsOnTable, gameMessage, error, players, activePlayerCount, aiTurnDelay } = this.state;
    const totalPlayerCount = players.length;

     if (gamePhase === 'loading' && loading && !players.length) {
        return <Spinner />;
     }

    if (gamePhase === 'error') {
        return (
            <div className="App">
                <div className='poker-table--wrapper error-container'> {/* Added class */}
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
                <div className='poker-table--wrapper showdown-wrapper'> {/* Added class */}
                     {loading && <div className="loading-overlay"><Spinner /></div>}
                    <div className="showdown-container--wrapper" style={{ filter: loading ? 'blur(2px)' : 'none' }}>
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

    // --- Main Game Render ---
    return (
      <div className="App">
        {/* poker-table--wrapper now uses flexbox to structure table and controls */}
        <div className='poker-table--wrapper'>
           {loading && <div className="loading-overlay"><Spinner /></div>}

          {/* This container holds the players and the table pile */}
          <div className="poker-table--container" style={{ filter: loading ? 'blur(2px)' : 'none', transition: 'filter 0.2s ease-out' }}>

            {this.renderPlayers()}

            {/* Centered Table Pile */}
            <div className='community-card-container'>
              <TablePile cardsOnTable={cardsOnTable} />
            </div>

            {/* Game Message */}
            <div className='game-message-container'>
              <div>{gameMessage}</div>
              {gamePhase === 'playing' && totalPlayerCount > 0 && (
                <div className='game-message-subtext'>
                  {activePlayerCount} / {totalPlayerCount} players active
                </div>
              )}
            </div>

          </div> {/* End poker-table--container */}

          {/* --- Controls Area (Now at the bottom via flexbox) --- */}
          {/* Only show controls area if game is playing */}
          {gamePhase === 'playing' && (
            <div className='game-controls-area'>
                {/* Game Action Bar (Play/Pass) */}
                <div className='game-action-bar'>
                   {this.renderGameControls()}
                </div>

                {/* AI Speed Slider */}
                <div className='ai-speed-slider-container'>
                  <label htmlFor="aiSpeed">AI Speed:</label>
                  <input
                    type="range"
                    id="aiSpeed"
                    name="aiSpeed"
                    min="10"
                    max="5000"
                    step="10"
                    value={aiTurnDelay}
                    onChange={this.handleDelayChange}
                    disabled={loading}
                  />
                  <span>{aiTurnDelay} ms</span>
                </div>
            </div>
           )} {/* End game-controls-area */}

        </div> {/* End poker-table--wrapper */}
      </div>
    );
  }
}

export default App;