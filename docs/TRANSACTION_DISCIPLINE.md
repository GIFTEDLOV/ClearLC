# Transaction and fee discipline

Phase 2 does not broadcast. The frontend now contains a typed, unused
transaction adapter at `frontend/src/chain/transactionDiscipline.ts` for later
qualification.

The adapter enforces the required sequence:

`PRECONDITION READ -> PREPARE -> BROADCAST ONCE -> PERSIST EXACT HASH -> RECONCILE SAME HASH -> FINALITY -> EXECUTION RESULT -> CANONICAL READBACK`

It has no blind-retry branch after a transaction hash exists. It also keeps
payable user `value` separate from the protocol fee deposit `feeValue`.

The current v2 RC API identified for fee preparation is
`estimateTransactionFeesForWrite`, with `estimateTransactionFees` available
for checked-in fee profiles. Finalized receipts must be checked with
`isSuccessful`; `FINALIZED` alone is not a successful business execution.

Studio-dev's gasless EVM wallet layer does not imply zero GenLayer protocol
fees. The later live qualification must read fee policy and finalized fee
accounting from the SDK. Hosted Studio-dev is not blocked by local Docker.

References: [GenLayerJS contract methods](https://docs.genlayer.com/api-references/genlayer-js/contracts), [writing data](https://docs.genlayer.com/developers/decentralized-applications/writing-data), and [fee profiling](https://docs.genlayer.com/developers/decentralized-applications/fee-profiling-and-estimation).
