// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract TicketSystem {
    struct Listing {
        uint256 id;
        string name;
        uint256 price;
        uint256 supply;
        uint256 soldCount;
        uint256 liveTime;     // sale start
        bool active;
        bool isCancelled;
        uint256 eventTime;    // event start: sales, resale and refunds close here
        uint256 heldCount;    // tickets currently held by users (refundable liability)
    }

    struct Ticket {
        uint256 tokenId;
        uint256 listingId;
        address owner;
        bool isResold;
        bool claimed;
    }

    uint256 public constant MAX_PER_WALLET = 4;
    uint256 public constant RESALE_REFUND_PCT = 90;

    address public admin;
    uint256 public listingCount;
    uint256 public tokenCount;

    // ETH reserved for 100% refunds on cancelled events
    uint256 public lockedRefundEscrow;

    bool private _locked;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256[]) public userTickets;
    mapping(uint256 => mapping(address => uint256)) private purchased; // listingId => wallet => tickets held

    event ListingCreated(uint256 indexed listingId, string name, uint256 price, uint256 supply, uint256 liveTime);
    event ListingCancelled(uint256 indexed listingId);
    event TicketPurchased(uint256 indexed tokenId, uint256 indexed listingId, address buyer);
    event TicketRefunded(uint256 indexed tokenId, address seller, uint256 refundAmount);
    event TicketClaimed(uint256 indexed tokenId);
    event FundsWithdrawn(address indexed admin, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "Reentrancy detected");
        _locked = true;
        _;
        _locked = false;
    }

    constructor() {
        admin = msg.sender;
    }

    function _resaleRefund(uint256 price) private pure returns (uint256) {
        return (price * RESALE_REFUND_PCT) / 100;
    }

    function createListing(
        string memory name,
        uint256 price,
        uint256 supply,
        uint256 liveTime,
        uint256 eventTime
    ) public onlyAdmin {
        require(bytes(name).length > 0, "Event name cannot be empty");
        require(price > 0 && supply > 0, "Price and supply must be positive");
        require(eventTime > liveTime && eventTime > block.timestamp, "Event must start after sale start");

        listingCount++;
        listings[listingCount] = Listing({
            id: listingCount,
            name: name,
            price: price,
            supply: supply,
            soldCount: 0,
            liveTime: liveTime,
            active: true,
            isCancelled: false,
            eventTime: eventTime,
            heldCount: 0
        });
        emit ListingCreated(listingCount, name, price, supply, liveTime);
    }

    function cancelListing(uint256 listingId) public onlyAdmin {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing already inactive or cancelled");
        require(block.timestamp < listing.eventTime, "Event already started");

        listing.active = false;
        listing.isCancelled = true;

        // Reserve 100% only for tickets users still hold (not used, not already refunded)
        lockedRefundEscrow += listing.price * listing.heldCount;

        emit ListingCancelled(listingId);
    }

    function buyTicket(uint256 listingId) public payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing is not active");
        require(!listing.isCancelled, "Listing is cancelled");
        require(block.timestamp >= listing.liveTime, "Listing is not live yet");
        require(block.timestamp < listing.eventTime, "Event already started");
        require(listing.soldCount < listing.supply, "Sold out!");
        require(purchased[listingId][msg.sender] < MAX_PER_WALLET, "Per-wallet ticket limit reached");
        require(msg.value == listing.price, "Incorrect ETH amount sent");

        listing.soldCount++;
        listing.heldCount++;
        purchased[listingId][msg.sender]++;
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

    function claimCancelledRefund(uint256 tokenId) public nonReentrant {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner == msg.sender, "You do not own this ticket");
        require(!ticket.claimed, "Ticket already claimed/used");

        Listing storage listing = listings[ticket.listingId];
        require(listing.isCancelled, "Listing is not cancelled");

        uint256 fullRefund = listing.price;

        ticket.owner = address(0);
        ticket.claimed = true;
        listing.heldCount--;
        lockedRefundEscrow -= fullRefund;

        (bool sent, ) = payable(msg.sender).call{value: fullRefund}("");
        require(sent, "ETH refund transfer failed");

        emit TicketRefunded(tokenId, msg.sender, fullRefund);
    }

    function resellRefund(uint256 tokenId) public nonReentrant {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner == msg.sender, "You do not own this ticket");
        require(!ticket.claimed, "Ticket already claimed/used");
        require(!ticket.isResold, "Ticket already processed for resale");

        Listing storage listing = listings[ticket.listingId];
        require(!listing.isCancelled, "Event cancelled: use claimCancelledRefund instead");
        require(block.timestamp < listing.eventTime, "Refunds closed: event started");

        uint256 refundAmount = _resaleRefund(listing.price);

        ticket.isResold = true;
        ticket.owner = address(this);
        listing.heldCount--;
        purchased[ticket.listingId][msg.sender]--;

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "ETH transfer failed");

        emit TicketRefunded(tokenId, msg.sender, refundAmount);
    }

    function buyResellTicket(uint256 tokenId) public payable nonReentrant {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.isResold, "Ticket is not available for resale");
        require(!ticket.claimed, "Ticket already claimed");

        Listing storage listing = listings[ticket.listingId];
        require(!listing.isCancelled, "Event cancelled");
        require(block.timestamp < listing.eventTime, "Event already started");
        require(purchased[ticket.listingId][msg.sender] < MAX_PER_WALLET, "Per-wallet ticket limit reached");
        require(msg.value == listing.price, "Incorrect ETH amount sent");

        ticket.owner = msg.sender;
        ticket.isResold = false;
        listing.heldCount++;
        purchased[ticket.listingId][msg.sender]++;

        userTickets[msg.sender].push(tokenId);
        emit TicketPurchased(tokenId, ticket.listingId, msg.sender);
    }

    // Marks a ticket as used at the gate. The signature check happens in the gate app;
    // this call is restricted to the ticket owner or the admin (gate) wallet.
    function claimTicket(uint256 tokenId) public {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner != address(0), "Ticket does not exist");
        require(!ticket.isResold, "Ticket is in the resale pool");
        require(ticket.owner == msg.sender || msg.sender == admin, "Not authorized to verify");
        require(!ticket.claimed, "Ticket already used/claimed");

        Listing storage listing = listings[ticket.listingId];
        require(!listing.isCancelled, "Event cancelled");

        ticket.claimed = true;
        listing.heldCount--; // used tickets are no longer refundable
        emit TicketClaimed(tokenId);
    }

    // Withdraws only surplus: balance minus cancelled-event escrow minus the 90% refund
    // liability of tickets that can still be refunded (event not started). The loop runs
    // over listings (admin-created), not over tickets, so gas does not grow with sales.
    function withdraw() public onlyAdmin nonReentrant {
        uint256 activeLiability = 0;
        for (uint256 i = 1; i <= listingCount; i++) {
            Listing storage l = listings[i];
            if (!l.isCancelled && block.timestamp < l.eventTime) {
                activeLiability += _resaleRefund(l.price) * l.heldCount;
            }
        }

        uint256 totalLocked = lockedRefundEscrow + activeLiability;
        uint256 contractBalance = address(this).balance;
        require(contractBalance > totalLocked, "No surplus funds to withdraw");

        uint256 withdrawableAmount = contractBalance - totalLocked;

        (bool sent, ) = payable(admin).call{value: withdrawableAmount}("");
        require(sent, "ETH transfer failed");

        emit FundsWithdrawn(admin, withdrawableAmount);
    }

    function getUserTickets(address user) public view returns (uint256[] memory) {
        return userTickets[user];
    }
}
