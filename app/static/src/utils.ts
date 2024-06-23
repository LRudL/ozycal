
export function initializeSelectedTime(now, round_direction="forward") {
    if (now == undefined) now = new Date();
    var minutes;
    if (round_direction == "forward") {
        var minutes = Math.ceil(now.getMinutes() / 15) * 15;
    } else {
        var minutes = Math.floor(now.getMinutes() / 15) * 15;
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes);
}

export function timeConvert(time) {
    // if time is a string, convert to a date
    // if time is a date, keep as is
    if (time instanceof Date) {
        return time;
    }
    return new Date(time);
}