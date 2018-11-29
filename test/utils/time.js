function getCurrentTime() {
    var block = web3.eth.getBlock("latest");
    return block.timestamp;
}

Object.assign(exports, {
    getCurrentTime
});