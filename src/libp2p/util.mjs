const textEncoder = new TextEncoder();

export function formatPublishData(dataObject) {
    return textEncoder.encode(JSON.stringify(dataObject));
}