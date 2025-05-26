// ./components/players/Player.jsx
import React, { useState } from 'react';
import Card from '../cards/Card';
import HiddenCard from '../cards/HiddenCard';
import PlayerStatusNotificationBox from "./PlayerStatusNotificationBox";

const Player = (props) => {
  const {
    player,
    isCurrentPlayer,
    isStillInRound,
    onCardClick,
    selectedCards,
    playerAnimationSwitchboard,
    endTransition,
    arrayIndex
  } = props;

  // Add state to track card visibility for non-human players
  const [showOpponentCards, setShowOpponentCards] = useState(false);

  // Toggle function for opponent cards visibility
  const toggleOpponentCards = (e) => {
    if (!player.isHuman) {
      e.stopPropagation(); // Prevent event bubbling
      setShowOpponentCards(prev => !prev);
    }
  };

  if (!player) return null;

  const { name, hand, isHuman, avatarURL } = player;

  const renderPlayerCards = () => {
    if (!hand) return null;

    // Responsive card width based on screen size
    let cardWidth, overlapFactor;
    
    // Determine card width and overlap based on screen size
    if (window.innerWidth >= 1200) {
      // Large screens
      cardWidth = 50;
      overlapFactor = 0.7;
    } else if (window.innerWidth <= 480) {
      // Mobile - with extreme overlap
      if (isHuman) {
        cardWidth = 60; // Much larger for human player on mobile
        overlapFactor = 0.3; // Extreme overlap for human player (was 0.6)
      } else {
        cardWidth = 30; // Normal size for AI players
        overlapFactor = 0.25; // Extreme overlap for AI players (was 0.5)
      }
    } else {
      // Tablets and medium screens
      cardWidth = 40;
      overlapFactor = 0.7;
    }

    return hand.map((card, index) => {
      const isSelected = !isHuman ? false : selectedCards && selectedCards.some(selCard => selCard.id === card.id);

      const numCards = hand.length;
      const centerIndex = (numCards - 1) / 2;
      const xOffset = (index - centerIndex) * (cardWidth * overlapFactor);

      // Card container style (absolute positioning)
      const cardContainerStyle = {
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transformOrigin: 'bottom center',
        zIndex: index,
        transform: `
          translateX(${xOffset - (cardWidth / 2)}px)
          ${isSelected ? 'translateY(-10px)' : ''}`,
        transition: 'transform 0.2s ease-out',
      };

      // Inner card style (takes full size of container)
      const cardInnerStyle = {
        height: '100%', // Takes height from CSS applied to parent
        width: '100%',  // Takes width from CSS applied to parent
        pointerEvents: 'auto',
      };

      if (!isHuman) {
        return (
          // Apply style to the container div which now relies on CSS for sizing
          <div 
            key={card.id || `hidden-${index}`} 
            style={cardContainerStyle} 
            className="abscard"
            onClick={toggleOpponentCards}
          >
            <div style={cardInnerStyle}>
              {/* Show actual cards if showOpponentCards is true, otherwise show hidden cards */}
              {showOpponentCards ? (
                <Card
                  cardData={card}
                  isSelected={false}
                  onClick={() => {}}
                  applyFoldedClassname={false}
                />
              ) : (
                <HiddenCard
                  cardData={card}
                  applyFoldedClassname={false}
                />
              )}
            </div>
          </div>
        );
      }
      
      return (
        // Apply style to the container div which now relies on CSS for sizing
        <div key={card.id} style={cardContainerStyle} className="abscard">
          <div style={cardInnerStyle}>
            <Card
              cardData={card}
              isSelected={isSelected}
              onClick={() => onCardClick(card)}
              applyFoldedClassname={false}
            />
          </div>
        </div>
      );
    });
  };

  const ifAnimating = (playerBoxIndex) => {
    return playerAnimationSwitchboard && playerAnimationSwitchboard[playerBoxIndex]?.isAnimating;
  }

  const activeStateClass = isStillInRound ? 'active-in-round' : 'inactive-in-round';
  const currentPlayerClass = isCurrentPlayer ? ' current-player-turn' : '';
  const currentNameClass = isCurrentPlayer ? ' current-player-name-highlight' : '';

  // Create a status text to display the player's current status
  const getPlayerStatusText = () => {
    if (!isStillInRound) return 'Out of Round';
    if (isCurrentPlayer) return 'Current Turn';
    return 'Waiting';
  };

  return (
    // Add 'player-entity-container' for potential future targeting if needed
    <div className={`player-entity--wrapper p${arrayIndex} ${activeStateClass}${currentPlayerClass}`}>
      <div className="player-entity--top">
        <div className="player-avatar--container">
          {avatarURL && <img
            className={`player-avatar--image${(isCurrentPlayer ? ' activePlayer' : '')}`}
            src={avatarURL}
            alt="Player Avatar"
          />}
          <h5 className={`player-info--name${currentNameClass}`}>
            {name} {player.isHuman ? '(You)' : ''} {player.role ? `(${player.role})` : ''}
            {!isHuman && showOpponentCards && <span className="debug-indicator"> [Cards Visible]</span>}
          </h5>
          <div className="player-info--card-count">
            Cards: {hand ? hand.length : 0}
          </div>
          {player.finishedRank && <span className="player-info--rank">Rank: {player.finishedRank}</span>}
          {!player.finishedRank && <span className="player-info--status">{getPlayerStatusText()}</span>}
        </div>
        {playerAnimationSwitchboard && endTransition &&
          <PlayerStatusNotificationBox
            index={arrayIndex}
            isActive={ifAnimating(arrayIndex)}
            content={playerAnimationSwitchboard[arrayIndex]?.content || ''}
            endTransition={endTransition}
          />
        }
      </div>
      {/* Hand container's height/width will be controlled by CSS */}
      <div className='player-hand-container'>
        {renderPlayerCards()}
      </div>
    </div>
  );
};

export default Player;