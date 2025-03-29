import uuid from 'uuid/v1';
import { dealMissingCommunityCards, generateDeckOfCards, shuffle } from './cards.js';

const axios = require('axios')
// TODO Generate UUID to simulate User ID and really get a perf match on binding to players when determining winnings
const generateTable = async () => {
	const users = [{
		id: uuid(),
		name: 'Player 1',
		avatarURL: '/assets/boy.svg',
		cards: [],
		bet: 0,
		betReconciled: false,
		folded: false,
		canRaise: true,
		stackInvestment: 0,
		robot: false
	}];

	const response = await axios.get(`https://randomuser.me/api/?results=4&nat=us,gb,fr`);
	response.data.results
		.map(user => {
			return ({
				id: uuid(),
				name: `${user.name.first.charAt(0).toUpperCase()}${user.name.first.slice(1)} ${user.name.last.charAt(0).toUpperCase()}${user.name.last.slice(1)}`,
				avatarURL: user.picture.large,
				cards: [],
				bet: 0,
				betReconciled: false,
				folded: false,
				robot: true,
				canRaise: true,
				stackInvestment: 0,
			})
		})
		.forEach(user => users.push(user))

	return users
}

const handleOverflowIndex = (currentIndex, incrementBy, arrayLength, direction) => {
	switch (direction) {
		case('up'): {
			return (
				(currentIndex + incrementBy) % arrayLength
			)
		}
		case('down'): {
			return (
				((currentIndex - incrementBy) % arrayLength) + arrayLength 
			)
		}
		default: throw Error("Attempted to overfow index on unfamiliar direction");
	}
}



// This function can lead to errors if player all ins at a certain position
// final AI will freeze
// seems to happen when only 2 players left and someone has all-in

const determineNextActivePlayer = (state) => {
	state.activePlayerIndex = handleOverflowIndex(state.activePlayerIndex, 1, state.players.length, 'up');
	const activePlayer = state.players[state.activePlayerIndex];

	if (activePlayer.folded) {
		console.log("Current player index is folded, going to next active player.")
		return determineNextActivePlayer(state);
	}

	if (
		!activePlayer.folded &&
		activePlayer.betReconciled
	) {
		return(showDown(reconcilePot(dealMissingCommunityCards(state))));
	}

	// IF a player is all in, he will be reconciled?
	if (activePlayer.betReconciled) {
		console.log("Player is reconciled with pot, round betting cycle complete, proceed to next round.")
		return handlePhaseShift(state);
	}

	return state
}

const beginNextRound = (state) => {
	state.communityCards = [];
	state.sidePots = [];
	state.playerHierarchy = [];
	state.showDownMessages = [];
	state.deck = shuffle(generateDeckOfCards())
	state.highBet = 20;
	state.betInputValue = 20;
	state.minBet = 20; // can export out to initialState
	// Unmount all cards so react can re-trigger animations
	const { players } = state;
	const clearPlayerCards = players.map(player => ({...player, cards: player.cards.map(card => {})}))
	state.players = clearPlayerCards;
	return passDealerChip(state)
}

// NEED INITIAL PLAYER STATE
// INITIAL TABLE STATE
export { generateTable, handleOverflowIndex, determineNextActivePlayer, beginNextRound }