# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

"""Read-only qualification probe for native GEN value transfer support.

This contract is intentionally isolated from ClearLC and is never deployed.
The source is submitted only to the hosted schema endpoint and, where the
runner exposes it, to read-only deployment/fee simulation.
"""

import genlayer as gl


@gl.evm.contract_interface
class NativeRecipient:
    class View:
        pass

    class Write:
        pass


class ValueTransferProbe(gl.contract.Contract):
    def __init__(self) -> None:
        self.last_target = ""
        self.last_amount = gl.u256(0)
        self.last_balance = gl.u256(0)

    @gl.public.write.payable
    def receive_gen(self) -> None:
        self.last_amount = gl.message.value
        self.last_balance = self.balance

    @gl.public.write
    def probe_eoa_transfer(self, recipient: str, amount: gl.u256) -> None:
        target = gl.Address(recipient)
        self.last_target = str(target)
        self.last_amount = gl.u256(amount)
        self.last_balance = self.balance
        NativeRecipient(target).emit_transfer(value=gl.u256(amount))

    @gl.public.view
    def probe_balance(self) -> str:
        return str(self.balance)
