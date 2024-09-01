import { useCallback, useEffect, useState } from 'react';
import { useAccount, useNetwork, useWaitForTransaction } from 'wagmi';
import { Loading, Toggle } from '@geist-ui/core';
import { tinyBig } from 'essential-eth';
import { useAtom } from 'jotai';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { httpFetchTokens, Tokens } from '../../src/fetch-tokens';

// Currency formatter
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// TokenRow component
const TokenRow: React.FC<{ token: Tokens[number] }> = ({ token }) => {
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { chain } = useNetwork();
  const { address } = useAccount();

  const pendingTxn = checkedRecords[token.contract_address as `0x${string}`]?.pendingTxn;
  const { isLoading } = useWaitForTransaction({
    hash: pendingTxn?.blockHash || undefined,
  });

  const setTokenChecked = (tokenAddress: string, isChecked: boolean) => {
    setCheckedRecords((old) => ({
      ...old,
      [tokenAddress]: { isChecked },
    }));
  };

  const { balance, contract_address, contract_ticker_symbol } = token;

  // Calculate and round the token balance
  const unroundedBalance = tinyBig(token.quote).div(token.quote_rate);
  const roundedBalance = unroundedBalance.lt(0.001)
    ? unroundedBalance.round(10)
    : unroundedBalance.gt(1000)
    ? unroundedBalance.round(2)
    : unroundedBalance.round(5);

  return (
    <div key={contract_address} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
      {isLoading && <Loading />}
      <Toggle
        checked={checkedRecords[contract_address as `0x${string}`]?.isChecked || false}
        onChange={(e) => {
          setTokenChecked(contract_address, e.target.checked);
        }}
        style={{ marginRight: '18px' }}
        disabled={Boolean(pendingTxn)}
      />
      <span style={{ fontFamily: 'monospace' }}>{roundedBalance.toString()} </span>
      <a
        href={`${chain?.blockExplorers?.default.url}/token/${token.contract_address}?a=${address}`}
        target="_blank"
        rel="noreferrer"
      >
        {contract_ticker_symbol}
      </a>{' '}
      (worth{' '}
      <span style={{ fontFamily: 'monospace' }}>
        {usdFormatter.format(token.quote)}
      </span>)
    </div>
  );
};

// GetTokens component
export const GetTokens: React.FC = () => {
  const [tokens, setTokens] = useAtom(globalTokensAtom);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();

  const fetchData = useCallback(async () => {
    if (!chain?.id || !address) return;

    setLoading(true);
    try {
      setError('');
      const newTokens = await httpFetchTokens(chain.id, address);
      setTokens(newTokens.data.erc20s);
    } catch (error) {
      setError(`Chain ${chain.id} not supported. Coming soon!`);
    }
    setLoading(false);
  }, [address, chain?.id, setTokens]);

  useEffect(() => {
    if (address && chain?.id) {
      fetchData();
      setCheckedRecords({});
    }
  }, [address, chain?.id, fetchData, setCheckedRecords]);

  useEffect(() => {
    if (!isConnected) {
      setTokens([]);
      setCheckedRecords({});
    }
  }, [isConnected, setTokens, setCheckedRecords]);

  if (loading) {
    return <Loading>Loading</Loading>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div style={{ margin: '20px' }}>
      {isConnected && tokens.length === 0 && `No tokens on ${chain?.name}`}
      {tokens.map((token) => (
        <TokenRow token={token} key={token.contract_address} />
      ))}
    </div>
  );
};
