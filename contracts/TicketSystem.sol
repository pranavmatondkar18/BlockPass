//SPDX-License-Identifier:MIT
pragma solidity ^0.8.21;

contract TicketSystem {
    struct Listing {
        uint256 id;
        string name;        // <--- NEW: Event Name
        uint256 price;
        uint256 supply;
        uint256 soldCount;
        uint256 liveTime;
        bool active;
        bool isCancelled;
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
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256[]) public userTickets;

    // Updated event with string name
    event ListingCreated(uint256 indexed listingId, string name, uint256 price, uint256 supply, uint256 liveTime);
    event ListingCancelled(uint256 indexed listingId);
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

    // NEW: First parameter is now string memory name
    function createListing(string memory name, uint256 price, uint256 supply, uint256 liveTime) public onlyAdmin {
        require(bytes(name).length > 0, "Event name cannot be empty");
        listingCount++;
        listings[listingCount] = Listing({
            id: listingCount,
            name: name,
            price: price,
            supply: supply,
            soldCount: 0,
            liveTime: liveTime,
            active: true,
            isCancelled: false
        });
        emit ListingCreated(listingCount, name, price, supply, liveTime);
    }

    function cancelListing(uint256 listingId) public onlyAdmin {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing already inactive or cancelled");
        
        listing.active = false;
        listing.isCancelled = true;
        emit ListingCancelled(listingId);
    }

    function buyTicket(uint256 listingId) public payable {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing is not active");
        require(!listing.isCancelled, "Listing is cancelled");
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

    function claimCancelledRefund(uint256 tokenId) public {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner == msg.sender, "You do not own this ticket");
        require(!ticket.claimed, "Ticket already claimed/used");

        Listing storage listing = listings[ticket.listingId];
        require(listing.isCancelled, "Listing is not cancelled");

        uint256 fullRefund = listing.price;

        ticket.owner = address(0);
        ticket.claimed = true;

        (bool sent, ) = payable(msg.sender).call{value: fullRefund}("");
        require(sent, "ETH refund transfer failed");

        emit TicketRefunded(tokenId, msg.sender, fullRefund);
    }

    function resellRefund(uint256 tokenId) public {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner == msg.sender, "You do not own this ticket");
        require(!ticket.claimed, "Ticket already claimed/used");
        require(!ticket.isResold, "Ticket already processed for resale");

        Listing storage listing = listings[ticket.listingId];
        require(!listing.isCancelled, "Event cancelled: use claimCancelledRefund instead");
        
        uint256 refundAmount = (listing.price * 90) / 100;
        
        ticket.isResold = true;
        ticket.owner = address(this);

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "ETH transfer failed");
        
        emit TicketRefunded(tokenId, msg.sender, refundAmount);
    }

    function buyResellTicket(uint256 tokenId) public payable {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.isResold, "Ticket is not available for resale");
        require(!ticket.claimed, "Ticket already claimed");

        Listing storage listing = listings[ticket.listingId];
        require(!listing.isCancelled, "Event cancelled");
        require(msg.value == listing.price, "Incorrect ETH/MATIC amount sent");

        ticket.owner = msg.sender;
        ticket.isResold = false;

        userTickets[msg.sender].push(tokenId);
        emit TicketPurchased(tokenId, ticket.listingId, msg.sender);
    }

    function claimTicket(uint256 tokenId) public {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner == msg.sender || msg.sender == admin, "Not authorized to verify");
        require(!ticket.claimed, "Ticket already used/claimed");

        ticket.claimed = true;
        emit TicketClaimed(tokenId);
    }
}