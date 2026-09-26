let web3;
let contract;
let connectedAccount = null;

// Your deployed contract address from Ganache:
const contractAddress = "0x2d40B61f8f66c205d63bda9bF9905Edd1bB52629";

// Exact ABI matching your current TicketSystem.sol
const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "listingId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "supply", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "liveTime", "type": "uint256" }
    ],
    "name": "ListingCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "TicketClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "listingId", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "buyer", "type": "address" }
    ],
    "name": "TicketPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "refundAmount", "type": "uint256" }
    ],
    "name": "TicketRefunded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "listingCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "listings",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "uint256", "name": "price", "type": "uint256" },
      { "internalType": "uint256", "name": "supply", "type": "uint256" },
      { "internalType": "uint256", "name": "soldCount", "type": "uint256" },
      { "internalType": "uint256", "name": "liveTime", "type": "uint256" },
      { "internalType": "bool", "name": "active", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "tickets",
    "outputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "listingId", "type": "uint256" },
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "bool", "name": "isResold", "type": "bool" },
      { "internalType": "bool", "name": "claimed", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "tokenCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "userTickets",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "price", "type": "uint256" },
      { "internalType": "uint256", "name": "supply", "type": "uint256" },
      { "internalType": "uint256", "name": "liveTime", "type": "uint256" }
    ],
    "name": "createListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "listingId", "type": "uint256" }],
    "name": "buyTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function",
    "payable": true
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "resellRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "buyResellTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function",
    "payable": true
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "claimTicket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// 1. Connect MetaMask Wallet & Setup Roles
async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        alert("Please install MetaMask to use this dApp!");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(contractABI, contractAddress);
        
        connectedAccount = accounts[0];
        document.getElementById("status").innerHTML = `${connectedAccount.substring(0, 6)}...${connectedAccount.substring(38)}`;
        console.log("Wallet connected:", connectedAccount);

        const adminAddress = await contract.methods.admin().call();
        const isAdmin = connectedAccount.toLowerCase() === adminAddress.toLowerCase();

        if (isAdmin) {
            console.log("Logged in as Admin");
            document.getElementById("sellerPanel").style.display = "block";
            document.getElementById("buyerPanel").style.display = "none";
        } else {
            console.log("Logged in as Buyer");
            document.getElementById("sellerPanel").style.display = "none";
            document.getElementById("buyerPanel").style.display = "block";
            loadUserInventory();
            loadResellListings();
        }

        loadListings();
    } catch (error) {
        console.error("Connection failed:", error);
        alert("Connection failed: " + (error.message || error));
    }
}

// Direct purchase for primary listings
async function buyListingDirect(listingId, priceWei) {
    if (!web3 || !connectedAccount) return alert("Please connect your wallet first!");

    try {
        document.getElementById("status").innerHTML = `Purchasing Ticket for Listing #${listingId}...`;

        await contract.methods.buyTicket(listingId).send({
            from: connectedAccount,
            value: priceWei,
            gas: 350000
        });

        document.getElementById("status").innerHTML = "Ticket secured on-chain!";
        alert(`Successfully purchased ticket for Listing #${listingId}!`);

        loadListings();
        loadUserInventory();
    } catch (error) {
        console.error("Buy error:", error);
        document.getElementById("status").innerHTML = "Transaction failed.";
        alert("Purchase failed: " + (error.reason || error.message || error));
    }
}

// 3. Display Primary Listings with Direct Buy Button
async function loadListings() {
    const containers = [
        document.getElementById("listingsContainer"),
        document.getElementById("sellerListingsContainer")
    ];

    try {
        const total = Number(await contract.methods.listingCount().call());
        if (total === 0) {
            containers.forEach(c => { if (c) c.innerHTML = "<p>No listings created yet.</p>"; });
            return;
        }

        let buyerHtml = "";
        let sellerHtml = "";

        const now = Math.floor(Date.now() / 1000);

        for (let i = 1; i <= total; i++) {
            const item = await contract.methods.listings(i).call();
            const id = item.id !== undefined ? item.id : item[0];
            const priceWei = item.price !== undefined ? item.price : item[1];
            const supply = item.supply !== undefined ? item.supply : item[2];
            const soldCount = item.soldCount !== undefined ? item.soldCount : item[3];
            const liveTime = item.liveTime !== undefined ? item.liveTime : item[4];
            const active = item.active !== undefined ? item.active : item[5];

            const priceEth = web3.utils.fromWei(priceWei.toString(), "ether");
            const remaining = Number(supply) - Number(soldCount);
            const liveDate = new Date(Number(liveTime) * 1000).toLocaleString();
            const isLive = now >= Number(liveTime);
            const canBuy = active && isLive && remaining > 0;

            const baseCard = `
                <h4>Listing #${id}</h4>
                <p><strong>Price:</strong> ${priceEth} ETH</p>
                <p><strong>Available:</strong> ${remaining} / ${supply}</p>
                <p><strong>Start Date:</strong> ${liveDate}</p>
                <p><strong>Status:</strong> ${active ? (isLive ? "<span style='color:green;'>Live</span>" : "<span style='color:orange;'>Upcoming</span>") : "<span style='color:gray;'>Closed</span>"}</p>
            `;

            // Buyer card includes the direct buy button
            buyerHtml += `
                <div class="card" style="border: 1px solid #3498db; margin-bottom: 12px; padding: 12px; border-radius: 6px;">
                    ${baseCard}
                    ${canBuy ? `
                        <button class="btn" onclick="buyListingDirect(${id}, '${priceWei.toString()}')">
                            Buy Ticket for ${priceEth} ETH
                        </button>
                    ` : `
                        <button class="btn" disabled style="background:#bdc3c7;">
                            ${!active ? "Sale Closed" : (!isLive ? "Not Live Yet" : "Sold Out")}
                        </button>
                    `}
                </div>
            `;

            // Seller card (info only)
            sellerHtml += `
                <div class="card" style="border: 1px solid #ddd; margin-bottom: 12px; padding: 12px; border-radius: 6px;">
                    ${baseCard}
                </div>
            `;
        }

        const buyerContainer = document.getElementById("listingsContainer");
        const sellerContainer = document.getElementById("sellerListingsContainer");

        if (buyerContainer) buyerContainer.innerHTML = buyerHtml;
        if (sellerContainer) sellerContainer.innerHTML = sellerHtml;

    } catch (error) {
        console.error("Load listings error:", error);
    }
}

// 4. Create Listing (Admin)
async function createListing() {
    if (!web3 || !connectedAccount) return alert("Please connect your wallet first!");

    const price = document.getElementById("ticketPrice").value;
    const supply = document.getElementById("ticketSupply").value;
    const liveTimeInput = document.getElementById("ticketLiveTime").value;

    if (!price || !supply) return alert("Please fill in price and supply.");

    // Enter 0 for immediate release, or enter seconds from now
    let liveTimestamp = 0;
    const seconds = Number(liveTimeInput);
    if (seconds > 0) {
        liveTimestamp = Math.floor(Date.now() / 1000) + seconds;
    }

    try {
        const priceWei = web3.utils.toWei(price, "ether");
        document.getElementById("status").innerHTML = "Creating listing in MetaMask...";

        await contract.methods.createListing(priceWei, supply, liveTimestamp).send({
            from: connectedAccount,
            gas: 300000
        });

        document.getElementById("status").innerHTML = "Listing created on-chain!";
        alert("Listing created successfully!");
        loadListings();
    } catch (error) {
        console.error("Create listing error:", error);
        document.getElementById("status").innerHTML = "Listing creation failed.";
        alert("Listing failed: " + (error.reason || error.message || error));
    }
}

// 5. Load Buyer Inventory (Scanning tokens directly: Prevents decoding & index errors)
async function loadUserInventory() {
    const container = document.getElementById("inventoryContainer");
    if (!container || !contract || !connectedAccount) return;

    container.innerHTML = "Fetching your tickets...";

    try {
        const totalTokens = Number(await contract.methods.tokenCount().call());
        if (totalTokens === 0) {
            container.innerHTML = "<p>You do not own any tickets yet.</p>";
            return;
        }

        let html = "";
        let count = 0;

        for (let tid = 1; tid <= totalTokens; tid++) {
            const t = await contract.methods.tickets(tid).call();
            const listingId = t.listingId !== undefined ? t.listingId : t[1];
            const owner = (t.owner !== undefined ? t.owner : t[2]).toLowerCase();
            const isResold = t.isResold !== undefined ? t.isResold : t[3];
            const claimed = t.claimed !== undefined ? t.claimed : t[4];

            // Render only if currently owned by user and not in resale escrow
            if (owner === connectedAccount.toLowerCase() && !isResold) {
                count++;
                html += `
                    <div class="card" style="border: 1px solid #27ae60; margin-bottom: 10px; padding: 12px; border-radius: 6px;">
                        <h4>🎟️ Ticket Pass #${tid}</h4>
                        <p><strong>Associated Listing:</strong> #${listingId}</p>
                        <p><strong>Status:</strong> ${claimed ? "<span style='color:gray;'>Claimed / Used</span>" : "<span style='color:green;'>Valid</span>"}</p>
                        ${!claimed ? `
                            <button class="btn" style="background:#e67e22; margin-bottom: 6px;" onclick="initiateResale(${tid})">Refund & Resell (-10%)</button>
                            <button class="btn" style="background:#27ae60;" onclick="openEntryPass(${tid})">Show Entry Pass (OTP)</button>
                        ` : ""}
                    </div>
                `;
            }
        }

        container.innerHTML = count > 0 ? html : "<p>You do not own any tickets yet.</p>";
    } catch (error) {
        console.error("Inventory error:", error);
        container.innerHTML = `<p style='color:red;'>Failed to load inventory: ${error.message || error}</p>`;
    }
}

// 6. Resale Refund
async function initiateResale(tokenId) {
    if (!confirm(`Refund Ticket #${tokenId}? You will receive 90% of the price back.`)) return;

    try {
        document.getElementById("status").innerHTML = "Processing resale refund...";
        await contract.methods.resellRefund(tokenId).send({
            from: connectedAccount,
            gas: 300000
        });

        alert(`Ticket #${tokenId} refunded and moved to secondary market!`);
        document.getElementById("status").innerHTML = "Ready";
        loadUserInventory();
        loadResellListings();
    } catch (error) {
        console.error("Resale refund failed:", error);
        alert("Refund failed: " + (error.reason || error.message || error));
    }
}

// 7. Load Resale Market
async function loadResellListings() {
    const container = document.getElementById("resellContainer");
    if (!container || !contract) return;

    try {
        const total = Number(await contract.methods.tokenCount().call());
        let html = "";
        let count = 0;

        for (let tid = 1; tid <= total; tid++) {
            const t = await contract.methods.tickets(tid).call();
            const listingId = t.listingId !== undefined ? t.listingId : t[1];
            const isResold = t.isResold !== undefined ? t.isResold : t[3];
            const claimed = t.claimed !== undefined ? t.claimed : t[4];

            if (isResold && !claimed) {
                count++;
                const originalListing = await contract.methods.listings(listingId).call();
                const priceWei = originalListing.price !== undefined ? originalListing.price : originalListing[1];
                const priceEth = web3.utils.fromWei(priceWei.toString(), "ether");

                html += `
                    <div class="card" style="border: 1px solid #f39c12; margin-bottom: 10px; padding: 12px; border-radius: 6px;">
                        <h4>Resale Pass #${tid}</h4>
                        <p><strong>Original Listing:</strong> #${listingId}</p>
                        <p><strong>Price:</strong> ${priceEth} ETH</p>
                        <button class="btn" style="background:#f39c12;" onclick="buyResellTicketDirect(${tid}, '${priceWei.toString()}')">
                            Buy Resale Ticket #${tid}
                        </button>
                    </div>
                `;
            }
        }

        container.innerHTML = count > 0 ? html : "<p>No resold tickets currently available.</p>";
    } catch (error) {
        console.error("Resale market error:", error);
    }
}

// 8. Buy Resale Ticket
async function buyResellTicketDirect(tokenId, priceWei) {
    if (!web3 || !connectedAccount) return alert("Please connect your wallet first!");

    try {
        document.getElementById("status").innerHTML = `Purchasing Resale Ticket #${tokenId}...`;

        await contract.methods.buyResellTicket(tokenId).send({
            from: connectedAccount,
            value: priceWei,
            gas: 350000
        });

        alert(`Successfully acquired Ticket #${tokenId} from resale!`);
        document.getElementById("status").innerHTML = "Ready";
        loadResellListings();
        loadUserInventory();
    } catch (error) {
        console.error("Resale purchase error:", error);
        alert("Purchase failed: " + (error.reason || error.message || error));
    }
}

// 9. Time-Based Dynamic Pass (OTP)
let otpInterval = null;

function openEntryPass(tokenId) {
    document.getElementById("modalTokenText").innerText = `Ticket #${tokenId}`;
    document.getElementById("otpModal").style.display = "flex";
    refreshOtp(tokenId);

    if (otpInterval) clearInterval(otpInterval);
    otpInterval = setInterval(() => refreshOtp(tokenId), 1000);
}

function refreshOtp(tokenId) {
    const now = Math.floor(Date.now() / 1000);
    const windowPeriod = 30; // 30-second rotating window
    const timeSlice = Math.floor(now / windowPeriod);
    const timeLeft = windowPeriod - (now % windowPeriod);

    // Deterministic 6-digit pseudo-OTP based on token ID and current 30s epoch
    const rawVal = Math.abs(Math.sin(Number(tokenId) * 1000 + timeSlice) * 1000000);
    const otp = Math.floor(rawVal).toString().padStart(6, '0');

    document.getElementById("otpDisplay").innerText = otp;
    document.getElementById("otpTimer").innerText = timeLeft;
}

function closeOtpModal() {
    document.getElementById("otpModal").style.display = "none";
    if (otpInterval) clearInterval(otpInterval);
}

// 10. Account Switch & Load Handlers
if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => window.location.reload());
}

window.addEventListener('load', async () => {
    if (typeof window.ethereum !== "undefined") {
        web3 = new Web3(window.ethereum);
    }
});