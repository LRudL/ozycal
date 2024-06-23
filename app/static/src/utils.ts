
export function initializeSelectedTime(now: Date, round_direction="forward") {
    if (now == undefined) now = new Date();
    var minutes : number;
    if (round_direction == "forward") {
        minutes = Math.ceil(now.getMinutes() / 15) * 15;
    } else {
        minutes = Math.floor(now.getMinutes() / 15) * 15;
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes);
}

export function timeConvert(time: Date | string) {
    // if time is a string, convert to a date
    // if time is a date, keep as is
    if (time instanceof Date) {
        return time;
    }
    return new Date(time);
}