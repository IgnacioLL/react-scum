import React, { Component } from 'react';
import './App.css';
import './Poker.css'; // Keep for layout and card styles

import Spinner from './Spinner'; // Keep
// import WinScreen from './WinScreen'; // Keep or adapt

import Player from "./components/players/Player";
import TablePile from "./components/cards/TablePile"; // Use the new TablePile
import GameControls from "./components/GameControls"; // Use the new GameControls

// Import Scum logic functions
import {
  generateDeck,
  shuffleDeck,
  dealCards,
  isValidPlay,
  findNextPlayerIndex,
  findValidPlays, // *** Make sure this is imported ***
} from './utils/scumLogic.js';

// Keep UI utils if needed (like renderUnicodeSuitSymbol used by Card)
// import { renderUnicodeSuitSymbol } from './utils/ui';

import { cloneDeep } from 'lodash'; // Useful for deep copying state

const NUM_PLAYERS = 5;
const AI_DELAY = 1; // Use the constant (seconds)

class App extends Component {
  state = {
    loading: true,
    gamePhase: 'loading', // 'loading', 'dealing', 'playing', 'roundOver', 'gameOver'
    players: [], // { id, name, hand, isHuman, finishedRank }
    deck: [],
    cardsOnTable: [], // Cards in the current trick/pile
    currentPlayerIndex: 0,
    lastPlayerToPlay: null, // Index of the player who last successfully played cards
    trickLeadPlayerIndex: 0, // Who started the current trick
    passCounter: 0, // Consecutive passes
    roundWinners: [], // Order players finished the round
    gameMessage: 'Starting Game...',
    selectedCards: [], // Cards selected by the human player { id, suit, cardFace, value }
    playerAnimationSwitchboard: this.initializeAnimationSwitchboard(NUM_PLAYERS),
  };

  // Holds the timeout ID for the AI turn
  aiTurnTimeout = null; // Initialize here

  initializeAnimationSwitchboard(numPlayers) {
    const switchboard = {};
    for (let i = 0; i < numPlayers; i++) {
      switchboard[i] = { isAnimating: false, content: null };
    }
    return switchboard;
  }

  componentDidMount() {
    this.startGame();
  }

  // *** REVISED componentDidUpdate ***
  componentDidUpdate(prevProps, prevState) {
    const { gamePhase, players, currentPlayerIndex } = this.state;
    const currentPlayer = players[currentPlayerIndex];

    // --- AI Turn Trigger Logic ---
    // Check if it's an AI's turn NOW and it wasn't their turn before (or game just started/resumed)
    if (
      gamePhase === 'playing' &&
      currentPlayer && !currentPlayer.isHuman && // It's an AI's turn
      (prevState.currentPlayerIndex !== currentPlayerIndex || // The turn just changed to this player
       (prevState.gamePhase !== 'playing' && gamePhase === 'playing')) // Or the game just resumed on this player's turn
    ) {
      // Clear any *previous* timeout just in case (e.g., if updates happened very fast)
      if (this.aiTurnTimeout) {
        clearTimeout(this.aiTurnTimeout);
      }
      console.log(`[AI Trigger] Setting AI timeout for Player ${currentPlayerIndex} (${currentPlayer.name})`); // Debug log
      this.aiTurnTimeout = setTimeout(this.handleAiTurn, AI_DELAY * 2_000);
    }

    // --- Cleanup Logic ---
    // If the game is NO LONGER playing, clear any pending AI timeout.
    if (prevState.gamePhase === 'playing' && gamePhase !== 'playing') {
      if (this.aiTurnTimeout) {
        clearTimeout(this.aiTurnTimeout);
        this.aiTurnTimeout = null;
        console.log("[AI Cleanup] Game phase changed, clearing AI timeout."); // Debug
      }
    }

    // Optional: If the player changed *away* from the AI before its timeout fired
    // This is less common but can happen with rapid state changes.
    const prevPlayer = prevState.players[prevState.currentPlayerIndex];
    if (prevState.gamePhase === 'playing' && gamePhase === 'playing' && // Game is still playing
        prevState.currentPlayerIndex !== currentPlayerIndex && // Player changed
        prevPlayer && !prevPlayer.isHuman && // It *was* an AI's turn
        this.aiTurnTimeout) // And there was a timeout pending
     {
         // Check if the timeout was for the player whose turn it just was
         // (This check is implicitly handled by clearing any timeout above when setting a new one,
         // but explicit clearing here adds safety if the trigger logic were different)
         // console.log(`[AI Cleanup] Player changed away from AI ${prevState.currentPlayerIndex} before timeout fired. Clearing.`);
         // clearTimeout(this.aiTurnTimeout);
         // this.aiTurnTimeout = null;
         // This part might be redundant with the trigger logic clearing previous timeouts,
         // but keep it in mind if you encounter edge cases.
     }
  }

  // *** ADDED componentWillUnmount ***
  componentWillUnmount() {
    // Clear any pending timeout when the component is removed
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout);
      this.aiTurnTimeout = null;
      console.log("[AI Cleanup] Component unmounting, clearing AI timeout."); // Debug
    }
  }


  handleAiTurn = () => {
    const { players, currentPlayerIndex, cardsOnTable, gamePhase } = this.state;
    const aiPlayer = players[currentPlayerIndex];

    console.log(`[AI Turn] Handling turn for Player ${currentPlayerIndex} (${aiPlayer?.name})`); // Debug log

    // Reset timeout handle now that it has fired
    this.aiTurnTimeout = null;

    if (!aiPlayer || aiPlayer.isHuman || gamePhase !== 'playing') {
      console.warn("[AI Turn] AI turn triggered incorrectly or game state changed.", {
          hasPlayer: !!aiPlayer,
          isHuman: aiPlayer?.isHuman,
          gamePhase: gamePhase
      });
      return; // Safety check
    }

    // 1. Find all valid plays for the AI
    // *** Ensure findValidPlays is correctly imported and implemented ***
    const possiblePlays = findValidPlays(aiPlayer.hand, cardsOnTable);
    console.log(`[AI Turn] Player ${currentPlayerIndex} Hand:`, aiPlayer.hand);
    console.log(`[AI Turn] Cards on Table:`, cardsOnTable);
    console.log(`[AI Turn] Possible Plays:`, possiblePlays); // Debug log

    // 2. Decide action: Play or Pass
    if (possiblePlays.length > 0) {
      // Simple random AI: choose a random valid play
      // TODO: Implement better AI strategy later
      const randomIndex = Math.floor(Math.random() * possiblePlays.length);
      const selectedPlay = possiblePlays[randomIndex];

      console.log(`[AI Turn] Player ${currentPlayerIndex} chose to PLAY:`, selectedPlay); // Debug log
      // Simulate the play action (similar to handlePlayCards but without UI selection)
      this.executePlay(selectedPlay);

    } else {
      // No valid plays, AI must pass
      console.log(`[AI Turn] Player ${currentPlayerIndex} has no valid plays, PASSING.`); // Debug log
      this.handlePass(); // Use the existing pass handler
    }
  };

  // Refactored play logic to be callable by both human and AI
  executePlay = (cardsToPlay) => {
    const { players, currentPlayerIndex, cardsOnTable } = this.state;
    const currentPlayer = players[currentPlayerIndex];
    const playerName = currentPlayer?.name || `Player ${currentPlayerIndex}`;

    console.log(`[Execute Play] ${playerName} attempts to play:`, cardsToPlay);

    // Basic validation (should already be valid if coming from AI findValidPlays)
    const validationResult = isValidPlay(cardsToPlay, cardsOnTable);
     if (validationResult !== true) {
       console.error(`[Execute Play] AI ${playerName} attempted invalid play!`, {
           cardsToPlay,
           cardsOnTable,
           reason: validationResult
       });
       // As a fallback, make the AI pass if something went wrong
       this.handlePass();
       return;
     }

    // --- Play is Valid ---
    this.pushAnimationState(currentPlayerIndex, `Plays ${cardsToPlay.length} card(s)`);

    // 1. Remove cards from player's hand
    const newHand = currentPlayer.hand.filter(card =>
      !cardsToPlay.some(selCard => selCard.id === card.id)
    );
    const updatedPlayers = cloneDeep(players);
    updatedPlayers[currentPlayerIndex].hand = newHand;

    // 2. Update cards on table
    const newCardsOnTable = [...cardsOnTable, ...cardsToPlay]; // Append played cards to the existing pile

    // 3. Check if player finished
    let newRoundWinners = [...this.state.roundWinners];
    if (newHand.length === 0 && !this.state.roundWinners.includes(currentPlayer.id)) {
        newRoundWinners.push(currentPlayer.id);
        const finishedRank = newRoundWinners.length;
        updatedPlayers[currentPlayerIndex].finishedRank = finishedRank;
        this.pushAnimationState(currentPlayerIndex, `Finished ${finishedRank}!`);
        console.log(`[Execute Play] ${playerName} finished in rank ${finishedRank}`);
    }

    // 4. Check for round end
    const playersStillPlaying = updatedPlayers.filter(p => p.hand.length > 0 && p.finishedRank === null);
    console.log(`[Execute Play] Players still playing: ${playersStillPlaying.length}`);

    if (playersStillPlaying.length <= 1) {
        // If exactly one player is left, assign them the last rank
        if (playersStillPlaying.length === 1) {
            const lastPlayer = playersStillPlaying[0];
            if (!newRoundWinners.includes(lastPlayer.id)) {
                 newRoundWinners.push(lastPlayer.id);
                 const lastRank = newRoundWinners.length;
                 const lastPlayerIndexInAll = updatedPlayers.findIndex(p => p.id === lastPlayer.id);
                 if (lastPlayerIndexInAll !== -1) {
                    updatedPlayers[lastPlayerIndexInAll].finishedRank = lastRank;
                    console.log(`[Execute Play] ${lastPlayer.name} finished last (rank ${lastRank})`);
                 }
            }
        }

        // Ensure all players have a rank if round ends abruptly
        updatedPlayers.forEach((p, index) => {
            if (p.hand.length > 0 && p.finishedRank === null) {
                 if (!newRoundWinners.includes(p.id)) {
                     newRoundWinners.push(p.id);
                     p.finishedRank = newRoundWinners.length;
                     console.warn(`[Execute Play] Force assigning rank ${p.finishedRank} to ${p.name} at round end.`);
                 }
            }
        });


        const winner = updatedPlayers.find(p => p.finishedRank === 1);
        console.log("[Execute Play] Round Over!");
        this.setState({
            players: updatedPlayers,
            roundWinners: newRoundWinners,
            gamePhase: 'roundOver',
            gameMessage: `Round Over! ${winner?.name || 'Winner'} is President!`,
            cardsOnTable: newCardsOnTable, // Show the last play briefly
            selectedCards: [], // Clear human selection
            currentPlayerIndex: -1, // No current player
            lastPlayerToPlay: currentPlayerIndex, // Keep track of who played last
        }, () => {
             // Start next round after a delay
             setTimeout(this.startNextRound, 5000); // Increased delay to see results
        });
        return; // Stop further processing for this turn
    }

    // 5. Determine next player (ensure skipping finished players)
    const nextPlayerIndex = findNextPlayerIndex(currentPlayerIndex, updatedPlayers);
    const nextPlayerName = updatedPlayers[nextPlayerIndex]?.name || `Player ${nextPlayerIndex}`;
    console.log(`[Execute Play] Next player index: ${nextPlayerIndex} (${nextPlayerName})`);


    // 6. Update state for next turn
    this.setState({
      players: updatedPlayers,
      cardsOnTable: newCardsOnTable,
      lastPlayerToPlay: currentPlayerIndex,
      currentPlayerIndex: nextPlayerIndex,
      passCounter: 0, // Reset pass counter on a successful play
      gameMessage: `${nextPlayerName}'s turn.`,
      selectedCards: [], // Clear human selection
      roundWinners: newRoundWinners,
    });
  }

  // Modify handlePlayCards to use executePlay
  handlePlayCards = () => {
    const { selectedCards, players, currentPlayerIndex, cardsOnTable } = this.state;
    const currentPlayer = players[currentPlayerIndex];

    if (!currentPlayer || !currentPlayer.isHuman) {
        console.warn("handlePlayCards called when not human player's turn.");
        return;
    }

    // Validation is still useful for human player feedback
    const validationResult = isValidPlay(selectedCards, cardsOnTable);
    if (validationResult !== true) {
      this.setState({ gameMessage: validationResult });
      return;
    }
    this.executePlay(selectedCards); // Call the shared logic
  };

  startGame = () => {
    console.log("--- Starting Game ---");
    this.setState({ loading: true, gameMessage: 'Setting up the table...' });

    // Clear any lingering timeouts from previous games/rounds
    if (this.aiTurnTimeout) {
        clearTimeout(this.aiTurnTimeout);
        this.aiTurnTimeout = null;
    }

    // 1. Create Players
    const players = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
      players.push({
        id: `player-${i}`,
        name: i === 0 ? 'You' : `AI Player ${i + 1}`, // Player 0 is human
        hand: [],
        isHuman: i === 0,
        finishedRank: null, // Reset rank
        avatarURL: i === 0 ? '/assets/boy.svg' : `https://i.pravatar.cc/100?img=${i}` // Example avatars
      });
    }

    // 2. Create and Shuffle Deck
    const deck = shuffleDeck(generateDeck());

    // 3. Deal Cards
    const { updatedPlayers, remainingDeck } = dealCards(deck, players);

    // Sort human player's hand initially
    if (updatedPlayers[0]) {
        updatedPlayers[0].hand.sort((a, b) => a.value - b.value);
    }

    // Determine starting player (e.g., player with 3 of Diamonds, or just player 0)
    // For simplicity, let's start with player 0
    const startingPlayerIndex = 0; // TODO: Implement actual starting rule (e.g., 3 of Diamonds)
    const startingPlayerName = updatedPlayers[startingPlayerIndex]?.name || `Player ${startingPlayerIndex}`;

    console.log("Dealing complete. Players:", updatedPlayers);

    this.setState({
      loading: false,
      gamePhase: 'playing',
      players: updatedPlayers,
      deck: remainingDeck, // Should be empty after dealing
      cardsOnTable: [],
      currentPlayerIndex: startingPlayerIndex,
      lastPlayerToPlay: null,
      trickLeadPlayerIndex: startingPlayerIndex,
      passCounter: 0,
      roundWinners: [],
      gameMessage: `${startingPlayerName}'s turn to lead.`,
      selectedCards: [],
      playerAnimationSwitchboard: this.initializeAnimationSwitchboard(NUM_PLAYERS), // Reset animations
    }, () => {
        // This callback ensures state is set before potentially triggering AI
        // Needed if player 0 is AI
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (this.state.gamePhase === 'playing' && currentPlayer && !currentPlayer.isHuman) {
             console.log("[startGame Callback] First player is AI, triggering timeout.");
             if (this.aiTurnTimeout) clearTimeout(this.aiTurnTimeout); // Clear just in case
             this.aiTurnTimeout = setTimeout(this.handleAiTurn, AI_DELAY * 5000);
        }
    });
  };

  // --- Player Action Handlers ---

  handleCardClick = (card) => {
    // Only allow clicking if it's the human player's turn
    const { players, currentPlayerIndex, gamePhase } = this.state;
    if (gamePhase !== 'playing' || !players[currentPlayerIndex]?.isHuman) {
        return;
    }

    const { selectedCards } = this.state;
    const alreadySelected = selectedCards.some(c => c.id === card.id);

    let newSelectedCards;
    if (alreadySelected) {
      // Deselect card
      newSelectedCards = selectedCards.filter(c => c.id !== card.id);
    } else {
      // Select card
      newSelectedCards = [...selectedCards, card];
    }

    // Sort selected cards by value for consistency
    newSelectedCards.sort((a, b) => a.value - b.value);

    this.setState({ selectedCards: newSelectedCards });
  };

  // handlePlayCards is above (modified to call executePlay)

  handlePass = () => {
    const { players, currentPlayerIndex, passCounter, lastPlayerToPlay, trickLeadPlayerIndex, gamePhase } = this.state;

    // Prevent passing if not playing phase
    if (gamePhase !== 'playing') return;

    const currentPlayer = players[currentPlayerIndex];
    const playerName = currentPlayer?.name || `Player ${currentPlayerIndex}`;
    console.log(`[Handle Pass] ${playerName} passes.`);

    this.pushAnimationState(currentPlayerIndex, 'Passes'); // Optional animation message

    const newPassCounter = passCounter + 1;

    // Count players who haven't finished yet
    const numActivePlayers = players.filter(p => p.finishedRank === null).length;

    // Check if the trick ends
    // Trick ends if:
    // 1. Everyone still in the round (who hasn't finished) except the last person to play has passed.
    // 2. The pass counter reaches (number of active players - 1)
    // 3. There *was* a last player to play (i.e., not the very start of a trick where everyone passes)
    if (lastPlayerToPlay !== null && newPassCounter >= numActivePlayers - 1) {
      // Trick ends, clear the table, last player to play leads next
      const nextLeadPlayerIndex = lastPlayerToPlay;
      const nextLeadPlayerName = players[nextLeadPlayerIndex]?.name || `Player ${nextLeadPlayerIndex}`;
      console.log(`[Handle Pass] Trick ends. ${nextLeadPlayerName} leads next.`);
      this.setState({
        cardsOnTable: [], // Clear the pile
        passCounter: 0,
        currentPlayerIndex: nextLeadPlayerIndex,
        trickLeadPlayerIndex: nextLeadPlayerIndex, // This player starts the new trick
        lastPlayerToPlay: null, // Reset for the new trick
        gameMessage: `${nextLeadPlayerName} cleared the pile and leads next.`,
        selectedCards: [],
      });
    } else {
      // Trick continues, move to next player (skipping finished players)
      const nextPlayerIndex = findNextPlayerIndex(currentPlayerIndex, players);
      const nextPlayerName = players[nextPlayerIndex]?.name || `Player ${nextPlayerIndex}`;
      console.log(`[Handle Pass] Trick continues. Next player: ${nextPlayerIndex} (${nextPlayerName})`);
      this.setState({
        passCounter: newPassCounter,
        currentPlayerIndex: nextPlayerIndex,
        gameMessage: `${nextPlayerName}'s turn.`,
        selectedCards: [], // Clear selection just in case
      });
    }
  };

  startNextRound = () => {
      // Basic reset for now - doesn't handle roles yet
      console.log("--- Starting Next Round ---");
      // TODO: Implement role assignment (President, Scum etc.) and card trading
      // TODO: Determine starting player based on previous round's Scum
      this.startGame(); // Just restart the game for simplicity for now
  };


  // --- Animation Helpers (Optional) ---
  pushAnimationState = (index, content) => {
    if (!this.state.playerAnimationSwitchboard.hasOwnProperty(index)) return; // Safety check
    const newAnimationSwitchboard = {
        ...this.state.playerAnimationSwitchboard,
        [index]: { isAnimating: true, content }
    };
    this.setState({ playerAnimationSwitchboard: newAnimationSwitchboard });
  };

  popAnimationState = (index) => {
    if (!this.state.playerAnimationSwitchboard.hasOwnProperty(index)) return; // Safety check
    // Keep content for display even after animation ends
    const persistContent = this.state.playerAnimationSwitchboard[index]?.content;
    const newAnimationSwitchboard = {
        ...this.state.playerAnimationSwitchboard,
        [index]: { isAnimating: false, content: persistContent }
    };
    this.setState({ playerAnimationSwitchboard: newAnimationSwitchboard });
  };


  // --- Render Methods ---

  renderPlayers = () => {
    const { players, currentPlayerIndex, selectedCards, playerAnimationSwitchboard, gamePhase } = this.state;
    if (!players || players.length === 0) return null;

    // Simple rendering without rotation for now
    return players.map((player, index) => (
      <Player
        key={player.id}
        arrayIndex={index} // For positioning using p0, p1, etc.
        player={player}
        isCurrentPlayer={index === currentPlayerIndex && gamePhase === 'playing'} // Only highlight if playing
        onCardClick={this.handleCardClick}
        selectedCards={player.isHuman ? selectedCards : []} // Only pass selection to human
        // Optional animation props
        playerAnimationSwitchboard={playerAnimationSwitchboard}
        endTransition={this.popAnimationState}
      />
    ));
  };

  renderGameControls = () => {
    const { players, currentPlayerIndex, gamePhase, selectedCards, cardsOnTable } = this.state;
    if (gamePhase !== 'playing' || !players.length) return null;

    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isHuman) return null; // Only show controls for human player

    // Determine if the play button should be enabled
    const playValidity = isValidPlay(selectedCards, cardsOnTable);
    const canPlay = playValidity === true;
    // Player can always pass unless they are leading a new trick (cardsOnTable is empty)
    const canPass = cardsOnTable.length > 0;

    return (
      <GameControls
        onPlayClick={this.handlePlayCards}
        onPassClick={this.handlePass}
        canPlay={canPlay}
        canPass={canPass}
        playText={selectedCards.length > 0 ? `Play ${selectedCards.length} Card(s)` : "Play"}
      />
    );
  };

  render() {
    const { loading, gamePhase, cardsOnTable, gameMessage, players, roundWinners } = this.state;

    if (loading) {
      return <Spinner />;
    }

    // Basic round over screen
    if (gamePhase === 'roundOver') {
        // Sort players by rank for display
        const rankedPlayers = [...players].sort((a, b) => (a.finishedRank || 99) - (b.finishedRank || 99));
        return (
            <div className="App">
                <div className='poker-table--wrapper'> {/* Reuse wrapper */}
                    <div className="showdown-container--wrapper" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'white', backgroundColor: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '10px' }}> {/* Reuse styles */}
                        <h1>Round Over!</h1>
                        <p>{gameMessage}</p>
                        {/* Display final player rankings */}
                        <h3>Results:</h3>
                        <ol style={{ listStylePosition: 'inside', paddingLeft: 0 }}>
                            {rankedPlayers
                                .map(p => <li key={p.id}>{p.name} - Rank {p.finishedRank || 'Unknown'}</li>)
                            }
                        </ol>
                        <p>Starting next round soon...</p>
                        {/* Optional: Button to proceed manually */}
                        {/* <button onClick={this.startNextRound}>Start Next Round</button> */}
                    </div>
                </div>
            </div>
        );
    }


    return (
      <div className="App">
        {/* Reuse the poker table background/layout */}
        <div className='poker-table--wrapper'>
          <div className="poker-table--container">
            {/* You might want a simpler background than the SVG table */}
            {/* <img className="poker-table--table-image" src={"./assets/table-nobg-svg-01.svg"} alt="Poker Table" /> */}

            {/* Render Players */}
            {this.renderPlayers()}

            {/* Render Cards on Table (Pile) */}
            <div className='community-card-container' style={{ top: 'calc(50% - 35px)', height: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}> {/* Repositioned & Sized */}
              <TablePile cardsOnTable={cardsOnTable} />
            </div>

            {/* Optional: Display Game Message */}
            <div className='game-message-container' style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '5px', zIndex: 50, textAlign: 'center', minWidth: '200px' }}>
              {gameMessage}
            </div>

          </div>

          {/* Render Action Buttons for Human Player */}
          <div className='game-action-bar' > {/* Reuse action bar style */}
             {this.renderGameControls()}
             {/* Remove Slider */}
          </div>
        </div>
      </div>
    );
  }
}

export default App;