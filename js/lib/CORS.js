function CORS(method, url, callback) {
    // Create CORS request
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
        xhr = new XDomainRequest();
        xhr.open(method, url);
    }
    if (!xhr) {
        console.log("CORS not supported!");
        return;
    }
    // Make CORS request
    xhr.onload = () => callback(xhr.responseText);
    xhr.onerror = () => console.log("There was an error making CORS request.");
    xhr.send();
}

function getJSON(url, callback) {
    CORS('GET', url, (response) => callback(JSON.parse(response)) );
}