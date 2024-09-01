// Example implementation of httpFetchTokens
import axios from 'axios';

export interface Tokens {
  contract_address: string;
  contract_ticker_symbol: string;
  balance: string;
  quote: string;
  quote_rate: string;
}

export const httpFetchTokens = async (chainId: number, address: string) => {
  const response = await axios.get(`/api/tokens`, {
    params: { chainId, address },
  });
  return response.data;
};
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useNetwork, useWaitForTransaction } from 'wagmi';
import { Loading, Toggle } from '@geist-ui/core';
import { tinyBig } from 'essential-eth';
import { useAtom } from 'jotai';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { httpFetchTokens, Tokens } from '../../src/fetch-tokens';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const TokenRow: React.FunctionComponent<{ token: Tokens }> = ({ token }) => {
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { chain } = useNetwork();
  const pendingTxn = checkedRecords[token.contract_address]?.pendingTxn;
  const { address } = useAccount();
  
  const setTokenChecked = (tokenAddress: string, isChecked: boolean) => {
    setCheckedRecords((old) => ({
      ...old,
      [tokenAddress]: { isChecked },
    }));
  };

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
    <div key={token.contract_address}>
      {isLoading && <Loading />}
      <Toggle
        checked={checkedRecords[token.contract_address]?.isChecked || false}
        onChange={(e) => {
          setTokenChecked(token.contract_address, e.target.checked);
        }}
        style={{ marginRight: '18px' }}
        disabled={Boolean(pendingTxn)}
      />
      <span style={{ fontFamily: 'monospace' }}>
        {roundedBalance.toString()}{' '}
      </span>
      <a
        href={`${chain?.blockExplorers?.default.url}/token/${token.contract_address}?a=${address}`}
        target="_blank"
        rel="noreferrer"
      >
        {token.contract_ticker_symbol}
      </a>{' '}
      (worth{' '}
      <span style={{ fontFamily: 'monospace' }}>
        {usdFormatter.format(token.quote)}
      </span>
      )
    </div>
  );
};

export const GetTokens = () => {
  const [tokens, setTokens] = useAtom(globalTokensAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setError('');
      const newTokens = await httpFetchTokens(
        chain?.id as number,
        address as string,
      );
      setTokens(newTokens.data.erc20s);
    } catch (error) {
      setError(`Chain ${chain?.id} not supported or an error occurred.`);
    } finally {
      setLoading(false);
    }
  }, [address, chain?.id, setTokens]);

  useEffect(() => {
    if (address) {
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
    return <Loading>Loading...</Loading>;
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
      {/* Uncomment this button if you want a refetch option */}
      {/* {isConnected && (
        <Button style={{ marginLeft: '20px' }} onClick={() => fetchData()}>
          Refetch
        </Button>
      )} */}
    </div>
  );
};
