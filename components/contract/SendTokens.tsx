import { useCallback, useEffect, useState } from 'react';
import { useAccount, useNetwork, useWaitForTransaction } from 'wagmi';
import { Loading, Toggle } from '@geist-ui/core';
import { tinyBig } from 'essential-eth';
import { useAtom } from 'jotai';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { Tokens } from '../../src/fetch-tokens';

// Define the API URL and Chain ID from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID);

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const TokenRow: React.FC<{ token: Tokens[number] }> = ({ token }) => {
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { chain } = useNetwork();
  const pendingTxn = checkedRecords[token.contract_address as `0x${string}`]?.pendingTxn;

  const setTokenChecked = (tokenAddress: string, isChecked: boolean) => {
    setCheckedRecords((old) => ({
      ...old,
      [tokenAddress]: { isChecked },
    }));
  };

  const { address } = useAccount();
  const { balance, contract_address, contract_ticker_symbol } = token;
  const unroundedBalance = tinyBig(token.quote).div(token.quote_rate);
  const roundedBalance = unroundedBalance.lt(0.001)
    ? unroundedBalance.round(10)
    : unroundedBalance.gt(1000)
    ? unroundedBalance.round(2)
    : unroundedBalance.round(5);

  const { isLoading } = useWaitForTransaction({
    hash: pendingTxn?.blockHash || undefined,
  });

  return (
    <div key={contract_address} style={{ display: 'flex', alignItems: 'center' }}>
      <Toggle
        checked={checkedRecords[token.contract_address]?.isChecked || false}
        onChange={(e) => setTokenChecked(token.contract_address, e.target.checked)}
      />
      <span style={{ marginLeft: '10px' }}>{contract_ticker_symbol}</span>
      <span style={{ marginLeft: '10px' }}>{roundedBalance.toString()}</span>
      <span style={{ marginLeft: '10px' }}>{usdFormatter.format(token.quote)}</span>
      {isLoading && <Loading style={{ marginLeft: '10px' }} />}
    </div>
  );
};

export default TokenRow;
