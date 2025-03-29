// utils/scumLogic.js

const SUITS = ['Heart', 'Spade', 'Club', 'Diamond'];
const FACES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// Assign numerical values for comparison (3 is lowest, 2 is highest)
const VALUE_MAP = FACES.reduce((map, face, index) => {
  map[face] = index + 1; // 3=1, 4=2, ..., A=12, 2=13
  return map;
}, {});

/**
 * Generates a standard 52-card deck for Scum.
 */
export const generateDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const face of FACES) {
      deck.push({
        cardFace: face,
        suit: suit,
        value: VALUE_MAP[face],
        id: `${face}-${suit}` // Unique ID for React keys
      });
    }
  }
  return deck;
};

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 */
export const shuffleDeck = (deck) => {
  let shuffledDeck = [...deck]; // Create a copy
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]]; // Swap elements
  }
  return shuffledDeck;
};

/**
 * Deals cards from the deck to players.
 * Returns the updated players array and the remaining deck.
 */
export const dealCards = (deck, players) => {
  let currentDeck = [...deck];
  const numPlayers = players.length;
  const updatedPlayers = players.map(p => ({ ...p, hand: [] })); // Clear hands first
  let playerIndex = 0;

  while (currentDeck.length > 0) {
    const card = currentDeck.pop();
    // Add animation delay if needed (optional)
    card.animationDelay = playerIndex * 50 + updatedPlayers[playerIndex % numPlayers].hand.length * 20;
    updatedPlayers[playerIndex % numPlayers].hand.push(card);
    playerIndex++;
  }

  // Sort each player's hand for better display
  updatedPlayers.forEach(player => {
    player.hand.sort((a, b) => a.value - b.value);
  });

  return { updatedPlayers, remainingDeck: currentDeck };
};

/**
 * Gets the Scum value of a card.
 */
export const getCardValue = (card) => {
  return card.value;
};

/**
 * Checks if a proposed play is valid according to Scum rules.
 *
 * @param {Array} selectedCards - The cards the player wants to play.
 * @param {Array} cardsOnTable - The cards currently in the pile/trick.
 * @returns {Boolean|String} - True if valid, or a string message if invalid.
 */
export const isValidPlay = (selectedCards, cardsOnTable) => {
  if (!selectedCards || selectedCards.length === 0) {
    return "No cards selected.";
  }

  // Check if all selected cards have the same face value
  const firstCardValue = selectedCards[0].value;
  if (!selectedCards.every(card => card.value === firstCardValue)) {
    return "Selected cards must have the same rank.";
  }

  const numSelected = selectedCards.length;

  // --- Playing onto an empty table ---
  if (!cardsOnTable || cardsOnTable.length === 0) {
    // Any single, double, triple, or quad is valid to start
    if (numSelected >= 1 && numSelected <= 4) {
      return true; // Valid lead play
    } else {
      return "Invalid number of cards to lead.";
    }
  }

  // --- Playing onto existing cards ---
  const numOnTable = cardsOnTable.length;
  const tableValue = cardsOnTable[0].value;

  // Must play the same number of cards
  if (numSelected !== numOnTable) {
    return `Must play ${numOnTable} card(s).`;
  }

  // Must play a higher rank
  if (firstCardValue <= tableValue) {
    return "Must play a higher rank.";
  }

  // If all checks pass
  return true;
};

/**
 * Finds the index of the next player who hasn't finished.
 */
export const findNextPlayerIndex = (currentIndex, players) => {
    let nextIndex = (currentIndex + 1) % players.length;
    let attempts = 0;
    // Keep looping until we find a player with cards, or we've checked everyone
    while (players[nextIndex].hand.length === 0 && attempts < players.length) {
        nextIndex = (nextIndex + 1) % players.length;
        attempts++;
    }
    // If all players are finished (attempts === players.length), return -1 or handle game over
    if (attempts === players.length) return -1; // Or handle appropriately
    return nextIndex;
};


/**
 * Finds all valid plays a player can make given their hand and the cards on table.
 *
 * @param {Array} hand - The player's hand.
 * @param {Array} cardsOnTable - The cards currently on the table.
 * @returns {Array} - An array of valid plays (each play is an array of cards).
 */
export const findValidPlays = (hand, cardsOnTable) => {
    const validPlays = [];
    if (!hand || hand.length === 0) {
      return validPlays; // No cards, no plays
    }
  
    // Group hand by card value
    const cardsByValue = hand.reduce((groups, card) => {
      const value = card.value;
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(card);
      return groups;
    }, {});
  
    // Check potential plays (singles, doubles, triples, quads)
    for (const value in cardsByValue) {
      const group = cardsByValue[value];
      // Check singles
      if (isValidPlay([group[0]], cardsOnTable) === true) {
        validPlays.push([group[0]]);
      }
      // Check doubles
      if (group.length >= 2 && isValidPlay(group.slice(0, 2), cardsOnTable) === true) {
        validPlays.push(group.slice(0, 2));
      }
      // Check triples
      if (group.length >= 3 && isValidPlay(group.slice(0, 3), cardsOnTable) === true) {
        validPlays.push(group.slice(0, 3));
      }
      // Check quads
      if (group.length >= 4 && isValidPlay(group.slice(0, 4), cardsOnTable) === true) {
        validPlays.push(group.slice(0, 4));
      }
    }
  
    return validPlays;
  };