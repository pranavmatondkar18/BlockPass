let web3;
let contract;

// Your deployed contract address from Ganache migration output:
const contractAddress = "0xf057498Db091645fA20A6C9bddAe34B66A5D7DEb";

// Contract ABI
const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "supply",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "liveTime",
        "type": "uint256"
      }
    ],
    "name": "ListingCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "TicketClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      }
    ],
    "name": "TicketPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "refundAmount",
        "type": "uint256"
      }
    ],
    "name": "TicketRefunded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "listingCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "listings",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "soldCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "liveTime",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tickets",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isResold",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "claimed",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "tokenCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userTickets",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "liveTime",
        "type": "uint256"
      }
    ],
    "name": "createListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "buyTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function",
    "payable": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "resellRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "buyResellTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function",
    "payable": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "claimTicket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// 1. Connect MetaMask Wallet & Handle Role-Based UI Display
async function connectWallet() {
    if (typeof window.ethereum !== "undefined") {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            web3 = new Web3(window.ethereum);
            contract = new web3.eth.Contract(contractABI, contractAddress);
            
            const connectedAccount = accounts[0];
            document.getElementById("status").innerHTML = "Connected: " + connectedAccount.substring(0, 6) + "...";
            console.log("Wallet connected:", connectedAccount);

            // Fetch admin address from contract to check permissions
            const adminAddress = await contract.methods.admin().call();

            // Debug prints to check what addresses are being compared
            console.log("Connected Account (Lowercase):", connectedAccount.toLowerCase());
            console.log("Contract Admin (Lowercase):", adminAddress.toLowerCase());

            // Toggle panels depending on whether the connected wallet is the admin/seller or a buyer
            if (connectedAccount.toLowerCase() === adminAddress.toLowerCase()) {
                console.log("MATCH! Logged in as Admin/Seller");
                document.getElementById("sellerPanel").style.display = "block";
                document.getElementById("buyerPanel").style.display = "none";
            } else {
                console.log("NO MATCH. Logged in as Buyer");
                document.getElementById("sellerPanel").style.display = "none";
                document.getElementById("buyerPanel").style.display = "block";
            }

        } catch (error) {
            console.error("Error connecting wallet or checking role:", error);
            alert("Connection failed. Check console for details.");
        }
    } else {
        alert("Please install MetaMask to use this dApp!");
    }
}

// 2. Buy Ticket Function with Explicit Gas Limit
async function buyTicket() {
    console.log("Button clicked! buyTicket function started.");
    if (!web3) {
        alert("Please connect your wallet first!");
        return;
    }

    const listingId = document.getElementById("listingId").value;
    if (!listingId) {
        alert("Please enter a valid Listing ID.");
        return;
    }

    try {
        const accounts = await web3.eth.getAccounts();
        contract = new web3.eth.Contract(contractABI, contractAddress);

        // Define the ticket price in Wei (0.01 ETH)
        const ticketPrice = web3.utils.toWei("0.01", "ether");

        document.getElementById("status").innerHTML = "Processing transaction in MetaMask...";

        // Call the smart contract's buyTicket function with explicit gas
        const receipt = await contract.methods.buyTicket(listingId).send({
            from: accounts[0],
            value: ticketPrice,
            gas: 300000 // Explicit gas limit prevents MetaMask estimation bugs on local dev networks
        });

        document.getElementById("status").innerHTML = "Success! Ticket successfully secured on-chain.";
        console.log("Transaction successful:", receipt);
        alert("Ticket purchased successfully!");
    } catch (error) {
        console.error("Detailed Transaction Error:", error);
        document.getElementById("status").innerHTML = "Transaction failed.";
        alert("Transaction failed! Check browser console (F12) for details.");
    }
}

// 3. Seller Function to Create a New Listing On-Chain
async function createListing() {
    console.log("Button clicked! createListing function started.");
    if (!web3) {
        alert("Please connect your wallet first!");
        return;
    }

    const priceInput = document.getElementById("ticketPrice").value;
    const supplyInput = document.getElementById("ticketSupply").value;
    const liveTimeInput = document.getElementById("ticketLiveTime").value;

    if (!priceInput || !supplyInput || !liveTimeInput) {
        alert("Please fill in all listing fields (Price, Supply, Live Time).");
        return;
    }

    try {
        const accounts = await web3.eth.getAccounts();
        contract = new web3.eth.Contract(contractABI, contractAddress);

        // Convert price to Wei
        const priceInWei = web3.utils.toWei(priceInput, "ether");

        document.getElementById("status").innerHTML = "Processing listing creation in MetaMask...";

        // Call your Solidity contract's createListing(price, supply, liveTime) method
        const receipt = await contract.methods.createListing(priceInWei, supplyInput, liveTimeInput).send({
            from: accounts[0],
            gas: 300000
        });

        document.getElementById("status").innerHTML = "Success! Listing created on-chain.";
        console.log("Listing created successfully:", receipt);
        alert("Ticket listing created successfully!");
    } catch (error) {
        console.error("Detailed Listing Creation Error:", error);
        document.getElementById("status").innerHTML = "Listing creation failed.";
        alert("Listing failed! Check browser console (F12) for details.");
    }
}

// Window load listener
window.addEventListener('load', async () => {
    if (typeof window.ethereum !== "undefined") {
        web3 = new Web3(window.ethereum);
    }
});