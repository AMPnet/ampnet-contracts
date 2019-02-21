function getCurrentTime() {
    var block = web3.eth.getBlock("latest");
    return block.timestamp;
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return Math.floor(result.getTime()/1000);
}

function currentTimeWithSecondsOffset(seconds) {
    var result = new Date();
    result.setSeconds(result.getSeconds() + seconds);
    return Math.floor(result.getTime()/1000);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

Object.assign(exports, {
    getCurrentTime,
    addDays,
    currentTimeWithSecondsOffset,
    timeout
});
