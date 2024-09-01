import { useCallback } from 'react';
import { useAccount, useNetwork, useWaitForTransaction } from 'wagmi';
import { Loading, Toggle } from '@geist-ui/core';
import { tinyBig } from 'essential-eth';
import { useAtom } from 'jotai';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { Tokens } from '../../src/fetch-tokens';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const TokenRow: React.FunctionComponent<{ token: Tokens[number] }> = ({ token }) => {
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { chain } = useNetwork();
  const { address } = useAccount();

  const pendingTxn = checkedRecords[token.contract_address as `0x${string}`]?.pendingTxn;

  const setTokenChecked = useCallback((tokenAddress: string, isChecked: boolean) => {
    setCheckedRecords((old) => ({
      ...old,
      [tokenAddress]: { isChecked },
    }));
  }, [setCheckedRecords]);

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
        checked={checkedRecords[token.contract_address as `0x${string}`]?.isChecked || false}
        onChange={(e) => setTokenChecked(token.contract_address, e.target.checked)}
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

export default TokenRow;
