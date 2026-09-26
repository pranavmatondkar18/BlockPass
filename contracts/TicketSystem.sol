//SPDX-License-Identifier:MIT
pragma solidity ^0.8.21;


contract TicketSystem {
    struct Listing {
        uint256 id;
        uint256 price;
        uint256 supply;
        uint256 soldCount;
        uint256 liveTime;
        bool active;
    }

    struct Ticket {
        uint256 tokenId;
        uint256 listingId;
        address owner;
        bool isResold;
        bool claimed;
    }

    address public admin;
    uint256 public listingCount;
    uint256 public tokenCount;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Ticket) public tickets; // tokenId -> Ticket details
    mapping(address => uint256[]) public userTickets; // wallet address -> array of tokenIds owned

    event ListingCreated(uint256 indexed listingId, uint256 price, uint256 supply, uint256 liveTime);
    event TicketPurchased(uint256 indexed tokenId, uint256 indexed listingId, address buyer);
    event TicketRefunded(uint256 indexed tokenId, address seller, uint256 refundAmount);
    event TicketClaimed(uint256 indexed tokenId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // 1. Official seller/admin mints initial tickets with price, supply, and launch timestamp
    function createListing(uint256 price, uint256 supply, uint256 liveTime) public onlyAdmin {
        listingCount++;
        listings[listingCount] = Listing({
            id: listingCount,
            price: price,
            supply: supply,
            soldCount: 0,
            liveTime: liveTime,
            active: true
        });
        emit ListingCreated(listingCount, price, supply, liveTime);
    }

    // 2. Buyer sends ETH/MATIC, receives token locked to their address
    function buyTicket(uint256 listingId) public payable {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing is not active");
        require(block.timestamp >= listing.liveTime, "Listing is not live yet");
        require(listing.soldCount < listing.supply, "Sold out!");
        require(msg.value == listing.price, "Incorrect ETH/MATIC amount sent");

        listing.soldCount++;
        tokenCount++;

        tickets[tokenCount] = Ticket({
            tokenId: tokenCount,
            listingId: listingId,
            owner: msg.sender,
            isResold: false,
            claimed: false
        });

        userTickets[msg.sender].push(tokenCount);
        emit TicketPurchased(tokenCount, listingId, msg.sender);
    }

    // 3. Contract verifies token wasn't already resold, sends back 90% price (10% fee cuts out scalper flip)
    function resellRefund(uint256 tokenId) public {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner == msg.sender, "You do not own this ticket");
        require(!ticket.claimed, "Ticket already claimed/used");
        require(!ticket.isResold, "Ticket already processed for resale");

        Listing storage listing = listings[ticket.listingId];
        
        // Calculate 90% refund
        uint256 refundAmount = (listing.price * 90) / 100;
        
        ticket.isResold = true;
        ticket.owner = address(this); // Held back by contract for secondary marketplace

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "ETH transfer failed");
        
        emit TicketRefunded(tokenId, msg.sender, refundAmount);
    }

    // 4. Secondary buyer purchases the returned ticket; sets isResold = false and assigns new owner
    function buyResellTicket(uint256 tokenId) public payable {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.isResold, "Ticket is not available for resale");
        require(!ticket.claimed, "Ticket already claimed");

        Listing storage listing = listings[ticket.listingId];
        require(msg.value == listing.price, "Incorrect ETH/MATIC amount sent");

        ticket.owner = msg.sender;
        ticket.isResold = false; // Reset status

        userTickets[msg.sender].push(tokenId);
        emit TicketPurchased(tokenId, ticket.listingId, msg.sender);
    }

    // 5. Marks ticket as used (prevents duplicate entry at venue gate)
    function claimTicket(uint256 tokenId) public {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner == msg.sender, "You are not the owner of this ticket");
        require(!ticket.claimed, "Ticket already used/claimed");

        ticket.claimed = true;
        emit TicketClaimed(tokenId);
    }
}