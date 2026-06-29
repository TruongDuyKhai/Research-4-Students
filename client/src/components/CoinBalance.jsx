import React from 'react';
import { Coins } from 'lucide-react';
import './CoinBalance.css';

const CoinBalance = ({ amount = 0, size = 'sm' }) => {
  return (
    <span className={`coin-balance coin-balance--${size}`}>
      <Coins className="coin-balance__icon" />
      <span className="coin-balance__amount">{Number(amount).toLocaleString()}</span>
      <span className="coin-balance__symbol">V</span>
    </span>
  );
};

export default CoinBalance;
