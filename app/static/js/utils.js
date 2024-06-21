
export function initializeSelectedTime(now) {
    if (now == undefined) now = new Date();
    var minutes = Math.ceil(now.getMinutes() / 15) * 15;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes);
}
