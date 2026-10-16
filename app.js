let web3, contract;
let connectedAccount = null;
let isAdminAccount = false;
let activeTokenIdForSigning = null;

// After `truffle migrate --reset`, paste the new TicketSystem address here.
const contractAddress = "0x447e719816739F944b09855B671c4248410341b4";

const PASS_WINDOW = 60; // seconds per signature window (current + previous window accepted)
const ZERO = "0x0000000000000000000000000000000000000000";

// Events are omitted: the UI reads state directly and never subscribes to them.
const u = "uint256";
const contractABI = [
  { type: "constructor", stateMutability: "nonpayable", inputs: [] },
  { type: "function", name: "admin", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "listingCount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: u }] },
  { type: "function", name: "tokenCount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: u }] },
  {
    type: "function", name: "listings", stateMutability: "view", inputs: [{ name: "", type: u }],
    outputs: [
      { name: "id", type: u }, { name: "name", type: "string" }, { name: "price", type: u },
      { name: "supply", type: u }, { name: "soldCount", type: u }, { name: "liveTime", type: u },
      { name: "active", type: "bool" }, { name: "isCancelled", type: "bool" },
      { name: "eventTime", type: u }, { name: "heldCount", type: u }
    ]
  },
  {
    type: "function", name: "tickets", stateMutability: "view", inputs: [{ name: "", type: u }],
    outputs: [
      { name: "tokenId", type: u }, { name: "listingId", type: u }, { name: "owner", type: "address" },
      { name: "isResold", type: "bool" }, { name: "claimed", type: "bool" }
    ]
  },
  { type: "function", name: "getUserTickets", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256[]" }] },
  {
    type: "function", name: "createListing", stateMutability: "nonpayable", outputs: [],
    inputs: [{ name: "name", type: "string" }, { name: "price", type: u }, { name: "supply", type: u }, { name: "liveTime", type: u }, { name: "eventTime", type: u }]
  },
  { type: "function", name: "cancelListing", stateMutability: "nonpayable", inputs: [{ name: "listingId", type: u }], outputs: [] },
  { type: "function", name: "buyTicket", stateMutability: "payable", inputs: [{ name: "listingId", type: u }], outputs: [] },
  { type: "function", name: "claimCancelledRefund", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: u }], outputs: [] },
  { type: "function", name: "resellRefund", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: u }], outputs: [] },
  { type: "function", name: "buyResellTicket", stateMutability: "payable", inputs: [{ name: "tokenId", type: u }], outputs: [] },
  { type: "function", name: "claimTicket", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: u }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [], outputs: [] }
];

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const nowSec = () => Math.floor(Date.now() / 1000);
const pick = (o, k, i) => (o[k] !== undefined ? o[k] : o[i]);
const errMsg = e => e.reason || (e.cause && e.cause.message) || e.message || String(e);
const ethOf = wei => web3.utils.fromWei(wei.toString(), "ether");
const when = sec => new Date(sec * 1000).toLocaleString();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const setStatus = t => { $("status").innerHTML = t; };
const idle = () => setStatus(connectedAccount ? `${connectedAccount.substring(0, 6)}...${connectedAccount.substring(38)}` : "UNAUTHENTICATED");
const showPanels = (buyer, seller) => {
  $("buyerPanel").style.display = buyer ? "block" : "none";
  $("sellerPanel").style.display = seller ? "block" : "none";
};

function readListing(x) {
  return {
    id: pick(x, "id", 0), name: pick(x, "name", 1), priceWei: pick(x, "price", 2),
    supply: Number(pick(x, "supply", 3)), sold: Number(pick(x, "soldCount", 4)),
    liveTime: Number(pick(x, "liveTime", 5)), active: Boolean(pick(x, "active", 6)),
    cancelled: Boolean(pick(x, "isCancelled", 7)), eventTime: Number(pick(x, "eventTime", 8))
  };
}

function readTicket(t) {
  return {
    listingId: pick(t, "listingId", 1), owner: String(pick(t, "owner", 2)).toLowerCase(),
    isResold: Boolean(pick(t, "isResold", 3)), claimed: Boolean(pick(t, "claimed", 4))
  };
}

// Runs one transaction with status text, error reporting and a refresh callback.
async function run(label, action, okMsg, refresh) {
  if (!web3 || !connectedAccount) return alert("Please connect your wallet first!");
  try {
    setStatus(label);
    await action();
    alert(okMsg);
    if (refresh) refresh();
  } catch (e) {
    console.error(label, e);
    alert(`${label} failed: ${errMsg(e)}`);
  } finally {
    idle();
  }
}

// ---------- 1. account + role sync ----------
async function initAccount() {
  if (typeof window.ethereum === "undefined") return;
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) {
      connectedAccount = null;
      isAdminAccount = false;
      idle();
      showPanels(false, false);
      return;
    }

    web3 = new Web3(window.ethereum);
    connectedAccount = accounts[0];
    idle();

    if (!web3.utils.isAddress(contractAddress)) {
      setStatus("Set contractAddress in app.js");
      return;
    }
    contract = new web3.eth.Contract(contractABI, contractAddress);

    const adminAddress = await contract.methods.admin().call();
    isAdminAccount = connectedAccount.toLowerCase() === adminAddress.toLowerCase();

    showPanels(!isAdminAccount, isAdminAccount);
    if (isAdminAccount) {
      updateTreasuryBalance();
    } else {
      loadUserInventory();
      loadResellListings();
    }
    loadListings();
  } catch (error) {
    console.error("Account sync error:", error);
    setStatus("Wrong network or contract address?");
  }
}

async function connectWallet() {
  if (typeof window.ethereum === "undefined") return alert("Please install MetaMask to use this dApp!");
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await initAccount();
  } catch (err) {
    alert("Connection failed: " + errMsg(err));
  }
}

// ---------- 2. treasury ----------
async function updateTreasuryBalance() {
  const el = $("contractBalanceText");
  if (!el || !web3) return;
  try {
    el.innerText = `${ethOf(await web3.eth.getBalance(contractAddress))} ETH`;
  } catch (err) {
    console.error("Error fetching contract balance:", err);
  }
}

function withdrawFunds() {
  run("Withdrawing surplus", () => contract.methods.withdraw().send({ from: connectedAccount }),
    "Surplus transferred to the admin wallet.", updateTreasuryBalance);
}

// ---------- 3. primary listings ----------
function buyListingDirect(listingId, priceWei) {
  run(`Buying ticket for listing #${listingId}`,
    () => contract.methods.buyTicket(listingId).send({ from: connectedAccount, value: priceWei }),
    `Ticket purchased for listing #${listingId}!`,
    () => { loadListings(); loadUserInventory(); });
}

async function loadListings() {
  if (!contract) return;
  const buyerBox = $("listingsContainer");
  const sellerBox = $("sellerListingsContainer");

  try {
    const total = Number(await contract.methods.listingCount().call());
    if (total === 0) {
      [buyerBox, sellerBox].forEach(c => { if (c) c.innerHTML = "<p>No listings created yet.</p>"; });
      return;
    }

    let buyerHtml = "", sellerHtml = "";
    const now = nowSec();

    for (let i = 1; i <= total; i++) {
      try {
        const l = readListing(await contract.methods.listings(i).call());
        const priceEth = ethOf(l.priceWei);
        const remaining = l.supply - l.sold;
        const isLive = now >= l.liveTime;
        const started = now >= l.eventTime;
        const canBuy = l.active && !l.cancelled && isLive && !started && remaining > 0;

        let badge = "<span style='color:gray;'>Closed</span>";
        if (l.cancelled) badge = "<span style='color:red;'>CANCELLED</span>";
        else if (started) badge = "<span style='color:gray;'>Event started</span>";
        else if (l.active) badge = isLive ? "<span style='color:green;'>Live</span>" : "<span style='color:orange;'>Upcoming</span>";

        const card = `
          <h4>${esc(l.name || "Event")} <span style="font-size: 12px; color: var(--text-muted);">(#${l.id})</span></h4>
          <p><strong>Price:</strong> ${priceEth} ETH</p>
          <p><strong>Available:</strong> ${remaining} / ${l.supply}</p>
          <p><strong>Sale starts:</strong> ${when(l.liveTime)}</p>
          <p><strong>Event starts:</strong> ${when(l.eventTime)}</p>
          <p><strong>Status:</strong> ${badge}</p>`;

        const why = l.cancelled ? "Event Cancelled" : started ? "Event Started" : !l.active ? "Sale Closed" : !isLive ? "Not Live Yet" : "Sold Out";

        buyerHtml += `
          <div class="card" style="border: 1px solid #3498db; margin-bottom: 12px; padding: 12px; border-radius: 6px;">
            ${card}
            ${canBuy
              ? `<button class="btn" onclick="buyListingDirect(${l.id}, '${l.priceWei.toString()}')">Buy Ticket for ${priceEth} ETH</button>
                 <p class="hint">Limit: 4 tickets per wallet</p>`
              : `<button class="btn" disabled style="background:#bdc3c7;">${why}</button>`}
          </div>`;

        sellerHtml += `
          <div class="card" style="border: 1px solid #ddd; margin-bottom: 12px; padding: 12px; border-radius: 6px;">
            ${card}
            ${!l.cancelled && l.active && !started
              ? `<button class="btn" style="background:#e74c3c; margin-top:8px;" onclick="cancelListing(${l.id})">Cancel Listing</button>` : ""}
          </div>`;
      } catch (err) {
        console.error(`Error loading listing #${i}:`, err);
      }
    }

    if (buyerBox) buyerBox.innerHTML = buyerHtml || "<p>No active listings.</p>";
    if (sellerBox) sellerBox.innerHTML = sellerHtml || "<p>No active listings.</p>";
  } catch (error) {
    console.error("Load listings error:", error);
  }
}

// ---------- 4. admin: create + cancel ----------
function createListing() {
  const name = $("ticketName").value.trim();
  const price = $("ticketPrice").value.trim();
  const supply = Number($("ticketSupply").value);
  const delaySec = Number($("ticketLiveTime").value || 0);
  const eventVal = $("ticketEventTime").value;

  if (!name) return alert("Please specify an event name.");
  if (!(Number(price) > 0) || !Number.isInteger(supply) || supply <= 0) return alert("Enter a positive price and a whole-number supply.");
  if (!eventVal) return alert("Please choose the event start date and time.");

  const liveTime = nowSec() + delaySec;
  const eventTime = Math.floor(new Date(eventVal).getTime() / 1000);
  if (eventTime <= liveTime) return alert("The event must start after the sale starts.");

  run("Creating listing",
    () => contract.methods.createListing(name, web3.utils.toWei(price, "ether"), supply, liveTime, eventTime).send({ from: connectedAccount }),
    `Listing "${name}" created!`, loadListings);
}

function cancelListing(listingId) {
  if (!confirm(`Cancel listing #${listingId}? Ticket holders will be able to claim a 100% refund.`)) return;
  run(`Cancelling listing #${listingId}`,
    () => contract.methods.cancelListing(listingId).send({ from: connectedAccount }),
    `Listing #${listingId} cancelled.`, () => { loadListings(); loadResellListings(); });
}

// ---------- 5. buyer inventory ----------
function claimFullRefund(tokenId) {
  if (!confirm(`Claim 100% refund for ticket #${tokenId}?`)) return;
  run(`Claiming refund for ticket #${tokenId}`,
    () => contract.methods.claimCancelledRefund(tokenId).send({ from: connectedAccount }),
    `100% refund received for ticket #${tokenId}!`, () => { loadUserInventory(); updateTreasuryBalance(); });
}

async function loadUserInventory() {
  const box = $("inventoryContainer");
  if (!box || !contract || !connectedAccount) return;
  box.innerHTML = "Fetching your tickets...";

  try {
    const totalTokens = Number(await contract.methods.tokenCount().call());
    const me = connectedAccount.toLowerCase();
    const now = nowSec();
    let html = "", count = 0;

    for (let tid = 1; tid <= totalTokens; tid++) {
      try {
        const t = readTicket(await contract.methods.tickets(tid).call());
        if (t.owner !== me || t.isResold) continue;
        count++;

        const l = readListing(await contract.methods.listings(t.listingId).call());
        const started = now >= l.eventTime;

        let status = "<span style='color:green;'>Valid</span>";
        if (t.claimed) status = "<span style='color:gray;'>Used</span>";
        else if (l.cancelled) status = "<span style='color:red;'>Event Cancelled</span>";

        let buttons = "";
        if (!t.claimed && l.cancelled) {
          buttons = `<button class="btn" style="background:#e74c3c;" onclick="claimFullRefund(${tid})">Claim 100% Full Refund</button>`;
        } else if (!t.claimed) {
          if (!started) buttons += `<button class="btn" style="background:#e67e22; margin-bottom: 6px;" onclick="initiateResale(${tid})">Refund & Resell (-10%)</button>`;
          buttons += `<button class="btn" style="background:#27ae60;" onclick="openEntryPass(${tid})">Show Entry Pass (Signature)</button>`;
        }

        html += `
          <div class="card" style="border: 1px solid ${l.cancelled ? '#e74c3c' : '#27ae60'}; margin-bottom: 10px; padding: 12px; border-radius: 6px;">
            <h4>🎟️ ${esc(l.name || "Ticket Pass")} #${tid}</h4>
            <p><strong>Listing:</strong> #${t.listingId}</p>
            <p><strong>Event starts:</strong> ${when(l.eventTime)}</p>
            <p><strong>Status:</strong> ${status}</p>
            ${buttons}
          </div>`;
      } catch (err) {
        console.error(`Error reading token #${tid}:`, err);
      }
    }
    box.innerHTML = count > 0 ? html : "<p>You do not own any tickets yet.</p>";
  } catch (error) {
    console.error("Inventory error:", error);
    box.innerHTML = `<p style='color:red;'>Failed to load inventory: ${esc(errMsg(error))}</p>`;
  }
}

// ---------- 6. resale ----------
function initiateResale(tokenId) {
  if (!confirm(`Refund ticket #${tokenId}? You will receive 90% of the price back.`)) return;
  run("Processing resale refund",
    () => contract.methods.resellRefund(tokenId).send({ from: connectedAccount }),
    `Ticket #${tokenId} refunded and moved to the resale pool.`,
    () => { loadUserInventory(); loadResellListings(); updateTreasuryBalance(); });
}

async function loadResellListings() {
  const box = $("resellContainer");
  if (!box || !contract) return;

  try {
    const total = Number(await contract.methods.tokenCount().call());
    const now = nowSec();
    let html = "", count = 0;

    for (let tid = 1; tid <= total; tid++) {
      try {
        const t = readTicket(await contract.methods.tickets(tid).call());
        if (!t.isResold || t.claimed) continue;

        const l = readListing(await contract.methods.listings(t.listingId).call());
        if (l.cancelled || now >= l.eventTime) continue;

        count++;
        html += `
          <div class="card" style="border: 1px solid #f39c12; margin-bottom: 10px; padding: 12px; border-radius: 6px;">
            <h4>Resale: ${esc(l.name || "Ticket")} #${tid}</h4>
            <p><strong>Original listing:</strong> #${t.listingId}</p>
            <p><strong>Price:</strong> ${ethOf(l.priceWei)} ETH (face value)</p>
            <button class="btn" style="background:#f39c12;" onclick="buyResellTicketDirect(${tid}, '${l.priceWei.toString()}')">Buy Resale Ticket #${tid}</button>
          </div>`;
      } catch (err) {
        console.error(`Error loading resale ticket #${tid}:`, err);
      }
    }
    box.innerHTML = count > 0 ? html : "<p>No resold tickets currently available.</p>";
  } catch (error) {
    console.error("Resale market error:", error);
  }
}

function buyResellTicketDirect(tokenId, priceWei) {
  run(`Buying resale ticket #${tokenId}`,
    () => contract.methods.buyResellTicket(tokenId).send({ from: connectedAccount, value: priceWei }),
    `Ticket #${tokenId} acquired from the resale pool!`,
    () => { loadResellListings(); loadUserInventory(); updateTreasuryBalance(); });
}

// ---------- 7. wallet-signature entry pass ----------
// The signed message is bound to this contract, this chain, this ticket and a short time window.
async function passMessage(tokenId, windowIdx) {
  const chainId = (await web3.eth.getChainId()).toString();
  return `BlockPass entry pass | contract ${contractAddress.toLowerCase()} | chain ${chainId} | ticket #${tokenId} | window ${windowIdx}`;
}
const currentWindow = () => Math.floor(nowSec() / PASS_WINDOW);

function openEntryPass(tokenId) {
  activeTokenIdForSigning = tokenId;
  $("modalTokenText").innerText = `Ticket #${tokenId}`;
  $("signatureOutput").innerText = "";
  $("otpModal").style.display = "flex";
}

function closeOtpModal() {
  $("otpModal").style.display = "none";
  activeTokenIdForSigning = null;
}

async function signEntryPass() {
  if (!web3 || !connectedAccount || activeTokenIdForSigning == null) return alert("Wallet not connected or ticket not selected.");
  try {
    setStatus("Requesting signature in MetaMask...");
    const message = await passMessage(activeTokenIdForSigning, currentWindow());
    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [web3.utils.utf8ToHex(message), connectedAccount]
    });
    $("signatureOutput").innerText = signature;
    alert("Pass signed! Show or send this signature to gate staff within 2 minutes.");
  } catch (error) {
    console.error("Signing failed:", error);
    alert("Signing cancelled or failed.");
  } finally {
    idle();
  }
}

async function copySignature() {
  const sig = $("signatureOutput").innerText;
  if (!sig) return alert("Sign the pass first.");
  try {
    await navigator.clipboard.writeText(sig);
    alert("Signature copied.");
  } catch (e) {
    alert("Copy failed. Select the text manually.");
  }
}

// ---------- 8. wallet listeners ----------
if (window.ethereum) {
  window.ethereum.on("accountsChanged", async accounts => {
    if (!accounts || accounts.length === 0) {
      connectedAccount = null;
      isAdminAccount = false;
      setStatus("DISCONNECTED");
      showPanels(false, false);
    } else {
      await initAccount();
    }
  });
  window.ethereum.on("chainChanged", () => window.location.reload());
}

window.addEventListener("load", async () => {
  if (typeof window.ethereum !== "undefined") {
    web3 = new Web3(window.ethereum);
    await initAccount();
  }

  const verifyBtn = $("verifyTicketBtn");
  if (!verifyBtn) return;

  verifyBtn.addEventListener("click", async () => {
    const tokenId = $("scanTokenId").value;
    const signature = $("scanSignature").value.trim();
    const box = $("scanStatus");
    const text = $("statusText");

    const show = (ok, msg) => {
      box.classList.remove("hidden", "status-success", "status-error");
      box.classList.add(ok ? "status-success" : "status-error");
      text.innerText = msg;
    };

    if (!tokenId || !signature) return show(false, "ERROR: Fill in all fields!");
    if (!connectedAccount || !contract) return show(false, "ERROR: Connect MetaMask first!");
    if (!isAdminAccount) return show(false, "ERROR: Only the admin (gate) wallet can scan tickets.");

    try {
      show(true, "VERIFYING SIGNATURE...");
      const t = readTicket(await contract.methods.tickets(tokenId).call());

      if (t.owner === ZERO) return show(false, "ACCESS DENIED: Ticket does not exist or was refunded.");
      if (t.claimed) return show(false, "ACCESS DENIED: Ticket already used.");
      if (t.isResold) return show(false, "ACCESS DENIED: Ticket was refunded and is in the resale pool.");

      let valid = false;
      for (const w of [currentWindow(), currentWindow() - 1]) {
        try {
          const signer = web3.eth.accounts.recover(await passMessage(tokenId, w), signature);
          if (signer.toLowerCase() === t.owner) { valid = true; break; }
        } catch (e) { /* malformed signature: treated as invalid */ }
      }
      if (!valid) return show(false, "ACCESS DENIED: Invalid, expired or wrong-ticket signature.");

      show(true, "SIGNATURE VALID. CLAIMING ON-CHAIN...");
      await contract.methods.claimTicket(tokenId).send({ from: connectedAccount });
      show(true, `ACCESS GRANTED // Ticket #${tokenId} verified and marked used`);
    } catch (error) {
      console.error(error);
      show(false, `ACCESS DENIED: ${errMsg(error)}`);
    }
  });
});
