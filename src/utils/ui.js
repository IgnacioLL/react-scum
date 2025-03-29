const renderUnicodeSuitSymbol = (suit) => {
	switch(suit) {
		case('Heart'): return '\u2665';
		case('Diamond'): return '\u2666';
		case('Spade'): return '\u2660';
		case('Club'): return '\u2663';
		default: throw Error('Unfamiliar String Recieved in Suit Unicode Generation');
	}
}


export { 
	renderUnicodeSuitSymbol, 
}

