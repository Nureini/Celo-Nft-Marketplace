import { Contract } from "ethers";
import { isAddress, parseEther } from "ethers/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { useSigner, erc721ABI } from "wagmi";
import MarketplaceABI from "../abis/NFTMarketplace.json";
import Navbar from "../components/Navbar";
import styles from "../styles/Create.module.css";
import { MARKETPLACE_ADDRESS } from "../constants";

export default function Create() {
  // state variables to contain information about the NFT being sold
  const [nftAddress, setNftAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showListingLink, setShowListingLink] = useState(false);

  //   get signer from wagmi
  const { data: signer } = useSigner();

  async function handleCreateListing() {
    setLoading(true);

    try {
      const isValidAddress = isAddress(nftAddress);
      if (!isValidAddress) {
        throw new Error("Invalid contract address");
      }

      await requestApproval();
      await createListing();

      setShowListingLink(true);
    } catch (error) {
      console.error(error);
    }
  }

  //   check if NFT approval is required
  async function requestApproval() {
    const address = await signer.getAddress();

    // initialize a contract instance for the NFT contract
    const ERC721Contract = new Contract(nftAddress, erc721ABI, signer);

    const tokenOwner = await ERC721Contract.ownerOf(tokenId);
    if (tokenOwner.toLowerCase() !== address.toLowerCase()) {
      throw new Error("You do not own this NFT");
    }

    const isApproved = await ERC721Contract.isApprovedForAll(
      address,
      MARKETPLACE_ADDRESS
    );

    if (!isApproved) {
      console.log("Requesting approval over NFTs...");

      const approvalTxn = await ERC721Contract.setApprovalForAll(
        MARKETPLACE_ADDRESS,
        true
      );
      await approvalTxn.wait();
    }
  }

  async function createListing() {
    const MarketplaceContract = new Contract(
      MARKETPLACE_ADDRESS,
      MarketplaceABI,
      signer
    );

    const createListingTxn = await MarketplaceContract.createListing(
      nftAddress,
      tokenId,
      parseEther(price)
    );
    await createListingTxn.wait();
  }

  return (
    <>
      <Navbar />

      <div className={styles.container}>
        <input
          type="text"
          placeholder="NFT Address 0x..."
          value={nftAddress}
          onChange={(e) => setNftAddress(e.target.value)}
        />
        <input
          type="text"
          placeholder="Token ID"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Price (in CELO)"
          value={price}
          onChange={(e) => {
            if (e.target.value === "") {
              setPrice("0");
            } else {
              setPrice(e.target.value);
            }
          }}
        />

        <button onClick={handleCreateListing} disabled={loading}>
          {loading ? "Loading..." : "Create"}
        </button>

        {showListingLink && (
          <Link href={`/${nftAddress}/${tokenId}`}>
            <button>View Listing</button>
          </Link>
        )}
      </div>
    </>
  );
}
