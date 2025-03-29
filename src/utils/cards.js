import { handleOverflowIndex } from './players.js';

const totalNumCards = 52;
const suits = ['Heart', 'Spade', 'Club', 'Diamond'];
const cards = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const VALUE_MAP = {
	2:1,
	3:2,
	4:3,
	5:4,
	6:5,
	7:6,
	8:7,
	9:8,
	10:9,
	J:10,
	Q:11,
	K:12,
	A:13,
};

const randomizePosition = (min, max) => {
	min = Math.ceil(min);
  	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


const generateDeckOfCards = () => {
	const deck = [];

	for (let suit of suits) {
		for (let card of cards) {
			deck.push({
				cardFace: card,
				suit: suit,
				value: VALUE_MAP[card]
			})
		}
	}
		return deck
}

const shuffle = (deck) => {
	let shuffledDeck = new Array(totalNumCards);
	let filledSlots = [];
	for (let i = 0; i < totalNumCards; i++) {
		if (i === 51) {
			// Fill last undefined slot when only 1 card left to shuffle
			const lastSlot = shuffledDeck.findIndex((el) => typeof el == 'undefined');
				shuffledDeck[lastSlot] = deck[i];
				filledSlots.push(lastSlot);
		} else {
			let shuffleToPosition = randomizePosition(0, totalNumCards - 1);
				while (filledSlots.includes(shuffleToPosition)) {
					shuffleToPosition = randomizePosition(0, totalNumCards - 1);
				}
						shuffledDeck[shuffleToPosition] = deck[i];
						filledSlots.push(shuffleToPosition);
		}
	}
	return shuffledDeck
}

const popCards = (deck, numToPop) => {
	// Note: While this is a Shallow Copy, (It copies the references to the children) - note that we are mutating it by 
	// Actually modifying the array, NOT the children. This is why the length of mutableCopy changes, but that of deck 
	// Does not.
	const mutableDeckCopy = [...deck];
	let chosenCards;
	if (numToPop === 1) {
		chosenCards = mutableDeckCopy.pop();
	} else {
		chosenCards = [];
		for(let i = 0; i < numToPop; i++) {
			chosenCards.push(mutableDeckCopy.pop());
		}
	}
		return { mutableDeckCopy, chosenCards }
}

const popShowdownCards = (deck, numToPop) => {
	// When dealMissingCommunityCards was calling popCards() with the condition numToPop === 1
	// It was returning a raw object instead of an array, and calling a for...of loop, causing the program to crash
	// Until we can refactor this code and all of its calling functions 
	// (change the code for dealFlop/River/Turn to use a consistent .concat function instead of .push())
	// We'll just duplicat this code here and utilize it in dealMissingCommunityCards
	const mutableDeckCopy = [...deck];
	let chosenCards;
	if (numToPop === 1) {
		chosenCards = [mutableDeckCopy.pop()];
	} else {
		chosenCards = [];
		for(let i = 0; i < numToPop; i++) {
			chosenCards.push(mutableDeckCopy.pop());
		}
	}
		return { mutableDeckCopy, chosenCards }
}

const dealPrivateCards = (state) => {
		// Clear any "clear cards" flag if it exists
		state.clearCards = false;
		let animationDelay = 0;
		
		// Continue dealing until the deck is empty
		while (state.deck.length > 0) {
		  // Pop a single card from the deck
		  const { mutableDeckCopy, chosenCards } = popCards(state.deck, 1);
		  
		  // Add animation delay (similar to your dealPrivateCards function)
		  chosenCards.animationDelay = animationDelay;
		  animationDelay = animationDelay + 250;
		  
		  // Add the card to the current active player's hand
		  state.players[state.activePlayerIndex].cards.push(chosenCards);
		  
		  // Update the deck
		  state.deck = [...mutableDeckCopy];
		  
		  // Move to the next player
		  state.activePlayerIndex = handleOverflowIndex(state.activePlayerIndex, 1, state.players.length, 'up');
		}
		
		// Move to the next phase after all cards are dealt
		state.phase = 'allCardsDealt';
		
		return state;
};


const buildValueSet = (hand) => {
	return Array.from(new Set(hand.map(cardInfo => cardInfo.value)))
}

const dealMissingCommunityCards = (state) => {
	const cardsToPop = 5 - state.communityCards.length
	if (cardsToPop >= 1) {
		let animationDelay = 0;
		const { mutableDeckCopy, chosenCards } = popShowdownCards(state.deck, cardsToPop);
			
			for (let card of chosenCards) {
				card.animationDelay = animationDelay;
				animationDelay = animationDelay + 250;
				state.communityCards.push(card);
			}

		state.deck = mutableDeckCopy;
	}
	state.phase = 'showdown'
	return state
}

// Add these functions to your existing utils/cards.js file


const throwCardsToTable = (cardsToThrow, playerId, gameState) => {
	// Create a copy of the game state to modify
	const newGameState = { ...gameState };
	
	// Add the thrown cards to the table
	newGameState.cardsOnTable = [
	  ...cardsToThrow.map(card => ({
		...card,
		playedBy: playerId,
		animationDelay: Math.random() * 200 // Randomize animation for natural look
	  }))
	];
	
	// Update the player's hand by removing the thrown cards
	const playerIndex = newGameState.players.findIndex(player => player.name === playerId);
	if (playerIndex >= 0) {
	  // Filter out the cards that were thrown
	  newGameState.players[playerIndex].cards = newGameState.players[playerIndex].cards.filter(
		playerCard => !cardsToThrow.some(
		  thrownCard => thrownCard.suit === playerCard.suit && thrownCard.cardFace === playerCard.cardFace
		)
	  );
	}
	
	return newGameState;
  };
  

const clearTableCards = (gameState) => {
	return {
	  ...gameState,
	  cardsOnTable: []
	};
  };

export { generateDeckOfCards, shuffle, popCards, dealPrivateCards, dealMissingCommunityCards, buildValueSet, throwCardsToTable, clearTableCards }