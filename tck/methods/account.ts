import {
    AccountCreateTransaction,
    Hbar,
    AccountId,
    AccountUpdateTransaction,
    AccountDeleteTransaction,
    Timestamp,
    AccountAllowanceApproveTransaction,
    AccountAllowanceDeleteTransaction,
    TransferTransaction,
    NftId,
    TokenId,
    EvmAddress,
} from "@hashgraph/sdk";
import Long from "long";

import { sdk } from "../sdk_data";
import { AccountResponse } from "../response/account";

import { getKeyFromString } from "../utils/key";
import { DEFAULT_GRPC_DEADLINE } from "../utils/constants/config";
import { handleNftAllowances } from "../utils/helpers/account";

import {
    AccountAllowanceApproveParams,
    CreateAccountParams,
    DeleteAccountParams,
    DeleteAllowanceParams,
    UpdateAccountParams,
} from "../params/account";
import { applyCommonTransactionParams } from "../params/common-tx-params";
import { TransferCryptoParams } from "../params/transfer";

export const createAccount = async ({
    key,
    initialBalance,
    receiverSignatureRequired,
    maxAutoTokenAssociations,
    commonTransactionParams,
    stakedAccountId,
    stakedNodeId,
    declineStakingReward,
    memo,
    autoRenewPeriod,
    alias,
}: CreateAccountParams): Promise<AccountResponse> => {
    let transaction = new AccountCreateTransaction().setGrpcDeadline(
        DEFAULT_GRPC_DEADLINE,
    );

    if (key != null) {
        transaction.setKeyWithoutAlias(getKeyFromString(key));
    }

    if (initialBalance != null) {
        transaction.setInitialBalance(Hbar.fromTinybars(initialBalance));
    }

    if (receiverSignatureRequired != null) {
        transaction.setReceiverSignatureRequired(receiverSignatureRequired);
    }

    if (maxAutoTokenAssociations != null) {
        transaction.setMaxAutomaticTokenAssociations(maxAutoTokenAssociations);
    }

    if (stakedAccountId != null) {
        const accountId = AccountId.fromString(stakedAccountId);

        transaction.setStakedAccountId(accountId);
    }

    if (stakedNodeId != null) {
        transaction.setStakedNodeId(Long.fromString(stakedNodeId));
    }

    if (declineStakingReward != null) {
        transaction.setDeclineStakingReward(declineStakingReward);
    }

    if (memo != null) {
        transaction.setAccountMemo(memo);
    }

    if (autoRenewPeriod != null) {
        transaction.setAutoRenewPeriod(Long.fromString(autoRenewPeriod));
    }

    if (alias != null) {
        transaction.setAlias(alias);
    }

    if (commonTransactionParams != null) {
        applyCommonTransactionParams(
            commonTransactionParams,
            transaction,
            sdk.getClient(),
        );
    }

    const txResponse = await transaction.execute(sdk.getClient());
    const receipt = await txResponse.getReceipt(sdk.getClient());

    return {
        accountId: receipt.accountId.toString(),
        status: receipt.status.toString(),
    };
};

export const updateAccount = async ({
    accountId,
    key,
    autoRenewPeriod,
    expirationTime,
    receiverSignatureRequired,
    memo,
    maxAutoTokenAssociations,
    stakedAccountId,
    stakedNodeId,
    declineStakingReward,
    commonTransactionParams,
}: UpdateAccountParams): Promise<AccountResponse> => {
    let transaction = new AccountUpdateTransaction().setGrpcDeadline(
        DEFAULT_GRPC_DEADLINE,
    );

    if (accountId != null) {
        transaction.setAccountId(accountId);
    }

    if (key != null) {
        transaction.setKey(getKeyFromString(key));
    }

    if (receiverSignatureRequired != null) {
        transaction.setReceiverSignatureRequired(receiverSignatureRequired);
    }

    if (maxAutoTokenAssociations != null) {
        transaction.setMaxAutomaticTokenAssociations(maxAutoTokenAssociations);
    }

    if (stakedAccountId != null) {
        const accountId = AccountId.fromString(stakedAccountId);

        transaction.setStakedAccountId(accountId);
    }

    if (stakedNodeId != null) {
        transaction.setStakedNodeId(Long.fromString(stakedNodeId));
    }

    if (expirationTime != null) {
        transaction.setExpirationTime(
            new Timestamp(Long.fromString(expirationTime), 0),
        );
    }

    if (declineStakingReward != null) {
        transaction.setDeclineStakingReward(declineStakingReward);
    }

    if (memo != null) {
        transaction.setAccountMemo(memo);
    }

    if (autoRenewPeriod != null) {
        transaction.setAutoRenewPeriod(Long.fromString(autoRenewPeriod));
    }

    if (commonTransactionParams != null) {
        applyCommonTransactionParams(
            commonTransactionParams,
            transaction,
            sdk.getClient(),
        );
    }

    const txResponse = await transaction.execute(sdk.getClient());
    const receipt = await txResponse.getReceipt(sdk.getClient());

    return {
        status: receipt.status.toString(),
    };
};

export const deleteAccount = async ({
    deleteAccountId,
    transferAccountId,
    commonTransactionParams,
}: DeleteAccountParams): Promise<AccountResponse> => {
    let transaction = new AccountDeleteTransaction().setGrpcDeadline(
        DEFAULT_GRPC_DEADLINE,
    );

    if (deleteAccountId != null) {
        transaction.setAccountId(AccountId.fromString(deleteAccountId));
    }

    if (transferAccountId != null) {
        transaction.setTransferAccountId(
            AccountId.fromString(transferAccountId),
        );
    }

    if (commonTransactionParams != null) {
        applyCommonTransactionParams(
            commonTransactionParams,
            transaction,
            sdk.getClient(),
        );
    }

    const txResponse = await transaction.execute(sdk.getClient());
    const receipt = await txResponse.getReceipt(sdk.getClient());

    return {
        status: receipt.status.toString(),
    };
};

export const approveAllowance = async ({
    allowances,
    commonTransactionParams,
}: AccountAllowanceApproveParams): Promise<AccountResponse> => {
    const transaction = new AccountAllowanceApproveTransaction();
    transaction.setGrpcDeadline(DEFAULT_GRPC_DEADLINE);

    for (const allowance of allowances) {
        const { ownerAccountId, spenderAccountId, hbar, token, nft } =
            allowance;
        const owner = AccountId.fromString(ownerAccountId);
        const spender = AccountId.fromString(spenderAccountId);

        if (hbar) {
            transaction.approveHbarAllowance(
                owner,
                spender,
                Hbar.fromTinybars(hbar.amount),
            );
        } else if (token) {
            transaction.approveTokenAllowance(
                TokenId.fromString(token.tokenId),
                owner,
                spender,
                Long.fromString(token.amount),
            );
        } else if (nft) {
            handleNftAllowances(transaction, nft, owner, spender);
        } else {
            throw new Error("No valid allowance type provided.");
        }
    }

    transaction.freezeWith(sdk.getClient());

    if (commonTransactionParams) {
        applyCommonTransactionParams(
            commonTransactionParams,
            transaction,
            sdk.getClient(),
        );
    }

    const txResponse = await transaction.execute(sdk.getClient());
    const receipt = await txResponse.getReceipt(sdk.getClient());

    return {
        status: receipt.status.toString(),
    };
};

export const deleteAllowance = async ({
    allowances,
    commonTransactionParams,
}: DeleteAllowanceParams): Promise<AccountResponse> => {
    let transaction = new AccountAllowanceDeleteTransaction().setGrpcDeadline(
        DEFAULT_GRPC_DEADLINE,
    );

    for (const allowance of allowances) {
        const owner = AccountId.fromString(allowance.ownerAccountId);
        const tokenId = AccountId.fromString(allowance.tokenId);

        for (const serialNumber of allowance.serialNumbers) {
            const nftId = new NftId(
                new TokenId(tokenId),
                Long.fromString(serialNumber),
            );

            transaction.deleteAllTokenNftAllowances(nftId, owner);
        }
    }

    if (commonTransactionParams != null) {
        applyCommonTransactionParams(
            commonTransactionParams,
            transaction,
            sdk.getClient(),
        );
    }

    const txResponse = await transaction.execute(sdk.getClient());
    const receipt = await txResponse.getReceipt(sdk.getClient());

    return {
        status: receipt.status.toString(),
    };
};

export const transferCrypto = async ({
    transfers,
    commonTransactionParams,
}: TransferCryptoParams): Promise<AccountResponse> => {
    if (!transfers.length) {
        throw new Error("No transfers provided.");
    }

    let transaction = new TransferTransaction().setGrpcDeadline(
        DEFAULT_GRPC_DEADLINE,
    );

    for (const txParams of transfers) {
        const isApproved = txParams.approved ?? false;

        if (txParams.hbar) {
            const amount = Hbar.fromTinybars(txParams.hbar.amount);

            if (txParams.hbar.accountId != null) {
                const accountId = AccountId.fromString(txParams.hbar.accountId);

                isApproved
                    ? transaction.addApprovedHbarTransfer(accountId, amount)
                    : transaction.addHbarTransfer(accountId, amount);
            } else if (txParams.hbar.evmAddress != null) {
                const evmAddress = EvmAddress.fromString(
                    txParams.hbar.evmAddress,
                );
                const accountId = AccountId.fromEvmAddress(0, 0, evmAddress);

                isApproved
                    ? transaction.addApprovedHbarTransfer(accountId, amount)
                    : transaction.addHbarTransfer(accountId, amount);
            }
        } else if (txParams.token != null) {
            const accountId = AccountId.fromString(txParams.token.accountId);
            const tokenId = TokenId.fromString(txParams.token.tokenId);
            const amount = Long.fromString(txParams.token.amount);

            if (txParams.token.decimals !== undefined) {
                isApproved
                    ? transaction.addApprovedTokenTransfer(
                          tokenId,
                          accountId,
                          amount,
                      )
                    : transaction.addTokenTransferWithDecimals(
                          tokenId,
                          accountId,
                          amount,
                          txParams.token.decimals,
                      );
            } else {
                isApproved
                    ? transaction.addApprovedTokenTransfer(
                          tokenId,
                          accountId,
                          amount,
                      )
                    : transaction.addTokenTransfer(tokenId, accountId, amount);
            }
        } else if (txParams.nft != null) {
            const senderAccountId = AccountId.fromString(
                txParams.nft.senderAccountId,
            );
            const receiverAccountId = AccountId.fromString(
                txParams.nft.receiverAccountId,
            );
            const nftId = new NftId(
                TokenId.fromString(txParams.nft.tokenId),
                Long.fromString(txParams.nft.serialNumber),
            );

            isApproved
                ? transaction.addApprovedNftTransfer(
                      nftId,
                      senderAccountId,
                      receiverAccountId,
                  )
                : transaction.addNftTransfer(
                      nftId,
                      senderAccountId,
                      receiverAccountId,
                  );
        }
    }

    if (commonTransactionParams != null) {
        applyCommonTransactionParams(
            commonTransactionParams,
            transaction,
            sdk.getClient(),
        );
    }

    const txResponse = await transaction.execute(sdk.getClient());
    const receipt = await txResponse.getReceipt(sdk.getClient());

    return {
        status: receipt.status.toString(),
    };
};
