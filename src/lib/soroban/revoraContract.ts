/**
 * Read-only Soroban client for the Revora revenue-deposit contract
 *
 * Provides typed functions to query contract state without signing transactions.
 * Uses @stellar/stellar-sdk rpc.Server for read-only contract calls.
 *
 * Contract methods (from getContractMethods):
 * - get_admin(): Address
 * - get_token(): Address
 * - get_period(period_id: U32): Result<Period>
 * - get_period_ids(): Vec<U32>
 * - has_claimed(period_id: U32, address: Address): Bool
 * - get_beneficiaries(period_id: U32): Result<Vec<Address>>
 * - unclaimed_summary(): Map<U32, I128>
 * - get_authorized_offerings(): Vec<Address>
 */

import { rpc } from '@stellar/stellar-sdk';
import {
  RPC_URL,
  NETWORK_PASSPHRASE,
  CONTRACT_ID,
} from '../../constants/stellar';

/**
 * Contract method names (recorded from contract interface)
 */
export const CONTRACT_METHODS = {
  GET_ADMIN: 'get_admin',
  GET_TOKEN: 'get_token',
  GET_PERIOD: 'get_period',
  GET_PERIOD_IDS: 'get_period_ids',
  HAS_CLAIMED: 'has_claimed',
  GET_BENEFICIARIES: 'get_beneficiaries',
  UNCLAIMED_SUMMARY: 'unclaimed_summary',
  GET_AUTHORIZED_OFFERINGS: 'get_authorized_offerings',
} as const;

/**
 * Period metadata (decoded from get_period Result)
 */
export interface Period {
  start_ledger: number;
  end_ledger: number;
  revenue_amount: bigint;
  is_complete: boolean;
}

/**
 * Unclaimed summary entry (from unclaimed_summary Map)
 */
export interface UnclaimedEntry {
  period_id: number;
  amount: bigint;
}

/**
 * Creates an RPC server instance for Soroban
 * Exported for testing purposes
 */
export const createRpcServer = () => new rpc.Server(RPC_URL);

/**
 * Internal: get RPC server (allows override in tests)
 */
let _rpcServerFactory = createRpcServer;

export function setRpcServerFactory(factory: () => any) {
  _rpcServerFactory = factory;
}

export function resetRpcServerFactory() {
  _rpcServerFactory = createRpcServer;
}

/**
 * Query the contract's admin address
 */
export async function getAdmin(): Promise<string> {
  const server = _rpcServerFactory();
  const { result } = await server.queryContract<string>(
    CONTRACT_ID,
    CONTRACT_METHODS.GET_ADMIN,
    undefined,
    NETWORK_PASSPHRASE,
  );
  return result;
}

/**
 * Query the contract's token address
 */
export async function getToken(): Promise<string> {
  const server = _rpcServerFactory();
  const { result } = await server.queryContract<string>(
    CONTRACT_ID,
    CONTRACT_METHODS.GET_TOKEN,
    undefined,
    NETWORK_PASSPHRASE,
  );
  return result;
}

/**
 * Query all period IDs registered with the contract
 */
export async function getPeriodIds(): Promise<number[]> {
  const server = _rpcServerFactory();
  const { result } = await server.queryContract<number[]>(
    CONTRACT_ID,
    CONTRACT_METHODS.GET_PERIOD_IDS,
    undefined,
    NETWORK_PASSPHRASE,
  );
  return result;
}

/**
 * Query period metadata for a specific period
 * Returns the period data or null if the period doesn't exist
 */
export async function getPeriod(periodId: number): Promise<Period | null> {
  const server = _rpcServerFactory();
  try {
    const { result } = await server.queryContract<Period>(
      CONTRACT_ID,
      CONTRACT_METHODS.GET_PERIOD,
      { period_id: periodId },
      NETWORK_PASSPHRASE,
    );
    return result;
  } catch (error) {
    // Return null if period doesn't exist or query fails
    return null;
  }
}

/**
 * Query whether an address has claimed from a period
 */
export async function hasClaimed(periodId: number, address: string): Promise<boolean> {
  const server = _rpcServerFactory();
  const { result } = await server.queryContract<boolean>(
    CONTRACT_ID,
    CONTRACT_METHODS.HAS_CLAIMED,
    { period_id: periodId, address },
    NETWORK_PASSPHRASE,
  );
  return result;
}

/**
 * Query the beneficiary list for a period
 */
export async function getBeneficiaries(periodId: number): Promise<string[] | null> {
  const server = _rpcServerFactory();
  try {
    const { result } = await server.queryContract<string[]>(
      CONTRACT_ID,
      CONTRACT_METHODS.GET_BENEFICIARIES,
      { period_id: periodId },
      NETWORK_PASSPHRASE,
    );
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Query unclaimed summary map (period_id -> unclaimed_amount)
 */
export async function getUnclaimedSummary(): Promise<UnclaimedEntry[]> {
  const server = _rpcServerFactory();
  const { result } = await server.queryContract<Record<number, bigint>>(
    CONTRACT_ID,
    CONTRACT_METHODS.UNCLAIMED_SUMMARY,
    undefined,
    NETWORK_PASSPHRASE,
  );
  
  // Convert Record to array of entries
  return Object.entries(result).map(([periodId, amount]) => ({
    period_id: Number(periodId),
    amount,
  }));
}

/**
 * Query the list of authorized offering contract addresses
 */
export async function getAuthorizedOfferings(): Promise<string[]> {
  const server = _rpcServerFactory();
  const { result } = await server.queryContract<string[]>(
    CONTRACT_ID,
    CONTRACT_METHODS.GET_AUTHORIZED_OFFERINGS,
    undefined,
    NETWORK_PASSPHRASE,
  );
  return result;
}

/**
 * Get a summary of contract state for display purposes
 * Combines multiple read-only calls into a single summary object
 */
export async function getContractSummary() {
  try {
    const [admin, token, periodIds, authorizedOfferings] = await Promise.all([
      getAdmin(),
      getToken(),
      getPeriodIds(),
      getAuthorizedOfferings(),
    ]);

    return {
      admin,
      token,
      periodCount: periodIds.length,
      periodIds,
      authorizedOfferingsCount: authorizedOfferings.length,
    };
  } catch (error) {
    throw new Error(`Failed to fetch contract summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}
