import {
	createApproveCheckedInstruction,
	createAssociatedTokenAccountInstruction,
	createBurnCheckedInstruction,
	createCloseAccountInstruction,
	createInitializeMintInstruction,
	createMintToCheckedInstruction,
	createRevokeInstruction,
	createTransferInstruction,
	getAssociatedTokenAddress,
	getAssociatedTokenAddressSync,
	MINT_SIZE,
	TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
	Keypair,
	PublicKey,
	LAMPORTS_PER_SOL,
	Transaction,
	SystemProgram,
} from "@solana/web3.js";
import { useState } from "react";
import { toast } from "react-toastify";

export const Token = () => {
	const { connection } = useConnection();
	const { publicKey, sendTransaction } = useWallet();
	const [mint, setMint] = useState<PublicKey | null>(null);
	const [tokenBalance, setTokenBalance] = useState<string>();

	const fetchTokenBalance = async (tokenAccount: PublicKey) => {
		if (!publicKey) {
			console.error("Wallet is not connected");
			return;
		}

		try {
			const balance = await connection.getTokenAccountBalance(
				tokenAccount
			);
			console.log("Token balance:", balance.value.uiAmount);
			setTokenBalance(balance.value.amount);
		} catch (error) {
			console.error("Failed to fetch token balance:", error);
		}
	};

	async function createToken() {
		if (!publicKey) {
			console.error("Wallet is not connected");
			return;
		}

		const mintKeypair = Keypair.generate();
		const lamports = await connection.getMinimumBalanceForRentExemption(
			MINT_SIZE
		);

		const transaction = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: publicKey,
				newAccountPubkey: mintKeypair.publicKey,
				space: MINT_SIZE,
				lamports,
				programId: TOKEN_PROGRAM_ID,
			}),
			createInitializeMintInstruction(
				mintKeypair.publicKey,
				9,
				publicKey,
				publicKey
			)
		);

		try {
			transaction.feePayer = publicKey;
			transaction.recentBlockhash = (
				await connection.getRecentBlockhash()
			).blockhash;

			const signature = await sendTransaction(transaction, connection, {
				signers: [mintKeypair],
			});

			await connection.confirmTransaction(signature, "confirmed");
			setMint(mintKeypair.publicKey);
			console.log("Token created:", mintKeypair.publicKey.toString());
			toast.success("Token created successfully!");

			// Explorer link for the created token
			const explorerUrl = `https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`;
			toast.info(
				`View on Explorer: ${explorerUrl}`,
				{
					autoClose: false,
					onClick: () => window.open(explorerUrl, "_blank"),
				}
			);
		} catch (error) {
			console.error("Failed to create token:", error);
			toast.error("Failed to create token.");
		}
	}

	async function mintTokens() {
		if (!publicKey || !mint) {
			console.error("Wallet is not connected or mint not set.");
			return;
		}

		const ata = getAssociatedTokenAddressSync(mint, publicKey);

		let tx = new Transaction();
		tx.add(
			createAssociatedTokenAccountInstruction(
				publicKey,
				ata,
				publicKey,
				mint
			),
			createMintToCheckedInstruction(
				mint,
				ata,
				publicKey,
				100 * LAMPORTS_PER_SOL,
				9
			)
		);

		tx.feePayer = publicKey;
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

		try {
			const signature = await sendTransaction(tx, connection);
			await connection.confirmTransaction(signature, "confirmed");
			toast.success("Tokens minted successfully");
			fetchTokenBalance(ata);

			// Explorer link for the mint transaction
			const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
			toast.info(
				`View on Explorer: ${explorerUrl}`,
				{
					autoClose: false,
					onClick: () => window.open(explorerUrl, "_blank"),
				}
			);
		} catch (error) {
			console.error("Failed to mint tokens:", error);
			toast.error("Failed to mint tokens.");
		}
	}

	async function sendTokens() {
		if (!publicKey || !mint) {
			console.error("Wallet is not connected or mint not set.");
			return;
		}

		const receiver = new PublicKey(
			"JCsFjtj6tem9Dv83Ks4HxsL7p8GhdLtokveqW7uWjGyi"
		);
		const senderATA = getAssociatedTokenAddressSync(mint, publicKey);
		const receiverATA = getAssociatedTokenAddressSync(mint, receiver);

		let tx = new Transaction();
		tx.add(
			createAssociatedTokenAccountInstruction(
				publicKey,
				receiverATA,
				receiver,
				mint
			),
			createTransferInstruction(
				senderATA,
				receiverATA,
				publicKey,
				1 * LAMPORTS_PER_SOL
			)
		);

		tx.feePayer = publicKey;
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

		try {
			const signature = await sendTransaction(tx, connection);
			await connection.confirmTransaction(signature, "confirmed");
			toast.success("Tokens sent successfully");
			fetchTokenBalance(senderATA);

			// Explorer link for the transfer transaction
			const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
			toast.info(
				`View on Explorer: ${explorerUrl}`,
				{
					autoClose: false,
					onClick: () => window.open(explorerUrl, "_blank"),
				}
			);
		} catch (error) {
			console.error("Failed to send tokens:", error);
			toast.error("Failed to send tokens.");
		}
	}

	async function burnTokens() {
		if (!publicKey || !mint) {
			console.error("Wallet is not connected or mint not set.");
			return;
		}

		const ata = getAssociatedTokenAddressSync(mint, publicKey);

		let tx = new Transaction();
		tx.add(
			createBurnCheckedInstruction(
				ata,
				mint,
				publicKey,
				1 * LAMPORTS_PER_SOL,
				9
			)
		);

		tx.feePayer = publicKey;
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

		try {
			const signature = await sendTransaction(tx, connection);
			await connection.confirmTransaction(signature, "confirmed");
			toast.success("Tokens burned successfully");
			fetchTokenBalance(ata);

			// Explorer link for the burn transaction
			const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
			toast.info(
				`View on Explorer: ${explorerUrl}`,
				{
					autoClose: false,
					onClick: () => window.open(explorerUrl, "_blank"),
				}
			);
		} catch (error) {
			console.error("Failed to burn tokens:", error);
			toast.error("Failed to burn tokens.");
		}
	}

	async function delegate() {
		if (!publicKey || !mint) {
			console.error("Wallet is not connected or mint not set.");
			return;
		}

		const ata = getAssociatedTokenAddressSync(mint, publicKey);
		const delegate = new PublicKey(
			"JCsFjtj6tem9Dv83Ks4HxsL7p8GhdLtokveqW7uWjGyi"
		);

		let tx = new Transaction();
		tx.add(
			createApproveCheckedInstruction(
				ata,
				mint,
				delegate,
				publicKey,
				1 * LAMPORTS_PER_SOL,
				9
			)
		);

		tx.feePayer = publicKey;
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

		try {
			const signature = await sendTransaction(tx, connection);
			await connection.confirmTransaction(signature, "confirmed");
			toast.success("Tokens delegated successfully");

			// Explorer link for the delegate transaction
			const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
			toast.info(
				`View on Explorer: ${explorerUrl}`,
				{
					autoClose: false,
					onClick: () => window.open(explorerUrl, "_blank"),
				}
			);
		} catch (error) {
			console.error("Failed to delegate tokens:", error);
			toast.error("Failed to delegate tokens.");
		}
	}

	async function revokeDelegate() {
		if (!publicKey || !mint) {
			console.error("Wallet is not connected or mint not set.");
			return;
		}

		const ata = getAssociatedTokenAddressSync(mint, publicKey);

		let tx = new Transaction();
		tx.add(createRevokeInstruction(ata, publicKey));

		tx.feePayer = publicKey;
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

		try {
			const signature = await sendTransaction(tx, connection);
			await connection.confirmTransaction(signature, "confirmed");
			toast.success("Tokens revoked successfully");

			// Explorer link for the revoke transaction
			const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
			toast.info(
				`View on Explorer: ${explorerUrl}`,
				{
					autoClose: false,
					onClick: () => window.open(explorerUrl, "_blank"),
				}
			);
		} catch (error) {
			console.error("Failed to revoke tokens:", error);
			toast.error("Failed to revoke tokens.");
		}
	}

	async function closeTokenAccount() {
		if (!publicKey || !mint) {
			console.error("Wallet is not connected or mint not set.");
			return;
		}

		const ata = getAssociatedTokenAddressSync(mint, publicKey);

		let tx = new Transaction();

		const balance = await connection.getTokenAccountBalance(ata);
		if (parseFloat(balance.value.amount) > 0) {
			toast.info(
				"Token account has balance. Sending tokens to another account."
			);

			const receiver = new PublicKey(
				"JCsFjtj6tem9Dv83Ks4HxsL7p8GhdLtokveqW7uWjGyi"
			);
			const senderATA = getAssociatedTokenAddressSync(mint, publicKey);
			const receiverATA = getAssociatedTokenAddressSync(mint, receiver);

			tx.add(
				createAssociatedTokenAccountInstruction(
					publicKey,
					receiverATA,
					receiver,
					mint
				),
				createTransferInstruction(
					senderATA,
					receiverATA,
					publicKey,
					parseInt(balance.value.amount)
				)
			);
		}

		tx.add(createCloseAccountInstruction(ata, publicKey, publicKey));

		tx.feePayer = publicKey;
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

		try {
			const signature = await sendTransaction(tx, connection);
			await connection.confirmTransaction(signature, "confirmed");
			toast.success("Token account closed successfully");
			setMint(null);
			fetchTokenBalance(ata);

			// Explorer link for the close account transaction
			const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
			toast.info(
				`View on Explorer: ${explorerUrl}`,
				{
					autoClose: false,
					onClick: () => window.open(explorerUrl, "_blank"),
				}
			);
		} catch (error) {
			console.error("Failed to close token account:", error);
			toast.error("Failed to close token account.");
		}
	}

	return (
		<div className="flex flex-col gap-4 p-6 bg-gray-800 rounded-lg shadow-lg animate-fade-in">
		  <h2 className="text-2xl font-bold text-purple-400">Token Operations</h2>
	
		  {mint ? (
			<div className="flex flex-col gap-4">
			  <p className="text-green-400">Token created: {mint.toString()}</p>
			  {tokenBalance && (
				<p className="text-yellow-400">
				  Token Balance: {parseInt(tokenBalance) / 10 ** 9}
				</p>
			  )}
			  <div className="grid grid-cols-2 gap-4">
				<button
				  onClick={mintTokens}
				  className="btn-primary"
				>
				  Mint Tokens
				</button>
				<button
				  onClick={sendTokens}
				  className="btn-secondary"
				>
				  Send Tokens
				</button>
				<button
				  onClick={burnTokens}
				  className="btn-danger"
				>
				  Burn Tokens
				</button>
				<button
				  onClick={delegate}
				  className="btn-info"
				>
				  Delegate
				</button>
				<button
				  onClick={revokeDelegate}
				  className="btn-warning"
				>
				  Revoke Delegate
				</button>
				<button
				  onClick={closeTokenAccount}
				  className="btn-dark"
				>
				  Close Token Account
				</button>
			  </div>
			</div>
		  ) : (
			<button
			  onClick={createToken}
			  className="btn-primary"
			>
			  Create Token
			</button>
		  )}
		</div>
	  );
	};
