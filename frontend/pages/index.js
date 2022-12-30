import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Listing from "../components/Listing";
import { createClient } from "urql";
import styles from "../styles/Home.module.css";
import Link from "next/link";
import { SUBGRAPH_URL } from "../constants";
import { useAccount } from "wagmi";

export default function Home() {
  // state variables to contain active listings and signify a loading state
  const [listings, setListings] = useState();
  const [loading, setLoading] = useState(false);

  const { isConnected } = useAccount();

  // function to fetch listings from the subgraph
  async function fetchListings() {
    setLoading(true);
    // graphQL query to run
    const listingsQuery = `
    query ListingsQuery{
      listingEntities {
        id
        nftAddress
        tokenId
        price
        seller
        buyer
      }
    }
    `;

    // create a urql client
    const urqlClient = createClient({
      url: SUBGRAPH_URL,
    });

    // send the query to the subgraph GraphQL API, and get the response
    const response = await urqlClient.query(listingsQuery).toPromise();
    const listingEntities = response.data.listingEntities;

    // filter out active listings i.e. ones which haven't been sold yet
    const activeListings = listingEntities.filter((l) => l.buyer === null);

    setListings(activeListings);
    setLoading(false);
  }

  useEffect(() => {
    if (isConnected) {
      fetchListings();
    }
  }, []);

  return (
    <>
      <Navbar />

      {loading && isConnected && <span>Loading...</span>}

      <div className={styles.container}>
        {!loading &&
          listings &&
          listings.map((listing) => {
            return (
              <Link
                key={listing.id}
                href={`/${listing.nftAddress}/${listing.tokenId}`}
              >
                <Listing
                  nftAddress={listing.nftAddress}
                  tokenId={listing.tokenId}
                  price={listing.price}
                  seller={listing.seller}
                />
              </Link>
            );
          })}
      </div>

      {!loading && listings && listings.length === 0 && (
        <span>No listings found</span>
      )}
    </>
  );
}
