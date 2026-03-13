const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function parseTimeToSeconds(tStr) {
        let parts = tStr.trim().split(" ");
        let timePart = parts[0];
        let amPm = parts[1].toLowerCase();

        let timeArray = timePart.split(":");
        let hrs = parseInt(timeArray[0], 10);
        let mins = parseInt(timeArray[1], 10);
        let secs = parseInt(timeArray[2], 10);

        if (hrs === 12) hrs = 0;
        if (amPm === "pm") hrs += 12;

        return (hrs * 3600) + (mins * 60) + secs;
    }

    let start = parseTimeToSeconds(startTime);
    let end = parseTimeToSeconds(endTime);

    if (end < start) {
        end += (24 * 3600);
    }

    let diff = end - start;

    let totalH = Math.floor(diff / 3600);
    let totalM = Math.floor((diff % 3600) / 60);
    let totalS = diff % 60;

    let mString = totalM < 10 ? "0" + totalM : totalM;
    let sString = totalS < 10 ? "0" + totalS : totalS;

    return `${totalH}:${mString}:${sString}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function getSeconds(timeStr) {
        let splitted = timeStr.trim().split(" ");
        let clock = splitted[0].split(":");
        let modifier = splitted[1].toUpperCase();

        let h = parseInt(clock[0], 10);
        let m = parseInt(clock[1], 10);
        let s = parseInt(clock[2], 10);

        if (h === 12 && modifier === "AM") h = 0;
        else if (h !== 12 && modifier === "PM") h += 12;

        return h * 3600 + m * 60 + s;
    }

    let sSec = getSeconds(startTime);
    let eSec = getSeconds(endTime);

    if (eSec < sSec) {
        eSec += 24 * 3600;
    }

    let shiftLen = eSec - sSec;
    let actSecs = 0;

    let delivStart = 8 * 3600;
    let delivEnd = 22 * 3600;

    let startOverlap1 = Math.max(sSec, delivStart);
    let endOverlap1 = Math.min(eSec, delivEnd);
    if (startOverlap1 < endOverlap1) {
        actSecs += (endOverlap1 - startOverlap1);
    }

    let startOverlap2 = Math.max(sSec, delivStart + 24 * 3600);
    let endOverlap2 = Math.min(eSec, delivEnd + 24 * 3600);
    if (startOverlap2 < endOverlap2) {
        actSecs += (endOverlap2 - startOverlap2);
    }

    let idleLen = shiftLen - actSecs;

    let hh = Math.floor(idleLen / 3600);
    let mm = Math.floor((idleLen % 3600) / 60);
    let ss = idleLen % 60;

    let mmStr = mm.toString().padStart(2, '0');
    let ssStr = String(ss).padStart(2, '0');

    return `${hh}:${mmStr}:${ssStr}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function strToSec(str) {
        let arr = str.split(":");
        return (parseInt(arr[0], 10) * 3600) + (parseInt(arr[1], 10) * 60) + parseInt(arr[2], 10);
    }

    let totalShift = strToSec(shiftDuration);
    let totalIdle = strToSec(idleTime);
    let act = totalShift - totalIdle;

    if (act < 0) act = 0;

    let h = Math.floor(act / 3600);
    let m = Math.floor((act % 3600) / 60);
    let s = act % 60;

    let finalM = m < 10 ? '0' + m : m;
    let finalS = s < 10 ? '0' + s : s;

    return h + ":" + finalM + ":" + finalS;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let parts = activeTime.split(":");
    let activeSeconds = (parseInt(parts[0], 10) * 3600) + (parseInt(parts[1], 10) * 60) + parseInt(parts[2], 10);

    let dateParts = date.split("-");
    let y = parseInt(dateParts[0], 10);
    let m = parseInt(dateParts[1], 10);
    let d = parseInt(dateParts[2], 10);

    let quotaSecs = 8 * 3600 + 24 * 60;

    let isEid = false;
    if (y === 2025 && m === 4) {
        if (d >= 10 && d <= 30) {
            isEid = true;
        }
    }

    if (isEid) {
        quotaSecs = 6 * 3600;
    }

    if (activeSeconds >= quotaSecs) {
        return true;
    } else {
        return false;
    }
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let content = fs.readFileSync(textFile, "utf8").trim();
    let rows = content.split("\n");

    let lastIdx = -1;
    let foundDriver = false;

    for (let i = 1; i < rows.length; i++) {
        let columns = rows[i].split(",");
        if (columns.length >= 3) {
            let id = columns[0];
            let dateText = columns[2];

            if (id === shiftObj.driverID) {
                foundDriver = true;
                lastIdx = i;

                if (dateText === shiftObj.date) {
                    return {};
                }
            }
        }
    }

    let dur = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idl = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let act = getActiveTime(dur, idl);
    let quota = metQuota(shiftObj.date, act);

    let createdRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: dur,
        idleTime: idl,
        activeTime: act,
        metQuota: quota,
        hasBonus: false
    };

    let csvReady = `${createdRecord.driverID},${createdRecord.driverName},${createdRecord.date},${createdRecord.startTime},${createdRecord.endTime},${createdRecord.shiftDuration},${createdRecord.idleTime},${createdRecord.activeTime},${createdRecord.metQuota},${createdRecord.hasBonus}`;

    if (foundDriver) {
        rows.splice(lastIdx + 1, 0, csvReady);
    } else {
        rows.push(csvReady);
    }

    let finalText = rows.join("\n") + "\n";
    fs.writeFileSync(textFile, finalText, "utf8");

    return createdRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // to do later
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // to do later
    return 0;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // to do later
    return "00:00:00";
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // to do later
    return "00:00:00";
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // to do later
    return 0;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
