let web3;
let contract;
let connectedAccount = null;

// Replace with your new address after running truffle migrate --reset
const contractAddress = "0x4F99eCB525f4FeDd09d985F6660e2660957baF4c";

// Exact ABI matching updated TicketSystem.sol with event name
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
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
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
      { "indexed": true, "internalType": "uint256", "name": "listingId", "type": "uint256" }
    ],
    "name": "ListingCancelled",
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
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "uint256", "name": "price", "type": "uint256" },
      { "internalType": "uint256", "name": "supply", "type": "uint256" },
      { "internalType": "uint256", "name": "soldCount", "type": "uint256" },
      { "internalType": "uint256", "name": "liveTime", "type": "uint256" },
      { "internalType": "bool", "name": "active", "type": "bool" },
      { "internalType": "bool", "name": "isCancelled", "type": "bool" }
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
      { "internalType": "string", "name": "name", "type": "string" },
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
    "name": "cancelListing",
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
    "name": "claimCancelledRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
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

// 1. Connect MetaMask
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

// 2. Buy Primary Listing
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

// 3. Load & Render Primary Listings
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
      try {
        const item = await contract.methods.listings(i).call();
        const id = item.id !== undefined ? item.id : item[0];
        const name = item.name !== undefined ? item.name : item[1];
        const priceWei = item.price !== undefined ? item.price : item[2];
        const supply = item.supply !== undefined ? item.supply : item[3];
        const soldCount = item.soldCount !== undefined ? item.soldCount : item[4];
        const liveTime = item.liveTime !== undefined ? item.liveTime : item[5];
        const active = item.active !== undefined ? item.active : item[6];
        const isCancelled = item.isCancelled !== undefined ? Boolean(item.isCancelled) : Boolean(item[7]);

        const priceEth = web3.utils.fromWei(priceWei.toString(), "ether");
        const remaining = Number(supply) - Number(soldCount);
        const liveDate = new Date(Number(liveTime) * 1000).toLocaleString();
        const isLive = now >= Number(liveTime);
        const canBuy = active && !isCancelled && isLive && remaining > 0;

        let statusBadge = "<span style='color:gray;'>Closed</span>";
        if (isCancelled) {
          statusBadge = "<span style='color:red;'>CANCELLED</span>";
        } else if (active) {
          statusBadge = isLive ? "<span style='color:green;'>Live</span>" : "<span style='color:orange;'>Upcoming</span>";
        }

        const baseCard = `
          <h4>${name || "Event"} <span style="font-size: 12px; color: var(--text-muted);">(#${id})</span></h4>
          <p><strong>Price:</strong> ${priceEth} ETH</p>
          <p><strong>Available:</strong> ${remaining} / ${supply}</p>
          <p><strong>Start Date:</strong> ${liveDate}</p>
          <p><strong>Status:</strong> ${statusBadge}</p>
        `;

        buyerHtml += `
          <div class="card" style="border: 1px solid #3498db; margin-bottom: 12px; padding: 12px; border-radius: 6px;">
            ${baseCard}
            ${canBuy ? `
              <button class="btn" onclick="buyListingDirect(${id}, '${priceWei.toString()}')">
                Buy Ticket for ${priceEth} ETH
              </button>
            ` : `
              <button class="btn" disabled style="background:#bdc3c7;">
                ${isCancelled ? "Event Cancelled" : (!active ? "Sale Closed" : (!isLive ? "Not Live Yet" : "Sold Out"))}
              </button>
            `}
          </div>
        `;

        sellerHtml += `
          <div class="card" style="border: 1px solid #ddd; margin-bottom: 12px; padding: 12px; border-radius: 6px;">
            ${baseCard}
            ${!isCancelled && active ? `
              <button class="btn" style="background:#e74c3c; margin-top:8px;" onclick="cancelListing(${id})">
                Cancel Listing
              </button>
            ` : ""}
          </div>
        `;
      } catch (err) {
        console.error(`Error loading listing #${i}:`, err);
      }
    }

    const buyerContainer = document.getElementById("listingsContainer");
    const sellerContainer = document.getElementById("sellerListingsContainer");

    if (buyerContainer) buyerContainer.innerHTML = buyerHtml || "<p>No active listings.</p>";
    if (sellerContainer) sellerContainer.innerHTML = sellerHtml || "<p>No active listings.</p>";

  } catch (error) {
    console.error("Load listings error:", error);
  }
}

// 4. Create Listing (Admin)
async function createListing() {
  if (!web3 || !connectedAccount) return alert("Please connect your wallet first!");

  const name = document.getElementById("ticketName") ? document.getElementById("ticketName").value.trim() : "Event Ticket";
  const price = document.getElementById("ticketPrice").value;
  const supply = document.getElementById("ticketSupply").value;
  const delaySec = document.getElementById("ticketLiveTime").value || 0;

  if (!name) return alert("Please specify an event name.");
  if (!price || !supply) return alert("Please fill in price and supply.");

  const liveTimestamp = Math.floor(Date.now() / 1000) + Number(delaySec);

  try {
    const priceWei = web3.utils.toWei(price, "ether");
    document.getElementById("status").innerHTML = "Creating listing in MetaMask...";

    await contract.methods.createListing(name, priceWei, supply, liveTimestamp).send({
      from: connectedAccount,
      gas: 350000
    });

    document.getElementById("status").innerHTML = "Listing created on-chain!";
    alert(`Listing "${name}" created successfully!`);
    loadListings();
  } catch (error) {
    console.error("Create listing error:", error);
    document.getElementById("status").innerHTML = "Listing creation failed.";
    alert("Listing failed: " + (error.reason || error.message || error));
  }
}

// 5. Cancel Listing (Admin)
async function cancelListing(listingId) {
  if (!confirm(`Cancel Listing #${listingId}? Ticket holders will be able to claim a 100% refund.`)) return;

  try {
    document.getElementById("status").innerHTML = `Cancelling Listing #${listingId}...`;

    await contract.methods.cancelListing(listingId).send({
      from: connectedAccount,
      gas: 200000
    });

    alert(`Listing #${listingId} cancelled!`);
    document.getElementById("status").innerHTML = "Ready";
    loadListings();
  } catch (error) {
    console.error("Cancel listing error:", error);
    alert("Cancel failed: " + (error.reason || error.message || error));
  }
}

// 6. Claim 100% Full Refund
async function claimFullRefund(tokenId) {
  if (!confirm(`Claim 100% full refund for Ticket #${tokenId}?`)) return;

  try {
    document.getElementById("status").innerHTML = `Claiming refund for Ticket #${tokenId}...`;

    await contract.methods.claimCancelledRefund(tokenId).send({
      from: connectedAccount,
      gas: 250000
    });

    alert(`100% refund received for Ticket #${tokenId}!`);
    document.getElementById("status").innerHTML = "Ready";
    loadUserInventory();
  } catch (error) {
    console.error("Full refund error:", error);
    alert("Refund claim failed: " + (error.reason || error.message || error));
  }
}

// 7. Load Buyer Inventory
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

      if (owner === connectedAccount.toLowerCase() && !isResold) {
        count++;

        const listing = await contract.methods.listings(listingId).call();
        const eventName = listing.name !== undefined ? listing.name : listing[1];
        const isEventCancelled = listing.isCancelled !== undefined ? Boolean(listing.isCancelled) : Boolean(listing[7]);

        let statusText = "<span style='color:green;'>Valid</span>";
        if (claimed) {
          statusText = "<span style='color:gray;'>Claimed / Refunded</span>";
        } else if (isEventCancelled) {
          statusText = "<span style='color:red;'>Event Cancelled</span>";
        }

        html += `
          <div class="card" style="border: 1px solid ${isEventCancelled ? '#e74c3c' : '#27ae60'}; margin-bottom: 10px; padding: 12px; border-radius: 6px;">
            <h4>🎟️ ${eventName || "Ticket Pass"} #${tid}</h4>
            <p><strong>Associated Listing:</strong> #${listingId}</p>
            <p><strong>Status:</strong> ${statusText}</p>
            ${!claimed && isEventCancelled ? `
              <button class="btn" style="background:#e74c3c;" onclick="claimFullRefund(${tid})">
                Claim 100% Full Refund
              </button>
            ` : (!claimed ? `
              <button class="btn" style="background:#e67e22; margin-bottom: 6px;" onclick="initiateResale(${tid})">Refund & Resell (-10%)</button>
              <button class="btn" style="background:#27ae60;" onclick="openEntryPass(${tid})">Show Entry Pass (OTP)</button>
            ` : "")}
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

// 8. Resale Refund (10% Cut)
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

// 9. Load Resale Market
async function loadResellListings() {
  const container = document.getElementById("resellContainer");
  if (!container || !contract) return;

  try {
    const total = Number(await contract.methods.tokenCount().call());
    let html = "";
    let count = 0;

    for (let tid = 1; tid <= total; tid++) {
      try {
        const t = await contract.methods.tickets(tid).call();
        const listingId = t.listingId !== undefined ? t.listingId : t[1];
        const isResold = t.isResold !== undefined ? t.isResold : t[3];
        const claimed = t.claimed !== undefined ? t.claimed : t[4];

        if (isResold && !claimed) {
          const originalListing = await contract.methods.listings(listingId).call();
          const eventName = originalListing.name !== undefined ? originalListing.name : originalListing[1];
          const isCancelled = originalListing.isCancelled !== undefined ? Boolean(originalListing.isCancelled) : Boolean(originalListing[7]);

          if (isCancelled) continue;

          count++;
          const priceWei = originalListing.price !== undefined ? originalListing.price : originalListing[2];
          const priceEth = web3.utils.fromWei(priceWei.toString(), "ether");

          html += `
            <div class="card" style="border: 1px solid #f39c12; margin-bottom: 10px; padding: 12px; border-radius: 6px;">
              <h4>Resale: ${eventName || "Ticket"} #${tid}</h4>
              <p><strong>Original Listing:</strong> #${listingId}</p>
              <p><strong>Price:</strong> ${priceEth} ETH</p>
              <button class="btn" style="background:#f39c12;" onclick="buyResellTicketDirect(${tid}, '${priceWei.toString()}')">
                Buy Resale Ticket #${tid}
              </button>
            </div>
          `;
        }
      } catch (err) {
        console.error(`Error loading resale ticket #${tid}:`, err);
      }
    }

    container.innerHTML = count > 0 ? html : "<p>No resold tickets currently available.</p>";
  } catch (error) {
    console.error("Resale market error:", error);
  }
}

// 10. Buy Resale Ticket
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

// 11. OTP Session
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
  const windowPeriod = 30;
  const timeSlice = Math.floor(now / windowPeriod);
  const timeLeft = windowPeriod - (now % windowPeriod);

  const rawVal = Math.abs(Math.sin(Number(tokenId) * 1000 + timeSlice) * 1000000);
  const otp = Math.floor(rawVal).toString().padStart(6, '0');

  document.getElementById("otpDisplay").innerText = otp;
  document.getElementById("otpTimer").innerText = timeLeft;
}

function closeOtpModal() {
  document.getElementById("otpModal").style.display = "none";
  if (otpInterval) clearInterval(otpInterval);
}

function verifyOtpLocally(tokenId, otpToCheck) {
  const now = Math.floor(Date.now() / 1000);
  const windowPeriod = 30;
  for (let i = -1; i <= 1; i++) {
    const timeSlice = Math.floor(now / windowPeriod) + i;
    const rawVal = Math.abs(Math.sin(Number(tokenId) * 1000 + timeSlice) * 1000000);
    const validOtp = Math.floor(rawVal).toString().padStart(6, '0');
    if (validOtp === otpToCheck) return true;
  }
  return false;
}

// 12. Account & Page Handlers
if (window.ethereum) {
  window.ethereum.on('accountsChanged', () => window.location.reload());
}

window.addEventListener('load', async () => {
  if (typeof window.ethereum !== "undefined") {
    web3 = new Web3(window.ethereum);
  }

  const verifyBtn = document.getElementById('verifyTicketBtn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      const tokenId = document.getElementById('scanTokenId').value;
      const enteredOtp = document.getElementById('scanOtp').value;
      const statusBox = document.getElementById('scanStatus');
      const statusText = document.getElementById('statusText');

      statusBox.classList.remove('hidden', 'status-success', 'status-error');

      if (!tokenId || !enteredOtp) {
        statusBox.classList.add('status-error');
        statusText.innerText = "ERROR: Fill in all fields!";
        return;
      }

      if (!connectedAccount) {
        statusBox.classList.add('status-error');
        statusText.innerText = "ERROR: Connect MetaMask first!";
        return;
      }

      if (!verifyOtpLocally(tokenId, enteredOtp)) {
        statusBox.classList.add('status-error');
        statusText.innerText = `ACCESS DENIED: Invalid or Expired OTP!`;
        return;
      }

      try {
        statusText.innerText = "VERIFYING ON-CHAIN...";
        await contract.methods.claimTicket(tokenId).send({ from: connectedAccount });

        statusBox.classList.add('status-success');
        statusText.innerText = `ACCESS GRANTED // Ticket #${tokenId} Verified`;
      } catch (error) {
        statusBox.classList.add('status-error');
        statusText.innerText = `ACCESS DENIED: Already used or invalid.`;
        console.error(error);
      }
    });
  }
});