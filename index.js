require("dotenv").config();

const ethers = require("ethers");

const abi = require("./abi/xen.json");

const {
  NETWORK,
  XEN_ADDRESS,
  WALLET_SEED,
  ALCHEMY_KEY,
  SPONSOR_KEY,
  ETHER_UNIT,
} = process.env;

const provider = ethers.getDefaultProvider(NETWORK, { alchemy: ALCHEMY_KEY });
const xenContract = new ethers.Contract(XEN_ADDRESS, abi, provider);
const sponsorWallet = new ethers.Wallet(SPONSOR_KEY, provider);

const mint = async (privateKey, term) => {
  const wallet = new ethers.Wallet(privateKey, provider);

  // send ether to target wallet
  const sendTxData = {
    to: wallet.address,
    value: ethers.utils.parseEther(ETHER_UNIT),
  };

  const sendTx = await sponsorWallet.sendTransaction(sendTxData);
  console.log(
    `Sending ${ETHER_UNIT}Ether to ${wallet.address} - Tx hash: ${sendTx.hash}`
  );
  await sendTx.wait();

  // minting Xen token
  const xenWithSigner = xenContract.connect(wallet);

  const tx = await xenWithSigner.claimRank(term);
  console.log(`Minting to ${wallet.address} - Tx hash: ${tx.hash}`);
  await tx.wait();
  console.log(`Done\n`);
};

const getMintReward = async (privateKey) => {
  const wallet = new ethers.Wallet(privateKey, provider);

  // rewarding
  const xenWithSigner = xenContract.connect(wallet);

  const tx = await xenWithSigner.claimMintRewardAndShare(
    sponsorWallet.address,
    100
  );
  console.log(
    `Sending mint reward from ${wallet.address} to ${sponsorWallet.address} - Tx hash: ${tx.hash}`
  );
  await tx.wait();

  // send remaining ether to sponsor wallet
  const balance = await wallet.getBalance();
  const gasPrice = await provider.getGasPrice();
  const value = balance.sub(gasPrice.mul(21000));

  if (value.gt(ethers.ethers.BigNumber.from(0))) {
    const sendTxData = {
      to: sponsorWallet.address,
      value: value,
      gasPrice: gasPrice,
      gasLimit: 21000,
    };

    const sendTx = await wallet.sendTransaction(sendTxData);
    console.log(
      `Sending ${ethers.utils.formatEther(value)}Ether to ${
        sponsorWallet.address
      } - Tx hash: ${sendTx.hash}`
    );
    await sendTx.wait();
  }

  console.log(`Done\n`);
};

async function main() {
  // generate 10 wallets
  for (let i = 0; i < 10; i++) {
    const wallet = ethers.Wallet.fromMnemonic(
      WALLET_SEED,
      `m/44'/60'/0'/0/${i}`
    );

    const term = 100; // term for mint
    await mint(wallet.privateKey, term);
    // await getMintReward(wallet.privateKey);
  }
}

main();
