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
    let txt = fs.readFileSync(textFile, "utf8").trim();
    if (txt === "") return;

    let lineArray = txt.split("\n");
    let needsUpdate = false;

    for (let j = 1; j < lineArray.length; j++) {
        let piece = lineArray[j].split(",");
        if (piece.length >= 10) {
            if (piece[0] === driverID && piece[2] === date) {
                piece[9] = String(newValue);
                lineArray[j] = piece.join(",");
                needsUpdate = true;
                break;
            }
        }
    }

    if (needsUpdate == true) {
        fs.writeFileSync(textFile, lineArray.join("\n") + "\n", "utf8");
    }
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let fDate = fs.readFileSync(textFile, "utf8").trim();
    if (!fDate) return -1;

    let rows = fDate.split("\n");
    let driverExistsInFile = false;
    let count = 0;

    let givenM = parseInt(month, 10);

    for (let k = 1; k < rows.length; k++) {
        let elements = rows[k].split(",");
        if (elements.length >= 10) {
            let rowID = elements[0];

            if (rowID === driverID) {
                driverExistsInFile = true;
                let exactDate = elements[2];
                let dateParts = exactDate.split("-");
                let mPart = parseInt(dateParts[1], 10);

                if (mPart === givenM) {
                    let b = elements[9].trim().toLowerCase();
                    if (b === "true") {
                        count += 1;
                    }
                }
            }
        }
    }

    if (!driverExistsInFile) {
        return -1;
    }
    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let d = fs.readFileSync(textFile, "utf8").trim();
    if (d === "") return "000:00:00";

    let rowData = d.split("\n");
    let searchingMonth = parseInt(month, 10);
    let totalSec = 0;

    for (let x = 1; x < rowData.length; x++) {
        let info = rowData[x].split(",");
        if (info.length >= 10) {
            let numId = info[0];
            let checkD = info[2];
            let checkM = parseInt(checkD.split("-")[1], 10);

            if (numId === driverID && checkM === searchingMonth) {
                let aTime = info[7];
                let parts = aTime.split(":");
                totalSec += (parseInt(parts[0], 10) * 3600) + (parseInt(parts[1], 10) * 60) + parseInt(parts[2], 10);
            }
        }
    }

    let hrs = Math.floor(totalSec / 3600);
    let mns = Math.floor((totalSec % 3600) / 60);
    let scs = totalSec % 60;

    let hrsString = hrs.toString();
    if (hrsString.length < 2) hrsString = "0" + hrsString;

    let mnsString = mns < 10 ? "0" + mns : String(mns);
    let scsString = scs < 10 ? "0" + scs : String(scs);

    return hrsString + ":" + mnsString + ":" + scsString;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    let reqSecs = 0;
    let theMonth = parseInt(month, 10);

    let ratesContent = fs.readFileSync(rateFile, "utf8").trim();
    let ratesLineArr = ratesContent.split("\n");
    let dOff = "";

    for (let i = 0; i < ratesLineArr.length; i++) {
        let items = ratesLineArr[i].split(",");
        if (items[0] === driverID) {
            dOff = items[1].trim().toLowerCase();
            break;
        }
    }

    let dMap = {
        "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3,
        "thursday": 4, "friday": 5, "saturday": 6
    };
    let freeDayNum = dMap[dOff];

    let shiftsTxt = fs.readFileSync(textFile, "utf8").trim();
    let sLines = shiftsTxt.split("\n");

    let seen = [];

    for (let ind = 1; ind < sLines.length; ind++) {
        let cols = sLines[ind].split(",");
        if (cols.length >= 10) {
            let rowDid = cols[0];
            let rowDat = cols[2];

            let partsDat = rowDat.split("-");
            let y = parseInt(partsDat[0], 10);
            let m = parseInt(partsDat[1], 10);
            let d = parseInt(partsDat[2], 10);

            if (rowDid === driverID && m === theMonth) {
                if (!seen.includes(rowDat)) {
                    seen.push(rowDat);

                    let currD = new Date(y, m - 1, d);

                    if (currD.getDay() !== freeDayNum) {
                        let isEidStatus = false;
                        if (y === 2025 && m === 4 && d >= 10 && d <= 30) {
                            isEidStatus = true;
                        }

                        if (isEidStatus) {
                            reqSecs += 6 * 3600;
                        } else {
                            reqSecs += (8 * 3600) + 24 * 60;
                        }
                    }
                }
            }
        }
    }

    let removeBonusTime = bonusCount * 2 * 3600;
    reqSecs = reqSecs - removeBonusTime;
    if (reqSecs < 0) {
        reqSecs = 0;
    }

    let finalH = Math.floor(reqSecs / 3600);
    let finalM = Math.floor((reqSecs % 3600) / 60);
    let finalS = reqSecs % 60;

    let stringH = String(finalH);
    if (stringH.length < 2) stringH = "0" + stringH;

    let stringM = finalM < 10 ? "0" + finalM : finalM;
    let stringS = finalS < 10 ? "0" + finalS : finalS;

    return `${stringH}:${stringM}:${stringS}`;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let rc = fs.readFileSync(rateFile, "utf8").trim();
    let rl = rc.split("\n");
    let base = 0;
    let tr = 0;

    for (let a = 0; a < rl.length; a++) {
        let cc = rl[a].split(",");
        if (cc[0] === driverID) {
            base = parseInt(cc[2], 10);
            tr = parseInt(cc[3], 10);
            break;
        }
    }

    let allowMiss = 0;
    switch (tr) {
        case 1: allowMiss = 50; break;
        case 2: allowMiss = 20; break;
        case 3: allowMiss = 10; break;
        case 4: allowMiss = 3; break;
    }

    let actParts = actualHours.split(":");
    let reqParts = requiredHours.split(":");

    let aS = (parseInt(actParts[0], 10) * 3600) + (parseInt(actParts[1], 10) * 60) + parseInt(actParts[2], 10);
    let rS = (parseInt(reqParts[0], 10) * 3600) + (parseInt(reqParts[1], 10) * 60) + parseInt(reqParts[2], 10);

    if (aS >= rS) {
        return base;
    }

    let mS = rS - aS;
    let allowedS = allowMiss * 3600;
    let billableS = mS - allowedS;

    if (billableS <= 0) {
        return base;
    }

    let billMissH = Math.floor(billableS / 3600);
    let dr = Math.floor(base / 185);
    let dduct = billMissH * dr;

    return base - dduct;
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
