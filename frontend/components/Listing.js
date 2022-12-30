import { useEffect, useState } from "react";
import { useAccount, useContract, useProvider, erc721ABI } from "wagmi";
import styles from "../styles/Listing.module.css";
import { formatEther } from "ethers/lib/utils.js";
import { Contract } from "ethers";

export default function Listing(props) {
  // State variables to hold information about NFT
  const [imageURI, setImageURI] = useState("");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);

  // get the provider, connected address, and a contract instance
  // for the NFT contract using wagmi.
  const provider = useProvider();
  const { address } = useAccount();

  const ERC721Contract = new Contract(props.nftAddress, erc721ABI, provider);
  //   check if the nft seller is the connected user
  const isOwner = address.toLowerCase() === props.seller.toLowerCase();

  //   fetch NFT details by resolving the token URI
  async function fetchNFTDetails() {
    try {
      // get token uri from contract
      let tokenURI = await ERC721Contract.tokenURI(0);

      //   if its an IPFS URI, replace it with an HTTP Gateway link
      tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");

      //   Resolve the token uri
      const metadata = await fetch(tokenURI);
      const metadataJSON = await metadata.json();

      //   extract image uri from the metadata
      let image = metadataJSON.imageUrl;
      //   if its an IPFS uri, replace it with an http gateway link
      image = image.replace("ipfs://", "https://ipfs.io/ipfs/");

      //   update state variables
      setName(metadataJSON.name);
      setImageURI(image);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  //   fetch the NFT details when component is loaded.
  useEffect(() => {
    fetchNFTDetails();
  }, []);

  return (
    <div>
      {loading ? (
        <span>Loading...</span>
      ) : (
        <div className={styles.card}>
          <img src={imageURI} />
          <div className={styles.container}>
            <span>
              <b>
                {name} - #{props.tokenId}
              </b>
            </span>
            <span>Price: {formatEther(props.price)}</span>
            <span>
              Seller: {isOwner ? "You" : props.seller.substring(0, 6) + "..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
