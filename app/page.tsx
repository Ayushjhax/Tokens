"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { Token } from "./components/Token";

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [solAmount, setSolAmount] = useState<number>(0.5);
  const [receiverPublicKey, setReceiverPublicKey] = useState<string>("");

  const getBalance = useCallback(async () => {
    if (publicKey) {
      try {
        const newBalance = await connection.getBalance(publicKey);
        return newBalance / LAMPORTS_PER_SOL;
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        toast.error("Failed to fetch balance.");
      }
    }
    return 0;
  }, [publicKey, connection]);

  useEffect(() => {
    if (publicKey) {
      const fetchBalance = async () => {
        const newBalance = await getBalance();
        setBalance(newBalance);
      };
      fetchBalance();
      const intervalId = setInterval(fetchBalance, 5000);
      return () => clearInterval(intervalId);
    }
  }, [publicKey, connection, getBalance]);

  const getAirdropOnClick = async () => {
    try {
      if (!publicKey) {
        throw new Error("Wallet is not connected");
      }

      const [latestBlockhash, signature] = await Promise.all([
        connection.getLatestBlockhash(),
        connection.requestAirdrop(
          publicKey,
          Math.floor(Math.random() * 5 + 1) * LAMPORTS_PER_SOL
        ),
      ]);

      const signResult = await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );

      if (signResult) {
        toast.success("Airdrop was successful!");
        setBalance(await getBalance());

        // Explorer link for the airdrop transaction
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
        toast.info(
          `View on Explorer: ${explorerUrl}`,
          {
            autoClose: false,
            onClick: () => window.open(explorerUrl, "_blank"),
          }
        );
      }
    } catch (err) {
      toast.error("Airdrop failed");
      console.error(`Airdrop failed: ${err}`);
    }
  };

  const transferSol = async () => {
    try {
      if (!publicKey) {
        throw new Error("Wallet is not connected");
      }
      if (!receiverPublicKey) {
        throw new Error("Receiver Public Key is required");
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(receiverPublicKey),
          lamports: solAmount * LAMPORTS_PER_SOL,
        })
      );
      const signature = await sendTransaction(transaction, connection);
      const sigResult = await connection.confirmTransaction(
        signature,
        "confirmed"
      );

      if (sigResult) {
        toast.success("Transaction was successful!");
        setBalance(await getBalance());

        // Explorer link for the transfer transaction
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
        toast.info(
          `View on Explorer: ${explorerUrl}`,
          {
            autoClose: false,
            onClick: () => window.open(explorerUrl, "_blank"),
          }
        );
      }
    } catch (err) {
      toast.error("Transaction failed");
      console.error(`Transaction failed: ${err}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <header className="w-full flex justify-end mb-8">
        <WalletMultiButton className="btn-primary" />
      </header>

      {publicKey ? (
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl animate-fade-in">
          <h1 className="text-3xl font-bold text-purple-400">
            Welcome, Solana User!
          </h1>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Account Info</h2>
            <p className="text-green-400 break-all">
              Public Key: {publicKey.toString()}
            </p>
            <p className="text-yellow-400 mt-2">
              Balance: {balance.toFixed(4)} SOL
            </p>
            <button
              onClick={getAirdropOnClick}
              className="btn-secondary mt-4"
            >
              Request Airdrop
            </button>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Transfer SOL</h2>
            <div className="flex flex-col gap-4">
              <input
                type="number"
                className="bg-gray-700 text-white rounded px-3 py-2 w-full"
                value={solAmount}
                onChange={(e) => setSolAmount(parseFloat(e.target.value))}
                placeholder="Amount"
              />
              <input
                type="text"
                className="bg-gray-700 text-white rounded px-3 py-2 w-full"
                value={receiverPublicKey}
                onChange={(e) => setReceiverPublicKey(e.target.value)}
                placeholder="Receiver Public Key"
              />
            </div>
            <button
              onClick={transferSol}
              className="btn-primary mt-4 w-full"
            >
              Transfer SOL
            </button>
          </div>

          <Token />
        </div>
      ) : (
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-bold text-purple-400 mb-8">
            Welcome to Solana Token Manager
          </h1>
          <p className="text-xl mb-8">Please connect your wallet to continue</p>
          <WalletMultiButton className="btn-primary" />
        </div>
      )}
    </div>
  );
}
