curl -fsSL https://bun.sh/install | bash
curl -fsSL https://raw.githubusercontent.com/wormhole-foundation/native-token-transfers/main/cli/install.sh | bash


npm uninstall -g @coral-xyz/anchor-cli
npm install -g @coral-xyz/anchor-cli@0.29.0


ntt add-chain Solana --latest --mode locking --token 3LhHkdtRnvtVhuD4wkPbvzBaZ1nNSLpcQs1xGYHWe9AK --payer ~/.config/solana/sonic.json --program-key keypair/NTtGuQDiJawkJAhiHkWfbnWS5GmwMBgMA6NHoE3fxD3.json