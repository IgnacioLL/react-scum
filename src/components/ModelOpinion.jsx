import React from 'react';
import './ModelOpinion.css';

const ModelOpinion = ({ data, loading, onClose }) => {
  if (loading) {
    return (
      <div className="model-opinion-overlay">
        <div className="model-opinion-container">
          <h2>AI Analysis</h2>
          <p>Loading AI analysis...</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="model-opinion-overlay">
        <div className="model-opinion-container">
          <h2>AI Analysis</h2>
          <p>No analysis available.</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const { recommendedAction, probability, expectedValue, topActions, confidence } = data;

  // Format the action description
  const formatAction = (action) => {
    if (!action) return "Unknown action";
    
    if (action.type === 'pass') return 'Pass';
    
    if (action.type === 'play') {
      // Use the description if available
      if (action.description) return action.description;
      
      // Otherwise build a description from the available fields
      if (action.count && action.cardFace) {
        return `Play ${action.count}x ${action.cardFace}`;
      }
      
      // Fallback for older format with cards array
      if (action.cards && action.cards.length > 0) {
        return `Play ${action.cards.length} card${action.cards.length > 1 ? 's' : ''}: ${action.cards.map(c => c.cardFace).join(', ')}`;
      }
    }
    
    // Last resort - stringify the object for debugging
    return JSON.stringify(action);
  };

  // Get confidence class for styling
  const getConfidenceClass = (conf) => {
    switch (conf) {
      case 'high': return 'high-confidence';
      case 'medium': return 'medium-confidence';
      case 'low': return 'low-confidence';
      default: return '';
    }
  };

  return (
    <div className="model-opinion-overlay">
      <div className="model-opinion-container">
        <h2>AI Analysis</h2>
        
        <div className="opinion-section">
          <h3>Recommended Move</h3>
          <div className={`recommendation ${getConfidenceClass(confidence)}`}>
            <p className="action">{formatAction(recommendedAction)}</p>
            <p className="confidence">Confidence: {confidence} ({(probability * 100).toFixed(1)}%)</p>
          </div>
        </div>

        {topActions && topActions.length > 0 && (
          <div className="opinion-section">
            <h3>Top Considered Moves</h3>
            <ul className="top-actions">
              {topActions.map((action, index) => (
                <li key={index}>
                  <span className="action-desc">{formatAction(action.action)}</span>
                  <span className="action-prob">({(action.probability * 100).toFixed(1)}%)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="opinion-section">
          <h3>Expected Outcome</h3>
          <p className="expected-value">
            {expectedValue > 0 ? '👍 Favorable' : 
             expectedValue < 0 ? '👎 Unfavorable' : 
             '🤔 Uncertain'}
            <span className="value-number"> ({expectedValue.toFixed(2)})</span>
          </p>
        </div>

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ModelOpinion; 