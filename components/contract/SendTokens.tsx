import { Button, Input, Toggle, useToasts } from '@geist-ui/core';
import { erc20ABI, usePublicClient, useWalletClient } from 'wagmi';
import { isAddress } from 'essential-eth';
import { useAtom } from 'jotai';
import { normalize } from 'viem/ens';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SendTokens = () => {
  const { setToast } = useToasts();
  const showToast = (message: string, type: any) =>
    setToast({
      text: message,
      type,
      delay: 4000,
    });

  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const sendAllCheckedTokens = async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = Object.entries(checkedRecords)
      .filter(([tokenAddress, { isChecked }]) => isChecked)
      .map(([tokenAddress]) => tokenAddress as `0x${string}`);

    if (!walletClient || !destinationAddress) return;

    if (destinationAddress.includes('.')) {
      const resolvedDestinationAddress = await publicClient.getEnsAddress({
        name: normalize(destinationAddress),
      });
      if (resolvedDestinationAddress) {
        setDestinationAddress(resolvedDestinationAddress);
      }
      return;
    }

    for (const tokenAddress of tokensToSend) {
      const token = tokens.find(
        (token) => token.contract_address === tokenAddress,
      );

      if (token) {
        try {
          const { request } = await publicClient.simulateContract({
            account: walletClient.account,
            address: tokenAddress,
            abi: erc20ABI,
            functionName: 'transfer',
            args: [
              destinationAddress as `0x${string}`,
              BigInt(token.balance || '0'),
            ],
          });

          const res = await walletClient.writeContract(request);
          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...old[tokenAddress],
              pendingTxn: res,
            },
          }));
        } catch (err) {
          showToast(
            `Error with ${token.contract_ticker_symbol} ${
              err?.reason || 'Unknown error'
            }`,
            'warning',
          );
        }
      }
    }
  };

  const addressAppearsValid: boolean =
    typeof destinationAddress === 'string' &&
    (destinationAddress.includes('.') || isAddress(destinationAddress));

  const checkedCount = Object.values(checkedRecords).filter(
    (record) => record.isChecked,
  ).length;

  return (
    <div style={{ margin: '20px' }}>
      <form>
        <label>
          Destination Address:
          <Input
            id="destination-address"
            name="destinationAddress"
            required
            value={destinationAddress}
            placeholder="vitalik.eth"
            onChange={(e) => setDestinationAddress(e.target.value)}
            type={
              addressAppearsValid
                ? 'success'
                : destinationAddress.length > 0
                ? 'warning'
                : 'default'
            }
            width="100%"
            style={{
              marginLeft: '10px',
              marginRight: '10px',
            }}
          />
        </label>
        {tokens.map((token) => (
          <div
            key={token.contract_address}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Toggle
              checked={
                checkedRecords[token.contract_address as `0x${string}`]?.isChecked || false
              }
              onChange={(e) => setCheckedRecords((old) => ({
                ...old,
                [token.contract_address as `0x${string}`]: {
                  ...old[token.contract_address as `0x${string}`],
                  isChecked: e.target.checked,
                },
              }))}
            />
            <span style={{ marginLeft: '10px' }}>{token.contract_ticker_symbol}</span>
          </div>
        ))}
        <Button
          type="secondary"
          onClick={sendAllCheckedTokens}
          disabled={!addressAppearsValid}
          style={{ marginTop: '20px' }}
        >
          {checkedCount === 0
            ? 'Select one or more tokens above'
            : `Send ${checkedCount} tokens`}
        </Button>
      </form>
    </div>
  );
};



