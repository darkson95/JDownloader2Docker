var command = "filebot"; // Change this if filebot isn't on your path
var logfile = "/config/jdownloader-eventscripter.log"; // File this script logs to. Use forward slashes as path separators!
var filebotLogfile = "/config/filebot.log"; // File that filebot will log to. Use forward slashes as path separators!
var downloadBase = "/mnt/Downloads"; // Base folder under which your download packages reside. Use escaped backslashes as path separators!
var archiveExtensions = /(\.(zip|rar|7z|par\d+|part\d+|r\d+|t\d+|\d{3}))$/; // Regex to test for nested archives in extracted files
var irrelevantFiles = /(\\subs\\|\\proof\\|\-subs|\-proof)/i; // Regex for matching files which are irrelevant to renaming (subs, proof, etc)

// Parameters for the scripts to run
var params = {
    "rename": {
        "options": {
            "-script": "fn:amc",
            "--log-file": filebotLogfile,
            "--action": "move",
            "--conflict": "auto",
            "--lang": "de",
            "--output": "/mnt/Downloads"
        },
        "defs": {
            "unsorted": "n",
            "skipExtract": "y",
            "clean": "y",
            "minFileSize": "104857600",
            "seriesFormat": "/mnt/Serien/{n}/{s00e00} - {t}",
            "movieFormat": "/mnt/Filme/{n}"
        },
        "switches": [
            "-non-strict"
        ]
    },
    "cleaner": {
        "options": {
            "-script": "fn:cleaner",
            "--log-file": filebotLogfile
        },
        "defs": {
            "root": "y"
        },
        "switches": []
    }
}

var logBuf = "";

function log(message) {
    logBuf += new Date().toISOString().slice(0, 19) + " - " + message + "\r\n";
}

function logArray(message, arr) {
    log("\t" + message);

    if (arr == null || arr.length == 0) {
        log("\t\tnone");
        return;
    }

    for (var i = 0; i < arr.length; i++) {
        log("\t\t" + arr[i]);
    }
}

function logSpacer() {
    log("++++++++++++++++++++++++++++++");
}

function flushLog() {
    writeFile(logfile, logBuf, true);
    logBuf = "";
}

function quoteIfNecessary(value) {
    return value.replace(" ", "\\ ");
    // return (value != null && value.indexOf("\"") < 0) ? '"' + value + '"' : value;
}

function quoteArrayElements(input) {
    var result = [];

    for (var i = 0; i < input.length; i++) {
        result[result.length] = quoteIfNecessary(input[i]);
    }

    return result;
}

function reduce(map, joinChar) {
    var keyValuePairs = [];

    for (var key in map) {
        keyValuePairs[keyValuePairs.length] = key + joinChar + map[key];
    }

    return keyValuePairs;
}

function mapToArray(map) {
    var array = [];

    for (var key in map) {
        array[array.length] = key;
        array[array.length] = map[key];
    }

    return array;
}

function createArgumentArray(parameters, inputs) {
    var options = mapToArray(parameters["options"]);
    var switches = parameters["switches"];
    var defs = reduce(parameters["defs"], "=");

    return [command].concat(options).concat(switches).concat(inputs).concat(["--def"]).concat(defs);
}

function isArchiveFile(filename) {
    return archiveExtensions.test(filename);
}

function isRelevant(filename) {
    return !irrelevantFiles.test(filename);
}

function containsNestedArchive(extractedFiles) {
    for (var i = 0; i < extractedFiles.length; i++) {
        if (isArchiveFile(extractedFiles[i]) && isRelevant(extractedFiles[i])) {
            return true;
        }
    }

    return false;
}

function getPackageRoot(folder) {
    return folder.substring(0, folder.indexOf("/", downloadBase.length + 1));
}

function commissionRelevantFiles(files) {
    if (files == null) return [];

    var relevantFiles = [];

    for (var i = 0; i < files.length; i++) {
        if (isRelevant(files[i])) {
            relevantFiles[relevantFiles.length] = files[i];
        }
    }

    return relevantFiles;
}

var links = archive.getDownloadLinks() ? archive.getDownloadLinks() : []
var package = links.length > 0 ? links[0].getPackage() : null
var archiveFolder = archive.getFolder();
var archiveName = archive.getName();
var archiveType = archive.getArchiveType();
var extractedFiles = archive.getExtractedFiles();
var archiveUID = archiveFolder + "/" + archiveName;
var packageRoot = getPackageRoot(archiveFolder + "/");
var relevantFiles = commissionRelevantFiles(extractedFiles);

logSpacer();
log("FINISHED EXTRACTION - " + archiveUID);
log("\tType: " + archiveType);
log("\tPackage root: " + packageRoot);
// logArray("Extracted files:", extractedFiles);
logArray("Relevant files:", relevantFiles);

if (relevantFiles == null || relevantFiles.length == 0) {
    log("SKIPPING - No relevant files encountered.");
} else if (containsNestedArchive(extractedFiles)) {
    log("SKIPPING - Nested archive detected.");
} else if (!isRelevant(archiveUID)) {
    log("SKIPPING - Archive is irrelevant.");
} else {
    var renameInputs = quoteArrayElements(relevantFiles);
    var renameArgs = createArgumentArray(params["rename"], packageRoot);
    log("renameArgs - " + renameArgs);
    log("RUNNING SCRIPT - " + archiveUID);

    callAsync(
        function(exitCode, stdOut, errOut) {
            if (exitCode == 0) {
                log("SUCCESS - " + archiveUID);

                var cleanerArgs = createArgumentArray(params["cleaner"], packageRoot);

                log("CLEANING - " + packageRoot);

                callAsync(
                    function(exitCode, stdOut, errOut) {
                        if (exitCode == 0) {
                            log("ALL CLEAN - " + packageRoot);
                        } else {
                            log("STILL DIRTY - " + packageRoot);
                        }

                        flushLog();
                    },
                    cleanerArgs
                );
            } else {
                log("ERROR - " + archiveUID + " - Code " + exitCode);
            }

            flushLog();
        },
        renameArgs
    );
}

logSpacer();
flushLog();