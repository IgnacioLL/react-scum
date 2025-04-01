// ./components/Leaderboard.jsx
import React from 'react';
import Spinner from '../Spinner'; // Adjust path if needed
import './Leaderboard.css'; // Create this CSS file

const Leaderboard = ({ data, loading }) => {
  if (loading) {
    return <div className="leaderboard-container"><Spinner message="Loading Leaderboard..." /></div>;
  }

  if (!data || data.length === 0) {
    return <div className="leaderboard-container"><p>No leaderboard data yet. Play some games!</p></div>;
  }

  return (
    <div className="leaderboard-container">
      <h2>Leaderboard</h2>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Wins</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, index) => (
            <tr key={player.name}>
              <td>{index + 1}</td>
              <td>{player.name}</td>
              <td>{player.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;