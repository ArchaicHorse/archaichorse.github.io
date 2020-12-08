

let cnv = document.getElementById('dst');
let ctx = cnv.getContext('2d', { alpha: false });
let readyFrames = [];
let underflow = true;
let frameTime = 50; // in milliseconds
let handleCount = 0;
let renderCount = 0;
let statsDisplayed = false;

var asset;


function displayStats(frame){
    try {
        document.getElementById('frame_count').innerHTML = "Frame #: " + renderCount;
        document.getElementById("coded_width").innerHTML = "codedWidth: " + frame.codedWidth;
        document.getElementById("coded_height").innerHTML = "codedHeight: " + frame.codedHeight;
        document.getElementById("display_width").innerHTML = "displayWidth: " + frame.displayWidth;
        document.getElementById("display_height").innerHTML = "displayHeight: " + frame.displayHeight;

        cnv.width = frame.displayWidth;
        cnv.height = frame.displayHeight;
    } catch(err) {
        document.getElementById('filename').innerHTML = "Error: " + err.message;
    }
}

function handleFrame(frame) {
    console.log('handling frame ' + handleCount);
    handleCount++;
    readyFrames.push(frame);
    if (underflow)
        setTimeout(renderFrame, 0);
}

function delay(time_ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, time_ms);
    });
}

async function renderFrame() {
    console.log('rendering frame ' + renderCount);
    
    renderCount++;
    if (readyFrames.length == 0) {
        underflow = true;
        return;
    }
    let frame = readyFrames.shift();
    underflow = false;

    let bitmap = await frame.createImageBitmap();

    await delay(frameTime);
    if (!statsDisplayed) {
        displayStats(frame);
        statsDisplayed = true;
    } else {
        // just update the frame count
        document.getElementById('frame_count').innerHTML = "Frame #: " + renderCount;
    }
    
    ctx.drawImage(bitmap, 0, 0);

    // Immediately schedule rendering of the next frame
    setTimeout(renderFrame, 0);
    frame.destroy();
}

async function decodeVideo(assetURL, avcC) {
    if ("VideoDecoder" in window) {
        const init = {
            output : handleFrame,
            error: (e) => {
                console.log(e.message);
            }
        };

        const config = {
            codec: "avc1.64000a",
            description : avcC, 
            codedWidth: cnv.width,
            codedHeight: cnv.height,
        };

        let decoder = new VideoDecoder(init);
        decoder.configure(config);

        console.log('creating encoded video chunk');

        (await fetch(assetURL)).arrayBuffer().then(async function(buffer) {
            let chunk = new EncodedVideoChunk({
                type : "key",
                timestamp: frameTime,
                data : buffer,
            });
    
            handleCount = 0;
            renderCount = 0;
            statsDisplayed = false;
    
            decoder.decode(chunk);
            
            await decoder.flush();
        });


    } else {
        document.body.innerHTML = "<h1>WebCodecs API is not supported.</h1>";
        return;
    }
}