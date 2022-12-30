import { Contract } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createClient } from "urql";
import { useContract, useSigner, erc721ABI } from "wagmi";
import MarketplaceABI from "../../abis/NFTMarketplace.json";
import Navbar from "../../components/Navbar";
import { MARKETPLACE_ADDRESS, SUBGRAPH_URL } from "../../constants";
import styles from "../../styles/Details.module.css";

export default function NFTDetails() {
  // extract NFT contract address and token id from url
  const router = useRouter();
  const nftAddress = router.query.nftContract;
  const tokenId = router.query.tokenId;

  //   contain NFT and lsiting info
  const [listing, setListing] = useState("");
  const [name, setName] = useState("");
  const [imageURI, setImageURI] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isActive, setIsActive] = useState(false);

  //   new price if updating listing
  const [newPrice, setNewPrice] = useState("");

  //   contain various loading stataes
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [buying, setBuying] = useState(false);

  const { data: signer } = useSigner();

  // const MarketplaceContract = useContract({
  //   addressOrName: MARKETPLACE_ADDRESS,
  //   contractInterface: MarketplaceABI,
  //   signerOrProvider: signer,
  // });
  const MarketplaceContract = new Contract(
    MARKETPLACE_ADDRESS,
    MarketplaceABI,
    signer
  );

  async function fetchListing() {
    const listingQuery = `query ListingQuery {
        listingEntities(where: {
            nftAddress: "${nftAddress}",
            tokenId: "${tokenId}"
        }) {
            id
            nftAddress
            tokenId
            price
            seller
            buyer
        }
    }`;

    const urqlClient = createClient({ url: SUBGRAPH_URL });

    // send query to subgraph GraphQL API
    const response = await urqlClient.query(listingQuery).toPromise();
    const listingEntities = response.data.listingEntities;

    if (listingEntities.length === 0) {
      window.alert("Listing does not exist or has been canceled");
      return router.push("/");
    }

    // grab first listing
    const listing = listingEntities[0];

    const address = await signer.getAddress();

    setIsActive(listing.buyer === null);
    setIsOwner(address.toLowerCase() === listing.seller.toLowerCase());
    setListing(listing);
  }

  async function fetchNFTDetails() {
    const ERC721Contract = new Contract(nftAddress, erc721ABI, signer);
    let tokenURI = await ERC721Contract.tokenURI(tokenId);
    tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");

    const metadata = await fetch(tokenURI);
    const metadataJSON = await metadata.json();

    let image = metadataJSON.imageUrl;
    image = image.replace("ipfs://", "https://ipfs.io/ipfs/");

    setName(metadataJSON.name);
    setImageURI(image);
  }

  async function updateListing() {
    setUpdating(true);
    const updateTxn = await MarketplaceContract.updateListing(
      nftAddress,
      tokenId,
      parseEther(newPrice)
    );
    await updateTxn.wait();
    await fetchListing();
    setUpdating(false);
  }

  async function cancelListing() {
    setCanceling(true);
    const cancelTxn = await MarketplaceContract.cancelListing(
      nftAddress,
      tokenId
    );
    await cancelTxn.wait();
    window.alert("Listing canceled");
    await router.push("/");
    setCanceling(false);
  }

  async function buyListing() {
    setBuying(true);
    const buyTxn = await MarketplaceContract.purchaseListing(
      nftAddress,
      tokenId,
      {
        value: listing.price,
      }
    );
    await buyTxn.wait();
    await fetchListing();
    setBuying(false);
  }

  useEffect(() => {
    if (router.query.nftContract && router.query.tokenId && signer) {
      Promise.all([fetchListing(), fetchNFTDetails()]).finally(() => {
        setLoading(false);
      });
    }
  }, [router, signer]);

  return (
    <>
      {loading ? (
        <span>Loading...</span>
      ) : (
        <div className="styles.container">
          <div className={styles.details}>
            <img src={imageURI} />
            <span>
              <b>
                {name} - #{tokenId}
              </b>
            </span>
            <span>Price: {formatEther(listing.price)} CELO</span>
            <span>
              <a
                href={`https://alfajores.celoscan.io/address/${listing.seller}`}
                target="_blank"
              >
                Seller:{" "}
                {isOwner ? "You" : listing.seller.substring(0, 6) + "..."}
              </a>
            </span>
            <span>Status: {listing.buyer === null ? "Active" : "Sold"}</span>
          </div>

          <div className={styles.options}>
            {!isActive && (
              <span>
                Listing has been sold to{" "}
                <a
                  href={`https://alfajores.celoscan.io/address/${listing.buyer}`}
                >
                  {listing.buyer}
                </a>
              </span>
            )}

            {isOwner && isActive && (
              <>
                <div className={styles.updateListing}>
                  <input
                    type="text"
                    placeholder="New Price (in CELO)"
                    value={newPrice}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setNewPrice("0");
                      } else setNewPrice(e.target.value);
                    }}
                  />
                  <button disabled={updating} onClick={updateListing}>
                    Update Listing
                  </button>
                </div>

                <button
                  className={styles.btn}
                  disabled={canceling}
                  onClick={cancelListing}
                >
                  Cancel Listing
                </button>
              </>
            )}

            {!isOwner && isActive && (
              <button
                className={styles.btn}
                disabled={buying}
                onClick={buyListing}
              >
                Buy Listing
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
